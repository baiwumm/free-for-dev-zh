import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-mono text-5xl tracking-tight text-fd-muted-foreground/50">404</p>
      <p className="text-sm text-fd-muted-foreground">页面不存在，或该条目已从上游移除。</p>
      <Link
        href="/"
        className="mt-2 inline-flex h-9 items-center rounded-md border border-fd-border px-4 text-sm text-fd-muted-foreground transition-colors hover:border-fd-foreground/30 hover:text-fd-foreground"
      >
        返回首页
      </Link>
    </main>
  )
}
