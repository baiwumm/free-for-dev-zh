# 需求文档索引

本目录是 free-for-dev-zh 项目的需求与方案基线，建立于 2026-10-15。开发过程中如有需求变更，先改文档再改代码。

| 文档 | 内容 |
|---|---|
| [01-overview.md](./01-overview.md) | 背景、机会、产品定位、目标与非目标、命名 |
| [02-data-sync.md](./02-data-sync.md) | 上游数据映射、解析规则、差异比对、翻译流水线、每日自动化 |
| [03-site-requirements.md](./03-site-requirements.md) | 页面结构、功能需求、视觉与交互要求、性能与 SEO |
| [04-technical-design.md](./04-technical-design.md) | 技术栈选型、仓库结构（src/ 布局）、CF Workers 部署、CI/CD |
| [05-milestones-and-risks.md](./05-milestones-and-risks.md) | 分期计划与验收标准、风险登记、合规说明 |

## 一句话需求

把 [ripienaar/free-for-dev](https://github.com/ripienaar/free-for-dev) 的英文免费服务清单，通过"每日自动同步 + LLM 增量翻译"，转译为一个高颜值的中文文档站点，数据与上游保持天级一致。

## 当前状态

需求已梳理，尚未开始编码。技术栈已定：Next.js 16（App Router）+ Tailwind CSS v4 + Fumadocs 16，纯静态导出（`output: export`）部署到 Cloudflare Workers Static Assets，应用代码统一放在 `src/` 目录下。
