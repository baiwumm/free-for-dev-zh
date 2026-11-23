/**
 * 自托管字体 URL（?v= 版本号由 scripts/subset-font.mjs 在重新生成子集时
 * 与 globals.css 里的 @font-face 同步更新）。根布局用它做 preload，
 * 减少首屏字体切换（见 03 NFR-1）。
 */
export const FONT_URL = '/fonts/maple-mono-cn-regular.woff2?v=20261016'
