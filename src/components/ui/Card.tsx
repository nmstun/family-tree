'use client'

import { cn } from './cn'

// 白い角丸パネル。以前は影付き・枠線付きが混在していたので影付きに統一する。
// padding は用途によって変わる。
//   panel … フォームなどの独立したまとまり
//   row   … 一覧の行のように詰めて並べるもの
//   none  … 中で divide-y を使うなど自前で余白を持つもの
export type CardPadding = 'panel' | 'row' | 'none'

const PADDING_CLASS: Record<CardPadding, string> = {
  panel: 'p-4 md:p-6',
  row: 'p-3',
  none: '',
}

// <form> など div 以外の要素にも同じ見た目を適用できるようにクラスだけ切り出す。
export function cardClass(padding: CardPadding = 'panel', className?: string): string {
  return cn('bg-white rounded-lg shadow', PADDING_CLASS[padding], className)
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
}

export default function Card({ padding = 'panel', className, ...props }: CardProps) {
  return <div className={cardClass(padding, className)} {...props} />
}
