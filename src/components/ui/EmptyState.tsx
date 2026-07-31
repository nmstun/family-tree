'use client'

import { cn } from './cn'

// 「まだ何もない」ことを伝える表示。
//   panel … その領域全体が空のとき（面として見せる）
//   inline … 一覧の中身だけが空のとき（軽く添えるだけ）
interface EmptyStateProps {
  variant?: 'panel' | 'inline'
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export default function EmptyState({
  variant = 'panel',
  icon,
  children,
  className,
}: EmptyStateProps) {
  if (variant === 'inline') {
    return (
      <div className={cn('text-center text-[13px] text-neutral-400 py-4', className)}>
        {children}
      </div>
    )
  }
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 text-center',
        'bg-white rounded-xl border border-dashed border-neutral-300 px-6 py-10',
        className
      )}
    >
      {icon && <div className="text-neutral-300 [&_svg]:h-7 [&_svg]:w-7">{icon}</div>}
      <p className="text-sm text-neutral-500">{children}</p>
    </div>
  )
}
