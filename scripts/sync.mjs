#!/usr/bin/env node
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { diffEntries } from './lib/diff.mjs'
import { fetchUpstream } from './lib/fetch.mjs'
import { runGuard } from './lib/guard.mjs'
import { mergeEntries } from './lib/merge.mjs'
import { findDuplicateIds, parseReadme } from './lib/parse.mjs'
import { translateRecords } from './translate.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = path.join(root, 'data')
const entriesFile = path.join(dataDir, 'entries.json')
const categoriesFile = path.join(dataDir, 'categories.json')
const overridesFile = path.join(dataDir, 'overrides.json')

const args = parseArgs(process.argv.slice(2))

main().catch((err) => {
  console.error(`\n✗ 同步失败：${err.message}`)
  process.exit(1)
})

async function main() {
  const startedAt = new Date()
  const today = startedAt.toISOString().slice(0, 10)

  // 1. fetch
  console.log('· 拉取上游 README…')
  const upstream = await fetchUpstream({ readmePath: args.readme })
  console.log(`  来源 ${upstream.source}${upstream.sha ? ` @ ${upstream.sha.slice(0, 7)}` : ''}`)

  // 2. parse
  const parsed = parseReadme(upstream.text)
  const entryCount = parsed.entries.filter((e) => e.kind === 'entry').length
  const noteCount = parsed.entries.filter((e) => e.kind === 'note').length
  console.log(
    `  解析出分类 ${parsed.categories.length} 个 / 条目 ${entryCount} 条 / 备注 ${noteCount} 条`,
  )

  const duplicateIds = findDuplicateIds(parsed.entries)
  if (duplicateIds.length > 0) {
    const detail = duplicateIds
      .map((id) => {
        const rows = parsed.entries
          .filter((e) => e.id === id)
          .map((e) => `${e.name ?? '(备注)'} <${e.url ?? e.category}>`)
          .join(' | ')
        return `  ${id}: ${rows}`
      })
      .join('\n')
    throw new Error(`条目 ID 唯一性断言失败（同一 URL 在同一分类重复出现）：\n${detail}`)
  }

  // 3. 分类人工层校验
  const categoriesDoc = await loadJson(categoriesFile)
  if (categoriesDoc) {
    const known = new Map(categoriesDoc.categories.map((c) => [c.name_en, c]))
    const missing = parsed.categories.filter((c) => !known.has(c.nameEn)).map((c) => c.nameEn)
    const stale = categoriesDoc.categories
      .filter((c) => !parsed.categories.some((p) => p.id === c.id))
      .map((c) => c.name_en)
    if (missing.length > 0 && !args.dryRun) {
      throw new Error(
        `上游出现新分类，请先在 data/categories.json 补充中文名：\n  ${missing.join('\n  ')}`,
      )
    }
    if (stale.length > 0) {
      console.warn(
        `  警告：categories.json 中 ${stale.length} 个分类已不在上游（${stale.join('、')}），已忽略`,
      )
    }
  } else if (!args.dryRun) {
    throw new Error('data/categories.json 不存在，请先创建 57 个分类的中英对照（见 docs/02 DS-7）')
  } else {
    console.warn('  警告：categories.json 缺失（--dry-run 下放行）')
  }

  // 4. 与上一版比对/合并/守卫
  const previous = await loadJson(entriesFile)
  const diff = diffEntries(previous, parsed)
  const merged = mergeEntries(parsed, previous, today)

  const overrides = (await loadJson(overridesFile)) ?? {}
  const unknownOverrideIds = []
  for (const rec of merged) {
    const o = overrides[rec.id]
    if (o?.desc_zh) rec.desc_zh = o.desc_zh
  }
  for (const id of Object.keys(overrides)) {
    if (!merged.some((e) => e.id === id && e.status === 'active')) unknownOverrideIds.push(id)
  }
  if (unknownOverrideIds.length > 0) {
    console.warn(
      `  警告：overrides.json 中 ${unknownOverrideIds.length} 个条目 ID 已不存在：${unknownOverrideIds.join('、')}`,
    )
  }

  const guardIssues = runGuard(previous ? { entries: previous.entries } : null, { entries: merged })
  if (guardIssues.length > 0) {
    throw new Error(`解析守卫拦截，本次不写入任何数据：\n  ${guardIssues.join('\n  ')}`)
  }

  const counts = summarize(merged, parsed)
  console.log(
    `· 差异：新增 ${diff.added.length} · 变更 ${diff.changed.length} · 删除 ${diff.removed.length}` +
      (previous ? '' : '（首次运行，建立基线）'),
  )

  if (args.verbose) {
    for (const c of parsed.categories) {
      const n = merged.filter((e) => e.category === c.id && e.status === 'active').length
      console.log(`  ${String(n).padStart(4)}  ${c.id}  ${c.nameEn}`)
    }
  }

  // 5. 翻译（增量）
  let translateStats = null
  const pending = merged.filter((e) => e.status === 'active' && e.desc_en && !e.desc_zh)
  if (args.noTranslate) {
    console.log(`· 跳过翻译（--no-translate），待翻译 ${pending.length} 条`)
  } else if (!process.env.LLM_API_KEY) {
    console.log(
      `· 跳过翻译（未配置 LLM_API_KEY），待翻译 ${pending.length} 条；配置后运行 pnpm translate 或等待下次同步自动补齐`,
    )
  } else {
    translateStats = await translateRecords(merged, { limit: args.limit })
  }

  if (args.dryRun) {
    console.log('· --dry-run：不写入 data/entries.json')
    printSummary({ upstream, counts, diff, translateStats, pending })
    return
  }

  // 6. 短路：分类与条目与上一版完全一致时跳过写入。
  //    不更新 synced_at，避免上游无变化也产生每日空提交与部署（workflow 以 data/ 是否有 diff 判断）。
  const nextComparable = JSON.stringify({
    categories: parsed.categories.map((c) => ({ id: c.id, name_en: c.nameEn })),
    entries: merged,
  })
  const prevComparable = previous
    ? JSON.stringify({ categories: previous.categories, entries: previous.entries })
    : null
  if (prevComparable !== null && prevComparable === nextComparable) {
    console.log('· 与上一版数据完全一致，跳过写入（不产生提交与部署）')
    printSummary({ upstream, counts, diff, translateStats, pending })
    return
  }

  // 7. 原子写回
  const doc = {
    meta: {
      synced_at: startedAt.toISOString(),
      upstream: {
        url: upstream.source,
        commit_sha: upstream.sha,
        commit_date: upstream.commitDate,
      },
      counts: {
        ...summarize(merged, parsed),
        translated: merged.filter((e) => e.status === 'active' && e.desc_zh).length,
      },
    },
    categories: parsed.categories.map((c) => ({ id: c.id, name_en: c.nameEn })),
    entries: merged,
  }
  await mkdir(dataDir, { recursive: true })
  const tmp = `${entriesFile}.tmp`
  await writeFile(tmp, `${JSON.stringify(doc, null, 2)}\n`, 'utf8')
  await rename(tmp, entriesFile)

  printSummary({ upstream, counts, diff, translateStats, pending })
  console.log(`· 写入 data/entries.json（${(JSON.stringify(doc).length / 1024).toFixed(0)} KB）`)
}

function summarize(merged, parsed) {
  const active = merged.filter((e) => e.status === 'active')
  return {
    categories: parsed.categories.length,
    active: active.length,
    removed: merged.filter((e) => e.status === 'removed').length,
    entries: active.filter((e) => e.kind === 'entry').length,
    notes: active.filter((e) => e.kind === 'note').length,
  }
}

function printSummary({ upstream, counts, diff, translateStats, pending }) {
  console.log('\n✓ 同步完成')
  console.log(
    `  上游 ${upstream.sha ? upstream.sha.slice(0, 7) : '(本地文件)'}${upstream.commitDate ? ` · ${upstream.commitDate}` : ''}`,
  )
  console.log(
    `  条目 active ${counts.active}（条目 ${counts.entries} + 备注 ${counts.notes}）· removed ${counts.removed} · 分类 ${counts.categories}`,
  )
  console.log(
    `  差异 新增 ${diff.added.length} · 变更 ${diff.changed.length} · 删除 ${diff.removed.length}`,
  )
  if (translateStats && !translateStats.skipped) {
    console.log(
      `  翻译 成功 ${translateStats.translated} · 失败 ${translateStats.failed} · 待翻译 ${Math.max(0, pending.length - translateStats.translated)}`,
    )
  }
}

async function loadJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch (err) {
    if (err.code === 'ENOENT') return null
    throw err
  }
}

function parseArgs(argv) {
  const out = {
    dryRun: false,
    verbose: false,
    noTranslate: false,
    limit: Number.POSITIVE_INFINITY,
    readme: null,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') out.dryRun = true
    else if (a === '--verbose' || a === '-v') out.verbose = true
    else if (a === '--no-translate') out.noTranslate = true
    else if (a === '--limit') out.limit = Number(argv[++i])
    else if (a === '--readme') out.readme = argv[++i]
    else if (a === '--help' || a === '-h') {
      console.log(`用法：node scripts/sync.mjs [选项]

选项：
  --dry-run         只解析与比对，不写入、不翻译
  --verbose, -v     打印 57 个分类明细
  --no-translate    跳过翻译步骤
  --limit N         本次最多翻译 N 条
  --readme <file>   使用本地 README 文件作为上游（离线/测试）`)
      process.exit(0)
    } else {
      throw new Error(`未知参数：${a}`)
    }
  }
  return out
}
