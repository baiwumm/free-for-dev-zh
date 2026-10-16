# AGENTS.md — free-for-dev-zh 开发指南

上游免费资源清单的中文镜像站：`scripts/` 零依赖 Node 流水线（每日同步 + LLM 增量翻译），`src/` Next.js 16 静态导出站点（已上线 <https://ffd.baiwumm.com>）。

## 包管理器

- 使用 **pnpm 12**（`pnpm install`）；Node ≥ 20.9（Node 与 pnpm 版本分别由 `volta`、`packageManager` 字段固定）。
- 保留 `pnpm-workspace.yaml` 的 `allowBuilds`（放行 esbuild / workerd 安装脚本）与 `minimumReleaseAge: 0`——删掉会导致本地与 CI 安装失败；pnpm 11+ 已忽略旧的 `onlyBuiltDependencies` 写法。

## 常用命令

| 任务 | 命令 |
|---|---|
| 开发服务器 | `pnpm dev` |
| 单个测试文件（node:test） | `node --test test/parse.test.mjs` |
| 全部单测 | `pnpm test` |
| 检查 / 格式化（Biome） | `pnpm lint` / `pnpm format`；单文件：`pnpm exec biome check <path>` |
| 静态构建（`output: export` → `out/`） | `pnpm build` |
| 本地预览 Workers 行为（404 / 尾斜杠；需先 `pnpm build`） | `pnpm preview` |
| 手动同步数据（`--dry-run` / `--verbose` / `--readme <file>` / `--no-translate` / `--limit N`） | `pnpm sync` |
| 补翻译（`--limit N`，需 `LLM_API_KEY`） | `pnpm translate` |

## 硬性约束

- 需求或行为变更先改文档再改代码：流水线 → `docs/02-data-sync.md`；页面与视觉 → `docs/03-site-requirements.md`；依赖 / 部署 / CI → `docs/04-technical-design.md`。
- 站点为纯静态导出（`output: 'export'` + `images.unoptimized`）：所有页面构建期生成；外链图标用 `<img>` + letter avatar 兜底；新功能必须兼容静态导出。
- `data/entries.json` 由同步脚本生成（勿手改）；人工修正写 `data/overrides.json`（按条目 ID 覆盖译文），分类名写 `data/categories.json`。
- `desc_zh` 可能为 `null`（未翻译）：所有 UI 必须降级展示英文原文并标注「未翻译」。
- 改 React / Next.js 组件、数据获取或性能相关代码前，先读 `.agents/skills/vercel-react-best-practices/SKILL.md`。
- 改视觉前先读 `docs/03-site-requirements.md` 的视觉要求与 `.agents/skills/frontend-design/SKILL.md`；设计令牌在 `src/app/globals.css`。
- 提交信息使用中文 Conventional Commits（如 `fix(sync): …`）。

## 外部参考

| 需要什么 | 去哪看 |
|---|---|
| 背景与定位 | `docs/01-overview.md` |
| 流水线行为（解析 / 守卫 / 翻译） | `docs/02-data-sync.md` |
| 页面与视觉要求 | `docs/03-site-requirements.md` |
| 技术方案与部署 / CI | `docs/04-technical-design.md` |
| 进度、风险与合规 | `docs/05-milestones-and-risks.md` |
| 署名与免责声明 | `NOTICE.md` |
