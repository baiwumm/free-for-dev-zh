import { buildSearchIndex } from '@/lib/entries'

export const dynamic = 'force-static'

export function GET() {
  return new Response(JSON.stringify(buildSearchIndex()), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}
