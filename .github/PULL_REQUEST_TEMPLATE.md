## 变更说明

<!-- 一句话说明「为什么改」，以及改前改后的行为差异 -->

Closes #

## 涉及范围

- [ ] 同步流水线（`scripts/`）
- [ ] 站点（`src/`）
- [ ] 数据层（`data/`，注意 `entries.json` 由流水线生成，人工修正走 `overrides.json`）
- [ ] 文档（`docs/` / `README.md` / `AGENTS.md`）
- [ ] 仓库配置（`.github/`）
- [ ] 静态资源（`public/`）

## 一致性与真源检查

- [ ] 需求或行为变更：已先改 `docs/` 对应文档（流水线 → 02，页面与视觉 → 03，依赖 / 部署 / CI → 04）再改代码
- [ ] 涉及 `desc_zh` 为 `null` 的条目：UI 已降级展示英文原文并标注「未翻译」
- [ ] 站点功能：兼容纯静态导出（`output: 'export'`），无运行时依赖
- [ ] 改 React / Next.js 组件或数据获取：已读过 `.agents/skills/vercel-react-best-practices/SKILL.md`
- [ ] 改视觉：已读过 `docs/03` 视觉要求与 `.agents/skills/frontend-design/SKILL.md`
- [ ] 未手改 `data/entries.json`（同步产物）
- [ ] AI 参与的改动：提交信息已按 `AGENTS.md`「提交规范」带 trailer 并通过 `normalize.mjs check`

## 验证结果

<!-- 填实际跑过的命令与结果；未跑的项写明原因 -->

- `pnpm lint`：
- `pnpm test`：
- `pnpm build`（站点改动必填）：
- `pnpm audit:data`（数据 / 翻译改动必填）：

## 截图 / 录屏

<!-- UI 变更必填；无视觉变化可删除本节 -->
