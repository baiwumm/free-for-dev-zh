'use client'

import { ExternalLink, Search } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { ExplorerItem } from '@/lib/entries'
import { RichText } from './rich-text'
import { ServiceIcon } from './service-icon'

/**
 * 分类页条目浏览器：页内即时筛选（名称/描述/域名，多关键词空格分隔取交集）。
 * 顶级条目正常展示，子条目与备注缩进挂在其父条目之下。
 */
export function CategoryExplorer({ items }: { items: ExplorerItem[] }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (terms.length === 0) return items
    return items.filter((item) => {
      const haystack = [item.name ?? '', item.descEn, item.descZh ?? '', item.domain ?? '']
        .join(' ')
        .toLowerCase()
      return terms.every((t) => haystack.includes(t))
    })
  }, [items, query])

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 mb-1 border-b border-fd-border/70 bg-fd-background/85 px-4 py-2.5 backdrop-blur">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fd-muted-foreground/70" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="在当前分类内筛选（名称 / 描述 / 域名）…"
            className="w-full rounded-md border border-fd-border bg-transparent py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-fd-muted-foreground/60 focus:border-accent focus:ring-2 focus:ring-accent/15"
            aria-label="筛选当前分类的条目"
          />
        </div>
        {query.trim() !== '' && (
          <p className="mt-1.5 px-0.5 text-xs tabular-nums text-fd-muted-foreground">
            匹配 {filtered.length} / {items.length} 条
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 border border-dashed border-fd-border px-4 py-10 text-center text-sm text-fd-muted-foreground">
          没有匹配的服务，换个关键词试试。
        </p>
      ) : (
        <ul>
          {filtered.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  )
}

function Row({ item }: { item: ExplorerItem }) {
  if (item.kind === 'note' || !item.id) {
    return (
      <li className="border-b border-fd-border/50 py-3 pl-8 sm:pl-12">
        <div className="flex items-start gap-2.5 text-sm text-fd-muted-foreground">
          <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-fd-border" />
          <p className="leading-relaxed">
            <RichText text={item.descZh ?? item.descEn} />
          </p>
        </div>
      </li>
    )
  }

  const name = item.name ?? ''
  const desc = item.descZh ?? item.descEn
  const untranslated = !item.descZh && item.descEn !== ''

  return (
    <li className={item.depth > 0 ? 'pl-8 sm:pl-12' : undefined}>
      <div className="group relative flex items-start gap-3 border-b border-fd-border/50 py-3 transition-colors hover:bg-fd-muted/40">
        <ServiceIcon name={name} domain={item.domain} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link
              href={`/entry/${item.id}`}
              className="truncate text-[15px] outline-none transition-colors group-hover:text-accent focus-visible:underline"
            >
              {name}
            </Link>
            {item.domain && (
              <span className="hidden truncate text-xs text-fd-muted-foreground/80 sm:inline">
                {item.domain}
              </span>
            )}
            {untranslated && (
              <span className="rounded-sm border border-fd-border px-1.5 py-px text-[10px] leading-4 text-fd-muted-foreground">
                未翻译
              </span>
            )}
          </div>
          {desc !== '' && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-fd-muted-foreground">
              <RichText text={desc} />
            </p>
          )}
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`打开 ${name} 官网（新标签页）`}
            className="relative z-10 mt-0.5 hidden rounded-md p-1.5 text-fd-muted-foreground opacity-0 transition-opacity hover:bg-fd-muted hover:text-fd-foreground group-hover:opacity-100 focus-visible:opacity-100 sm:block"
          >
            <ExternalLink className="size-4" />
          </a>
        )}
      </div>
    </li>
  )
}
