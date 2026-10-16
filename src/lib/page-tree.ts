import type * as PageTree from 'fumadocs-core/page-tree'
import { categories } from './entries'

/** 侧边栏：概览 + 分类树，直接由 categories.json + entries.json 构建，不经过 MDX/codegen。 */
export const pageTree: PageTree.Root = {
  name: '免费开发资源',
  children: [
    { type: 'page', name: '概览', url: '/docs' },
    ...categories.map((c) => ({
      type: 'page' as const,
      name: c.nameZh,
      url: `/docs/${c.id}`,
    })),
  ],
}
