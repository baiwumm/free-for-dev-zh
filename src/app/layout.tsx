import { RootProvider } from 'fumadocs-ui/provider/next'
import type { Metadata, Viewport } from 'next'
import { JsonLd } from '@/components/json-ld'
import { stats } from '@/lib/entries'
import { FONT_URL } from '@/lib/font'
import { SITE_URL, siteGraph } from '@/lib/schema'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '免费开发资源 · Free for Dev 中文版',
    template: '%s | 免费开发资源',
  },
  description: `ripienaar/free-for-dev 中文版：${stats.categories} 个分类、${stats.services.toLocaleString('zh-CN')} 项面向开发者的免费服务（云厂商免费额度、CI/CD、监控、数据库、邮件、DNS 等），每日自动同步上游清单并增量翻译。`,
  icons: { icon: '/favicon.svg' },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    siteName: '免费开发资源',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FCFCFD' },
    { media: '(prefers-color-scheme: dark)', color: '#0D1013' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-fd-background font-sans text-fd-foreground antialiased">
        <link rel="preload" as="font" type="font/woff2" href={FONT_URL} crossOrigin="anonymous" />
        <RootProvider theme={{ defaultTheme: 'system' }} search={{ enabled: false }}>
          {children}
        </RootProvider>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="免费开发资源（RSS）"
          href="/feed.xml"
        />
        <JsonLd data={siteGraph()} />
      </body>
    </html>
  )
}
