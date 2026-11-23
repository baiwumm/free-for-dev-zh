import type { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 搜索索引体积大且无独立检索价值；静态导出无法输出响应头，用 robots 兜底
      disallow: ['/search-index.json'],
    },
    sitemap: 'https://ffd.baiwumm.com/sitemap.xml',
  }
}
