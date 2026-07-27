'use client'

import { cn } from './cn'

// 「まだ何もない」ことを伝える表示。
// 以前はパネル状のもの・ただの薄い文字・大きめの余白付き…と3種類あった。
//   panel … その領域全体が空のとき（カードとして見せる）
//   inline … 一覧の中身だけが空のとき（軽く添えるだけ）
interface EmptyStateProps {
  variant?: 'panel' | 'inline'
  children: React.ReactNode
  className?: string
}

export default function EmptyState({ variant = 'panel', children, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'text-center text-gray-500',
        variant === 'panel'
          ? 'bg-white rounded-lg shadow p-6 md:p-8 text-sm md:text-base'
          : 'py-3 text-xs md:text-sm',
        className
      )}
    >
      {children}
    </div>
  )
}
