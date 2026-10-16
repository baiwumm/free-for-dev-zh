/**
 * 首字母色板：纸墨体系中的低饱和度墨色/钴蓝，
 * 作为 favicon 加载失败时的降级色块，保持整站单色纪律。
 */
const PALETTE = [
  '#2b3038', // 墨
  '#3a4356', // 石板
  '#31497e', // 钴蓝
  '#46505f', // 石墨
  '#22262c', // 深墨
  '#546075', // 钢灰
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
