const UNIT = {
  k: 1e3,
  m: 1e6,
  b: 1e9,
  million: 1e6,
  billion: 1e9,
  万: 1e4,
  亿: 1e8,
}

/**
 * 数字提取与归一化（DS-6 校验 1）：
 * - 去千分位、全角数字转半角；
 * - 欧式千分位（3.000 / 12.500 / 1.000.000）按整数解析，原文与译文同样归一，不受书写习惯影响；
 * - 单位等值：5 million <-> 5000000、500 万 <-> 5000000、1k <-> 1000；
 * - 单位字母后不允许紧跟其他字母（避免把 "100ms"、"500MB" 误判为单位）。
 */
export function extractNumbers(input) {
  const s = normalizeEuroThousands(fullWidthToHalf(input))
  const out = []
  const re = /(\d[\d,]*(?:\.\d+)?)(?:\s*(million|billion|k|m|b|万|亿)(?![a-zA-Z]))?/gi
  let match
  while ((match = re.exec(s)) !== null) {
    let value = Number.parseFloat(match[1].replace(/,/g, ''))
    const unit = match[2]?.toLowerCase()
    if (unit && Number.isFinite(value) && UNIT[unit] !== undefined) {
      value = value * UNIT[unit]
    }
    if (Number.isFinite(value)) out.push(formatNumber(value))
  }
  return out.sort()
}

function formatNumber(n) {
  if (Number.isInteger(n)) return String(n)
  return String(Number.parseFloat(n.toPrecision(12)))
}

/** markdown 链接目标提取（DS-6 校验 2）。 */
export function extractLinks(input) {
  const out = []
  const re = /\]\(([^)]+)\)/g
  let match
  while ((match = re.exec(input)) !== null) out.push(match[1].trim())
  return out.sort()
}

/**
 * 四项校验（DS-6）：数字集合、链接集合、长度比、坏输出（含拒答、服务名缺失）。
 * 返回问题列表，空数组为通过。
 */
export function validateTranslation(en, zh, options = {}) {
  const issues = []
  const translation = (zh ?? '').trim()
  if (!translation) return ['译文为空']
  if (/无法(完成)?翻译|不能翻译|cannot translate|unable to translate|as an ai/i.test(translation)) {
    issues.push('疑似拒答')
  }

  const sameMultiset = (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
  const enNums = extractNumbers(en)
  const zhNums = extractNumbers(translation)
  if (!sameMultiset(enNums, zhNums)) {
    issues.push(`数字不一致 [${enNums.join(',')}] vs [${zhNums.join(',')}]`)
  }

  const enLinks = extractLinks(en)
  const zhLinks = extractLinks(translation)
  if (!sameMultiset(enLinks, zhLinks)) {
    issues.push(`链接不一致 [${enLinks.join(',')}] vs [${zhLinks.join(',')}]`)
  }

  // 极短描述（<20 字符）的译文天然紧凑（如 "Compute" → "计算"），长度比不适用；
  // 下界放宽到 0.25，避免误伤「更用心地关注对你重要的事。」这类简练译文。
  const enText = en.trim()
  if (enText.length >= 20) {
    const ratio = translation.length / enText.length
    if (ratio < 0.25 || ratio > 1.5) {
      issues.push(`长度比异常 ${ratio.toFixed(2)}`)
    }
  }

  const name = options.name
  if (
    name &&
    new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(name)}([^\\p{L}\\p{N}]|$)`, 'iu').test(en) &&
    !translation.includes(name)
  ) {
    issues.push('服务名缺失')
  }

  return issues
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 欧式千分位（1.000 / 12.500 / 1.000.000）按整数解析；两侧（原文/译文）同样归一，保证等值比较一致。 */
function normalizeEuroThousands(s) {
  return s.replace(/\b\d{1,3}(?:\.\d{3})+\b/g, (m) => m.replace(/\./g, ''))
}

function fullWidthToHalf(s) {
  return s.replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
}
