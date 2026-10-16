import { RootProvider } from 'fumadocs-ui/provider/next'
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://ffd.baiwumm.com'),
  title: {
    default: '开发者的免费资源清单 · Free for Dev 中文版',
    template: '%s | 免费开发资源',
  },
  description:
    'ripienaar/free-for-dev 中文版：57 个分类、1,300+ 个面向开发者的免费服务（云厂商免费额度、CI/CD、监控、数据库、邮件、DNS 等），每日自动同步上游清单并增量翻译。',
  keywords: ['free for dev', '免费开发资源', '开发者免费服务', '免费云服务', '免费 API'],
  icons: { icon: '/favicon.svg' },
}

const ldJson = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: '免费开发资源',
  url: 'https://ffd.baiwumm.com',
  description: 'ripienaar/free-for-dev 的中文版，每日自动同步与增量翻译。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-fd-background font-sans text-fd-foreground antialiased">
        <RootProvider theme={{ defaultTheme: 'system' }} search={{ enabled: false }}>
          {children}
        </RootProvider>
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD 结构化数据，内容为构建期常量且无用户输入
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
        />
      </body>
    </html>
  )
}
