import { DocsLayout } from 'fumadocs-ui/layouts/docs'
import { Brand } from '@/components/brand'
import { SearchButton } from '@/components/search'
import { pageTree } from '@/lib/page-tree'

export default function DocsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <DocsLayout
      tree={pageTree}
      tabs={false}
      nav={{ title: <Brand />, url: '/' }}
      links={[
        { type: 'custom', on: 'all', children: <SearchButton className="w-full justify-start" /> },
      ]}
      githubUrl="https://github.com/baiwumm/free-for-dev-zh"
      searchToggle={{ enabled: false }}
      sidebar={{ collapsible: true }}
    >
      {children}
    </DocsLayout>
  )
}
