/**
 * 分类 slug：与 GitHub 标题锚点规则一致（小写、非字母数字折叠为 '-'）。
 * 例："APIs, Data and ML" -> "apis-data-and-ml"
 */
export function slugify(input) {
  return input
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
