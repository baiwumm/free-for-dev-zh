/**
 * DS-4 解析守卫：三道断言，任一触发即返回问题列表（调用方中止、不写任何数据）。
 * 1. 总量：active 条目数与上一版相比跌幅 > 10%；
 * 2. 分类级：单个分类（>= 5 条）跌幅 > 30%；
 * 3. 译文覆盖率：active 条目译文覆盖率较上一版下降 > 10 个百分点。
 * 首次运行（无上一版）直接通过。
 */
export function runGuard(previous, next) {
  const issues = []
  if (!previous) return issues

  const prevActive = previous.entries.filter((e) => e.status === 'active')
  const nextActive = next.entries.filter((e) => e.status === 'active')

  if (prevActive.length >= 50) {
    const drop = 1 - nextActive.length / prevActive.length
    if (drop > 0.1) {
      issues.push(
        `条目总数跌幅 ${(drop * 100).toFixed(1)}%（${prevActive.length} -> ${nextActive.length}），疑似上游格式漂移`,
      )
    }
  }

  const countByCat = (list) => {
    const m = new Map()
    for (const e of list) m.set(e.category, (m.get(e.category) ?? 0) + 1)
    return m
  }
  const prevCats = countByCat(prevActive)
  const nextCats = countByCat(nextActive)
  for (const [cat, prevCount] of prevCats) {
    if (prevCount < 5) continue
    const nextCount = nextCats.get(cat) ?? 0
    const drop = 1 - nextCount / prevCount
    if (drop > 0.3) {
      issues.push(`分类 ${cat} 跌幅 ${(drop * 100).toFixed(1)}%（${prevCount} -> ${nextCount}）`)
    }
  }

  const coverage = (list) => list.filter((e) => e.desc_zh).length / Math.max(1, list.length)
  const prevCoverage = coverage(prevActive)
  const nextCoverage = coverage(nextActive)
  if (prevCoverage - nextCoverage > 0.1) {
    issues.push(
      `译文覆盖率下降 ${(prevCoverage * 100).toFixed(1)}% -> ${(nextCoverage * 100).toFixed(1)}%`,
    )
  }

  return issues
}
