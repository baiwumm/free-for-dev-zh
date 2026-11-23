import { ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { PlainHeader } from '@/components/plain-header'
import { RichText } from '@/components/rich-text'
import { ServiceIcon } from '@/components/service-icon'
import { SiteFooter } from '@/components/site-footer'
import {
  domainOf,
  entryById,
  entryDescription,
  entryTitle,
  getEntryContext,
  getEntryNotes,
  getRelatedEntries,
} from '@/lib/entries'
import { breadcrumbList } from '@/lib/schema'

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
    title: entryTitle(entry, category),
    description: entryDescription(entry, category, getEntryNotes(entry.id).length),
    alternates: { canonical: `/entry/${entry.id}` },
    openGraph: { url: `/entry/${entry.id}` },
  }
}

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = getEntryContext(id)
  if (!ctx) notFound()
  const { entry, category, parent } = ctx
  const name = entry.name ?? ''
  const desc = entry.descZh ?? entry.descEn
  const untranslated = !entry.descZh && entry.descEn !== ''
  const domain = domainOf(entry.url)
  const notes = getEntryNotes(entry.id)
  const related = getRelatedEntries(entry.id)

  const crumbs = [
    { name: '首页', path: '/' },
    { name: category.nameZh, path: `/docs/${category.id}` },
    ...(parent ? [{ name: parent.name ?? '', path: `/entry/${parent.id}` }] : []),
    { name, path: `/entry/${entry.id}` },
  ]

  return (
    <>
      <JsonLd data={breadcrumbList(crumbs)} />
      <PlainHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <nav
          className="mb-6 flex flex-wrap items-center gap-1.5 text-[13px] text-fd-muted-foreground"
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
          <ServiceIcon name={name} domain={domain} size={48} />
          <div className="min-w-0">
            <h1 className="text-2xl tracking-tight sm:text-3xl">{name}</h1>
            {domain && <p className="mt-1 truncate text-sm text-fd-muted-foreground">{domain}</p>}
          </div>
        </div>

        <section className="mt-6 border-y border-fd-border py-5">
          <h2 className="text-xs text-fd-muted-foreground">
            {untranslated ? '说明（暂未翻译，以下为英文原文）' : '中文说明'}
          </h2>
          <p className="mt-2.5 leading-7 text-fd-foreground">
            {desc !== '' ? (
              <RichText text={desc} />
            ) : (
              <>
                上游没有为这个条目提供整体说明
                {notes.length > 0 ? '，免费额度明细见下方。' : '。'}
              </>
            )}
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

        {notes.length > 0 && (
          <section className="border-b border-fd-border py-5">
            <h2 className="text-xs text-fd-muted-foreground">免费额度明细</h2>
            <ul className="mt-2.5 space-y-2">
              {notes.map((note) => (
                <li key={note.id} className="flex items-start gap-2.5 text-sm leading-relaxed">
                  <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-fd-border" />
                  <span className="text-fd-muted-foreground">
                    <RichText text={note.descZh ?? note.descEn} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {entry.url && (
            <a
              href={entry.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-md bg-fd-foreground px-4 py-2.5 text-sm text-fd-background transition-opacity hover:opacity-90"
            >
              访问官网
              <ExternalLink className="size-4" />
            </a>
          )}
          <a
            href={`https://github.com/ripienaar/free-for-dev#${category.id}`}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 rounded-md border border-fd-border px-4 py-2.5 text-sm text-fd-muted-foreground transition-colors hover:border-fd-foreground/30 hover:text-fd-foreground"
          >
            上游原始条目
            <ExternalLink className="size-4" />
          </a>
        </div>

        <nav className="mt-8 border-t border-fd-border pt-5" aria-label="同类资源">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xs text-fd-muted-foreground">同类资源</h2>
            <Link
              href={`/docs/${category.id}`}
              className="text-xs text-fd-muted-foreground underline decoration-fd-border underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
            >
              {category.nameZh}全部 {category.count} 项
            </Link>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {related.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/entry/${item.id}`}
                  className="block truncate text-sm text-fd-foreground underline decoration-fd-border underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="mt-6 text-xs tabular-nums text-fd-muted-foreground/80">
          收录于 {entry.firstSeen} · 最近更新 {entry.updatedAt} · 条目 ID{' '}
          <code className="font-mono">{entry.id}</code>
        </p>
      </main>
      <SiteFooter />
    </>
  )
}
