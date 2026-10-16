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
| 部署 | Cloudflare Workers Static Assets | `output: 'export'` 纯静态导出 + wrangler.jsonc，无适配器（与 theme-switch-animation 一致） |
| 同步流水线 | Node ESM 零依赖脚本 | `scripts/`，GitHub Actions 调度 |
| LLM | 智谱 GLM 免费模型（GLM-4.7-Flash / GLM-4.5-Flash）；备选 DeepSeek `deepseek-flash` 按量付费 | OpenAI 兼容接口，切换仅换 base_url 与 key |
| Lint/Format | Biome | 与 theme-switch-animation 等既有项目一致 |

选型理由（详见讨论记录，此处留结论）：Fumadocs 是 Next.js 生态默认颜值最高的文档框架且允许深度定制；内容为结构化数据，**不生成 MDX**——分类页就是普通路由，构建期直接读 `entries.json`，侧边栏由分类表手工构建 `PageTree`（2026-10-15 实现定案，原"生成 MDX + gen-content"方案废弃：对纯数据展示是多余环节）。

实现锁定版本（以 pnpm-lock.yaml 为准，2026-10-15 核验 npm 后保守选取）：next 16.4.1 · react 19.3.1 · fumadocs-core/fumadocs-ui 16.17.3 · tailwindcss/@tailwindcss/postcss 4.3.3 · typescript 5.9.3 · @biomejs/biome 2.5.15 · wrangler 4.151.0 · cmdk 1.1.1 · fuse.js 7.5.0 · lucide-react 1.57.0 · next-themes 0.4.6。npm 上更新的版本（如 TypeScript 7.x、@types/node 26.x）未采用，保守锁旧线。

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
├── test/                  # node:test 单测（解析边界 / 守卫 / diff-merge / 翻译校验，29 条）
├── src/
│   ├── app/               # 路由：/ · /docs/[category] · /entry/[id] · /about · 404 · search-index.json · sitemap · robots
│   ├── components/        # Search（⌘K）· CategoryExplorer · RichText · ServiceIcon · LetterAvatar · 页头页脚
│   └── lib/               # entries.ts（数据加载与索引）· page-tree.ts（侧边栏）· avatar.ts · cn.ts
├── public/favicon.svg
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

内容接入方式（2026-10-15 实现定案）：分类页 `/docs/[category]` 与详情页 `/entry/[id]` 均为服务端组件 + `generateStaticParams`，构建期直接读 `entries.json`；侧边栏 `PageTree` 由分类表构建（`src/lib/page-tree.ts`），全站无 MDX、无 codegen 步骤。搜索为 cmdk + Fuse.js 自建索引：`/search-index.json` 在构建期输出 1,339 条裁剪记录（287KB），客户端首次打开搜索面板时懒加载一次。

## Cloudflare Workers 部署（Static Assets，无适配器）

采用与 `theme-switch-animation` 项目一致的模式：Next.js 纯静态导出，Workers Static Assets 直接托管，不引入任何适配器。

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

- 全部页面必须构建期静态生成：57 个分类页 + 1,339 个详情页由 `generateStaticParams` 产出（全站 1,403 页）；无 ISR、无 middleware、无服务端动态——本站点本来就不需要这些。
- 图片优化不可用 → `images.unoptimized`，条目图标走 `<img>` + letter avatar 兜底（与 03 章降级策略一致）。
- 需要 `app/not-found.tsx` 提供 404 页（对应 `not_found_handling`）。
- `out/` 实测约 7,100 个文件 / 86MB，低于 Workers Static Assets 单版本 20,000 文件上限（2026-10-15 `wrangler dev` 实测通过，含尾斜杠 307 与自定义 404 行为）。
- 域名 `ffd.baiwumm.com` 在 routes 中声明为自定义域名，DNS 在 Cloudflare 侧自动处理。

## CI/CD

| 工作流 | 触发 | 动作 |
|---|---|---|
| `ci.yml` | PR / push main | Biome 检查 + `node --test` + `pnpm build` + `out/` 产物断言（首页/404/搜索索引条数） |
| `daily-sync.yml` | cron UTC 21:23（北京 05:23）+ 手动 | `node --test` → `node scripts/sync.mjs`（含增量翻译）→ 有变更才 commit `data/` 并 `workflow_call` 调 `deploy.yml`；无变更自动跳过提交与部署 |
| `deploy.yml` | push 到 main / workflow_call | `pnpm build` → `cloudflare/wrangler-action` 部署 `out/`（secret：`CLOUDFLARE_API_TOKEN`） |

**触发链注意**：使用默认 `GITHUB_TOKEN` 的提交不会触发其他 GitHub Actions workflow（GitHub 防递归机制），daily-sync 不能靠 push 事件唤起部署，必须通过 `workflow_call` 直调 `deploy.yml`；daily-sync 需声明 `permissions: contents: write` 才能 push commit。人工 push main 与每日同步共用同一份 `deploy.yml`。若改用 Cloudflare Workers Builds 监听仓库（外部 webhook 不受此限制），可省略 `deploy.yml`。

Secrets：`LLM_API_KEY`（翻译；`LLM_BASE_URL`/`LLM_MODEL`/`LLM_BATCH` 在 workflow env 中可调，默认智谱 GLM-4.7-Flash）与 `CLOUDFLARE_API_TOKEN`（部署），存于仓库 Actions secrets（多账户时再加 `CLOUDFLARE_ACCOUNT_ID`）。上游数据无凭据依赖。未配置 `LLM_API_KEY` 时同步照常运行，仅跳过翻译（`desc_zh` 留空，站点降级展示英文原文）。

## 本地开发

```bash
pnpm install                # pnpm 12；供应链策略与构建脚本白名单见 pnpm-workspace.yaml 注释
pnpm dev                    # Next.js 开发服务器
pnpm test                   # node:test 单测（29 条）
pnpm lint                   # Biome 检查（pnpm format 自动格式化）
node scripts/sync.mjs       # 手动同步（--dry-run / --verbose / --readme <path> 便于离线调试）
pnpm translate              # 单独补翻译（需 LLM_API_KEY，--limit N 可小步试跑）
pnpm build                  # next build（output: export → out/，1,403 个静态页）
pnpm preview                # wrangler dev 本地预览 Workers 托管行为
pnpm deploy                 # wrangler deploy（需 CLOUDFLARE_API_TOKEN，或已 wrangler login）
```

## 验收标准

- [x] `pnpm build` 产出 `out/`（1,403 页），`wrangler dev` 本地预览通过（含尾斜杠 307 与自定义 404 行为）——2026-10-15 实测。
- [ ] push main 后自动发布，`ffd.baiwumm.com` 可访问，404 页正常（待配置 `CLOUDFLARE_API_TOKEN`）。
- [ ] 手动触发 daily-sync，模拟上游变更后全自动走到部署（待配置 secrets 后验证）。
