import { HomeLayout } from 'fumadocs-ui/layouts/home'
import Link from 'next/link'
import { SearchButton } from '@/components/search'
import { SiteFooter } from '@/components/site-footer'
import { categories, siteMeta, stats } from '@/lib/entries'

const formattedDate = siteMeta.synced_at.slice(0, 10)

export default function HomePage() {
  return (
    <HomeLayout
      nav={{ title: <span className="font-semibold">免费开发资源</span>, url: '/' }}
      links={[
        { type: 'custom', on: 'all', children: <SearchButton /> },
        { type: 'main', text: '首页', url: '/', on: 'menu' },
        { type: 'main', text: '关于', url: '/about', on: 'menu' },
      ]}
      githubUrl="https://github.com/baiwumm/free-for-dev-zh"
      searchToggle={{ enabled: false }}
    >
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-12rem] size-[34rem] -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/10" />
          <div className="absolute right-[-8rem] top-24 size-[22rem] rounded-full bg-teal-400/15 blur-3xl dark:bg-teal-500/10" />
        </div>
        <div className="mx-auto max-w-5xl px-4 pb-14 pt-16 text-center sm:pt-24">
          <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-600/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            每日自动同步 ripienaar/free-for-dev
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">开发者的免费资源清单</h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-fd-muted-foreground">
            {categories.length} 个分类、{stats.services.toLocaleString('zh-CN')}
            个免费服务：云厂商免费额度、CI/CD、监控、数据库、邮件、DNS……
            <br className="hidden sm:block" />
            中文整理，支持一键搜索。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <SearchButton className="h-11 rounded-xl px-5 text-base" />
            <Link
              href="#categories"
              className="inline-flex h-11 items-center rounded-xl border border-fd-border bg-fd-card px-5 text-base font-medium transition-colors hover:bg-fd-accent"
            >
              浏览分类
            </Link>
          </div>
          <dl className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-3">
            <Stat label="免费服务" value={stats.services.toLocaleString('zh-CN')} />
            <Stat label="分类" value={String(stats.categories)} />
            <Stat label="同步至" value={formattedDate} />
          </dl>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-6">
        <h2 className="mb-4 text-lg font-semibold">全部分类</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/docs/${c.id}`}
              className="group rounded-xl border border-fd-border bg-fd-card p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-md dark:hover:border-emerald-400/40"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-fd-card-foreground">{c.nameZh}</span>
                <span className="shrink-0 rounded-full bg-fd-muted px-2 py-0.5 text-xs text-fd-muted-foreground">
                  {c.count}
                </span>
              </div>
              <p className="mt-1 truncate text-xs text-fd-muted-foreground">{c.nameEn}</p>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </HomeLayout>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-fd-border bg-fd-card px-3 py-4">
      <dd className="text-xl font-bold text-fd-card-foreground sm:text-2xl">{value}</dd>
      <dt className="mt-1 text-xs text-fd-muted-foreground">{label}</dt>
    </div>
  )
}
