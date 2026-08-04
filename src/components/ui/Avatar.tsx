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
  /**
   * 写真を押したときの動作（拡大表示を想定）。
   * 渡したときだけ押せるようになり、写真が無い場合は何も起きない。
   */
  onPhotoClick?: () => void
  /** 押せるときの説明。読み上げとツールチップに使う */
  photoLabel?: string
}

export default function Avatar({
  photo,
  initial,
  className,
  onPhotoClick,
  photoLabel,
}: AvatarProps) {
  const base = 'h-9 w-9 shrink-0 rounded-full object-cover'
  if (photo) {
    // 写真はDBに base64 で持っているため next/image では最適化できない
    // eslint-disable-next-line @next/next/no-img-element
    const image = <img src={photo} alt="" className={cn(base, className)} />
    if (!onPhotoClick) return image
    return (
      <button
        type="button"
        onClick={onPhotoClick}
        aria-label={photoLabel ?? '写真を拡大する'}
        title={photoLabel ?? '写真を拡大する'}
        className="shrink-0 rounded-full transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
      >
        {image}
      </button>
    )
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
