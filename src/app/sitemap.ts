import type { MetadataRoute } from 'next'
import { categories, entryById } from '@/lib/entries'

export const dynamic = 'force-static'

const BASE = 'https://ffd.baiwumm.com'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, priority: 1, changeFrequency: 'daily' },
    { url: `${BASE}/about`, priority: 0.4 },
    ...categories.map((c) => ({
      url: `${BASE}/docs/${c.id}`,
      priority: 0.8,
      changeFrequency: 'daily' as const,
    })),
    ...[...entryById.keys()].map((id) => ({
      url: `${BASE}/entry/${id}`,
      priority: 0.6,
    })),
  ]
}
