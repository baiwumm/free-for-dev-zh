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
      <div className="sticky top-0 z-10 -mx-2 mb-3 bg-white/85 px-2 py-2 backdrop-blur dark:bg-zinc-950/85">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="在当前分类内筛选（名称 / 描述 / 域名）…"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            aria-label="筛选当前分类的条目"
          />
        </div>
        {query.trim() !== '' && (
          <p className="mt-1.5 px-1 text-xs text-zinc-500 dark:text-zinc-400">
            匹配 {filtered.length} / {items.length} 条
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          没有匹配的服务，换个关键词试试。
        </p>
      ) : (
        <ul className="space-y-1">
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
      <li className="ml-8 sm:ml-12">
        <div className="flex items-start gap-2.5 px-3 py-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600" />
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
    <li className={item.depth > 0 ? 'ml-8 sm:ml-12' : undefined}>
      <div className="group relative flex items-start gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-zinc-200 hover:bg-zinc-50 dark:hover:border-zinc-800 dark:hover:bg-zinc-900">
        <ServiceIcon name={name} domain={item.domain} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link
              href={`/entry/${item.id}`}
              className="truncate font-medium text-zinc-900 outline-none after:absolute after:inset-0 focus-visible:underline dark:text-zinc-100"
            >
              {name}
            </Link>
            {item.domain && (
              <span className="hidden truncate text-xs text-zinc-400 sm:inline dark:text-zinc-500">
                {item.domain}
              </span>
            )}
            {untranslated && (
              <span className="rounded-full bg-amber-100 px-1.5 py-px text-[10px] leading-4 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                未翻译
              </span>
            )}
          </div>
          {desc !== '' && (
            <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
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
            className="relative z-10 mt-0.5 hidden rounded-md p-1.5 text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-200/60 hover:text-zinc-600 group-hover:opacity-100 focus-visible:opacity-100 sm:block dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <ExternalLink className="size-4" />
          </a>
        )}
      </div>
    </li>
  )
}
