'use client'

import { cn } from './cn'

// 状態を示す小さなラベル。「参加済み」「招待中」「自分」など。
export type BadgeTone = 'neutral' | 'success' | 'warning'

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-100 text-neutral-600 ring-neutral-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
}

interface BadgeProps {
  tone?: BadgeTone
  children: React.ReactNode
  className?: string
}

export default function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5',
        'text-[11px] font-medium ring-1 ring-inset',
        '[&_svg]:h-2.5 [&_svg]:w-2.5',
        TONE_CLASS[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
