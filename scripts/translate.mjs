#!/usr/bin/env node
import { readFile, writeFile, rename } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateTranslation } from './lib/validate.mjs'

const SYSTEM_PROMPT = `你是资深技术译者，负责把英文的产品/服务描述翻译成简体中文。
硬性规则：
1. 数字、单位、配额、百分比必须与原文等值（可按中文习惯改写，如 "5 million" 可写 "500 万"，但数值不可改变）；
2. markdown 链接必须原样保留（链接文字与 URL 都不变）；
3. 服务名、产品名、专有名词保持英文，不翻译；
4. 不添加、删减或评论任何信息，不输出原文以外的内容；
5. 仅输出 JSON：{"translations":[{"id":"<输入 id>","zh":"<译文>"}]}`

/**
 * 批量翻译（DS-6）：
 * - 目标：active 且 desc_en 非空且 desc_zh 为空（变更条目在 merge 阶段已被置空）；
 * - 相同描述去重只翻一次；每批默认 20–50 段，串行 + 失败重试；
 * - 每条译文过四项校验（数字 / 链接 / 长度比 / 坏输出），未过即重试一轮；
 * - 最终失败的条目保持 desc_zh = null（站点降级展示英文并标注"未翻译"）。
 */
export async function translateRecords(entries, opts = {}) {
  const apiKey = opts.apiKey ?? process.env.LLM_API_KEY
  if (!apiKey) return { skipped: true, attempted: 0, translated: 0, failed: 0 }

  const baseUrl = stripSlash(
    opts.baseUrl ?? process.env.LLM_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4',
  )
  const model = opts.model ?? process.env.LLM_MODEL ?? 'glm-4.7-flash'
  const batchSize = Math.max(1, Number(opts.batchSize ?? process.env.LLM_BATCH ?? 20))
  const limit = Number.isFinite(opts.limit) ? opts.limit : Number.POSITIVE_INFINITY

  const targets = entries
    .filter((e) => e.status !== 'removed' && e.desc_en && !e.desc_zh)
    .slice(0, limit)
  if (targets.length === 0) return { skipped: false, attempted: 0, translated: 0, failed: 0 }

  const byDesc = new Map()
  const nameByDesc = new Map()
  for (const e of targets) {
    if (!byDesc.has(e.desc_en)) {
      byDesc.set(e.desc_en, [])
      nameByDesc.set(e.desc_en, e.name ?? undefined)
    }
    byDesc.get(e.desc_en).push(e)
  }
  const unique = [...byDesc.keys()]
  console.log(
    `· 翻译 ${targets.length} 条（去重后 ${unique.length} 段）｜模型 ${model}｜每批 ${batchSize} 段`,
  )

  const stats = { skipped: false, attempted: 0, translated: 0, failed: 0 }
  for (let i = 0; i < unique.length; i += batchSize) {
    const batch = unique.slice(i, i + batchSize)
    const { result, failed } = await translateBatch(batch, {
      baseUrl,
      model,
      apiKey,
      nameByDesc,
    })
    for (const desc of batch) {
      stats.attempted += 1
      const zh = result.get(desc) ?? null
      if (zh) {
        stats.translated += 1
      } else {
        stats.failed += 1
        console.warn(`  保留英文（失败/校验未过）：${desc.slice(0, 64)}…`)
      }
      for (const rec of byDesc.get(desc)) rec.desc_zh = zh
    }
    if (i + batchSize < unique.length) process.stdout.write(`  进度 ${Math.min(i + batchSize, unique.length)}/${unique.length}\r`)
    if (i + batchSize < unique.length) await sleep(300)
  }
  process.stdout.write(' '.repeat(24) + '\r')
  return stats
}

async function translateBatch(descs, ctx) {
  const result = new Map()
  let pending = descs
  // 两轮：第一轮整体，第二轮只重试校验未过的部分
  for (let round = 0; round < 2 && pending.length > 0; round++) {
    let returned
    try {
      returned = await requestTranslations(pending, ctx)
    } catch (err) {
      console.error(`  批量请求失败：${err.message}`)
      returned = new Map()
    }
    const still = []
    for (const desc of pending) {
      const zh = returned.get(desc)
      if (!zh) {
        still.push(desc)
        continue
      }
      const issues = validateTranslation(desc, zh, { name: ctx.nameByDesc.get(desc) })
      if (issues.length === 0) result.set(desc, zh.trim())
      else still.push(desc)
    }
    pending = still
    if (pending.length > 0 && round === 0) await sleep(500)
  }
  return { result, failed: pending }
}

async function requestTranslations(descs, { baseUrl, model, apiKey, retries = 2 }) {
  const items = descs.map((text, idx) => ({ id: String(idx), text }))
  const body = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify({ items }) },
    ],
    temperature: 0.2,
  }
  if (process.env.LLM_THINKING === 'disabled') body.thinking = { type: 'disabled' }

  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(180000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}：${(await res.text()).slice(0, 200)}`)
      const data = await res.json()
      const content = data.choices?.[0]?.message?.content ?? ''
      const doc = parseModelJson(content)
      const map = new Map()
      for (const item of doc?.translations ?? []) {
        const idx = Number(item?.id)
        const zh = typeof item?.zh === 'string' ? item.zh : null
        if (Number.isInteger(idx) && descs[idx] != null && zh) map.set(descs[idx], zh)
      }
      return map
    } catch (err) {
      lastErr = err
      if (attempt < retries) await sleep(1500 * (attempt + 1))
    }
  }
  throw lastErr ?? new Error('未知错误')
}

/** 从模型输出中稳健地提取 JSON（容忍 ```json 围栏与前后杂讯）。 */
export function parseModelJson(content) {
  const text = String(content ?? '')
    .replace(/```(?:json)?/g, '')
    .trim()
  const candidates = [text]
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first >= 0 && last > first) candidates.push(text.slice(first, last + 1))
  for (const candidate of candidates) {
    try {
      const doc = JSON.parse(candidate)
      if (Array.isArray(doc)) return { translations: doc }
      if (doc && typeof doc === 'object') return doc
    } catch {
      // 尝试下一种
    }
  }
  return null
}

function stripSlash(s) {
  return String(s).replace(/\/+$/, '')
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---- 独立运行：node scripts/translate.mjs [--limit N] ----
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const entriesFile = path.join(root, 'data', 'entries.json')
  main().catch((err) => {
    console.error(`\n✗ 翻译失败：${err.message}`)
    process.exit(1)
  })

  async function main() {
    if (!process.env.LLM_API_KEY) {
      console.error('✗ 未配置 LLM_API_KEY（见 docs/04「本地开发」与 docs/02 DS-6）')
      process.exit(1)
    }
    const limitArg = process.argv.indexOf('--limit')
    const limit = limitArg >= 0 ? Number(process.argv[limitArg + 1]) : Number.POSITIVE_INFINITY

    const doc = JSON.parse(await readFile(entriesFile, 'utf8'))
    const stats = await translateRecords(doc.entries, { limit })
    if (stats.skipped) return

    try {
      const overrides = JSON.parse(await readFile(path.join(root, 'data', 'overrides.json'), 'utf8'))
      for (const e of doc.entries) {
        const o = overrides[e.id]
        if (o?.desc_zh) e.desc_zh = o.desc_zh
      }
    } catch {
      // overrides.json 缺失时跳过
    }

    doc.meta.counts.translated = doc.entries.filter((e) => e.status === 'active' && e.desc_zh).length
    doc.meta.translated_at = new Date().toISOString()
    const tmp = `${entriesFile}.tmp`
    await writeFile(tmp, `${JSON.stringify(doc, null, 2)}\n`, 'utf8')
    await rename(tmp, entriesFile)
    console.log(
      `✓ 翻译完成：成功 ${stats.translated} · 失败 ${stats.failed} · 覆盖 ${doc.meta.counts.translated}/${doc.meta.counts.active}`,
    )
  }
}
