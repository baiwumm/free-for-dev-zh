#!/usr/bin/env node
/**
 * 按站点实际用字重新生成字体子集（`pnpm fonts`）。
 *
 * 源字：assets/fonts/maple-mono-cn-gb2312.woff2（GB2312 + ASCII + 常用标点，≈1.7MB）
 * 产物：public/fonts/maple-mono-cn-regular.woff2（实际用字，≈0.3MB）
 *
 * 用字集合 = data/*.json 全部文本 + src/ 下 .ts/.tsx/.css 全部文本 + 固定标点范围。
 * 依赖本机 fonttools（pip install "fonttools[woff]"）：优先调用 pyftsubset，
 * 找不到时回退 `python -m fontTools.subset`。
 *
 * 产物字节变化时自动把 src/app/globals.css 中字体 URL 的 ?v=YYYYMMDD 更新为
 * 当天日期——/fonts/* 走强缓存 immutable（EdgeOne Pages 控制台配置），靠该版本号让旧访客换新。
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const sourceFont = join(root, 'assets', 'fonts', 'maple-mono-cn-gb2312.woff2')
const outputFont = join(root, 'public', 'fonts', 'maple-mono-cn-regular.woff2')
const cssFile = join(root, 'src', 'app', 'globals.css')
const fontTsFile = join(root, 'src', 'lib', 'font.ts')

if (!existsSync(sourceFont)) {
  console.error(`缺少源字文件：${relative(root, sourceFont)}`)
  process.exit(1)
}

// —— 1. 收集站点实际用字 ——
const chars = new Set()
const addText = (text) => {
  for (const ch of text) {
    const cp = ch.codePointAt(0)
    if (cp > 0x7e) chars.add(cp)
  }
}

for (const file of ['entries.json', 'categories.json', 'overrides.json']) {
  addText(readFileSync(join(root, 'data', file), 'utf8'))
}

const walk = (dir) => {
  // withFileTypes 让目录/文件判定与一次 readdir 同源，避免 statSync 的 TOCTOU
  // （CodeQL js/file-system-race）
  for (const dirent of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, dirent.name)
    if (dirent.isDirectory()) walk(path)
    else if (['.ts', '.tsx', '.css'].includes(extname(dirent.name)))
      addText(readFileSync(path, 'utf8'))
  }
}
walk(join(root, 'src'))

// 固定保留：ASCII + 常用中文标点 / 全角区（与 globals.css 的 unicode-range 声明一致）
const fixed = [
  'U+0020-007E',
  'U+00B1',
  'U+00B7',
  'U+00D7',
  'U+00F7',
  'U+2014',
  'U+2018-2019',
  'U+201C-201D',
  'U+2026',
  'U+3000-303F',
  'U+FF00-FFEF',
]
const unicodes = [
  ...fixed,
  ...[...chars]
    .sort((a, b) => a - b)
    .map((cp) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`),
].join(',')

// 私有临时目录：mkdtemp 生成不可预测名且权限 0700，避免共享 tmpdir 下
// 可预测文件名被抢占或符号链接劫持（CodeQL js/insecure-temporary-file）
const tmpDir = mkdtempSync(join(tmpdir(), 'ffd-font-'))
// 退出即清理（含 process.exit 与未捕获异常；finally 不覆盖 process.exit）
process.on('exit', () => rmSync(tmpDir, { recursive: true, force: true }))
const unicodesFile = join(tmpDir, 'unicodes.txt')
const outTemp = join(tmpDir, 'subset.woff2')
writeFileSync(unicodesFile, `${unicodes}\n`)

// —— 2. 调 fonttools 子集化 ——
const args = [
  sourceFont,
  '--flavor=woff2',
  '--layout-features=*',
  '--name-IDs=*',
  '--name-languages=*',
  `--unicodes-file=${unicodesFile}`,
  `--output-file=${outTemp}`,
]
let result = spawnSync('pyftsubset', args, { encoding: 'utf8' })
if (result.error?.code === 'ENOENT') {
  result = spawnSync('python', ['-m', 'fontTools.subset', ...args], { encoding: 'utf8' })
}
if (result.error || result.status !== 0) {
  console.error('字体子集化失败：请先安装 fonttools（pip install "fonttools[woff]"）')
  console.error(result.error?.message ?? result.stderr?.trim() ?? `退出码 ${result.status}`)
  process.exit(1)
}

// —— 3. 有变化才落盘，并刷新 CSS 版本号 ——
const fmt = (n) => `${(n / 1024).toFixed(0)}KB`
// 读已存在产物不预检：ENOENT 即「无旧版」，规避 existsSync + readFileSync 的
// TOCTOU（CodeQL js/file-system-race）
const readIfExists = (file) => {
  try {
    return readFileSync(file)
  } catch (err) {
    if (err.code === 'ENOENT') return null
    throw err
  }
}
const next = readFileSync(outTemp)
const prev = readIfExists(outputFont)
if (prev?.equals(next)) {
  console.log(`字体无变化（${fmt(next.length)}，${chars.size} 个非 ASCII 用字），跳过写入`)
  process.exit(0)
}

writeFileSync(outputFont, next)
const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '')
const css = readFileSync(cssFile, 'utf8')
const versionRe = /(maple-mono-cn-regular\.woff2\?v=)\d{8}/
if (!versionRe.test(css)) {
  console.warn('警告：globals.css 中未找到 ?v= 版本号标记，请手动确认字体 URL')
} else {
  writeFileSync(cssFile, css.replace(versionRe, `$1${stamp}`))
}
// 根布局用 font.ts 的 FONT_URL 做 preload，版本号必须与 @font-face 一致
const fontTs = readFileSync(fontTsFile, 'utf8')
writeFileSync(fontTsFile, fontTs.replace(versionRe, `$1${stamp}`))

console.log(
  `✓ 字体子集已更新：${prev ? fmt(prev.length) : '—'} → ${fmt(next.length)}（${chars.size} 个非 ASCII 用字）`,
)
console.log(`✓ globals.css / src/lib/font.ts 版本号 → ?v=${stamp}`)
