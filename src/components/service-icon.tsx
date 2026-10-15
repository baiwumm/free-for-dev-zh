'use client'

import { useState } from 'react'
import { LetterAvatar } from './letter-avatar'

/**
 * 服务图标：优先尝试对方站点的 favicon.ico（懒加载、不发送 referrer），
 * 加载失败自动降级为首字母色块，保证布局稳定、不出现破图。
 */
export function ServiceIcon({
  name,
  domain,
  size = 36,
}: {
  name: string
  domain: string | null
  size?: number
}) {
  const [failed, setFailed] = useState(!domain)

  if (failed || !domain) {
    return <LetterAvatar name={name} size={size} />
  }

  return (
    // biome-ignore lint/performance/noImgElement: 站点为静态导出，favicon 来自外部域名，无需 next/image 优化
    <img
      src={`https://${domain}/favicon.ico`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="shrink-0 rounded-lg border border-zinc-200/60 bg-white object-contain p-1 dark:border-zinc-700/60 dark:bg-zinc-900"
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  )
}
