import type { Metadata } from 'next'
import Link from 'next/link'
import { PlainHeader } from '@/components/plain-header'
import { SiteFooter } from '@/components/site-footer'
import { siteMeta, stats } from '@/lib/entries'

export const metadata: Metadata = {
  title: '关于本站',
  description: '数据来源、同步机制、翻译方式与免责声明。',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  const sha = siteMeta.upstream.commit_sha
  const syncedAt = siteMeta.synced_at
  return (
    <>
      <PlainHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="text-3xl tracking-tight">关于本站</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-fd-muted-foreground">
          本站是{' '}
          <a
            href="https://github.com/ripienaar/free-for-dev"
            target="_blank"
            rel="noreferrer noopener"
            className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
          >
            ripienaar/free-for-dev
          </a>{' '}
          的中文镜像：把面向开发者的免费资源清单（免费额度、免费层、开发者计划）整理成分类的可搜索站点，并保持与上游同步。
        </p>

        <Section title="数据来源与同步">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              上游仓库：ripienaar/free-for-dev（仓库自身的许可条款以上游为准，本站仅做整理与翻译）。
            </li>
            <li>
              每日由 GitHub Actions 自动拉取上游 README 并解析（当前上游版本{' '}
              <code className="rounded-sm bg-fd-muted px-1.5 py-0.5 font-mono text-xs">
                {sha ? sha.slice(0, 7) : '（本地）'}
              </code>
              ，同步时间 {syncedAt.slice(0, 10)}）。
            </li>
            <li>
              解析结果先经过「解析守卫」校验（总量、分类级跌幅、译文覆盖率），异常时中止同步并保留上一版数据。
            </li>
            <li>
              当前收录：{stats.services.toLocaleString('zh-CN')} 项资源，共 {stats.categories}{' '}
              个分类。
            </li>
          </ul>
        </Section>

        <Section title="中文翻译说明">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              中文描述由大模型（GLM
              系列免费模型）增量翻译，翻译结果自动校验数字、链接与长度等一致性。
            </li>
            <li>
              每条译文都保留英文原文入口（详情页「查看英文原文」），服务名称与专有名词不翻译。
            </li>
            <li>个别不满意的翻译可通过仓库的覆盖层文件人工修正。</li>
            <li>翻译仅供快速浏览，涉及免费额度、条款等关键信息请以官网英文原文为准。</li>
          </ul>
        </Section>

        <Section title="免责声明">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>免费政策随时可能调整或终止，本站不保证任何服务的可用性与长期免费。</li>
            <li>本站与上游项目、被收录的各服务商均无隶属或合作关系。</li>
            <li>如发现数据错误或翻译问题，欢迎到本站仓库提交 Issue 或 PR。</li>
          </ul>
        </Section>

        <Section title="技术栈">
          <p>
            Next.js 16（静态导出）+ Fumadocs 16 + Tailwind CSS 4，托管于 Cloudflare Workers
            静态资源；同步与翻译流水线为纯 Node.js 脚本，无额外依赖。
          </p>
        </Section>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-fd-foreground px-4 py-2.5 text-sm text-fd-background transition-opacity hover:opacity-90"
          >
            返回首页
          </Link>
          <a
            href="https://github.com/baiwumm/free-for-dev-zh"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center rounded-md border border-fd-border px-4 py-2.5 text-sm text-fd-muted-foreground transition-colors hover:border-fd-foreground/30 hover:text-fd-foreground"
          >
            GitHub 仓库
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t border-fd-border pt-6">
      <h2 className="text-base">{title}</h2>
      <div className="mt-3 text-sm leading-relaxed text-fd-muted-foreground">{children}</div>
    </section>
  )
}
