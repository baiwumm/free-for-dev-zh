import { categories, getExplorerItems, plainText, siteMeta, stats, truncate } from './entries'
import { SITE_URL } from './schema'

const syncDate = siteMeta.synced_at.slice(0, 10)
const commit = siteMeta.upstream.commit_sha?.slice(0, 7) ?? '—'

function oneLine(text: string, max = 200): string {
  return truncate(plainText(text), max)
}

/**
 * /llms.txt：站点定位、关键页面与分类索引（llmstxt.org 约定格式）。
 * 构建期生成，随每日同步更新。
 */
export function buildLlmsTxt(): string {
  return [
    '# 免费开发资源 · Free for Dev 中文版',
    '',
    `> ripienaar/free-for-dev 的中文镜像：${stats.categories} 个分类、${stats.services.toLocaleString('zh-CN')} 项面向开发者的免费资源（云厂商免费额度、CI/CD、监控、数据库、邮件、DNS、API 等），每日自动同步上游 README 并增量翻译。`,
    '',
    '本站为纯静态站点，全部页面无需登录即可访问。中文描述为机器翻译，免费额度与服务条款以各服务官网及上游英文原文为准。',
    '',
    `数据同步日期：${syncDate}；上游 commit：${commit}。`,
    '',
    '## 关键页面',
    '',
    `- [首页](${SITE_URL}/)：站点定位、近 7 天更新、全部分类索引与常见问题`,
    `- [分类索引](${SITE_URL}/docs)：完整目录、使用说明与数据来源`,
    `- [关于本站](${SITE_URL}/about)：同步机制、翻译方式与免责声明`,
    `- [RSS](${SITE_URL}/feed.xml)：最近更新的 50 条`,
    `- [全量条目](${SITE_URL}/llms-full.txt)：按分类列出的全部条目与中文描述`,
    '',
    '## 分类',
    '',
    ...categories.map(
      (c) => `- [${c.nameZh}](${SITE_URL}/docs/${c.id})：${c.count} 项 — ${c.nameEn}`,
    ),
    '',
    '## 说明',
    '',
    '- 每条资源有独立详情页，含中文说明、英文原文对照、官网链接与同分类相关资源。',
    '- 详情页 URL 形如 /entry/<id>，id 为同步流水线中的稳定条目标识。',
    '- 站点本身免费、无需注册；收录服务是否需要信用卡或实名认证由各服务自行决定。',
    '- 已失效或上游移除的条目会随每日同步下线。',
    '',
  ].join('\n')
}

/** /llms-full.txt：按分类展开全部条目（含备注），供 AI 引擎与 Agent 批量读取。 */
export function buildLlmsFullTxt(): string {
  const blocks: string[] = [
    '# 免费开发资源 · Free for Dev 中文版（全量条目）',
    '',
    `> ${stats.categories} 个分类、${stats.services.toLocaleString('zh-CN')} 项开发者免费资源。中文为机器翻译，以官网为准。同步于 ${syncDate}。`,
    '',
  ]

  for (const category of categories) {
    const items = getExplorerItems(category.id) ?? []
    blocks.push(`## ${category.nameZh}（${category.nameEn}）`, '')

    for (const item of items) {
      const desc = oneLine(item.descZh ?? item.descEn)
      if (item.kind === 'note') {
        if (desc) blocks.push(`- 备注：${desc}`)
        continue
      }
      const name = item.name ?? ''
      const head = desc ? `${name}：${desc}` : name
      const site = item.id ? ` — 详情：${SITE_URL}/entry/${item.id}` : ''
      const official = item.url ? ` — 官网：${item.url}` : ''
      blocks.push(`- ${head}${official}${site}`)
    }

    blocks.push('')
  }

  return blocks.join('\n')
}
