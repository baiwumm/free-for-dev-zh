/**
 * 结构化数据输出：构建期常量，统一用组件包一次 `dangerouslySetInnerHTML`，
 * 避免各页面重复写 script 标签（见 03 NFR-2）。
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD 为构建期常量，且已转义 `<`
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
