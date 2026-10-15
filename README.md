# free-for-dev-zh

[ripienaar/free-for-dev](https://github.com/ripienaar/free-for-dev) 的**中文版**：把 57 个分类、1,300+ 个面向开发者的免费资源（云厂商免费额度、CI/CD、监控、数据库、邮件、DNS……）整理成可搜索的静态站点，并对上游清单**每日自动同步 + 增量翻译**。

- 站点：<https://ffd.baiwumm.com>
- 数据每日自动同步（GitHub Actions），中文描述由大模型增量翻译（GLM 免费模型），以英文原文与官网为准。

## 特性

- **全自动同步**：每天定时拉取上游 README → 解析 → 守卫校验 → 增量翻译 → 提交 → 自动部署，全程无需人工干预。
- **解析守卫**：总量 / 分类级跌幅 / 译文覆盖率三道断言，上游格式漂移时中止同步并保留上一版数据。
- **增量翻译**：只翻译新增与变更条目，批内去重；数字、链接、长度、坏输出四项自动校验，失败的条目降级展示英文原文。
- **静态站点**：Next.js 16（`output: export`）+ Fumadocs 16 + Tailwind CSS 4，部署在 Cloudflare Workers 静态资源，成本约为零。
- **零依赖流水线**：`scripts/` 全部为纯 Node.js（无第三方依赖），单测使用内置 `node:test`。

## 仓库结构

```
data/              数据层（提交到仓库）
  entries.json     同步产物：条目 + 分类 + 元信息（上游 commit、同步时间）
  categories.json  57 个分类的中英对照（人工层，新分类出现时同步会停下来提示补充）
  overrides.json   人工翻译覆盖层（按条目 ID 覆盖机翻结果）
scripts/           同步流水线（纯 Node.js）
  sync.mjs         拉取 → 解析 → 守卫 → 差异 → 合并 → 翻译 → 原子写入
  translate.mjs    批量翻译（GLM / 任意 OpenAI 兼容接口），可独立运行
  lib/             fetch / parse / guard / diff / merge / validate / ids / slug
test/              解析边界、守卫、差异合并、翻译校验的单元测试
src/               Next.js 站点（首页 / 分类页 / 详情页 / 关于页 / ⌘K 搜索）
.github/workflows/ ci.yml · daily-sync.yml · deploy.yml
```

## 本地开发

```bash
pnpm install
pnpm dev            # 本地开发（http://localhost:3000）
pnpm test           # 单元测试
pnpm sync           # 手动同步上游（无 key 时只解析不翻译）
pnpm translate      # 单独补齐缺失的中文翻译（需要 LLM_API_KEY）
pnpm build          # 静态导出到 out/
pnpm preview        # wrangler dev 本地预览 out/ 产物
pnpm deploy         # 部署到 Cloudflare Workers（需要 CLOUDFLARE_API_TOKEN）
```

### 环境变量（翻译）

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `LLM_API_KEY` | — | 必填（配置后才启用翻译） |
| `LLM_BASE_URL` | `https://open.bigmodel.cn/api/paas/v4` | OpenAI 兼容接口地址（智谱 / DeepSeek 等均可） |
| `LLM_MODEL` | `glm-4.7-flash` | 模型名 |
| `LLM_BATCH` | `20` | 每请求翻译条目数（建议 20–50） |
| `LLM_THINKING` | — | 设为 `disabled` 时显式关闭思考模式（部分模型支持） |

## 部署（一次性配置）

1. 在 GitHub 仓库 Settings → Secrets and variables → Actions 添加：
   - `LLM_API_KEY`：智谱开放平台（或任意 OpenAI 兼容服务）的 API Key；
   - `CLOUDFLARE_API_TOKEN`：Cloudflare API Token（Workers 部署权限）。
2. 首次部署：push 到 `main` 会自动触发 `Deploy`；或本地 `pnpm deploy`。
3. 之后每天 UTC 21:23（北京时间 05:23）`Daily Sync` 自动跑；上游无变化则自动跳过提交与部署。
4. 如 Cloudflare 账号下有多个账户，再补一个 `CLOUDFLARE_ACCOUNT_ID` secret。

> 注：pnpm 12 默认要求对 `esbuild` / `workerd` 的安装脚本进行审批、并对发布时间不足 24h 的版本按照供应链策略拦截；本仓库已通过 `pnpm-workspace.yaml` 显式配置（见文件内注释）。

## 数据与许可

- 上游 [ripienaar/free-for-dev](https://github.com/ripienaar/free-for-dev) 未声明开源许可证；本站为个人整理的中文镜像，原始内容版权归上游作者与贡献者所有，站点已显著署名并链接上游。
- 本站代码以 MIT 许可开源（见 [LICENSE](./LICENSE)），该许可不覆盖上游数据。
- 中文描述为机器翻译，仅供快速浏览；免费额度等关键信息请以官网为准。
- 详见 [NOTICE.md](./NOTICE.md)。
