import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CategoryExplorer } from '@/components/category-explorer'
import { categories, categoryById, getExplorerItems } from '@/lib/entries'

export const dynamicParams = false

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const cat = categoryById.get(category)
  if (!cat) return {}
  return {
    title: `${cat.nameZh} · ${cat.nameEn}`,
    description: `free-for-dev 中文版：${cat.nameZh}（${cat.nameEn}）分类下收录了 ${cat.count} 个免费服务 / 资源，每日自动同步上游清单。`,
    alternates: { canonical: `/docs/${cat.id}` },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const cat = categoryById.get(category)
  const items = getExplorerItems(category)
  if (!cat || !items) notFound()

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-6 pt-4 sm:pt-8">
      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{cat.nameZh}</h1>
        <p className="mt-1 text-sm text-fd-muted-foreground">
          {cat.nameEn} · 共 {cat.count} 个服务
        </p>
      </header>
      <CategoryExplorer items={items} />
    </div>
  )
}
