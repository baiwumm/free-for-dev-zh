import assert from 'node:assert/strict'
import { test } from 'node:test'
import { diffEntries } from '../scripts/lib/diff.mjs'
import { runGuard } from '../scripts/lib/guard.mjs'
import { mergeEntries } from '../scripts/lib/merge.mjs'

function entry(id, category, extra = {}) {
  return {
    id,
    kind: 'entry',
    name: `Svc ${id}`,
    url: `https://example.com/${id}`,
    category,
    parent: null,
    desc_en: `desc ${id}`,
    desc_zh: null,
    status: 'active',
    first_seen: '2026-01-01',
    updated_at: '2026-01-01',
    ...extra,
  }
}

test('guard：首次运行直接通过', () => {
  const next = { entries: Array.from({ length: 10 }, (_, i) => entry(`a${i}`, 'cat-a')) }
  assert.deepEqual(runGuard(null, next), [])
})

test('guard：总量跌幅 > 10% 触发', () => {
  const prev = {
    entries: Array.from({ length: 100 }, (_, i) => entry(`p${i}`, i % 2 ? 'cat-a' : 'cat-b')),
  }
  const next = { entries: prev.entries.slice(0, 85) }
  const issues = runGuard(prev, next)
  assert.equal(issues.length, 1)
  assert.match(issues[0], /条目总数跌幅/)
})

test('guard：小幅波动不触发', () => {
  const prev = {
    entries: Array.from({ length: 100 }, (_, i) => entry(`p${i}`, i % 2 ? 'cat-a' : 'cat-b')),
  }
  const next = { entries: prev.entries.slice(0, 95) }
  assert.deepEqual(runGuard(prev, next), [])
})

test('guard：单分类跌幅 > 30% 触发', () => {
  const prev = {
    entries: [
      ...Array.from({ length: 10 }, (_, i) => entry(`s${i}`, 'small')),
      ...Array.from({ length: 90 }, (_, i) => entry(`b${i}`, 'big')),
    ],
  }
  const next = {
    entries: [
      ...Array.from({ length: 5 }, (_, i) => entry(`s${i}`, 'small')),
      ...Array.from({ length: 90 }, (_, i) => entry(`b${i}`, 'big')),
    ],
  }
  const issues = runGuard(prev, next)
  assert.equal(issues.length, 1)
  assert.match(issues[0], /分类 small/)
})

test('guard：译文覆盖率骤降触发', () => {
  const mk = (i, zh) => entry(`c${i}`, 'cat', { desc_zh: zh })
  const prev = { entries: Array.from({ length: 10 }, (_, i) => mk(i, `译文 ${i}`)) }
  const next = { entries: Array.from({ length: 10 }, (_, i) => mk(i, i < 4 ? `译文 ${i}` : null)) }
  const issues = runGuard(prev, next)
  assert.equal(issues.length, 1)
  assert.match(issues[0], /译文覆盖率/)
})

test('diff：新增/变更/删除三分类', () => {
  const prev = { entries: [entry('keep', 'cat'), entry('edit', 'cat'), entry('gone', 'cat')] }
  const next = {
    entries: [entry('keep', 'cat'), entry('edit', 'cat', { desc_en: 'new desc' }), entry('fresh', 'cat')],
  }
  const d = diffEntries(prev, next)
  assert.deepEqual(d.added.map((e) => e.id), ['fresh'])
  assert.deepEqual(d.changed.map((x) => x.rec.id), ['edit'])
  assert.deepEqual(d.removed.map((e) => e.id), ['gone'])
})

test('diff：仅空白差异视为未变更', () => {
  const prev = { entries: [entry('keep', 'cat', { desc_en: 'hello  world' })] }
  const next = { entries: [entry('keep', 'cat', { desc_en: 'hello world ' })] }
  const d = diffEntries(prev, next)
  assert.equal(d.changed.length, 0)
  assert.equal(d.added.length, 0)
  assert.equal(d.removed.length, 0)
})

test('diff：曾 removed 的条目重现按新增处理', () => {
  const prev = { entries: [entry('back', 'cat', { status: 'removed' })] }
  const next = { entries: [entry('back', 'cat')] }
  const d = diffEntries(prev, next)
  assert.deepEqual(d.added.map((e) => e.id), ['back'])
})

test('merge：沿用 first_seen 与未变译文，变更则置空并标记 removed', () => {
  const prev = {
    entries: [
      entry('keep', 'cat', { desc_zh: '旧译文', first_seen: '2026-01-02' }),
      entry('edit', 'cat', { desc_zh: '旧译文', first_seen: '2026-01-02' }),
      entry('gone', 'cat'),
    ],
  }
  const next = {
    entries: [entry('keep', 'cat'), entry('edit', 'cat', { desc_en: 'changed' }), entry('new', 'cat')],
  }
  const merged = mergeEntries(next, prev, '2026-10-15')
  const byId = Object.fromEntries(merged.map((e) => [e.id, e]))
  assert.equal(byId.keep.first_seen, '2026-01-02')
  assert.equal(byId.keep.desc_zh, '旧译文')
  assert.equal(byId.keep.updated_at, '2026-01-01')
  assert.equal(byId.edit.desc_zh, null)
  assert.equal(byId.edit.updated_at, '2026-10-15')
  assert.equal(byId.new.first_seen, '2026-10-15')
  assert.equal(byId.gone.status, 'removed')
  assert.equal(byId.gone.updated_at, '2026-10-15')
  assert.equal(merged.at(-1).id, 'gone')
})
