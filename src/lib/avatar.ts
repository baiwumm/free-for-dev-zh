const PALETTE = [
  '#0ea5e9',
  '#8b5cf6',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#ec4899',
  '#14b8a6',
  '#6366f1',
  '#f97316',
  '#84cc16',
]

/** 取名称首字符作为 letter avatar 文本（英文大写、中文原样）。 */
export function letterOf(name: string): string {
  const ch = [...name.trim()][0] ?? '?'
  return /[a-z]/i.test(ch) ? ch.toUpperCase() : ch
}

/** 名称哈希到固定调色板，保证同一服务颜色稳定。 */
export function colorOf(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0
  }
  return PALETTE[h % PALETTE.length]
}
