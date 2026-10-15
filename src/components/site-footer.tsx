import Link from 'next/link'
import { siteMeta } from '@/lib/entries'

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-zinc-200 py-10 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4">
        <p>
          数据来自{' '}
          <a
            href="https://github.com/ripienaar/free-for-dev"
            target="_blank"
            rel="noreferrer noopener"
            className="text-zinc-700 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-500 dark:text-zinc-300 dark:decoration-zinc-600"
          >
            ripienaar/free-for-dev
          </a>
          （每日自动同步；中文描述为机器翻译，仅作参考，以原文为准）。
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link
            href="/about"
            className="transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            关于本站
          </Link>
          <a
            href="https://github.com/baiwumm/free-for-dev-zh"
            target="_blank"
            rel="noreferrer noopener"
            className="transition-colors hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            GitHub
          </a>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            上游 {siteMeta.upstream.commit_sha ? siteMeta.upstream.commit_sha.slice(0, 7) : '—'} ·
            同步于 {siteMeta.synced_at.slice(0, 10)}
          </span>
        </div>
      </div>
    </footer>
  )
}
