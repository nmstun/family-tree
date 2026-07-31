'use client'

import { cn } from './cn'

// 写真が無いメンバーの表示。
// 以前は性別で 👨 / 👩 の絵文字を出していたが、見た目が野暮ったいうえ、
// 二択で表せない人を扱えないので、名前の頭文字を使う。
// 背景色は頭文字から決めて、一覧の中で見分けやすくする。
const TONES = [
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
]

function toneFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return TONES[Math.abs(hash) % TONES.length]
}

interface AvatarProps {
  photo?: string
  /** 写真が無いときに出す1文字（utils/memberName の initial() を想定） */
  initial: string
  className?: string
}

export default function Avatar({ photo, initial, className }: AvatarProps) {
  const base = 'h-9 w-9 shrink-0 rounded-full object-cover'
  if (photo) {
    return <img src={photo} alt="" className={cn(base, className)} />
  }
  return (
    <div
      aria-hidden
      className={cn(
        base,
        'flex items-center justify-center text-[13px] font-semibold',
        toneFor(initial),
        className
      )}
    >
      {initial}
    </div>
  )
}
