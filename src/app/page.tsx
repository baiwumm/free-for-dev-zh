import { HomeLayout } from 'fumadocs-ui/layouts/home'
import { BookOpen } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Brand } from '@/components/brand'
import { CategoryIndex } from '@/components/category-index'
import { GithubIcon } from '@/components/icons'
import { SearchButton } from '@/components/search'
import { SiteFooter } from '@/components/site-footer'
import { categories, getRecentUpdates, siteMeta, stats } from '@/lib/entries'

const syncDate = siteMeta.synced_at.slice(0, 10)
const recent = getRecentUpdates()

export const metadata: Metadata = {
  alternates: { canonical: 'https://ffd.baiwumm.com/' },
  openGraph: { url: 'https://ffd.baiwumm.com/' },
}

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
        <h1 className="mt-4 text-4xl tracking-tight sm:text-5xl">免费开发资源</h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-fd-muted-foreground">
          {stats.categories} 个分类、{stats.services.toLocaleString('zh-CN')}{' '}
          项免费资源：云厂商额度、CI/CD、监控、数据库、邮件、DNS
          与更多开发者工具。中文描述为机器翻译，仅供参考。
        </p>
      </section>

      <section id="index" className="mx-auto w-full max-w-5xl scroll-mt-24 px-4 pb-6">
        <div className="flex items-baseline justify-between border-t border-fd-border pt-5 text-xs text-fd-muted-foreground">
          <h2 className="text-xs font-normal">全部分类</h2>
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

      <section className="mx-auto w-full max-w-5xl px-4 pb-4 pt-10">
        <h2 className="border-t border-fd-border pt-5 text-base tracking-tight">常见问题</h2>
        <dl className="mt-3 space-y-4 text-sm leading-relaxed">
          <div>
            <dt className="text-fd-foreground">这是什么站？</dt>
            <dd className="mt-1 text-fd-muted-foreground">
              ripienaar/free-for-dev 的中文镜像：把上游 README 里的 {stats.categories} 个分类、
              {stats.services.toLocaleString('zh-CN')}{' '}
              项开发者免费资源整理成可浏览、可搜索的静态站点，提供分类索引、双语对照与 RSS 订阅。
            </dd>
          </div>
          <div>
            <dt className="text-fd-foreground">数据多久更新一次？</dt>
            <dd className="mt-1 text-fd-muted-foreground">
              每天自动同步上游 README：拉取、比对差异、增量翻译后发布，当前页面标注的同步日期为{' '}
              {syncDate}，近 7 天变更见上方「全部分类」区域。
            </dd>
          </div>
          <div>
            <dt className="text-fd-foreground">中文翻译可靠吗？</dt>
            <dd className="mt-1 text-fd-muted-foreground">
              中文描述为机器翻译，用于快速判断服务用途；具体免费额度、地区限制与条款以服务官网和上游英文原文为准，详情页可展开英文对照。
            </dd>
          </div>
          <div>
            <dt className="text-fd-foreground">使用这个站点要付费或注册吗？</dt>
            <dd className="mt-1 text-fd-muted-foreground">
              站点本身免费、无需注册；收录服务是否需要信用卡或实名认证，取决于各服务自己的政策。
            </dd>
          </div>
          <div>
            <dt className="text-fd-foreground">收录标准是什么？</dt>
            <dd className="mt-1 text-fd-muted-foreground">
              只收录上游列出、对开发者提供免费额度或免费套餐的服务；上游移除的条目会在同步时下线。完整目录见{' '}
              <Link
                href="/docs"
                className="underline decoration-fd-border underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
              >
                分类索引
              </Link>
              。
            </dd>
          </div>
        </dl>
      </section>

      <SiteFooter />
    </HomeLayout>
  )
}
