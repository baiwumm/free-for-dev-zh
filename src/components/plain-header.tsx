import { BookOpen } from 'lucide-react'
import Link from 'next/link'
import { Brand } from '@/components/brand'
import { GithubIcon } from '@/components/icons'
import { SearchButton } from '@/components/search'

/** 非文档区（详情页 / 关于页 / 404）的轻量顶栏。 */
export function PlainHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-fd-border/80 bg-fd-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="transition-colors hover:text-accent">
          <Brand />
        </Link>
        <div className="flex items-center gap-2">
          <SearchButton className="md:w-64" />
          <a
            href="https://github.com/baiwumm/free-for-dev-zh"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub 仓库"
            className="rounded-md p-2 text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground"
          >
            <GithubIcon className="size-4" />
          </a>
          <Link
            href="/docs"
            aria-label="文档概览"
            className="rounded-md p-2 text-fd-muted-foreground transition-colors hover:bg-fd-muted hover:text-fd-foreground"
          >
            <BookOpen className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  )
}
