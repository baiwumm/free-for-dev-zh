import type { MetadataRoute } from 'next'
import { categories, entryById, siteMeta } from '@/lib/entries'

export const dynamic = 'force-static'

const BASE = 'https://ffd.baiwumm.com'
const syncedAt = siteMeta.synced_at.slice(0, 10)

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, priority: 1, changeFrequency: 'daily', lastModified: syncedAt },
    { url: `${BASE}/about`, priority: 0.4 },
    { url: `${BASE}/docs`, priority: 0.6, changeFrequency: 'weekly', lastModified: syncedAt },
    ...categories.map((c) => ({
      url: `${BASE}/docs/${c.id}`,
      priority: 0.8,
      changeFrequency: 'daily' as const,
      lastModified: syncedAt,
    })),
    ...[...entryById.values()].map((e) => ({
      url: `${BASE}/entry/${e.id}`,
      priority: 0.6,
      lastModified: e.updatedAt,
    })),
  ]
}
