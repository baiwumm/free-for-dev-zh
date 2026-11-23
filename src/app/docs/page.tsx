import type { Metadata } from 'next'
import Link from 'next/link'
import { CategoryIndex } from '@/components/category-index'
import { categories, siteMeta, stats } from '@/lib/entries'

const syncDate = siteMeta.synced_at.slice(0, 10)

export const metadata: Metadata = {
  title: { absolute: '免费开发资源分类索引 · Free for Dev 中文版' },
  description: `free-for-dev 中文版完整分类索引：${stats.categories} 个分类、${stats.services.toLocaleString('zh-CN')} 项免费开发资源（含免费额度说明），每日自动同步上游清单，支持站内搜索与 RSS 订阅。`,
  alternates: { canonical: '/docs' },
  openGraph: { url: '/docs' },
}

export default function DocsOverviewPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-4 sm:pt-8">
      <header className="mb-6 border-b border-fd-border pb-5">
        <h1 className="text-2xl tracking-tight sm:text-3xl">分类索引</h1>
        <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
          全部 {stats.categories} 个分类、{stats.services.toLocaleString('zh-CN')}{' '}
          项免费资源；已翻译 {stats.translated.toLocaleString('zh-CN')}/
          {stats.total.toLocaleString('zh-CN')} 条（含备注），同步于 {syncDate}。
        </p>
      </header>

      <section className="mb-7">
        <h2 className="text-base tracking-tight">怎么用这个索引</h2>
        <ul className="mt-2.5 space-y-1.5 text-sm leading-relaxed text-fd-muted-foreground">
          <li>
            按分类进入：每个分类页列出该方向的全部服务，可用页内筛选按名称 / 描述 /
            域名快速缩小范围。
          </li>
          <li>
            全局搜索：任意页面按 <kbd className="rounded-sm border border-fd-border px-1.5">⌘K</kbd>{' '}
            或 <kbd className="rounded-sm border border-fd-border px-1.5">Ctrl+K</kbd>{' '}
            唤起命令面板，模糊匹配全部条目。
          </li>
          <li>
            订阅更新：
            <Link
              href="/feed.xml"
              className="underline decoration-fd-border underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
            >
              RSS
            </Link>{' '}
            提供最近更新的 50 条，首页另标注近 7 天新增 / 更新计数。
          </li>
        </ul>
      </section>

      <section className="mb-7">
        <h2 className="text-base tracking-tight">数据来源与更新</h2>
        <p className="mt-2.5 text-sm leading-relaxed text-fd-muted-foreground">
          内容来自{' '}
          <a
            href="https://github.com/ripienaar/free-for-dev"
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-fd-border underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
          >
            ripienaar/free-for-dev
          </a>{' '}
          的
          README：流水线每日拉取上游、比对差异并对新增或变更条目做增量翻译，中文描述为机器翻译，数字与配额请以服务官网为准。最近一次同步为{' '}
          {syncDate}。
        </p>
      </section>

      <h2 className="mb-3 text-base tracking-tight">全部分类</h2>
      <CategoryIndex categories={categories} />
    </div>
  )
}
