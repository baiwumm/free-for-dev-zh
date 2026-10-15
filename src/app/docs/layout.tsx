import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { SearchButton } from '@/components/search'
import { pageTree } from '@/lib/page-tree'

export default function DocsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <DocsLayout
      tree={pageTree}
      tabs={false}
      nav={{ title: <span className="font-semibold">免费开发资源</span>, url: '/' }}
      links={[
        { type: 'custom', on: 'all', children: <SearchButton /> },
        { type: 'main', text: '首页', url: '/', on: 'menu' },
        { type: 'main', text: '关于', url: '/about', on: 'menu' },
      ]}
      githubUrl="https://github.com/baiwumm/free-for-dev-zh"
      searchToggle={{ enabled: false }}
      sidebar={{
        collapsible: true,
        footer: (
          <p className="px-2 text-xs text-fd-muted-foreground">
            数据每日自动同步
            <br />
            中文为机器翻译，仅供参考
          </p>
        ),
      }}
    >
      {children}
    </DocsLayout>
  )
}
