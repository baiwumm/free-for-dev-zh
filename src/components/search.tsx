'use client'

import { Command } from 'cmdk'
import Fuse from 'fuse.js'
import { Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/cn'
import type { SearchRecord } from '@/lib/entries'

/**
 * 全站搜索：cmdk 键盘交互 + Fuse.js 模糊匹配，索引在首次打开时懒加载
 * （/search-index.json，构建期生成，不启用 Fumadocs 内置搜索）。
 */
export function SearchButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)

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
          'flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200',
          className,
        )}
        aria-label="搜索（快捷键 Ctrl+K）"
      >
        <Search className="size-4" />
        <span className="hidden sm:inline">搜索…</span>
        <kbd className="hidden rounded border border-zinc-200 px-1 font-mono text-[10px] text-zinc-400 md:inline dark:border-zinc-700">
          Ctrl K
        </kbd>
      </button>
      {open && <SearchDialog onClose={() => setOpen(false)} />}
    </>
  )
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
    })
  }, [records])

  const results = useMemo(() => {
    const q = query.trim()
    if (!fuse || !records) return []
    if (!q) return records.slice(0, 30)
    return fuse.search(q, { limit: 30 }).map((r) => r.item)
  }, [fuse, records, query])

  const select = (record: SearchRecord) => {
    onClose()
    router.push(`/entry/${record.id}`)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]"
      role="dialog"
      aria-modal="true"
      aria-label="全站搜索"
    >
      <button
        type="button"
        aria-label="关闭搜索"
        className="absolute inset-0 cursor-default bg-zinc-950/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <Command shouldFilter={false} loop>
          <div className="flex items-center gap-2.5 border-b border-zinc-200 px-4 dark:border-zinc-800">
            <Search className="size-4 shrink-0 text-zinc-400" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="搜索服务名、描述或分类…"
              className="h-12 w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            />
            <kbd className="rounded border border-zinc-200 px-1.5 font-mono text-[10px] text-zinc-400 dark:border-zinc-700">
              Esc
            </kbd>
          </div>
          <Command.List className="max-h-[52vh] overflow-y-auto overscroll-contain p-2">
            {records === null && (
              <p className="px-3 py-6 text-center text-sm text-zinc-400">索引加载中…</p>
            )}
            {records !== null && results.length === 0 && (
              <Command.Empty className="px-3 py-6 text-center text-sm text-zinc-400">
                没有找到匹配的服务
              </Command.Empty>
            )}
            {results.map((record) => (
              <Command.Item
                key={record.id}
                value={record.id}
                onSelect={() => select(record)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 data-[selected=true]:bg-zinc-100 dark:data-[selected=true]:bg-zinc-900"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {record.n}
                    </span>
                    <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-px text-[10px] leading-4 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                      {record.cz}
                    </span>
                  </div>
                  {record.d !== '' && (
                    <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {record.d}
                    </p>
                  )}
                </div>
              </Command.Item>
            ))}
          </Command.List>
          <div className="flex items-center gap-3 border-t border-zinc-200 px-4 py-2 text-[11px] text-zinc-400 dark:border-zinc-800">
            <span>↑↓ 选择</span>
            <span>↵ 打开详情</span>
            <span>Esc 关闭</span>
          </div>
        </Command>
      </div>
    </div>
  )
}
