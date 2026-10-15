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

选型理由（详见讨论记录，此处留结论）：Fumadocs 是 Next.js 生态默认颜值最高的文档框架且允许深度定制；内容为结构化数据，采用"构建期由 entries.json 生成 MDX"接入而非手写 MDX。

## 仓库结构（src/ 布局）

应用代码统一放 `src/`，数据与脚本在仓库根层：

```
free-for-dev-zh/
├── docs/                  # 需求文档（本目录）
├── data/                  # 同步流水线产物（入库）
│   ├── entries.json       # 全量条目数据（唯一事实源）
│   ├── categories.json    # 57 个分类中英对照（人工）
│   └── overrides.json     # 人工修正层（可 PR）
├── scripts/               # 零依赖 Node ESM 同步流水线
│   ├── sync.mjs           # 编排：fetch→parse→guard→diff→translate→写回
│   └── translate.mjs      # LLM 批量翻译 + 数字校验
├── src/
│   ├── app/               # App Router 路由与页面
│   ├── components/        # UI 组件
│   └── lib/               # 数据加载、类型、搜索索引
├── content/               # 构建期由 entries.json 生成的 MDX（gitignore）
├── .github/workflows/
│   ├── daily-sync.yml     # 每日同步流水线（cron UTC 10:00）
│   └── ci.yml             # PR 构建检查
├── wrangler.jsonc
├── NOTICE.md              # 上游署名、翻译免责声明（合规落点，见 05）
└── package.json
```

内容接入方式：`scripts/gen-content.mjs`（属于站点构建的一部分，随 M3 建立）在 `next build` 前把 `entries.json` 生成为 57 个分类 MDX 文件进 `content/`（gitignore），侧边栏即分类树。条目详情页 `/entry/[id]` 为普通动态路由 + `generateStaticParams` 直接读 `entries.json`，不进 MDX。

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
  "compatibility_date": "2026-10-15",
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

- 全部页面必须构建期静态生成：57 个分类页 + 约 1,500 个详情页由 `generateStaticParams` 产出；无 ISR、无 middleware、无服务端动态——本站点本来就不需要这些。
- 图片优化不可用 → `images.unoptimized`，条目图标走 `<img>` + letter avatar 兜底（与 03 章降级策略一致）。
- 需要 `app/not-found.tsx` 提供 404 页（对应 `not_found_handling`）。
- `out/` 约 1,600 个文件，远低于 Workers Assets 单部署文件数上限；若未来条目详情页做多语言静态化导致文件数大涨，再评估拆分部署。
- 域名 `ffd.baiwumm.com` 在 routes 中声明为自定义域名，DNS 在 Cloudflare 侧自动处理。

## CI/CD

| 工作流 | 触发 | 动作 |
|---|---|---|
| `ci.yml` | PR / push | 类型检查 + build |
| `daily-sync.yml` | cron UTC 10:00 + 手动 | 跑同步流水线 → commit `data/`（content/ 不提交，构建期生成）→ 直调 `deploy.yml` 发布 |
| `deploy.yml` | push 到 main / workflow_call | `pnpm build && npx wrangler deploy`（secret：`CLOUDFLARE_API_TOKEN`） |

**触发链注意**：使用默认 `GITHUB_TOKEN` 的提交不会触发其他 GitHub Actions workflow（GitHub 防递归机制），daily-sync 不能靠 push 事件唤起部署，必须通过 `workflow_call` 直调 `deploy.yml`；daily-sync 需声明 `permissions: contents: write` 才能 push commit。人工 push main 与每日同步共用同一份 `deploy.yml`。若改用 Cloudflare Workers Builds 监听仓库（外部 webhook 不受此限制），可省略 `deploy.yml`。

Secrets：`LLM_API_KEY`（及备选 key）与 `CLOUDFLARE_API_TOKEN`（部署），存于仓库 Actions secrets。上游数据无凭据依赖。

## 本地开发

```bash
pnpm install
pnpm dev                    # Next.js 开发服务器
node scripts/sync.mjs       # 手动跑一次同步流水线（首翻需 LLM_API_KEY）
pnpm build                  # 先 gen-content 再 next build（output: export → out/）
pnpm deploy                 # wrangler deploy，上传 out/ 到 Workers Static Assets
npx wrangler dev            # 本地预览 Workers 托管行为
```

## 验收标准

- [ ] `pnpm build` 产出 `out/`，可通过 `wrangler dev` 本地预览。
- [ ] push main 后自动发布，`ffd.baiwumm.com` 可访问，404 页正常。
- [ ] 手动触发 daily-sync，模拟上游变更后全自动走到部署。
