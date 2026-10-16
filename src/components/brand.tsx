/**
 * 站点品牌标识：F 字标（钴蓝底）+ 站点名，导航各处共用。
 * 与 public/favicon.svg 同一图形，内联渲染避免额外请求。
 */
export function Brand() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 64 64" aria-hidden className="size-5 shrink-0 rounded-[5px]">
        <rect width="64" height="64" rx="14" fill="#1d4aa3" />
        <rect x="18" y="14" width="9" height="36" rx="3.5" fill="#fcfcfd" />
        <rect x="18" y="14" width="27" height="9" rx="3.5" fill="#fcfcfd" />
        <rect x="18" y="29" width="20" height="9" rx="3.5" fill="#90b0ea" />
      </svg>
      <span>免费开发资源</span>
    </span>
  )
}
