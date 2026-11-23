# Contributing to free-for-dev-zh

感谢愿意参与。本站是 [ripienaar/free-for-dev](https://github.com/ripienaar/free-for-dev) 的中文镜像，由单人维护，**短小、聚焦的改动**远比大而全的 PR 容易评审与合入。

## 开始之前

- 先读 [AGENTS.md](./AGENTS.md)：仓库布局、命令、硬性约束（含提交规范）的唯一事实源。
- 超过小修范围的改动，先开一个 [Ideas 讨论](https://github.com/baiwumm/free-for-dev-zh/discussions/categories/ideas)对齐方向。
- 可复现的问题走 issue 表单；使用与勘误提问走 [Discussions Q&A](https://github.com/baiwumm/free-for-dev-zh/discussions/categories/q-a)。

## 本地开发

前置：Node ≥ 20.9、pnpm 12（版本由 `packageManager` / Volta 固定，启用 corepack 即可）。

```bash
pnpm install
pnpm dev            # 本地开发（http://localhost:3000）
pnpm test           # 单元测试（node:test）
pnpm lint           # Biome 检查（pnpm format 自动格式化）
pnpm build          # 静态导出到 out/
pnpm preview        # 本地预览 out/（需先 build）
pnpm sync           # 手动同步上游（无 LLM_API_KEY 时只解析不翻译）
pnpm translate      # 单独补翻译（需要 LLM_API_KEY）
pnpm audit:data     # 数据质量抽检（--sample 5 随机抽检）
```

CI 跑的是同一套门禁：Biome + `node --test` + `pnpm build` + `out/` 产物断言，PR 需全绿。

## 数据层注意事项

- `data/entries.json` 是同步流水线产物，**不要手改**；人工修正译文写 `data/overrides.json`（按条目 ID 覆盖）。
- 新出现的中文分类名写 `data/categories.json`，否则同步会停下提示补充。
- `desc_zh` 可能为 `null`（未翻译）：所有 UI 必须降级展示英文原文并标注「未翻译」。

## 文档先行

需求或行为变更先改文档再改代码：流水线 → `docs/02-data-sync.md`；页面与视觉 → `docs/03-site-requirements.md`；依赖 / 部署 / CI → `docs/04-technical-design.md`。

## Pull requests

- 一个 PR 只做一件逻辑事，保持 diff 聚焦。
- 提交信息用中文 Conventional Commits（`feat` / `fix` / `docs` / `test` / `chore` / `refactor`）。
- AI 参与的改动必须按 [AGENTS.md](./AGENTS.md)「提交规范」带 trailer 块，否则不计入工具署名。
- 站点为纯静态导出（`output: 'export'`）：新功能必须兼容静态导出，不引入运行时服务。
- 推送前本地跑过 `pnpm lint`、`pnpm test`，站点改动外加 `pnpm build`。

## 依赖

新增运行时依赖前先想清楚：`scripts/` 流水线保持零第三方依赖，站点侧优先用平台能力或已有依赖。

## Secrets

永远不要提交 `LLM_API_KEY` 等任何密钥；仓库已开启 push protection，含检测到密钥的提交会被直接拒绝。测试与文档只用伪造值。

## 社区

参与本项目即表示你同意遵守[行为准则](./CODE_OF_CONDUCT.md)，违规请举报至 me@baiwumm.com。

## 安全

不要在公开 issue 或 PR 中讨论漏洞，请按 [SECURITY.md](./SECURITY.md) 的私密渠道报告。
