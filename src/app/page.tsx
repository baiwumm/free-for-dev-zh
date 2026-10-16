import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { Brand } from '@/components/brand'
import { CategoryIndex } from '@/components/category-index'
import { GithubIcon } from '@/components/icons'
import { SearchButton } from '@/components/search'
import { SiteFooter } from '@/components/site-footer'
import { categories, getRecentUpdates, siteMeta, stats } from '@/lib/entries'

const syncDate = siteMeta.synced_at.slice(0, 10)
const recent = getRecentUpdates()

export default function HomePage() {
  return (
    <HomeLayout
      nav={{ title: <Brand />, url: '/' }}
      links={[
        { type: 'custom', on: 'all', children: <SearchButton className="w-full lg:w-64" /> },
        {
          type: 'icon',
          url: 'https://github.com/baiwumm/free-for-dev-zh',
          text: 'GitHub',
          label: 'GitHub 仓库',
          icon: <GithubIcon className="size-4" />,
          external: true,
          on: 'all',
        },
        {
          type: 'icon',
          url: '/docs',
          text: '文档概览',
          label: '文档概览',
          icon: <BookOpen className="size-4" />,
          on: 'all',
        },
        { type: 'main', text: '首页', url: '/', on: 'menu' },
        { type: 'main', text: '关于', url: '/about', on: 'menu' },
      ]}
      searchToggle={{ enabled: false }}
    >
      <section className="mx-auto w-full max-w-5xl px-4 pb-12 pt-16 sm:pt-24">
        <p className="text-sm text-fd-muted-foreground">
          <a
            href="https://github.com/ripienaar/free-for-dev"
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-fd-border underline-offset-4 transition-colors hover:decoration-accent"
          >
            ripienaar/free-for-dev
          </a>{' '}
          的中文镜像，每日自动同步。
        </p>
        <h1 className="mt-4 text-4xl tracking-tight sm:text-5xl">开发者的免费资源清单</h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-fd-muted-foreground">
          {stats.categories} 个分类、{stats.services.toLocaleString('zh-CN')}{' '}
          项免费资源：云厂商额度、CI/CD、监控、数据库、邮件、DNS
          与更多开发者工具。中文描述为机器翻译，仅供参考。
        </p>
      </section>

      <section id="index" className="mx-auto w-full max-w-5xl scroll-mt-24 px-4 pb-6">
        <div className="flex items-baseline justify-between border-t border-fd-border pt-5 text-xs text-fd-muted-foreground">
          <span>全部分类</span>
          <span className="tabular-nums">同步于 {syncDate}</span>
        </div>
        {recent.total > 0 && (
          <p className="mt-2 text-xs leading-6 text-fd-muted-foreground">
            近 7 天：新增 {recent.added.toLocaleString('zh-CN')} · 更新{' '}
            {recent.updated.toLocaleString('zh-CN')} ——{' '}
            {recent.items.map((e, i) => (
              <span key={e.id}>
                {i > 0 && '、'}
                <Link
                  href={`/entry/${e.id}`}
                  className="underline decoration-fd-border underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
                >
                  {e.name}
                </Link>
              </span>
            ))}
            {recent.total > recent.items.length && (
              <span className="tabular-nums">（共 {recent.total.toLocaleString('zh-CN')} 条）</span>
            )}
          </p>
        )}
        <div className="mt-1">
          <CategoryIndex categories={categories} />
        </div>
      </section>

      <SiteFooter />
    </HomeLayout>
  )
}
