'use client'

import { cn } from './cn'

// 画面内に出す短いフィードバック。
// 以前はフォームの入力エラーが native の alert()、招待やインポートは
// 独自のインライン表示、同期状態はまた別の書き方…と3系統に分かれていたので、
// 「操作の結果を伝える文言」はすべてこのコンポーネントに寄せる。
export type AlertTone = 'error' | 'success' | 'info'

const TONE: Record<AlertTone, { icon: string; text: string }> = {
  error: { icon: '⚠', text: 'text-red-600' },
  success: { icon: '✓', text: 'text-green-600' },
  info: { icon: '', text: 'text-gray-500' },
}

interface AlertProps {
  tone?: AlertTone
  children: React.ReactNode
  className?: string
}

export default function Alert({ tone = 'error', children, className }: AlertProps) {
  const { icon, text } = TONE[tone]
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('text-xs md:text-sm whitespace-pre-line', text, className)}
    >
      {icon && <span aria-hidden>{icon} </span>}
      {children}
    </p>
  )
}
