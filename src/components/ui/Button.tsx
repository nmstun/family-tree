'use client'

import { cn } from './cn'

// アプリ内のボタンの見た目をここに集約する。
// 以前は同じ「主ボタン」でも padding・文字サイズ・font-medium の有無が
// 画面ごとにバラバラだったため、variant と size の組み合わせだけで
// 表現できるようにして揃えている。
export type ButtonVariant =
  | 'primary' // 主要な操作（追加・保存・確定）
  | 'secondary' // キャンセルなどの副次操作
  | 'outline' // 主要色の枠線のみ（破壊的ではないが目立たせたい操作）
  | 'subtle' // 一覧の行内に置く軽い操作（編集など）
  | 'danger' // 破壊的な操作（一覧の行内の削除ボタン）
  | 'dangerSolid' // 破壊的な操作の最終確定（確認ダイアログのボタン）
  | 'toolbar' // 家系図ビューのツールバー用の丸いピル

export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  secondary: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50',
  outline: 'bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50',
  subtle: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200',
  danger: 'bg-red-100 text-red-700 hover:bg-red-200',
  dangerSolid: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  toolbar: 'bg-white border border-gray-200 shadow-sm text-gray-600 hover:bg-gray-100',
}

// タッチ端末で押しやすい高さを確保しつつ、マウス操作のPCでは詰めて表示する。
const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'min-h-[32px] px-2.5 text-xs',
  md: 'min-h-[44px] md:min-h-[36px] px-4 text-sm',
  lg: 'min-h-[48px] md:min-h-[44px] px-6 text-sm md:text-base',
}

// 角丸は variant と size の両方に依存する。Tailwindでは同じプロパティの
// クラスを2つ並べてもどちらが勝つかがクラス名の順序では決まらないため、
// 競合しないよう1つだけ選んで付ける。
function radiusClass(variant: ButtonVariant, size: ButtonSize): string {
  if (variant === 'toolbar') return 'rounded-full'
  return size === 'sm' ? 'rounded-md' : 'rounded-lg'
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium transition whitespace-nowrap',
        'outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        radiusClass(variant, size),
        fullWidth && 'w-full',
        className
      )}
      {...props}
    />
  )
}
