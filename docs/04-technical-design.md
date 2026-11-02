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
| 部署 | 腾讯云 EdgeOne Pages | `output: 'export'` 纯静态导出，Pages 绑定 Git 仓库构建 `out/`，无适配器（2026-11-02 从 Cloudflare Workers 迁来，域名与 DNS 均已指向腾讯云） |
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
│   ├── preview.mjs        # 本地静态预览 out/（pnpm preview，按 Pages 的 URL 解析规则）
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
│   └── daily-sync.yml     # 每日同步（cron UTC 21:23）→ commit data/（push 触发 Pages 构建）
├── biome.json             # 仅检查 src/scripts/test 代码（includes 白名单，不碰 500KB+ 数据 JSON）
├── pnpm-workspace.yaml    # pnpm 12：minimumReleaseAge 放开（依赖均无需安装脚本）
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

## 部署：腾讯云 EdgeOne Pages（纯静态托管，无适配器）

Next.js 纯静态导出，EdgeOne Pages 绑定 GitHub 仓库直接构建托管；仓库内不再有部署配置与部署凭据（原 `wrangler.jsonc`、`.github/workflows/deploy.yml`、`pnpm deploy`、`public/_headers` 已于 2026-11-02 随迁移删除）。

**next.config.ts**（导出模式 + 关闭图片优化）：

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  images: { unoptimized: true },
}

export default nextConfig
```

**Pages 项目侧配置**（控制台，不在仓库里）：

- 关联仓库 `baiwumm/free-for-dev-zh`，Production Branch = `main`；构建命令 `pnpm build`，输出目录 `out`。
- 域名 `ffd.baiwumm.com`：baiwumm.com 的 DNS 已托管腾讯云，`ffd` 记录由 Pages 分配（CNAME → `*.pages.dnsoe6.com`），证书由 Pages 签发。
- 缓存与响应头安全策略需在控制台配置（见下方 `_headers` 说明），仓库文件无法表达。

导出模式的约束与对策（本站点全部可满足）：

- 全部页面必须构建期静态生成：首页、`/docs` 概览、全部分类页与条目详情页由 `generateStaticParams` 产出（约 1,400 页）；无 ISR、无 middleware、无服务端动态——本站点本来就不需要这些。
- 图片优化不可用 → `images.unoptimized`，条目图标走 `<img>` + letter avatar 兜底（与 03 章降级策略一致）。
- 需要 `app/not-found.tsx` 提供 404 页；导出产物里的 `out/404.html` 由 Pages 承接未知路径（2026-11-02 线上实测：未知路径返回 404 状态 + 自定义 404 页内容）。
- `out/` 实测约 7,300 个文件 / 108MB（2026-11-02 本地构建，随条目数缓增），Pages 构建与托管实测通过；托管侧文件数与体积配额以 Pages 控制台为准。
- 静态资源缓存与安全头：原 `public/_headers` 是 Workers Static Assets 的专属机制，EdgeOne Pages 不识别（且该文件会被当普通资源公开访问，实测 `/_headers` 返回 200），已删除。等价策略改在 EdgeOne 控制台落地：`/_next/static/*` 与 `/fonts/*` 强缓存 `max-age=31536000, immutable`，全站补 `X-Content-Type-Options: nosniff` / `Referrer-Policy: strict-origin-when-cross-origin`（2026-11-02 迁移时线上新产物默认仅 `max-age=0, must-revalidate`，控制台规则待确认）。字体 URL 仍以 `?v=YYYYMMDD` 版本化（`pnpm fonts` 自动维护），缓存按 URL 区分，改字体不依赖响应头。
- RSS 与 OG 卡片：`/feed.xml` 为 `force-static` route handler（与 `/search-index.json` 同模式），OG 卡片走 `app/opengraph-image.png` 静态文件约定，均构建期产出、不引入动态服务。
- **URL 规范差异（迁移遗留项）**：Workers 的 `auto-trailing-slash` 会把 `/docs/` 307 到 `/docs`；EdgeOne Pages 实测 `/docs` 200、`/docs/` 404。站内链接一律无尾斜杠，故站内不受影响；风险仅在外部手输或历史外链带尾斜杠。2026-11-02 决定暂不改动 URL 规范（开 `trailingSlash` 会影响 sitemap 与既有链接），先记录观察。

## CI/CD

| 工作流 | 触发 | 动作 |
|---|---|---|
| `ci.yml` | PR / push main | Biome 检查 + `node --test` + `pnpm build` + `out/` 产物断言（首页/404/搜索索引条数） |
| `daily-sync.yml` | cron UTC 21:23（北京 05:23）+ 手动 | `node --test` → `node scripts/sync.mjs`（含增量翻译）→ 有变更才 commit `data/` 并 push；无变更自动跳过提交 |

发布不在 GitHub Actions 里：EdgeOne Pages 的 Git 集成监听仓库，push 到 Production Branch（`main`）即重新构建 `out/` 并上线。迁移后只剩上面两个工作流（原 `deploy.yml` 已删除）。

**Actions 运行时**：各 action 均已使用 Node.js 24 原生运行时版本（`actions/checkout@v6`、`actions/setup-node@v6`、`pnpm/action-setup@v6`，2026-10-16 升级），不再产生 Node20 弃用告警（runner 自 2026-06-16 起默认 Node24，2026-09-23 移除 Node20）。`pnpm/action-setup@v6` 支持 pnpm 12 且版本仍由 `package.json` 的 `packageManager` 字段解析，无需在 workflow 里显式传版本；`actions/setup-node@v6` 的 `cache: pnpm` 显式配置不受其「自动缓存仅限 npm」变更影响。

**触发链注意**：默认 `GITHUB_TOKEN` 的提交不会触发其他 GitHub Actions workflow（GitHub 平台防递归），但 **会** 触发 Pages 这类外部 GitHub App 的仓库事件——2026-11-02 实测：daily-sync 于 00:53 UTC 提交并 push，Pages 于 02:37 UTC 产出新构建（构建队列有排队延迟，每日同步内容上线通常滞后 1–2 小时，不是故障）。因此原先为绕开防递归而设计的 `workflow_call` 直调部署已无必要，daily-sync 只负责提交数据；`permissions: contents: write` 仍需保留才能 push。Pages 侧构建参数（Node / pnpm 版本、构建命令、输出目录）以控制台为准，仓库不再维护部署 job。

Secrets：只剩 `LLM_API_KEY`（翻译；`LLM_BASE_URL`/`LLM_MODEL`/`LLM_MODEL_FALLBACK`/`LLM_BATCH`/`LLM_THINKING` 在 workflow env 中可调，默认智谱 GLM-4.7-Flash 主模型 + GLM-4.5-Flash 免费备份、关闭思考模式；首翻补量可经 workflow_dispatch 传 `model` 临时覆盖为付费 GLM-5.3-Flash），存于仓库 Actions secrets。迁移后 `CLOUDFLARE_API_TOKEN`（及可选的 `CLOUDFLARE_ACCOUNT_ID`）已无用途，应在仓库 Settings 里删除并在 Cloudflare 侧吊销。上游数据无凭据依赖。未配置 `LLM_API_KEY` 时同步照常运行，仅跳过翻译（`desc_zh` 置 `null`，站点降级展示英文原文并标注「未翻译」）。

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
pnpm preview                # node scripts/preview.mjs 本地预览 out/（按 Pages 的 URL 解析规则）
```

发布在 EdgeOne Pages 控制台（绑定 Git 仓库，push main 自动构建），仓库内无部署命令。

## 验收标准

- [x] `pnpm build` 产出 `out/`（约 1,400 页，含 `/docs` 概览），`pnpm preview` 本地预览通过（自定义 404 页 + 无尾斜杠 URL）——2026-10-15 / 16 首验，2026-11-02 迁移后复验。
- [x] push main 后自动发布，`ffd.baiwumm.com` 线上可访问（首页 / 分类页 / 详情页 200、未知路径 404）——2026-10-16 首验（Cloudflare Workers），2026-11-02 迁移到 EdgeOne Pages 后复核通过（`Server: edgeone makers`，产物含当日同步数据）。
- [x] 手动触发 `Daily Sync`，全链路（同步 → 翻译 → 提交 → EdgeOne Pages 自动构建上线）走通——2026-10-16 首验，2026-11-02 确认 bot 提交同样触发 Pages 构建。

> 部署记录（2026-10-16）：首次 CI 失败于 pnpm 12 的安装脚本审批——pnpm 自 v11 起忽略 `onlyBuiltDependencies`，需改用 `allowBuilds` 映射（见 `pnpm-workspace.yaml` 注释）；修复后 CI / Deploy 全绿，自定义域名由 wrangler routes 自动挂载。

> 迁移记录（2026-11-02）：托管从 Cloudflare Workers 换到腾讯云 EdgeOne Pages（域名与 DNS 均已指向腾讯云）。删除 `wrangler.jsonc`、`.github/workflows/deploy.yml`、`public/_headers`、`pnpm deploy` 脚本与 wrangler 依赖（连带 workerd / esbuild 的 `allowBuilds` 放行一并撤掉），daily-sync 不再 `workflow_call` 调部署。`pnpm preview` 改为 `scripts/preview.mjs` 零依赖静态服务器。迁移后待办：EdgeOne 控制台的静态资源缓存与安全头规则（原 `_headers` 语义）、`/docs/` 尾斜杠 404 的处理方式。
