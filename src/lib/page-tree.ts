import type * as PageTree from 'fumadocs-core/page-tree'
import { categories } from './entries'

/** 侧边栏即分类树：直接由 categories.json + entries.json 构建，不经过 MDX/codegen。 */
export const pageTree: PageTree.Root = {
  name: '免费开发资源',
  children: categories.map((c) => ({
    type: 'page',
    name: c.nameZh,
    url: `/docs/${c.id}`,
  })),
}
