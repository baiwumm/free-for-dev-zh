# free-for-dev-zh

[ripienaar/free-for-dev](https://github.com/ripienaar/free-for-dev) 的**中文版**：把上游 57 个分类、1,300+ 条面向开发者的免费资源（云厂商免费额度、CI/CD、监控、数据库、邮件、DNS……）整理成可搜索的静态站点，并与上游**每日自动同步 + 增量翻译**。

<p align="center">
  <a href="https://ffd.baiwumm.com"><img src="https://img.shields.io/badge/%E7%AB%99%E7%82%B9-%E5%9C%A8%E7%BA%BF-0A0A0A?style=flat-square" alt="站点在线" /></a>
  <a href="https://github.com/baiwumm/free-for-dev-zh/blob/main/data/entries.json"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fbaiwumm%2Ffree-for-dev-zh%2Fmain%2Fdata%2Fentries.json&query=%24.meta.counts.entries&label=%E6%9D%A1%E7%9B%AE&style=flat-square&color=0A0A0A&cacheSeconds=3600" alt="收录条目数（实时）" /></a>
  <a href="https://github.com/baiwumm/free-for-dev-zh/actions/workflows/ci.yml"><img src="https://github.com/baiwumm/free-for-dev-zh/actions/workflows/ci.yml/badge.svg?branch=main&style=flat-square" alt="CI" /></a>
  <a href="https://github.com/baiwumm/free-for-dev-zh/actions/workflows/daily-sync.yml"><img src="https://github.com/baiwumm/free-for-dev-zh/actions/workflows/daily-sync.yml/badge.svg?branch=main&style=flat-square" alt="Daily Sync" /></a>
  <a href="https://github.com/ripienaar/free-for-dev"><img src="https://img.shields.io/badge/%E4%B8%8A%E6%B8%B8-ripienaar%2Ffree--for--dev-0A0A0A?style=flat-square" alt="上游 ripienaar/free-for-dev" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-0A0A0A?style=flat-square" alt="MIT License" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-111?style=flat-square&logo=nextdotjs&logoColor=fff&labelColor=111" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-111?style=flat-square&logo=react&logoColor=61DAFB&labelColor=111" alt="React 19" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-111?style=flat-square&logo=tailwindcss&logoColor=38BDF8&labelColor=111" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Cloudflare-Workers-111?style=flat-square&logo=cloudflare&logoColor=F38020&labelColor=111" alt="Cloudflare Workers" />
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A5%2020.9-111?style=flat-square&logo=nodedotjs&logoColor=5FA04E&labelColor=111" alt="Node.js ≥ 20.9" />
</p>

- 🌐 站点：<https://ffd.baiwumm.com>（Cloudflare Workers 静态资源，成本约零）
- 🔄 数据每日自动同步（GitHub Actions）；中文描述由大模型增量翻译（GLM 免费模型），以英文原文与官网为准。

## ✨ 特性

- ⏰ **全自动同步**：每天定时「拉取上游 README → 解析 → 守卫校验 → 增量翻译 → 提交 → 部署」，无需人工干预；上游无变化时自动跳过提交与部署。
- 🛡️ **解析守卫**：总量 / 分类级跌幅 / 译文覆盖率三道断言，上游格式漂移时中止同步并保留上一版数据。
- 🤖 **增量翻译**：只翻译新增与变更条目，批内去重；数字、链接、长度、坏输出四项自动校验，失败条目降级展示英文原文并标注「未翻译」。
- 📖 **索引式阅读体验**：纸墨单色 + 钴蓝强调色的「开放索引」设计；Maple Mono CN 自托管子集字体；⌘K 全站搜索（cmdk + Fuse.js 自建索引）、分类页页内筛选、深色模式。
- 📡 **更新可见与订阅**：首页展示近 7 天新增 / 更新速览；提供 RSS 订阅（`/feed.xml`）与分享卡片（OG 元数据 + 站点级静态图）。
- ⚡ **静态站点**：Next.js 16（`output: export`）+ Fumadocs 16 + Tailwind CSS 4，全站 1,400+ 页构建期生成（条目页 + 分类页 + 固定页）。
- 🪶 **零依赖流水线**：`scripts/` 全部为纯 Node.js（无第三方依赖），单测使用内置 `node:test`。

## 📁 仓库结构

```
docs/               需求与方案基线（01 概述 → 05 里程碑与风险）
data/               数据层（提交到仓库）
  entries.json      同步产物：条目 + 分类 + 元信息（上游 commit、同步时间），唯一事实源
  categories.json   57 个分类的中英对照（人工层，新分类出现时同步会停下提示补充）
  overrides.json    人工翻译覆盖层（按条目 ID 覆盖机翻结果）
scripts/            同步流水线（纯 Node.js）
  sync.mjs          拉取 → 解析 → 守卫 → 差异 → 合并 → 翻译 → 原子写入
  translate.mjs     批量翻译（OpenAI 兼容接口），可独立运行
  subset-font.mjs   按站点实际用字重新生成字体子集（pnpm fonts）
  lib/              fetch / parse / guard / diff / merge / validate / ids / slug
test/               解析边界、守卫、差异合并、翻译校验的单元测试
src/                站点（首页索引 / docs 概览 / 分类页 / 条目详情 / 关于 / ⌘K 搜索 / RSS）
assets/fonts/       Maple Mono CN GB2312 源字（仅用于再子集化，SIL OFL 1.1）
public/fonts/       站点字体子集（由 pnpm fonts 生成后提交）
public/_headers     Workers Static Assets 缓存与安全头
.agents/skills/     项目级 AI 技能（frontend-design / vercel-react-best-practices，版本锁定于 skills-lock.json）
.github/workflows/  ci.yml · daily-sync.yml · deploy.yml
AGENTS.md           AI 与开发协作约定（包管理 / 命令 / 硬性约束）
```

## 🚀 本地开发

前置：Node ≥ 20.9、pnpm 12（仓库以 Volta / `packageManager` 字段固定版本，启用 corepack 即可）。

```bash
pnpm install
pnpm dev            # 本地开发（http://localhost:3000）
pnpm test           # 单元测试
pnpm lint           # Biome 检查（pnpm format 自动格式化）
pnpm fonts          # 按站点实际用字重新生成字体子集（需本机 Python fonttools）
pnpm sync           # 手动同步上游（无 key 时只解析不翻译）
pnpm translate      # 单独补齐缺失的中文翻译（需要 LLM_API_KEY）
pnpm build          # 静态导出到 out/（1,400+ 页）
pnpm preview        # wrangler dev 本地预览 out/ 产物（需先 pnpm build）
pnpm deploy         # 部署到 Cloudflare Workers（需 CLOUDFLARE_API_TOKEN，或已 wrangler login）
```

### 🔑 环境变量（翻译）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `LLM_API_KEY` | — | 必填（配置后才启用翻译） |
| `LLM_BASE_URL` | `https://open.bigmodel.cn/api/paas/v4` | OpenAI 兼容接口地址（智谱 / DeepSeek 等均可） |
| `LLM_MODEL` | `glm-4.7-flash` | 模型名 |
| `LLM_MODEL_FALLBACK` | — | 备用模型（限流逃生通道；CI 工作流默认注入 `glm-4.5-flash`，本地未设置则不启用） |
| `LLM_BATCH` | `20` | 每请求翻译条目数（建议 20–50） |
| `LLM_THINKING` | — | 设为 `disabled` 时显式关闭思考模式（部分模型支持） |

本地运行时以环境变量注入（例如 PowerShell：`$env:LLM_API_KEY="…"`）；CI 中来自仓库 Actions secrets。首翻补量可临时覆盖模型（付费、极低价）：`gh workflow run daily-sync.yml -f model=glm-5.3-flash`。

## ☁️ 部署（一次性配置）

1. 在 GitHub 仓库 Settings → Secrets and variables → Actions 添加：
   - `CLOUDFLARE_API_TOKEN`：部署用，Cloudflare API Token（授「编辑 Cloudflare Workers」模板即可，详见 `docs/04-technical-design.md`）；
   - `LLM_API_KEY`：翻译用，智谱开放平台（或任意 OpenAI 兼容服务）的 API Key（缺省时同步照常运行、仅跳过翻译）。
2. 部署：push 到 `main` 自动触发 `Deploy`（build → wrangler deploy），自定义域名 `ffd.baiwumm.com` 随首次部署自动挂载；`Daily Sync` 提交数据后亦通过 `workflow_call` 直调部署；本地可用 `pnpm deploy`。
3. 每日 UTC 21:23（北京时间次日 05:23）`Daily Sync` 自动运行；首次全量翻译可在 Actions 页手动触发该 workflow（workflow_dispatch）。
4. 如 Cloudflare 账号下有多个账户，再补一个 `CLOUDFLARE_ACCOUNT_ID` secret。

## ⚖️ 数据与许可

- 上游 [ripienaar/free-for-dev](https://github.com/ripienaar/free-for-dev) 未声明开源许可证；本站为个人整理的中文镜像，原始内容版权归上游作者与贡献者所有，站点已显著署名并链接上游。
- 本站代码以 MIT 许可开源（见 [LICENSE](./LICENSE)），该许可不覆盖上游数据。
- 中文描述为机器翻译，仅供快速浏览；免费额度等关键信息请以官网为准。
- 详见 [NOTICE.md](./NOTICE.md)。
