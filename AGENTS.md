# AGENTS.md — free-for-dev-zh 开发指南

> 上游免费资源清单的中文镜像站（数据流水线 + Next.js 16 静态站点，已上线 <https://ffd.baiwumm.com>）。
> 项目约定：**改代码前先改 `docs/` 对应章节**（文档是需求基线）。

## 包管理器

- 使用 **pnpm 12**（`pnpm install`）；Node ≥ 20，Node 版本由 `volta` 字段固定、pnpm 由 `packageManager` 字段固定（启用 corepack 即可）。
- `pnpm-workspace.yaml` 中 `allowBuilds`（放行 esbuild/workerd 安装脚本）与 `minimumReleaseAge: 0` 是本地与 CI 安装成功的前提，不要删除。旧写法 `onlyBuiltDependencies` 在 pnpm 11+ 已被忽略。

## 常用命令

| 任务 | 命令 |
|---|---|
| 开发 | `pnpm dev` |
| 单测（node:test，31 条） | `pnpm test` |
| 检查 / 格式化（Biome） | `pnpm lint` / `pnpm format` |
| 静态构建（`output: export` → `out/`，1,400+ 页） | `pnpm build` |
| 本地预览 Workers 行为（404 / 尾斜杠） | `pnpm preview` |
| 手动同步数据（`--dry-run` / `--verbose` / `--readme <file>` / `--no-translate`） | `pnpm sync` |
| 补翻译（`--limit N`，需 `LLM_API_KEY`） | `pnpm translate` |

## 硬性约束

- 站点为纯静态导出：不使用服务端动态能力、middleware、next/image 优化；外链图标用 `<img>` + letter avatar 兜底。
- `data/entries.json` 是数据唯一事实源，由脚本生成，**不手改**；人工修正写 `data/overrides.json`（按条目 ID 覆盖译文），分类名在 `data/categories.json`。
- `desc_zh` 可为 `null`（未翻译）：所有 UI 必须降级展示英文并标注「未翻译」。
- React / Next.js 代码必须遵循 `.agents/skills/vercel-react-best-practices/SKILL.md` 的最佳实践（写组件、数据获取、性能相关改动前先通读对应规则）。
- 视觉系统（纸墨单色 + 钴蓝强调色、Maple Mono CN 字体）定义在 `src/app/globals.css`，要求见 `docs/03-site-requirements.md`；改动视觉前参考项目技能 `.agents/skills/frontend-design/SKILL.md`。
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
