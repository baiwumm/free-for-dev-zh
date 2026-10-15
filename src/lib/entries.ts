import categoriesData from '../../data/categories.json'
import entriesData from '../../data/entries.json'
import overridesData from '../../data/overrides.json'

export type EntryKind = 'entry' | 'note'

interface RawEntry {
  id: string
  kind: EntryKind
  name: string | null
  url: string | null
  category: string
  parent: string | null
  desc_en: string
  desc_zh: string | null
  status: 'active' | 'removed'
  first_seen: string
  updated_at: string
}

export interface SiteEntry {
  id: string
  kind: EntryKind
  name: string | null
  url: string | null
  category: string
  parent: string | null
  descEn: string
  descZh: string | null
  firstSeen: string
  updatedAt: string
}

export interface SiteCategory {
  id: string
  nameEn: string
  nameZh: string
  /** 该分类 active 的链接条目数（不含备注） */
  count: number
}

export interface ExplorerItem {
  id: string
  kind: EntryKind
  name: string | null
  url: string | null
  domain: string | null
  descEn: string
  descZh: string | null
  /** 0 = 顶级条目，1 = 子条目/备注 */
  depth: number
  childCount: number
}

const overrides = overridesData as Record<string, { desc_zh?: string }>

export const entries: SiteEntry[] = (entriesData.entries as RawEntry[])
  .filter((e) => e.status === 'active')
  .map((e) => ({
    id: e.id,
    kind: e.kind,
    name: e.name,
    url: e.url,
    category: e.category,
    parent: e.parent,
    descEn: e.desc_en,
    descZh: overrides[e.id]?.desc_zh ?? e.desc_zh,
    firstSeen: e.first_seen,
    updatedAt: e.updated_at,
  }))

export const siteMeta = entriesData.meta

const zhById = new Map(categoriesData.categories.map((c) => [c.id, c.name_zh]))

export const categories: SiteCategory[] = entriesData.categories.map((c) => {
  const inCategory = entries.filter((e) => e.category === c.id)
  return {
    id: c.id,
    nameEn: c.name_en,
    nameZh: zhById.get(c.id) ?? c.name_en,
    count: inCategory.filter((e) => e.kind === 'entry').length,
  }
})

export const categoryById = new Map(categories.map((c) => [c.id, c]))

export const entryById = new Map(
  entries.filter((e) => e.kind === 'entry' && e.url).map((e) => [e.id, e]),
)

export const stats = {
  services: entries.filter((e) => e.kind === 'entry').length,
  notes: entries.filter((e) => e.kind === 'note').length,
  categories: categories.length,
  translated: entries.filter((e) => e.descZh).length,
  total: entries.length,
}

export function domainOf(url: string | null): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

/** 分类页数据：顶级条目按上游顺序，子条目/备注紧随其父。 */
export function getExplorerItems(categoryId: string): ExplorerItem[] | null {
  if (!categoryById.has(categoryId)) return null
  const inCategory = entries.filter((e) => e.category === categoryId)
  const childrenOf = new Map<string, SiteEntry[]>()
  for (const e of inCategory) {
    if (!e.parent) continue
    const list = childrenOf.get(e.parent) ?? []
    list.push(e)
    childrenOf.set(e.parent, list)
  }

  const items: ExplorerItem[] = []
  for (const top of inCategory.filter((e) => !e.parent)) {
    const children = childrenOf.get(top.id) ?? []
    items.push(toItem(top, 0, children.length))
    for (const child of children) {
      items.push(toItem(child, 1, 0))
    }
  }
  return items
}

function toItem(e: SiteEntry, depth: number, childCount: number): ExplorerItem {
  return {
    id: e.id,
    kind: e.kind,
    name: e.name,
    url: e.url,
    domain: domainOf(e.url),
    descEn: e.descEn,
    descZh: e.descZh,
    depth,
    childCount,
  }
}

/** 详情页的上下文：所属分类、（可选）父条目。 */
export function getEntryContext(id: string): {
  entry: SiteEntry
  category: SiteCategory
  parent: SiteEntry | null
} | null {
  const entry = entryById.get(id)
  if (!entry) return null
  const category = categoryById.get(entry.category)
  if (!category) return null
  const parent = entry.parent ? (entryById.get(entry.parent) ?? null) : null
  return { entry, category, parent }
}

/** 搜索索引（构建期生成，/search-index.json 静态输出）。 */
export interface SearchRecord {
  id: string
  n: string
  u: string
  c: string
  cz: string
  d: string
}

export function buildSearchIndex(): SearchRecord[] {
  return entries
    .filter((e) => e.kind === 'entry' && e.url)
    .map((e) => ({
      id: e.id,
      n: e.name ?? '',
      u: e.url ?? '',
      c: e.category,
      cz: categoryById.get(e.category)?.nameZh ?? '',
      d: (e.descZh ?? e.descEn).slice(0, 96),
    }))
}
