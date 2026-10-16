#!/usr/bin/env node
/**
 * 数据质量抽检（DS-9，docs/02）：
 * - 默认全量体检：对生效译文（overrides 合并后，与站点一致）重跑 DS-6 四项校验，
 *   叠加跨条目启发式（原文相同残留 / 无汉字 / 长英文片段 / 撞译文）；
 * - --sample N：从近 N 天（--days，默认 7，按 meta.synced_at 对齐站点口径）更新的
 *   已译条目随机抽取，输出可留档的中英对照 markdown；
 * - 只读 data/、不写盘；默认报告制（exit 0），--strict 下硬问题（数字 / 链接 / 拒答）非零退出。
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateTranslation } from './lib/validate.mjs'

const SITE_BASE = 'https://ffd.baiwumm.com'
const UPSTREAM_BASE = 'https://github.com/ripienaar/free-for-dev'
/** 长英文片段阈值：剥除链接与代码后，连续 ≥ 6 个英文词判为残留 */
const EN_RUN_WORDS = 6
/** 撞译文检查只统计较长译文，短句撞车属正常（如「完全免费」） */
const DUP_MIN_LEN = 24
/** --strict 视为硬问题（非零退出）的检查项 */
const HARD_CHECKS = new Set(['数字不一致', '链接不一致', '疑似拒答'])
const CHECK_ORDER = [
  '数字不一致',
  '链接不一致',
  '长度比异常',
  '疑似拒答',
  '服务名缺失',
  '译文与原文相同',
  '无中文字符',
  '英文长片段残留',
  '译文撞车',
  '其他',
]

const USAGE = `用法：node scripts/audit.mjs [选项]

默认：全量体检（报告制，exit 0）
  --limit N        每组最多展示 N 条（默认 10）
  --strict         存在数字 / 链接 / 拒答硬问题时 exit 1

随机抽检：
  --sample N       抽取 N 条（正整数，必填）
  --days N         窗口：近 N 天更新（默认 7，按 meta.synced_at）
  --all            不设窗口，从全量已译条目抽样
  --category <id>  限定分类（如 ci-cd）
  --seed <s>       固定随机种子（默认按同步日期播种，同日可复现）
`

/** 读取并合并生效译文（overrides 优先，与站点展示一致），只保留 active。 */
export async function loadData(root) {
  const read = async (file) => JSON.parse(await readFile(path.join(root, 'data', file), 'utf8'))
  const [doc, overrides, categories] = await Promise.all([
    read('entries.json'),
    read('overrides.json').catch(() => ({})),
    read('categories.json').catch(() => ({ categories: [] })),
  ])
  const nameZh = new Map(categories.categories.map((c) => [c.id, c.name_zh]))
  const records = doc.entries
    .filter((e) => e.status === 'active')
    .map((e) => ({
      id: e.id,
      kind: e.kind,
      name: e.name,
      category: e.category,
      descEn: e.desc_en ?? '',
      descZh: overrides[e.id]?.desc_zh ?? e.desc_zh ?? null,
      updatedAt: e.updated_at ?? '',
      overridden: Boolean(overrides[e.id]?.desc_zh),
    }))
  return { meta: doc.meta, nameZh, records }
}

/** 全量体检：返回分组问题、未译清单与统计（纯函数，供单测）。 */
export function auditRecords(records) {
  const buckets = new Map(CHECK_ORDER.map((name) => [name, []]))
  const untranslated = []
  const byZh = new Map()
  let withEn = 0
  let translated = 0
  let overridden = 0

  for (const r of records) {
    const en = r.descEn.trim()
    if (!en) continue
    withEn += 1
    const zh = (r.descZh ?? '').trim()
    if (!zh) {
      untranslated.push(r)
      continue
    }
    translated += 1
    if (r.overridden) overridden += 1

    if (zh === en) {
      buckets.get('译文与原文相同').push({ record: r, detail: '与原文完全相同（疑似未译）' })
      continue
    }
    for (const issue of validateTranslation(en, zh, { name: r.name ?? undefined })) {
      buckets.get(classifyIssue(issue)).push({ record: r, detail: issue })
    }
    if (!/\p{Script=Han}/u.test(zh)) {
      buckets.get('无中文字符').push({ record: r, detail: '译文不含任何汉字' })
    }
    const run = longestEnglishRun(zh)
    if (run) {
      buckets
        .get('英文长片段残留')
        .push({ record: r, detail: `连续 ${run.words} 个英文词：${clip(run.text, 60)}` })
    }
    const group = byZh.get(zh) ?? []
    group.push(r)
    byZh.set(zh, group)
  }

  // 撞译文：同一译文对应多条不同原文（相同原文去重是设计行为，不算问题）
  for (const [zh, group] of byZh) {
    if (zh.length < DUP_MIN_LEN || group.length < 2) continue
    const distinct = new Map(group.map((r) => [r.descEn.trim(), r]))
    if (distinct.size < 2) continue
    for (const r of [...distinct.values()].slice(1)) {
      buckets
        .get('译文撞车')
        .push({ record: r, detail: `与另外 ${distinct.size - 1} 条不同原文共用同一译文` })
    }
  }

  const checks = CHECK_ORDER.map((name) => ({ name, items: buckets.get(name) }))
  const hardCount = checks
    .filter((c) => HARD_CHECKS.has(c.name))
    .reduce((sum, c) => sum + c.items.length, 0)
  return {
    checks,
    untranslated,
    stats: {
      active: records.length,
      withEn,
      translated,
      untranslated: untranslated.length,
      overridden,
      hardCount,
    },
  }
}

/** 随机抽检：窗口 / 分类过滤后用播种随机数抽样（同 seed 可复现，纯函数）。 */
export function sampleRecords(records, opts = {}) {
  const count = opts.count ?? 5
  const days = Number.isFinite(opts.days) ? Math.max(0, opts.days) : 7
  const anchorDate = String(opts.anchor ?? new Date().toISOString()).slice(0, 10)
  const since = isoDaysBefore(anchorDate, days)
  let pool = records.filter((r) => r.descEn.trim() && (r.descZh ?? '').trim())
  if (opts.category) pool = pool.filter((r) => r.category === opts.category)

  let scope = '全量'
  if (!opts.all) {
    const recent = pool.filter((r) => r.updatedAt && r.updatedAt >= since)
    if (recent.length > 0) {
      pool = recent
      scope = `近 ${days} 天更新（${since} 起）`
    } else {
      scope = `近 ${days} 天无更新，已回退全量`
    }
  }

  const seed = String(opts.seed ?? anchorDate)
  const items = shuffleSeeded(pool, seed).slice(0, count)
  return { items, poolSize: pool.length, count, days, since, scope, seed }
}

/** 字符串播种（xmur3）→ 32 位整数，保证跨平台可复现。 */
export function seedToInt(str) {
  let h = 1779033703 ^ String(str).length
  for (let i = 0; i < String(str).length; i++) {
    h = Math.imul(h ^ String(str).charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

/** Fisher–Yates 播种洗牌。 */
export function shuffleSeeded(list, seedStr) {
  const rng = mulberry32(seedToInt(seedStr))
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function classifyIssue(issue) {
  for (const name of CHECK_ORDER) {
    if (name !== '其他' && issue.startsWith(name)) return name
  }
  return '其他'
}

/** 剥除行内代码、markdown 链接目标、裸链接后，找最长连续英文词片段。 */
function longestEnglishRun(zh) {
  const cleaned = zh
    .replace(/`[^`]*`/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
  const re = new RegExp(
    `[A-Za-z][A-Za-z'’-]*(?:\\s+[A-Za-z][A-Za-z'’-]*){${EN_RUN_WORDS - 1},}`,
    'g',
  )
  let best = null
  for (const match of cleaned.matchAll(re)) {
    const words = match[0].split(/\s+/).length
    if (!best || words > best.words) best = { words, text: match[0] }
  }
  return best
}

export function formatAuditReport(report, { limit = 10 } = {}) {
  const { meta, nameZh, checks, untranslated, stats } = report
  const date = String(meta?.synced_at ?? '').slice(0, 10)
  const sha = String(meta?.commit_sha ?? '').slice(0, 8)
  const lines = [
    `free-for-dev-zh 数据质量体检 · ${date}（上游 ${sha}）`,
    `范围：active ${fmt(stats.active)}（有原文 ${fmt(stats.withEn)}｜已译 ${fmt(stats.translated)}｜未译 ${fmt(stats.untranslated)}｜人工覆盖 ${fmt(stats.overridden)}）`,
    '',
  ]

  let issues = 0
  for (const check of checks) {
    if (check.items.length === 0) continue
    issues += check.items.length
    lines.push(`✗ ${check.name}（${check.items.length} 条）`)
    for (const item of check.items.slice(0, limit)) {
      lines.push(`  · ${label(item.record, nameZh)} ${item.record.id}`)
      lines.push(`    ${item.detail}`)
      lines.push(`    en: ${clip(item.record.descEn)}`)
      lines.push(`    zh: ${clip(item.record.descZh)}`)
      lines.push(`    站点 ${siteLink(item.record)}`)
    }
    if (check.items.length > limit) {
      lines.push(`  …还有 ${check.items.length - limit} 条（--limit N 调整）`)
    }
    lines.push('')
  }
  if (issues === 0) {
    lines.push('✓ 未发现问题（数字 / 链接 / 长度比 / 拒答 / 服务名 / 文本启发式）')
  } else {
    lines.push(`合计 ${issues} 条线索（报告制；--strict 时数字 / 链接 / 拒答硬问题非零退出）`)
  }
  if (untranslated.length > 0) {
    lines.push('')
    lines.push(`未译条目（${untranslated.length}，站点降级展示英文并标注「未翻译」）：`)
    for (const r of untranslated.slice(0, limit)) {
      lines.push(`  · ${label(r, nameZh)} ${r.id}`)
    }
    if (untranslated.length > limit) lines.push(`  …还有 ${untranslated.length - limit} 条`)
  }
  return lines.join('\n')
}

export function formatSampleReport(result, { nameZh, date }) {
  const { items, poolSize, count, scope, seed } = result
  const taken =
    items.length === count
      ? `抽取 ${count} 条`
      : `抽取 ${items.length} 条（候选 ${poolSize} 条不足 ${count}）`
  const lines = [
    `## 翻译抽检样本 · ${date}`,
    '',
    `范围：${scope}（候选 ${poolSize} 条，${taken}）｜seed: ${seed}`,
    '',
  ]
  items.forEach((r, i) => {
    lines.push(`### ${i + 1}. ${r.name ?? '（备注）'}`)
    lines.push(
      `- 分类：${nameZh.get(r.category) ?? r.category}（${r.category}）· 更新于 ${r.updatedAt}`,
    )
    lines.push(`- 原文：${r.descEn.trim()}`)
    lines.push(`- 译文：${(r.descZh ?? '').trim()}`)
    lines.push(`- 站点：${siteLink(r)} ｜ 上游：${UPSTREAM_BASE}#${r.category}`)
    lines.push('- 复核：- [ ] 合格　- [ ] 不合格（原因：＿＿＿；回填 data/overrides.json）')
    lines.push('')
  })
  return lines.join('\n')
}

function isoDaysBefore(anchorDate, days) {
  return new Date(Date.parse(`${anchorDate}T00:00:00Z`) - days * 86_400_000)
    .toISOString()
    .slice(0, 10)
}

function fmt(n) {
  return Number(n ?? 0).toLocaleString('zh-CN')
}

function clip(text, max = 90) {
  const s = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  return s.length > max ? `${s.slice(0, max)}…` : s
}

function label(record, nameZh) {
  return `${record.name ?? '（备注）'}（${nameZh.get(record.category) ?? record.category}）`
}

function siteLink(record) {
  return record.kind === 'note'
    ? `${SITE_BASE}/docs/${record.category}`
    : `${SITE_BASE}/entry/${record.id}`
}

// ---- 独立运行：node scripts/audit.mjs [选项]（见 USAGE） ----
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isMain) {
  main().catch((err) => {
    console.error(`\n✗ 抽检失败：${err.message}`)
    process.exit(1)
  })
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE)
    return
  }
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
  const { meta, nameZh, records } = await loadData(root)
  const date = String(meta?.synced_at ?? new Date().toISOString()).slice(0, 10)

  const sampleIdx = args.indexOf('--sample')
  if (sampleIdx >= 0) {
    const count = Number(args[sampleIdx + 1])
    if (!Number.isInteger(count) || count <= 0) {
      throw new Error('--sample 需带正整数（如 --sample 5）')
    }
    const result = sampleRecords(records, {
      count,
      days: intFlag(args, '--days', 7),
      all: args.includes('--all'),
      category: strFlag(args, '--category'),
      seed: strFlag(args, '--seed'),
      anchor: date,
    })
    if (result.items.length === 0) {
      const scope = strFlag(args, '--category')
      console.log(
        `候选为空：${scope ? `分类 ${scope} 下没有已译条目；` : ''}检查 --days / --all，或先运行同步`,
      )
      return
    }
    console.log(formatSampleReport(result, { nameZh, date }))
    return
  }

  const result = auditRecords(records)
  console.log(
    formatAuditReport({ meta, nameZh, ...result }, { limit: intFlag(args, '--limit', 10) }),
  )
  if (args.includes('--strict') && result.stats.hardCount > 0) process.exitCode = 1
}

function intFlag(args, name, fallback) {
  const i = args.indexOf(name)
  if (i < 0) return fallback
  const value = Number(args[i + 1])
  return Number.isFinite(value) ? value : fallback
}

function strFlag(args, name) {
  const i = args.indexOf(name)
  if (i < 0) return null
  const value = args[i + 1]
  return value && !value.startsWith('--') ? value : null
}
