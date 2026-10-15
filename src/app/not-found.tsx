import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-mono text-6xl font-bold text-emerald-600 dark:text-emerald-400">404</p>
      <p className="text-zinc-500 dark:text-zinc-400">页面不存在，或该条目已从上游移除。</p>
      <Link
        href="/"
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
      >
        返回首页
      </Link>
    </main>
  )
}
