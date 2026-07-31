'use client'

import { AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { cn } from './cn'

// 画面内に出す短いフィードバック。
// 「操作の結果を伝える文言」はすべてこのコンポーネントに寄せる。
export type AlertTone = 'error' | 'success' | 'info'

const TONE = {
  error: { Icon: AlertCircle, text: 'text-red-600' },
  success: { Icon: CheckCircle2, text: 'text-emerald-600' },
  info: { Icon: Info, text: 'text-neutral-500' },
} as const

interface AlertProps {
  tone?: AlertTone
  children: React.ReactNode
  className?: string
}

export default function Alert({ tone = 'error', children, className }: AlertProps) {
  const { Icon, text } = TONE[tone]
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-1.5 text-[13px] whitespace-pre-line', text, className)}
    >
      <Icon className="h-4 w-4 shrink-0 mt-px" aria-hidden />
      <span>{children}</span>
    </p>
  )
}
