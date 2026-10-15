import type { ReactNode } from 'react'

/**
 * 轻量 markdown 渲染：仅支持描述文本中实际出现的三种行内语法
 * （[文字](链接)、`代码`、**加粗**），其余按纯文本转义渲染，不引入 MDX。
 */
export function RichText({ text, linkClassName }: { text: string; linkClassName?: string }) {
  const tokenRe = /\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*\*([^*]+)\*\*/g
  const nodes: ReactNode[] = []
  let last = 0
  let key = 0
  let match: RegExpExecArray | null

  while ((match = tokenRe.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    if (match[1] != null && match[2] != null) {
      nodes.push(
        <a
          key={key++}
          href={match[2]}
          target="_blank"
          rel="noreferrer noopener"
          className={
            linkClassName ??
            'text-emerald-700 underline decoration-emerald-600/30 underline-offset-2 hover:decoration-emerald-600 dark:text-emerald-400'
          }
        >
          {match[1]}
        </a>,
      )
    } else if (match[3] != null) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] dark:bg-zinc-800"
        >
          {match[3]}
        </code>,
      )
    } else if (match[4] != null) {
      nodes.push(<strong key={key++}>{match[4]}</strong>)
    }
    last = match.index + match[0].length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return <>{nodes}</>
}
