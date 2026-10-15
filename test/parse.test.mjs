import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { makeEntryId, normalizeUrl } from '../scripts/lib/ids.mjs'
import { findDuplicateIds, parseReadme } from '../scripts/lib/parse.mjs'
import { slugify } from '../scripts/lib/slug.mjs'

const fixture = await readFile(new URL('./fixtures/edge-cases.md', import.meta.url), 'utf8')
const parsed = parseReadme(fixture)

const find = (name) => parsed.entries.find((e) => e.name === name)
const findNote = (text) => parsed.entries.find((e) => e.kind === 'note' && e.desc_en === text)

test('slug：与 GitHub 标题锚点规则一致', () => {
  assert.equal(slugify('APIs, Data and ML'), 'apis-data-and-ml')
  assert.equal(slugify('Beta & Gamma'), 'beta-gamma')
  assert.equal(slugify("Major Cloud Providers' Always-Free Limits"), 'major-cloud-providers-always-free-limits')
})

test('解析分类：仅取 ## 标题，slug 作为 ID', () => {
  assert.deepEqual(parsed.categories, [
    { id: 'alpha-things', nameEn: 'Alpha Things' },
    { id: 'beta-gamma', nameEn: 'Beta & Gamma' },
    { id: 'tiny-section', nameEn: 'Tiny Section' },
  ])
})

test('解析计数：TOC 与前言不产生条目，备注单独计数', () => {
  const entries = parsed.entries.filter((e) => e.kind === 'entry')
  const notes = parsed.entries.filter((e) => e.kind === 'note')
  assert.equal(entries.length, 9)
  assert.equal(notes.length, 1)
  assert.ok(parsed.entries.every((e) => !String(e.url ?? '').includes('#alpha-things')))
})

test('描述分隔符：` - `、em dash、无分隔符三种形态', () => {
  assert.equal(find('Top One').desc_en, 'First top-level entry.')
  assert.equal(find('Top Two').desc_en, 'Em dash separated desc with 1,000 credits.')
  assert.equal(find('Flush Entry').desc_en, 'Free of dash. 5 GB storage')
  assert.equal(find('No Desc').desc_en, '')
  assert.equal(find('Linky').desc_en, 'Desc with [a link](https://target.example.com) and `code`.')
})

test('缩进规则：缩进 <= 2 为顶级，>= 4 挂到最近顶级条目', () => {
  const flush = find('Flush Entry')
  assert.equal(find('Top One').parent, null)
  assert.equal(flush.parent, null)
  assert.equal(find('Nested Link').parent, flush.id)
  assert.equal(findNote('Plain note with 2 million tokens').parent, flush.id)
  assert.equal(find('No Desc').parent, null)
  assert.equal(find('Linky').parent, null)
})

test('备注：无 URL、无名称', () => {
  const note = findNote('Plain note with 2 million tokens')
  assert.equal(note.url, null)
  assert.equal(note.name, null)
  assert.equal(note.kind, 'note')
  assert.equal(note.category, 'alpha-things')
})

test('ID 生成：URL 归一化（尾斜杠/协议/大小写/hash）', () => {
  assert.equal(normalizeUrl('https://Top.Example.com/path/'), 'https://top.example.com/path')
  assert.equal(normalizeUrl('http://x.dev/a#frag'), 'https://x.dev/a')
  assert.equal(normalizeUrl('https://x.dev/'), 'https://x.dev/')
  assert.equal(
    makeEntryId('https://top.example.com', 'alpha-things'),
    makeEntryId('https://top.example.com/', 'alpha-things'),
  )
  assert.notEqual(
    makeEntryId('https://top.example.com', 'alpha-things'),
    makeEntryId('https://top.example.com', 'beta-gamma'),
  )
  assert.equal(find('Top One').id, makeEntryId('https://top.example.com/', 'alpha-things'))
})

test('ID 唯一性断言：同 URL 同分类重复可被检出', () => {
  const dups = findDuplicateIds(parsed.entries)
  assert.equal(dups.length, 1)
  assert.equal(dups[0], makeEntryId('https://last.example.com/', 'beta-gamma'))
})
