'use client'

import { Command } from 'cmdk'
import type { FuseResultMatch } from 'fuse.js'
import Fuse from 'fuse.js'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/cn'
import type { SearchRecord } from '@/lib/entries'

/**
 * 全站搜索：cmdk 键盘交互 + Fuse.js 模糊匹配，索引在首次打开时懒加载
 * （/search-index.json，构建期生成，不启用 Fumadocs 内置搜索）。
 * 快捷键按平台显示（macOS ⌘K / 其他 Ctrl+K），命中片段高亮。
 */
export function SearchButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent))
  }, [])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-2 rounded-md border border-fd-border bg-transparent px-3 py-1.5 text-sm text-fd-muted-foreground transition-colors hover:border-fd-foreground/30 hover:text-fd-foreground',
          className,
        )}
        aria-label={`搜索（快捷键 ${isMac ? '⌘K' : 'Ctrl+K'}）`}
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">搜索…</span>
        <kbd className="ml-auto hidden rounded-sm border border-fd-border px-1 font-mono text-[10px] text-fd-muted-foreground/80 md:inline">
          {isMac ? '⌘ K' : 'Ctrl K'}
        </kbd>
      </button>
      {open && createPortal(<SearchDialog onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}

interface SearchResult {
  item: SearchRecord
  matches: readonly FuseResultMatch[]
}

function SearchDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [records, setRecords] = useState<SearchRecord[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/search-index.json')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled) setRecords(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setRecords([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const fuse = useMemo(() => {
    if (!records) return null
    return new Fuse(records, {
      keys: [
        { name: 'n', weight: 2 },
        { name: 'd', weight: 1 },
        { name: 'cz', weight: 0.6 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
      minMatchCharLength: 1,
      includeMatches: true,
    })
  }, [records])

  const results = useMemo<SearchResult[]>(() => {
    if (!records) return []
    const q = query.trim()
    if (!q) return records.slice(0, 30).map((item) => ({ item, matches: [] }))
    if (!fuse) return []
    return fuse.search(q, { limit: 30 }).map((r) => ({ item: r.item, matches: r.matches ?? [] }))
  }, [fuse, records, query])

  const select = (record: SearchRecord) => {
    onClose()
    router.push(`/entry/${record.id}`)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="全站搜索"
    >
      <button
        type="button"
        aria-label="关闭搜索"
        className="absolute inset-0 cursor-default bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-lg border border-fd-border bg-fd-popover shadow-lg">
        <Command shouldFilter={false} loop>
          <div className="flex items-center gap-2.5 border-b border-fd-border px-4">
            <Search className="size-4 shrink-0 text-fd-muted-foreground/70" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="搜索服务名、描述或分类…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-fd-muted-foreground/60"
            />
            <kbd className="rounded-sm border border-fd-border px-1.5 font-mono text-[10px] text-fd-muted-foreground/80">
              Esc
            </kbd>
          </div>
          <Command.List className="max-h-[52vh] overflow-y-auto overscroll-contain p-2">
            {records === null && (
              <p className="px-3 py-6 text-center text-sm text-fd-muted-foreground/70">
                索引加载中…
              </p>
            )}
            {records !== null && results.length === 0 && (
              <Command.Empty className="px-3 py-6 text-center text-sm text-fd-muted-foreground/70">
                没有找到匹配的服务
              </Command.Empty>
            )}
            {results.map(({ item: record, matches }) => (
              <Command.Item
                key={record.id}
                value={record.id}
                onSelect={() => select(record)}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 data-[selected=true]:bg-fd-muted"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-fd-foreground">
                      <Highlight text={record.n} match={findMatch(matches, 'n')} />
                    </span>
                    <span className="shrink-0 rounded-sm bg-fd-muted px-1.5 py-px text-[10px] leading-4 text-fd-muted-foreground">
                      {record.cz}
                    </span>
                  </div>
                  {record.d !== '' && (
                    <p className="mt-0.5 truncate text-xs text-fd-muted-foreground">
                      <Highlight text={record.d} match={findMatch(matches, 'd')} />
                    </p>
                  )}
                </div>
              </Command.Item>
            ))}
          </Command.List>
          <div className="flex items-center gap-3 border-t border-fd-border px-4 py-2 text-[11px] text-fd-muted-foreground/70">
            <span>↑↓ 选择</span>
            <span>↵ 打开详情</span>
            <span>Esc 关闭</span>
          </div>
        </Command>
      </div>
    </div>
  )
}

function findMatch(matches: readonly FuseResultMatch[], key: string): FuseResultMatch | undefined {
  return matches.find((m) => m.key === key)
}

/** 命中片段高亮：Fuse 匹配区间（重叠区间自动跳过，无匹配时原样输出）。 */
function Highlight({ text, match }: { text: string; match?: FuseResultMatch }) {
  if (!match || match.indices.length === 0) return <>{text}</>
  const parts: ReactNode[] = []
  let last = 0
  for (const [start, end] of [...match.indices].sort((a, b) => a[0] - b[0])) {
    if (start < last) continue
    if (start > last) parts.push(text.slice(last, start))
    parts.push(
      <mark key={start} className="rounded-[2px] bg-accent/15 text-inherit">
        {text.slice(start, end + 1)}
      </mark>,
    )
    last = end + 1
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}
