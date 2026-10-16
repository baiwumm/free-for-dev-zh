import assert from 'node:assert/strict'
import { test } from 'node:test'
import { auditRecords, sampleRecords, seedToInt, shuffleSeeded } from '../scripts/audit.mjs'

function rec(id, descEn, descZh, extra = {}) {
  return {
    id,
    kind: extra.kind ?? 'entry',
    name: extra.name ?? `Item ${id}`,
    category: extra.category ?? 'misc',
    descEn,
    descZh,
    updatedAt: extra.updatedAt ?? '2026-10-16',
    overridden: extra.overridden ?? false,
  }
}

const bucket = (result, name) => result.checks.find((c) => c.name === name)

test('体检：正常条目零问题，未译单独计数', () => {
  const result = auditRecords([
    rec('a', 'Free DNS hosting for developers', '为开发者提供免费的 DNS 托管服务'),
    rec('b', 'Enterprise plans available', null),
    rec('c', '', '无原文的条目'),
  ])
  assert.equal(result.stats.hardCount, 0)
  assert.deepEqual(
    result.checks.filter((c) => c.items.length > 0),
    [],
  )
  assert.equal(result.stats.active, 3)
  assert.equal(result.stats.withEn, 2)
  assert.equal(result.stats.translated, 1)
  assert.equal(result.untranslated.length, 1)
})

test('体检：数字不一致命中硬问题', () => {
  const result = auditRecords([rec('a', 'Free 100 GB storage', '免费存储额度充足')])
  assert.equal(bucket(result, '数字不一致').items.length, 1)
  assert.equal(result.stats.hardCount, 1)
})

test('体检：译文与原文相同单独归类，不重复报无中文字符', () => {
  const result = auditRecords([
    rec('a', 'Self-hosted metrics platform', 'Self-hosted metrics platform'),
  ])
  assert.equal(bucket(result, '译文与原文相同').items.length, 1)
  assert.equal(bucket(result, '无中文字符').items.length, 0)
})

test('体检：纯英文残留与长英文片段', () => {
  const en = 'Free plan for open source projects and development teams of all sizes'
  const result = auditRecords([
    rec('a', en, 'For open source projects'),
    rec(
      'b',
      en,
      '面向开源项目的免费方案，支持 GitHub GitLab Bitbucket Azure DevOps CircleCI 流水线',
    ),
    rec('c', en, '面向开源项目的免费方案，支持 GitHub Actions 与流水线集成'),
  ])
  assert.equal(bucket(result, '无中文字符').items.length, 1)
  assert.equal(bucket(result, '无中文字符').items[0].record.id, 'a')
  assert.equal(bucket(result, '英文长片段残留').items.length, 1)
  assert.equal(bucket(result, '英文长片段残留').items[0].record.id, 'b')
})

test('体检：服务名缺失归入对应检查项', () => {
  const result = auditRecords([
    rec('a', 'Use BudiBase to build your backend services quickly', '用它快速搭建你的后端服务', {
      name: 'BudiBase',
    }),
  ])
  assert.equal(bucket(result, '服务名缺失').items.length, 1)
  assert.equal(result.stats.hardCount, 0)
})

test('体检：撞译文按不同原文判定，相同原文去重不算', () => {
  const zh = '这是一段足够长的覆盖译文内容，用于验证撞车检测示例'
  const result = auditRecords([
    rec('a', 'Description A about databases', zh),
    rec('b', 'Description B about databases', zh),
    rec('c', 'Description A about databases', zh),
  ])
  const items = bucket(result, '译文撞车').items
  assert.equal(items.length, 1)
  assert.equal(items[0].record.id, 'b')
})

test('体检：短译文撞车不报（长度阈值）', () => {
  const result = auditRecords([
    rec('a', 'Free plan one', '完全免费'),
    rec('b', 'Free plan two', '完全免费'),
  ])
  assert.equal(bucket(result, '译文撞车').items.length, 0)
})

test('抽样：同 seed 可复现，窗口与全量回退正确', () => {
  const records = [
    rec('a', 'A', '甲', { updatedAt: '2026-10-16' }),
    rec('b', 'B', '乙', { updatedAt: '2026-10-16' }),
    rec('c', 'C', '丙', { updatedAt: '2026-10-15' }),
    rec('d', 'D', '丁', { updatedAt: '2026-10-12' }),
    rec('old', 'Old', '旧', { updatedAt: '2026-09-01' }),
  ]
  const opts = { count: 2, days: 7, anchor: '2026-10-16', seed: 'fixed' }
  const first = sampleRecords(records, opts)
  const second = sampleRecords(records, opts)
  assert.deepEqual(
    first.items.map((r) => r.id),
    second.items.map((r) => r.id),
  )
  assert.equal(first.poolSize, 4)
  assert.ok(first.items.every((r) => r.updatedAt >= first.since))

  const fallback = sampleRecords([rec('old', 'Old', '旧', { updatedAt: '2026-09-01' })], {
    count: 1,
    days: 7,
    anchor: '2026-10-16',
  })
  assert.match(fallback.scope, /回退全量/)
  assert.equal(fallback.poolSize, 1)

  const all = sampleRecords(records, { count: 1, all: true, anchor: '2026-10-16' })
  assert.equal(all.poolSize, 5)
  assert.equal(all.scope, '全量')
})

test('抽样：分类过滤与候选不足', () => {
  const records = [
    rec('a', 'A', '甲', { category: 'dns' }),
    rec('b', 'B', '乙', { category: 'dns' }),
    rec('c', 'C', '丙', { category: 'ci-cd' }),
  ]
  const result = sampleRecords(records, {
    count: 5,
    category: 'dns',
    anchor: '2026-10-16',
  })
  assert.equal(result.poolSize, 2)
  assert.equal(result.items.length, 2)
  assert.ok(result.items.every((r) => r.category === 'dns'))
})

test('抽样：播种洗牌是排列且可复现', () => {
  assert.equal(seedToInt('2026-10-16'), seedToInt('2026-10-16'))
  const shuffled = shuffleSeeded([1, 2, 3, 4, 5], 'seed-x')
  assert.deepEqual(
    [...shuffled].sort((a, b) => a - b),
    [1, 2, 3, 4, 5],
  )
  assert.deepEqual(shuffleSeeded([1, 2, 3, 4, 5], 'seed-x'), shuffled)
})
