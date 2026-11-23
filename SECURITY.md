# Security Policy

free-for-dev-zh 是一个纯静态站点：没有用户账号、没有服务端数据库、不采集访问者数据，站点本身不处理任何机密信息。风险面集中在**供应链与构建链**，以及仓库里的 Actions secrets。

## Reporting a vulnerability

请**不要**在公开 issue、讨论或 PR 中报告安全问题，使用 GitHub 私密漏洞报告：

https://github.com/baiwumm/free-for-dev-zh/security/advisories/new

请说明受影响的部分（依赖 / 工作流 / 站点产物）、版本或 commit、复现方式与你预期的影响。验证用的任何凭据都请用伪造值。

本项目由单人义务维护，响应尽力而为：报告被查看后会先致确认，修复与公开披露之间请留出时间。

## Scope

在范围内：

- 依赖与构建链：`package.json` / `pnpm-lock.yaml` 中的第三方依赖（Next.js、Fumadocs、Biome 等）及其已知漏洞
- GitHub Actions 工作流：`ci.yml` 与 `daily-sync.yml` 的权限边界、`GITHUB_TOKEN` 用法、注入面（PR 标题 / 分支名进入 `run` 的位置）
- 仓库 secrets 的暴露风险（`LLM_API_KEY` 等）
- 构建产物完整性：`out/` 被注入恶意内容（例如经翻译管线注入的可执行脚本）的路径

不在范围内：

- 上游 [ripienaar/free-for-dev](https://github.com/ripienaar/free-for-dev) 的内容问题（请在上游仓库反馈；本站数据以其为准）
- EdgeOne Pages 平台自身的基础设施问题（属于腾讯云侧）
- 仅在他人 fork 上修改配置后才能复现的问题

## Supported versions

只有 `main` 分支的最新构建（线上 <https://ffd.baiwumm.com>）会收到安全修复；历史版本不回补。

## Secrets

永远不要把 `LLM_API_KEY`、令牌或任何真实凭据贴进 issue、讨论或 advisory 的复现步骤里；仓库已开启 push protection，含检测密钥的提交会被拒绝。
