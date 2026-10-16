import type { Metadata } from 'next'
import { CategoryIndex } from '@/components/category-index'
import { categories, siteMeta, stats } from '@/lib/entries'

const syncDate = siteMeta.synced_at.slice(0, 10)

export const metadata: Metadata = {
  title: '概览',
  description: `free-for-dev 中文版全部 ${stats.categories} 个分类的索引：${stats.services.toLocaleString('zh-CN')} 项面向开发者的免费资源，每日自动同步上游清单。`,
  alternates: { canonical: '/docs' },
}

export default function DocsOverviewPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-4 sm:pt-8">
      <header className="mb-4 border-b border-fd-border pb-5">
        <h1 className="text-2xl tracking-tight sm:text-3xl">概览</h1>
        <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
          全部 {stats.categories} 个分类、{stats.services.toLocaleString('zh-CN')}{' '}
          项免费资源；已翻译 {stats.translated.toLocaleString('zh-CN')}/
          {stats.total.toLocaleString('zh-CN')} 条（含备注），同步于 {syncDate}。
        </p>
      </header>
      <CategoryIndex categories={categories} />
    </div>
  )
}
