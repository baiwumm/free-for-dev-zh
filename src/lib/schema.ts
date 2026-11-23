import type { SiteCategory } from './entries'

export const SITE_URL = 'https://ffd.baiwumm.com'
export const REPO_URL = 'https://github.com/baiwumm/free-for-dev-zh'
const ORG_ID = `${SITE_URL}/#organization`
const WEBSITE_ID = `${SITE_URL}/#website`

/** 根布局：Organization + WebSite 各一次，供其他页面 `isPartOf` 引用。 */
export function siteGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': ORG_ID,
        name: '免费开发资源',
        url: SITE_URL,
        sameAs: [REPO_URL, 'https://github.com/ripienaar/free-for-dev'],
      },
      {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        name: '免费开发资源',
        alternateName: 'Free for Dev 中文版',
        url: SITE_URL,
        inLanguage: 'zh-CN',
        description: 'ripienaar/free-for-dev 的中文版，每日自动同步与增量翻译。',
        publisher: { '@id': ORG_ID },
      },
    ],
  }
}

export type Crumb = { name: string; path: string }

/** 详情页面包屑：首页 → 分类 →（父条目）→ 当前条目。 */
export function breadcrumbList(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  }
}

/** 分类页：CollectionPage + ItemList（列出该分类全部链接条目）。 */
export function categoryCollection(
  category: SiteCategory,
  entries: { id: string; name: string | null }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.nameZh}（${category.nameEn}）`,
    url: `${SITE_URL}/docs/${category.id}`,
    inLanguage: 'zh-CN',
    isPartOf: { '@id': WEBSITE_ID },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: entries.length,
      itemListElement: entries.map((entry, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: entry.name,
        url: `${SITE_URL}/entry/${entry.id}`,
      })),
    },
  }
}
