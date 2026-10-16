# 02 数据同步需求

数据同步是本项目的引擎：站点是它的输出。本章定义流水线的行为，对应 `scripts/` 下的零依赖 Node ESM 脚本（Node ≥ 20.9，本地用 pnpm scripts 驱动）。

## DS-1 数据源

- 唯一事实源是上游仓库 `ripienaar/free-for-dev` 的 `README.md`，通过 raw.githubusercontent.com 拉取（带重试）。
- 每次同步记录上游的 commit sha 与日期，用于溯源和展示"最近同步时间"。
- 不 fork 仓库、不做 git 操作，只取文件，降低耦合。

## DS-2 解析规则

上游格式多年稳定，用状态机解析（2026-10-15 按真实样本校准）：

```
## 分类标题                        → 新分类（只认 `##` 标题）
  * [服务名](url) - 描述           → 条目；缩进 ≤ 2（含 0）为顶级
    * [子项](url) - 描述           → 嵌套子项；缩进 ≥ 4 挂到最近顶级条目
    - 纯文字备注                   → 同理挂靠，作为父条目备注
```

必须兼容的边界情况（均为实测真实样本）：

- **跳过 `# Table of Contents` 段**：目录行与条目格式同构（如 `  * [DNS](#dns)`），必须整体跳过；目录文案与标题可能不一致（"Major Cloud Providers' Always-Free Limits" vs 标题 "Major Cloud Providers"），分类名只从 `##` 标题取；
- **缩进 0 的顶级条目**：实测 7 条（如顶格书写的 `* [Appinvento](...)`），不可假定顶级条目必为缩进 2；
- **非常规缩进**：实测 1 条缩进 5 的子条目、3 条缩进 7 的 `- ` 备注（Oracle 词条下），按"缩进大于父条目"挂靠，不做硬编码层级；
- **非标准描述分隔符**：实测 7 条以 `—`（em dash）紧跟 URL、2 条（Zoho 词条）URL 后无分隔符直接接描述，需同时兼容 ` - `、`—`、无分隔三种形态；
- 无描述的条目（只有名称和链接，实测 6 条）；
- 描述中含 ` - `、含 markdown 链接（如 Revolt.chat 描述内嵌 Discord 链接）、含代码片段；
- 无链接的纯文本子项（如 `Full, detailed list - https://cloud.google.com/free`），作为父条目的备注保留；
- 实测 65 个带链接嵌套子条目 + 33 条纯文字备注，均通过 `parent` 字段挂靠。

## DS-3 数据模型

产物 `data/entries.json`（顶层 `{ meta, categories, entries }`）：`meta` 记录 `synced_at`、上游 `commit_sha/commit_date`（取自 GitHub Atom feed，避开 api.github.com 匿名限流）与计数；`categories` 为 `[{ id, name_en }]`。`entries` 每条：

```json
{
  "id": "sha1(归一化url|\"|\"+category) 前 12 位；备注为 sha1(parentId|\"|\"+category|\"|\"+desc_en) 前 12 位",
  "kind": "entry | note",
  "name": "Google Cloud Platform",
  "url": "https://cloud.google.com",
  "category": "major-cloud-providers",
  "parent": null,
  "desc_en": "原文描述",
  "desc_zh": "中文译文（未翻译为 null）",
  "status": "active | removed",
  "first_seen": "2026-10-15",
  "updated_at": "2026-10-15"
}
```

纯文字备注（`kind: "note"`）无名称与 URL（恒为 `null`），只承载文字。

- **归一化 URL + 分类作为稳定 ID**：同一 URL 可能出现在两个分类（实测 `ipgeolocation.io`、`codemagic.io` 各 2 次），ID 不含分类会碰撞丢条；URL 先归一化（https 化、host 小写、去尾斜杠）再参与 ID 与 diff；流水线启动时执行 ID 唯一性断言，发现重复即失败退出。
- 分类 ID 取上游英文标题的 slug，保证每条译文都能链回上游原文锚点。
- 上游删除的条目标 `status: "removed"`，保留在数据中但不展示，保留历史可追溯。

## DS-4 解析守卫（格式漂移检测）

三道断言任一触发即中止写回（不写入任何数据）并告警：① 总量——解析出的 active 条目数（不含 removed）较上一版跌幅超过 10%，判定为上游格式漂移，这是防止上游某天改版把数据清空的安全闸；② 分类级——单个分类（≥ 5 条）跌幅超过 30%；③ 译文覆盖率——active 条目译文覆盖率较上一版下降超过 10 个百分点。守卫在 merge 与 overrides 合并**之后**执行（覆盖率按结转后的译文计算，避免误报）；首次运行无基线时直接通过。

## DS-5 差异比对

- 按条目 ID（归一化 URL + 分类）分三组：新增、删除、描述变更（描述文本先做空白归一化再取哈希，避免上游空格/换行微调触发无谓翻译）。
- 只把"新增 + 描述变更"送翻，删除只改状态。
- 预期日常增量：每天 0–10 条。

## DS-6 翻译策略

- **模型（主选，免费层）**：智谱 GLM 免费文本模型——`GLM-4.7-Flash`（200K 上下文）或 `GLM-4.5-Flash`（128K），官方标注免费，国内访问无障碍（2026-10-15 核实）。
- **模型（备选，按量付费）**：DeepSeek `deepseek-flash`。DeepSeek 无免费层，但价格极低：首翻约 19.5 万字符，按现价估算约 ¥0.5–1.5，每日增量可忽略；对翻译质量不满意时切换。
- **备选三（免费，待核实）**：Gemini API 免费层的 flash 系列，跑在 GitHub Actions 无网络障碍，限额以官网为准。
- **限流逃生（免费）**：`LLM_MODEL_FALLBACK=glm-4.5-flash`——主力返回 429 时，同批次第二轮重试自动切到它，日常增量全程零成本。
- **首翻加速（按量付费，一次性）**：首次全量补翻可在手动触发时覆盖模型：`gh workflow run daily-sync.yml -f model=glm-5.3-flash`——约旗舰价 1/10（首翻全量预计 ¥1 以内，需账户有余额）；该系列思考模式无法关闭，脚本已自动对其跳过 `LLM_THINKING`（2026-10-16 核实）。补翻完成后日常同步自动回到免费模型，无需改配置。
- 上述接口均为 OpenAI 兼容，切换只需改 base_url 与 key。
- 批量：每请求默认 20 条（`LLM_BATCH` 可调至 50，CI 取 40 以摊薄请求数），要求返回 JSON 数组；低并发串行 + 限流感知重试：HTTP 层对 429 长退避（10/20/30 秒），其余错误短退避；同批最多重试 1 轮（只重试未过的条目，第二轮可切 `LLM_MODEL_FALLBACK` 备用模型）。4xx（如内容过滤 1301）不盲重试：整批失败自动二分拆分递归重试至单条，把问题条目隔离出来，同批其余条目照常通过。
- 限流熔断：批间自适应节流（整批失败加倍至上限 30 秒、成功回落），连续 5 批零成功即提前结束本轮（进度保留，下次同步自动续翻）——免费层限流（首翻实测 120 次 429）下避免空烧 Actions 时长。
- Prompt 硬约束：**数字、单位、配额、百分比保真**，只翻译叙述文字；服务名不翻译。
- 翻后校验（四项全过才通过）：
  1. **数字集合**：两边先归一化（去千分位、欧式 `3.000` / 空格 `10, 000` 千分位、全角转半角、英文数词 `five hundred` → `500`、`5 million` ↔ `500 万`、`1k` ↔ `1,000` 等值）再比对；大数（>12）严格一致，小数（≤12）允许「一台」「九个」这类中文数量表达；序数词（`3rd-party`）不参与；
  2. **链接集合**：译文中 markdown 链接目标与原文逐一一致；
  3. **长度比**：译文长度落在原文的 0.2–1.5 倍区间（原文不足 30 字符的标签类描述豁免），防截断、防复读；
  4. **坏输出**：空译、拒答语句，以及品牌特征服务名（含数字/符号/驼峰，如 `BudiBase`、`MediaWorkbench.ai`）未在译文保留（大小写不敏感），任一命中即判失败；通用词名称（`Surveys`、`Financial Data`）不强制。
  校验失败先重试（第二轮可切备用模型），仍失败则跳过该条（保留 `desc_zh: null`，站点降级展示英文原文并打"未翻译"标），失败原因（具体校验项 / 请求错误）随日志输出。
- 去重与人工优先：相同 `desc_en` 去重后只翻一次、回填所有同描述条目；已有人工覆盖译文的条目（见 DS-7）直接跳过翻译。
- 环境变量：

| 变量 | 默认值 | 说明 |
|---|---|---|
| `LLM_API_KEY` | — | 唯一必填；未设置则整段跳过翻译 |
| `LLM_BASE_URL` | `https://open.bigmodel.cn/api/paas/v4` | OpenAI 兼容接口 |
| `LLM_MODEL` | `glm-4.7-flash` | 模型名 |
| `LLM_MODEL_FALLBACK` | — | 备用模型；同批第二轮重试时使用（限流逃生通道；CI 工作流注入 `glm-4.5-flash`，未设置则不启用） |
| `LLM_BATCH` | `20` | 每请求条数 |
| `LLM_THINKING` | — | 设为 `disabled` 显式关闭思考模式（部分模型支持） |

- 独立运维入口：`node scripts/translate.mjs --limit N` 可在不跑同步的情况下小步补齐缺失译文。

## DS-7 人工层

| 文件 | 用途 |
|---|---|
| `data/categories.json` | 57 个分类中英对照，一次性人工翻译，可 review；格式 `{ "categories": [{ "id", "name_en", "name_zh" }] }`。上游出现新分类而表中缺失时，同步中止并提示补充 |
| `data/overrides.json` | 人工修正层：`{ "<条目id>": { "desc_zh": "人工译文" } }`，在翻译**之前**应用——有覆盖译文的条目直接跳过机翻 |

翻译产出永远可以被人工层覆盖，机翻只做第一稿。

## DS-8 流水线与调度

固定顺序，任一步失败即中止、保持上一个完好状态（幂等）。`sync.mjs` 止于原子写回，`commit` 与部署由 `daily-sync.yml` 完成：

```
fetch → parse → ID 唯一性/分类校验 → diff → merge → overrides → guard → translate → 原子写回   # sync.mjs
commit → workflow_call 部署                                                                    # daily-sync.yml
```

- 调度：GitHub Actions cron，UTC 21:23（北京时间次日 05:23）；`daily-sync.yml` 在写回后提交 `data/`，并通过 `workflow_call` 直调 `deploy.yml`（默认 GITHUB_TOKEN 的提交不触发 push 事件，见 04 触发链说明）。上游无变化时自动跳过提交与部署。
- 调试参数：`node scripts/sync.mjs` 支持 `--dry-run`（不写盘）、`--verbose`（逐分类计数）、`--no-translate`、`--limit N`、`--readme <本地文件>`（离线跑）。
- 原子写回：翻译结果先写临时文件，全部校验通过后才替换 `data/entries.json`，中途失败不留半成品。
- 失败通知：Actions 失败邮件（默认启用）；企业微信机器人每日摘要（新增 X 条 / 更新 Y 条 / 失败告警）为规划项，尚未接线。
- 上游拉取失败时原样重试，仍失败则本次同步跳过（站点保持昨日数据，workflow 正常结束）。

## 验收标准

- [x] 首次运行产出 1,339 条链接条目（另含 33 条纯文字备注）的 `entries.json`，分类 57 个，guard 通过——2026-10-15 实测（上游 commit 3764884）。
- [x] 增/删/改差异比对精确匹配（`test/guard-diff.test.mjs`，含"仅空白差异不算变更""removed 重现按新增"用例）。
- [x] 数字校验用例 100% 通过（含 `5 million`/`500 万`、`1,000`、`3.000` 欧式千分位、全角、`0.5GB`、`100ms` 等值换算与反例，`test/validate.test.mjs`）。
- [x] 解析器单测覆盖真实边界样本：TOC 段跳过、缩进 0/4/5/7、`—` 分隔与无分隔描述、纯文字备注、描述内嵌链接，全部通过（33 条单测全绿）。
- [x] 上游条目数骤降时 guard 阻止写回并告警（总量 10% / 单分类 30% / 覆盖率 10pp 三组用例）。
- [x] 首次全量翻译（手动触发 `Daily Sync`）已完成（2026-10-16）；翻译 → 提交 → `workflow_call` 部署链路与 04 章一致，完成度与残余条目见 05 章。
