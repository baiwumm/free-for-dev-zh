import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { SearchButton } from '@/components/search'

/** 非文档区（详情页 / 关于页 / 404）的轻量顶栏。 */
export function PlainHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-fd-border bg-fd-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <ArrowLeft className="size-4" />
          免费开发资源
        </Link>
        <div className="flex items-center gap-2">
          <SearchButton />
          <a
            href="https://github.com/baiwumm/free-for-dev-zh"
            target="_blank"
            rel="noreferrer noopener"
            aria-label="GitHub 仓库"
            className="rounded-lg p-2 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
          >
            <ExternalLink className="size-4" />
          </a>
        </div>
      </div>
    </header>
  )
}
