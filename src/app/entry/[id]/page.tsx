import { ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PlainHeader } from '@/components/plain-header'
import { RichText } from '@/components/rich-text'
import { ServiceIcon } from '@/components/service-icon'
import { SiteFooter } from '@/components/site-footer'
import { domainOf, entryById, getEntryContext } from '@/lib/entries'

export const dynamicParams = false

export function generateStaticParams() {
  return [...entryById.keys()].map((id) => ({ id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const ctx = getEntryContext(id)
  if (!ctx) return {}
  const { entry, category } = ctx
  return {
    title: `${entry.name} —— ${category.nameZh}`,
    description: entry.descZh ?? entry.descEn ?? undefined,
    alternates: { canonical: `/entry/${entry.id}` },
  }
}

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = getEntryContext(id)
  if (!ctx) notFound()
  const { entry, category, parent } = ctx
  const name = entry.name ?? ''
  const desc = entry.descZh ?? entry.descEn
  const domain = domainOf(entry.url)

  return (
    <>
      <PlainHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <nav
          className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-fd-muted-foreground"
          aria-label="面包屑"
        >
          <Link href="/" className="transition-colors hover:text-fd-foreground">
            首页
          </Link>
          <span aria-hidden>/</span>
          <Link
            href={`/docs/${category.id}`}
            className="transition-colors hover:text-fd-foreground"
          >
            {category.nameZh}
          </Link>
          {parent && (
            <>
              <span aria-hidden>/</span>
              <Link
                href={`/entry/${parent.id}`}
                className="transition-colors hover:text-fd-foreground"
              >
                {parent.name}
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-start gap-4">
          <ServiceIcon name={name} domain={domain} size={56} />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{name}</h1>
            {domain && <p className="mt-1 truncate text-sm text-fd-muted-foreground">{domain}</p>}
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-fd-border bg-fd-card p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-fd-muted-foreground">
            {entry.descZh ? '中文说明' : '说明（暂未翻译，以下为英文原文）'}
          </h2>
          <p className="mt-2.5 leading-relaxed text-fd-card-foreground">
            <RichText text={desc !== '' ? desc : '（该条目在上游没有文字说明）'} />
          </p>
          {entry.descZh && entry.descEn !== '' && (
            <details className="group mt-4 border-t border-fd-border pt-3">
              <summary className="cursor-pointer select-none text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground">
                查看英文原文
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
                <RichText text={entry.descEn} />
              </p>
            </details>
          )}
        </section>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {entry.url && (
            <a
              href={entry.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
            >
              访问官网
              <ExternalLink className="size-4" />
            </a>
          )}
          <a
            href={`https://github.com/ripienaar/free-for-dev#${category.id}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-xl border border-fd-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-fd-accent"
          >
            上游原始条目
            <ExternalLink className="size-4" />
          </a>
        </div>

        <p className="mt-5 text-xs text-fd-muted-foreground">
          收录于 {entry.firstSeen} · 最近更新 {entry.updatedAt} · 条目 ID{' '}
          <code className="font-mono">{entry.id}</code>
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
