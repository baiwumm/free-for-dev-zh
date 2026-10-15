import { colorOf, letterOf } from '@/lib/avatar'

export function LetterAvatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 select-none items-center justify-center rounded-lg font-semibold text-white"
      style={{
        width: size,
        height: size,
        background: colorOf(name),
        fontSize: Math.round(size * 0.45),
      }}
    >
      {letterOf(name)}
    </span>
  )
}
