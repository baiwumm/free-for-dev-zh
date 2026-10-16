import Link from 'next/link'
import type { SiteCategory } from '@/lib/entries'

/**
 * 分类索引（目录式排版）：编号 + 中文名 + 引导点线 + 条目数 + 英文名。
 * 首页与 /docs 概览共用同一组件，保证两处索引完全一致。
 */
export function CategoryIndex({ categories }: { categories: SiteCategory[] }) {
  return (
    <ol className="columns-1 gap-x-14 lg:columns-2">
      {categories.map((c, i) => (
        <li key={c.id} className="break-inside-avoid">
          <Link
            href={`/docs/${c.id}`}
            className="group flex items-baseline gap-3 border-b border-fd-border/70 py-2.5"
          >
            <span className="w-7 shrink-0 text-xs tabular-nums text-fd-muted-foreground/80">
              {String(i + 1).padStart(2, '0')}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="truncate text-[15px] transition-colors group-hover:text-accent">
                  {c.nameZh}
                </span>
                <span
                  aria-hidden
                  className="min-w-4 flex-1 border-b border-dotted border-fd-border"
                />
                <span className="text-xs tabular-nums text-fd-muted-foreground">{c.count}</span>
              </span>
              <span className="block truncate text-xs text-fd-muted-foreground/80">{c.nameEn}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}
