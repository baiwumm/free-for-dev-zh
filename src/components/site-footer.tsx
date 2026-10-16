import Link from 'next/link'
import { siteMeta } from '@/lib/entries'

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-fd-border text-[13px] text-fd-muted-foreground">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-8">
        <p>
          数据来自{' '}
          <a
            href="https://github.com/ripienaar/free-for-dev"
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-fd-border underline-offset-4 transition-colors hover:text-fd-foreground hover:decoration-accent"
          >
            ripienaar/free-for-dev
          </a>
          （每日自动同步；中文描述为机器翻译，仅供参考，以官网原文为准）。
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <Link
            href="/about"
            className="underline decoration-fd-border underline-offset-4 transition-colors hover:text-fd-foreground hover:decoration-accent"
          >
            关于本站
          </Link>
          <a
            href="https://github.com/baiwumm/free-for-dev-zh"
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-fd-border underline-offset-4 transition-colors hover:text-fd-foreground hover:decoration-accent"
          >
            GitHub
          </a>
          <span className="ml-auto text-xs tabular-nums text-fd-muted-foreground/70">
            上游 {siteMeta.upstream.commit_sha ? siteMeta.upstream.commit_sha.slice(0, 7) : '—'} ·
            同步于 {siteMeta.synced_at.slice(0, 10)}
          </span>
        </div>
      </div>
    </footer>
  )
}
