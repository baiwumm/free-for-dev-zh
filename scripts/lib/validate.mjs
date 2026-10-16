const UNIT = {
  k: 1e3,
  m: 1e6,
  b: 1e9,
  million: 1e6,
  billion: 1e9,
  万: 1e4,
  亿: 1e8,
}

const WORD_ONES = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
}
const WORD_TENS = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
}
const WORD_BIG = { thousand: 1e3, million: 1e6, billion: 1e9 }

// 汉字数字（DS-6 校验 1）：与英文数词对称归一，如 两千五百 → 2500、五万 → 50000
const CJK_DIGITS = {
  〇: 0,
  零: 0,
  一: 1,
  二: 2,
  两: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
}
const CJK_UNITS = { 十: 10, 百: 100, 千: 1000, 万: 1e4, 亿: 1e8 }
/** 近似表达前缀（数千 / 数百万 / 约十万）不解析为精确数字 */
const CJK_APPROX_PREFIX = '数几约'

/**
 * 数字提取与归一化（DS-6 校验 1）：
 * - 去千分位、全角数字转半角；
 * - 欧式千分位（3.000）与空格千分位（10, 000）按整数解析，原文与译文同样归一、不受书写习惯影响；
 * - 单位等值：5 million <-> 5000000、500 万 <-> 5000000、1k <-> 1000；
 * - 英文数词换算（nine -> 9、five hundred -> 500、seven billion -> 7000000000、twenty-four -> 24）；
 * - 序数词（3rd-party 的 3rd）不提取，避免与「第三方」这类中文惯用表达误报；
 * - 单位字母后不允许紧跟其他字母（避免把 "100ms"、"500MB" 误判为单位）。
 */
export function extractNumbers(input) {
  const s = normalizeThousands(fullWidthToHalf(input))
  const out = []
  const re =
    /(\d[\d,]*(?:\.\d+)?)(?:\s*(million|billion|k|m|b|万|亿)(?![a-zA-Z]))?(?!(?:st|nd|rd|th)\b)/gi
  let match
  while ((match = re.exec(s)) !== null) {
    let value = Number.parseFloat(match[1].replace(/,/g, ''))
    const unit = match[2]?.toLowerCase()
    if (unit && Number.isFinite(value) && UNIT[unit] !== undefined) {
      value = value * UNIT[unit]
    }
    if (Number.isFinite(value)) out.push(formatNumber(value))
  }
  for (const value of extractWordNumbers(s)) out.push(formatNumber(value))
  for (const value of extractCjkNumbers(s)) out.push(formatNumber(value))
  return out.sort()
}

/** 英文数词换算；词不连续（被其他单词打断）时分段结算，避免跨句累加。 */
function extractWordNumbers(s) {
  const out = []
  let current = 0
  let total = 0
  let matched = 0
  const flush = () => {
    if (matched > 0 && total + current > 0) out.push(total + current)
    current = 0
    total = 0
    matched = 0
  }
  for (const token of s.toLowerCase().split(/[^a-z]+/)) {
    if (!token) continue
    if (WORD_ONES[token] !== undefined) {
      current += WORD_ONES[token]
      matched += 1
    } else if (WORD_TENS[token] !== undefined) {
      current += WORD_TENS[token]
      matched += 1
    } else if (token === 'hundred') {
      current = (current || 1) * 100
      matched += 1
    } else if (WORD_BIG[token] !== undefined) {
      // 裸的 million/billion/thousand（前面没有数词，如 "5 million" 中的 million）不重复计数
      if (current === 0 && total === 0) continue
      total += current * WORD_BIG[token]
      current = 0
      matched += 1
    } else {
      flush()
    }
  }
  flush()
  return out
}

/** 提取汉字数字：跳过近似表达（数 / 几 / 约 前缀）与提示性单字单位。 */
function extractCjkNumbers(s) {
  const out = []
  const re = /[零〇一二三四五六七八九十百千万亿两]+/g
  let match
  while ((match = re.exec(s)) !== null) {
    const prev = s[match.index - 1] ?? ''
    if (prev && CJK_APPROX_PREFIX.includes(prev)) continue
    const value = parseCjkRun(match[0])
    if (value !== null) out.push(value)
  }
  return out
}

/**
 * 解析单个汉字数字串：
 * - 两千五百 → 2500、五万 → 50000、十万 → 100000；
 * - 单字单位（「200 万」的残留「万」、「数千」的「千」）与无单位多字枚举（「一二」）不解析；
 * - 含两个量级单位（「万亿」）不解析，避免层级歧义。
 */
function parseCjkRun(run) {
  if (/[万亿].*[万亿]/.test(run)) return null
  if (!/[十百千万亿]/.test(run)) return run.length === 1 ? CJK_DIGITS[run] : null
  if (run.length === 1) return null
  let total = 0
  let section = 0
  let digit = null
  for (const ch of run) {
    if (CJK_DIGITS[ch] !== undefined) {
      digit = CJK_DIGITS[ch]
      continue
    }
    const unit = CJK_UNITS[ch]
    if (unit < 1e4) {
      section += (digit ?? 1) * unit
    } else {
      section = (section + (digit ?? (section > 0 ? 0 : 1))) * unit
      total += section
      section = 0
    }
    digit = null
  }
  return total + section + (digit ?? 0)
}

function formatNumber(n) {
  if (Number.isInteger(n)) return String(n)
  return String(Number.parseFloat(n.toPrecision(12)))
}

/** 多重集合相等（数组已排序）。 */
function sameMultiset(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i])
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

  // 大数（>12）做严格集合比对：原文里的配额/数字必须在译文出现、译文中也不允许凭空多出大数；
  // 小数（≤12）常以中文数字 / 量词形式表达（one -> 一台、nine -> 九个），不做强制一致要求。
  const enNums = new Set(extractNumbers(en))
  const zhNums = new Set(extractNumbers(translation))
  const big = (n) => Number(n) > 12
  const missing = [...enNums].filter((n) => big(n) && !zhNums.has(n))
  const extra = [...zhNums].filter((n) => big(n) && !enNums.has(n))
  if (missing.length > 0 || extra.length > 0) {
    issues.push(`数字不一致 缺[${missing.join(',')}] 多[${extra.join(',')}]`)
  }

  const enLinks = extractLinks(en)
  const zhLinks = extractLinks(translation)
  if (!sameMultiset(enLinks, zhLinks)) {
    issues.push(`链接不一致 [${enLinks.join(',')}] vs [${zhLinks.join(',')}]`)
  }

  // 长度比：仅对 ≥30 字符的原文生效（更短的标签类描述译文天然紧凑），下界 0.2。
  const enText = en.trim()
  if (enText.length >= 30) {
    const ratio = translation.length / enText.length
    if (ratio < 0.2 || ratio > 1.5) {
      issues.push(`长度比异常 ${ratio.toFixed(2)}`)
    }
  }

  const name = options.name
  if (
    name &&
    isBrandLike(name) &&
    new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(name)}([^\\p{L}\\p{N}]|$)`, 'iu').test(en) &&
    !translation.toLowerCase().includes(name.toLowerCase())
  ) {
    issues.push('服务名缺失')
  }

  return issues
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 欧式千分位（1.000 / 1.000.000）与空格千分位（10, 000）按整数解析；两侧（原文/译文）同样归一，保证等值比较一致。 */
function normalizeThousands(s) {
  return s
    .replace(/\b\d{1,3}(?:\.\d{3})+\b/g, (m) => m.replace(/\./g, ''))
    .replace(/\b\d{1,3}(?:,\s\d{3})+\b/g, (m) => m.replace(/,\s/g, ''))
}

/**
 * 名称是否具备品牌特征（数字/点/连字符/驼峰，如 MediaWorkbench.ai、BudiBase、OpenAI）；
 * 通用词名称（Surveys、Storage、Financial Data）与缩写词（IP、API、DB、JSON）不强制保留英文，避免误判。
 */
function isBrandLike(name) {
  return /[0-9._+-]/.test(name) || /[a-z][A-Z]/.test(name)
}

function fullWidthToHalf(s) {
  return s.replace(/[\uFF10-\uFF19]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xfee0))
}
