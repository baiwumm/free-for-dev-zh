/**
 * 站点品牌标识：索引光标 F 字标 + 站点名，导航各处共用。
 * 图形与 public/logo.svg（深墨底，浅色主题）/ public/logo-dark.svg（纸面底，深色主题）一致，
 * 内联渲染并按 .dark 切换配色，避免额外请求与主题切换时的闪烁。
 */
export function Brand() {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 360 360" aria-hidden className="size-5 shrink-0 rounded-[5px]">
        <rect width="360" height="360" rx="80" className="fill-[#0D1013] dark:fill-[#FCFCFD]" />
        <g className="fill-[#E3E5E7] dark:fill-[#15181E]">
          <rect x="112" y="100" width="44" height="160" rx="13" />
          <rect x="112" y="100" width="136" height="44" rx="13" />
          <rect x="112" y="162" width="84" height="44" rx="13" />
        </g>
        <rect
          x="212"
          y="166"
          width="36"
          height="36"
          rx="9"
          className="fill-[#90B0EA] dark:fill-[#1D4AA3]"
        />
      </svg>
      <span>免费开发资源</span>
    </span>
  )
}
