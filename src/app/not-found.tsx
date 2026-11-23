import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: '页面不存在',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-mono text-5xl tracking-tight text-fd-muted-foreground/50">404</p>
      <h1 className="text-lg tracking-tight">页面不存在</h1>
      <p className="text-sm text-fd-muted-foreground">页面不存在，或该条目已从上游移除。</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-md border border-fd-border px-4 text-sm text-fd-muted-foreground transition-colors hover:border-fd-foreground/30 hover:text-fd-foreground"
        >
          返回首页
        </Link>
        <Link
          href="/docs"
          className="inline-flex h-9 items-center rounded-md border border-fd-border px-4 text-sm text-fd-muted-foreground transition-colors hover:border-fd-foreground/30 hover:text-fd-foreground"
        >
          浏览分类索引
        </Link>
      </div>
    </main>
  )
}
