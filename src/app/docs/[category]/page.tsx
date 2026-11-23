import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CategoryExplorer } from '@/components/category-explorer'
import { JsonLd } from '@/components/json-ld'
import {
  categories,
  categoryById,
  categoryDescription,
  categoryTitle,
  getExplorerItems,
  siteMeta,
} from '@/lib/entries'
import { categoryCollection } from '@/lib/schema'

export const dynamicParams = false

const syncDate = siteMeta.synced_at.slice(0, 10)

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
    title: categoryTitle(cat),
    description: categoryDescription(cat),
    alternates: { canonical: `/docs/${cat.id}` },
    openGraph: { url: `/docs/${cat.id}` },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params
  const cat = categoryById.get(category)
  const items = getExplorerItems(category)
  if (!cat || !items) notFound()

  const index = categories.findIndex((c) => c.id === cat.id)
  const prev = index > 0 ? categories[index - 1] : null
  const next = index < categories.length - 1 ? categories[index + 1] : null
  const linkable = items.filter((item) => item.kind === 'entry' && item.id)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-6 pt-4 sm:pt-8">
      <JsonLd data={categoryCollection(cat, linkable)} />
      <header className="mb-4">
        <h1 className="text-2xl tracking-tight sm:text-3xl">{cat.nameZh}</h1>
        <p className="mt-1.5 text-sm text-fd-muted-foreground">
          {cat.nameEn}，共 {cat.count} 项资源
        </p>
        <p className="mt-3 text-sm leading-relaxed text-fd-muted-foreground">
          「{cat.nameZh}」分类收录 {cat.count}{' '}
          个提供免费额度的服务与资源，中文说明为主、英文原文可展开对照；数据同步于 {syncDate}
          ，来源为{' '}
          <a
            href="https://github.com/ripienaar/free-for-dev"
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-fd-border underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
          >
            ripienaar/free-for-dev
          </a>
          。
        </p>
      </header>

      <h2 className="sr-only">{cat.nameZh}全部条目</h2>
      <CategoryExplorer items={items} />

      <nav
        className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-fd-border pt-4 text-sm"
        aria-label="分类导航"
      >
        {prev ? (
          <Link
            href={`/docs/${prev.id}`}
            className="max-w-[45%] truncate text-fd-muted-foreground transition-colors hover:text-accent"
          >
            ← {prev.nameZh}
          </Link>
        ) : (
          <span />
        )}
        <Link
          href="/docs"
          className="text-fd-muted-foreground underline decoration-fd-border underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
        >
          全部分类
        </Link>
        {next ? (
          <Link
            href={`/docs/${next.id}`}
            className="max-w-[45%] truncate text-right text-fd-muted-foreground transition-colors hover:text-accent"
          >
            {next.nameZh} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  )
}
