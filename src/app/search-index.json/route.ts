import { buildSearchIndex } from '@/lib/entries'

export const dynamic = 'force-static'

export function GET() {
  return new Response(JSON.stringify(buildSearchIndex()), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // 允许客户端抓取，但不进搜索引擎索引（索引体积大且无检索价值）
      'x-robots-tag': 'noindex',
    },
  })
}
