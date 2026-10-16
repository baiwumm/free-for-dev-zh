# 04 技术方案

## 技术栈（已定，勿随意更换）

| 层 | 选型 | 版本/说明 |
|---|---|---|
| 框架 | Next.js（App Router, RSC, SSG） | 16.x，React 19 |
| 样式 | Tailwind CSS v4 | `@tailwindcss/postcss`，CSS-first 配置 |
| 文档框架 | Fumadocs | 16.x（要求 Next 16.x / React ≥19.2），锁定小版本，升级看 changelog |
| 搜索 | cmdk + Fuse.js（自建索引，由 entries.json 生成） | 全站单套搜索体系；Fumadocs 内置静态搜索不启用——静态导出下需客户端下载全量索引，本场景体积不可控（官方对静态搜索的警告） |
| 主题 | next-themes | 深色模式 |
| 包管理 | pnpm | 本地 pnpm 12，Node 由 Volta 管理（package.json 里固定 volta 字段） |
| 部署 | Cloudflare Workers Static Assets | `output: 'export'` 纯静态导出 + wrangler.jsonc，无适配器（与作者既有项目同构） |
| 同步流水线 | Node ESM 零依赖脚本 | `scripts/`，GitHub Actions 调度 |
| LLM | 智谱 GLM 免费模型（GLM-4.7-Flash / GLM-4.5-Flash）；备选 DeepSeek `deepseek-flash` 按量付费 | OpenAI 兼容接口，切换仅换 base_url 与 key |
| Lint/Format | Biome | 与作者既有项目一致 |

选型理由（只留结论）：Fumadocs 是 Next.js 生态默认颜值最高的文档框架且允许深度定制；内容为结构化数据，**不生成 MDX**——分类页就是普通路由，构建期直接读 `entries.json`，侧边栏由分类表手工构建 `PageTree`（2026-10-15 实现定案，原"生成 MDX + gen-content"方案废弃：对纯数据展示是多余环节）。

依赖版本以 `package.json` / `pnpm-lock.yaml` 为准（2026-10-15 选型后保守锁旧线，npm 上更新的版本如 TypeScript 7.x、@types/node 26.x 未采用）；升级依赖前先读对应 changelog。

## 仓库结构（src/ 布局）

应用代码统一放 `src/`，数据与脚本在仓库根层：

```
free-for-dev-zh/
├── docs/                  # 需求文档（本目录）
├── data/                  # 同步流水线产物（入库）
│   ├── entries.json       # 全量条目数据（唯一事实源：meta + categories + entries）
│   ├── categories.json    # 57 个分类中英对照（人工层）
│   └── overrides.json     # 人工译文覆盖层（按条目 ID）
├── scripts/               # 零依赖 Node ESM 同步流水线
│   ├── sync.mjs           # 编排：fetch→parse→ID/分类校验→diff→merge→overrides→guard→translate→原子写
│   ├── translate.mjs      # LLM 批量翻译 + 校验（独立 CLI：--limit 试跑）
│   └── lib/               # fetch / parse / guard / diff / merge / validate / ids / slug
├── test/                  # node:test 单测（解析边界 / 守卫 / diff-merge / 翻译校验）
├── src/
│   ├── app/               # 路由：/ · /docs（概览）· /docs/[category] · /entry/[id] · /about · 404 · search-index.json · sitemap · robots
│   ├── components/        # Search（⌘K）· CategoryIndex（索引排版）· CategoryExplorer · RichText · ServiceIcon · LetterAvatar · Brand · Icons · PlainHeader · SiteFooter
│   └── lib/               # entries.ts（数据加载与索引）· page-tree.ts（侧边栏）· avatar.ts · cn.ts
├── public/
│   ├── favicon.svg
│   └── fonts/maple-mono-cn-regular.woff2   # Maple Mono CN 自托管子集（SIL OFL 1.1）
├── .agents/skills/        # 项目级 AI 技能：frontend-design · vercel-react-best-practices（skills-lock.json 锁定版本）
├── AGENTS.md              # AI 与开发协作约定（包管理 / 命令 / 硬性约束）
├── .github/workflows/
│   ├── ci.yml             # Biome + 单测 + build + out/ 产物断言
│   ├── daily-sync.yml     # 每日同步（cron UTC 21:23）→ commit data/ → workflow_call 部署
│   └── deploy.yml         # push main / workflow_call：build → wrangler deploy
├── wrangler.jsonc
├── biome.json             # 仅检查 src/scripts/test 代码（includes 白名单，不碰 500KB+ 数据 JSON）
├── pnpm-workspace.yaml    # pnpm 12：minimumReleaseAge 放开 + allowBuilds 放行 esbuild/workerd 构建脚本
├── NOTICE.md              # 上游署名、翻译免责声明（合规落点，见 05）
└── package.json
```

内容接入方式（2026-10-15 实现定案）：分类页 `/docs/[category]` 与详情页 `/entry/[id]` 均为服务端组件 + `generateStaticParams`，构建期直接读 `entries.json`；侧边栏 `PageTree`（概览 + 分类）由分类表构建（`src/lib/page-tree.ts`），全站无 MDX、无 codegen 步骤。首页与 `/docs` 概览共用 `CategoryIndex` 索引排版组件（2026-10-16 改版新增）。搜索为 cmdk + Fuse.js 自建索引：`/search-index.json` 在构建期输出全量条目的裁剪记录（首次实测约 287KB，随条目数缓增），客户端首次打开搜索面板时懒加载一次。

## 视觉系统与字体（2026-10-16 改版定案）

- 设计语言「开放索引」：纸墨单色（paper & ink）+ 唯一钴蓝强调色，层级靠字号 / 留白 / 细线；不使用渐变光斑、彩色底块与卡片堆叠。要求见 03 章。
- 设计令牌集中在 `src/app/globals.css`：引入 fumadocs `neutral` preset（替代首版 emerald），并以同名变量同步覆盖 fumadocs `--color-fd-*`，文档区与首页视觉一致；深浅色以 `.dark` class（next-themes）切换，`dark:` 变体绑定 class 而非系统媒体查询。
- 字体：Maple Mono CN 自托管（SIL OFL 1.1），两级文件——源字 `assets/fonts/maple-mono-cn-gb2312.woff2`（GB2312 + ASCII + 常用标点，≈1.7MB，仅用于再子集化，不进 `out/`）；站点子集 `public/fonts/maple-mono-cn-regular.woff2`（≈280KB，按站点实际用字生成，2026-10-16 从 1.7MB 收缩约 84%）。用字集合 = `data/*.json` 与 `src/` 全部文本 + 固定标点范围，`pnpm fonts` 重新生成（需本机 Python fonttools），并自动刷新 `globals.css` 中字体 URL 的 `?v=YYYYMMDD` 版本号；新用字未重新生成时按 `unicode-range` 规则回退系统栈。`--font-sans` / `--font-mono` 首位均为该字体，不再使用 `next/font` 拉取 Geist。
- 组件细则：详情页主按钮为「墨色实底」，钴蓝仅用于交互状态与引用标记；分类索引使用序号 + 引导点线的目录式排版（`CategoryIndex`）；letter avatar 色板为纸墨低饱和墨色。
- 设计过程使用项目技能 `.agents/skills/frontend-design`（来源 `anthropics/skills`），后续视觉迭代同样先读该技能。

## Cloudflare Workers 部署（Static Assets，无适配器）

采用与作者既有项目一致的模式：Next.js 纯静态导出，Workers Static Assets 直接托管，不引入任何适配器。

**next.config.ts**（导出模式 + 关闭图片优化）：

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
}

export default nextConfig
```

**wrangler.jsonc**（仓库根目录）：

```jsonc
{
  // Cloudflare Workers Static Assets：纯静态托管（next.config.ts output: 'export' → out/）
  // 部署：pnpm build && pnpm deploy
  // 首次部署需 CF 授权（wrangler login 或 CLOUDFLARE_API_TOKEN）
  "name": "free-for-dev-zh",
  "compatibility_date": "2026-06-01",
  // workers.dev 子域显式关闭：只保留自定义域名，避免重复内容与游离入口
  "workers_dev": false,
  "assets": {
    "directory": "./out",
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page"
  },
  "routes": [
    {
      "pattern": "ffd.baiwumm.com",
      "custom_domain": true
    }
  ]
}
```

导出模式的约束与对策（本站点全部可满足）：

- 全部页面必须构建期静态生成：首页、`/docs` 概览、全部分类页与条目详情页由 `generateStaticParams` 产出（约 1,400 页）；无 ISR、无 middleware、无服务端动态——本站点本来就不需要这些。
- 图片优化不可用 → `images.unoptimized`，条目图标走 `<img>` + letter avatar 兜底（与 03 章降级策略一致）。
- 需要 `app/not-found.tsx` 提供 404 页（对应 `not_found_handling`）。
- `out/` 实测约 7,100 个文件 / 86MB，低于 Workers Static Assets 单版本 20,000 文件上限（2026-10-15 `wrangler dev` 实测通过，含尾斜杠 307 与自定义 404 行为）。
- 静态资源缓存与安全头：`public/_headers`（Workers Static Assets 原生识别，文件本身不对外提供）——`/_next/static/*` 与 `/fonts/*` 强缓存 `max-age=31536000, immutable`，全站补 `X-Content-Type-Options: nosniff` / `Referrer-Policy: strict-origin-when-cross-origin`；字体 URL 以 `?v=YYYYMMDD` 版本化（`pnpm fonts` 自动维护），避免 immutable 场景下改字体不生效。
- RSS 与 OG 卡片：`/feed.xml` 为 `force-static` route handler（与 `/search-index.json` 同模式），OG 卡片走 `app/opengraph-image.png` 静态文件约定，均构建期产出、不引入动态服务；`workers_dev` 显式关闭，只有 `ffd.baiwumm.com` 对外（避免重复内容）。
- 域名 `ffd.baiwumm.com` 在 routes 中声明为自定义域名，DNS 在 Cloudflare 侧自动处理。

## CI/CD

| 工作流 | 触发 | 动作 |
|---|---|---|
| `ci.yml` | PR / push main | Biome 检查 + `node --test` + `pnpm build` + `out/` 产物断言（首页/404/搜索索引条数） |
| `daily-sync.yml` | cron UTC 21:23（北京 05:23）+ 手动 | `node --test` → `node scripts/sync.mjs`（含增量翻译）→ 有变更才 commit `data/` 并 `workflow_call` 调 `deploy.yml`；无变更自动跳过提交与部署 |
| `deploy.yml` | push 到 main / workflow_call | `pnpm build` → `cloudflare/wrangler-action` 部署 `out/`（secret：`CLOUDFLARE_API_TOKEN`） |

**Actions 运行时**：各 action 均已使用 Node.js 24 原生运行时版本（`actions/checkout@v6`、`actions/setup-node@v6`、`pnpm/action-setup@v6`、`cloudflare/wrangler-action@v4`，2026-10-16 升级），不再产生 Node20 弃用告警（runner 自 2026-06-16 起默认 Node24，2026-09-23 移除 Node20）。`pnpm/action-setup@v6` 支持 pnpm 12 且版本仍由 `package.json` 的 `packageManager` 字段解析，无需在 workflow 里显式传版本；`actions/setup-node@v6` 的 `cache: pnpm` 显式配置不受其「自动缓存仅限 npm」变更影响。

**触发链注意**：使用默认 `GITHUB_TOKEN` 的提交不会触发其他 GitHub Actions workflow（GitHub 防递归机制），daily-sync 不能靠 push 事件唤起部署，必须通过 `workflow_call` 直调 `deploy.yml`；daily-sync 需声明 `permissions: contents: write` 才能 push commit。人工 push main 与每日同步共用同一份 `deploy.yml`。另注意 `deploy.yml` 的 checkout 需显式 `ref: ${{ github.ref_name }}` 检出分支最新提交——`workflow_call` 场景下 `github.sha` 是 daily-sync 触发时的旧提交，默认 checkout 会漏掉刚推送的数据提交（2026-10-16 实测修复）。若改用 Cloudflare Workers Builds 监听仓库（外部 webhook 不受此限制），可省略 `deploy.yml`。

Secrets：`LLM_API_KEY`（翻译；`LLM_BASE_URL`/`LLM_MODEL`/`LLM_MODEL_FALLBACK`/`LLM_BATCH`/`LLM_THINKING` 在 workflow env 中可调，默认智谱 GLM-4.7-Flash 主模型 + GLM-4.5-Flash 免费备份、关闭思考模式；首翻补量可经 workflow_dispatch 传 `model` 临时覆盖为付费 GLM-5.3-Flash）与 `CLOUDFLARE_API_TOKEN`（部署，用「编辑 Cloudflare Workers」模板即可：Workers Scripts: Edit + Workers Routes: Edit + Account Settings: Read），存于仓库 Actions secrets（多账户时再加 `CLOUDFLARE_ACCOUNT_ID`）。上游数据无凭据依赖。未配置 `LLM_API_KEY` 时同步照常运行，仅跳过翻译（`desc_zh` 置 `null`，站点降级展示英文原文并标注「未翻译」）。

## 本地开发

```bash
pnpm install                # pnpm 12；供应链策略与构建脚本白名单见 pnpm-workspace.yaml 注释
pnpm dev                    # Next.js 开发服务器
pnpm test                   # node:test 单测（全部）
pnpm lint                   # Biome 检查（pnpm format 自动格式化）
pnpm fonts                  # 按站点实际用字重新生成字体子集（需本机 Python fonttools）
node scripts/sync.mjs       # 手动同步（--dry-run / --verbose / --readme <path> 便于离线调试）
pnpm translate              # 单独补翻译（需 LLM_API_KEY，--limit N 可小步试跑）
pnpm build                  # next build（output: export → out/，约 1,400 个静态页）
pnpm preview                # wrangler dev 本地预览 Workers 托管行为
pnpm deploy                 # wrangler deploy（需 CLOUDFLARE_API_TOKEN，或已 wrangler login）
```

## 验收标准

- [x] `pnpm build` 产出 `out/`（约 1,400 页，含 `/docs` 概览），`wrangler dev` 本地预览通过（含尾斜杠 307 与自定义 404 行为）——2026-10-15 / 16 实测。
- [x] push main 后自动发布，`ffd.baiwumm.com` 线上可访问（首页 / 分类页 / 详情页 200、未知路径 404、尾斜杠 307）——2026-10-16 实测。
- [x] 手动触发 `Daily Sync`，全链路（同步 → 翻译 → 提交 → `workflow_call` 部署）自动走通——2026-10-16。

> 部署记录（2026-10-16）：首次 CI 失败于 pnpm 12 的安装脚本审批——pnpm 自 v11 起忽略 `onlyBuiltDependencies`，需改用 `allowBuilds` 映射（见 `pnpm-workspace.yaml` 注释）；修复后 CI / Deploy 全绿，自定义域名由 wrangler routes 自动挂载。
