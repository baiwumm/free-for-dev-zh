import { categoryById, entryById, siteMeta, stats } from '@/lib/entries'

export const dynamic = 'force-static'

const BASE = 'https://ffd.baiwumm.com'
const MAX_ITEMS = 50

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function rfc822(date: string): string {
  return new Date(`${date.slice(0, 10)}T00:00:00Z`).toUTCString()
}

/**
 * RSS 2.0 订阅源：最近更新的 50 条条目（构建期静态产出）。
 * 页脚提供入口，根布局注入 <link rel="alternate"> 供订阅器自动发现。
 */
export function GET() {
  const items = [...entryById.values()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_ITEMS)

  const itemsXml = items
    .map((e) => {
      const name = e.name ?? e.id
      const category = categoryById.get(e.category)?.nameZh ?? e.category
      const link = `${BASE}/entry/${e.id}`
      const desc = e.descZh ?? e.descEn
      return `    <item>
      <title>${escapeXml(`${name} —— ${category}`)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${rfc822(e.updatedAt)}</pubDate>
      <description>${escapeXml(desc === '' ? `${name}（上游未提供描述）` : desc)}</description>
    </item>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>开发者的免费资源清单 · Free for Dev 中文版</title>
    <link>${BASE}/</link>
    <description>ripienaar/free-for-dev 的中文版：${stats.categories} 个分类、${stats.services} 项免费开发者资源，每日自动同步与增量翻译。</description>
    <language>zh-cn</language>
    <lastBuildDate>${rfc822(siteMeta.synced_at)}</lastBuildDate>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>
`

  return new Response(xml, {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  })
}
