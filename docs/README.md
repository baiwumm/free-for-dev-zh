# 需求文档索引

本目录是 free-for-dev-zh 项目的需求与方案基线，建立于 2026-10-15。开发过程中如有需求变更，先改文档再改代码。

| 文档 | 内容 |
|---|---|
| [01-overview.md](./01-overview.md) | 背景、机会、产品定位、目标与非目标、命名 |
| [02-data-sync.md](./02-data-sync.md) | 上游数据映射、解析规则、差异比对、翻译流水线、每日自动化 |
| [03-site-requirements.md](./03-site-requirements.md) | 页面结构、功能需求、视觉与交互要求、性能与 SEO |
| [04-technical-design.md](./04-technical-design.md) | 技术栈选型、仓库结构（src/ 布局）、视觉系统、CF Workers 部署、CI/CD |
| [05-milestones-and-risks.md](./05-milestones-and-risks.md) | 分期计划与验收标准、风险登记、合规说明 |

## 一句话需求

把 [ripienaar/free-for-dev](https://github.com/ripienaar/free-for-dev) 的英文免费服务清单，通过"每日自动同步 + LLM 增量翻译"，转译为一个高颜值的中文文档站点，数据与上游保持天级一致。

## 当前状态

**2026-10-16：已上线 <https://ffd.baiwumm.com>，全自动闭环运转中。**

- 部署：push `main` 自动触发 `Deploy`（build → wrangler deploy），自定义域名挂载成功；CI（Biome + 单测 + 构建）全绿。
- 数据：基线 57 分类 / 1,339 条目 + 33 备注（guard 通过，上游 commit `3764884`）；首次全量翻译已手动触发 `Daily Sync`（执行中）。
- 站点改版（2026-10-16）：全局字体换成 Maple Mono CN 自托管子集；视觉改为「开放索引」设计语言（纸墨单色 + 钴蓝强调色）；新增 `/docs` 概览页，文档侧边栏收敛为「概览 + 分类」。
- AI 协作：仓库新增 `AGENTS.md` 与 `.agents/skills/`（frontend-design、vercel-react-best-practices），版本由 `skills-lock.json` 锁定。
- 实现与本文档的偏差点已回写（04 章「生成 MDX」方案废弃等；首翻结果与线上版本以站点为准）。

技术栈落地版本：Next.js 16.4.1（App Router）+ Tailwind CSS v4 + Fumadocs 16.17.3，纯静态导出（`output: export`）部署到 Cloudflare Workers Static Assets，应用代码统一放在 `src/` 目录下。
