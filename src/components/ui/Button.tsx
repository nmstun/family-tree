'use client'

import { cn } from './cn'

// アプリ内のボタンの見た目をここに集約する。
// 面（塗り）で主張するのは主要な操作だけにして、それ以外は
// 枠線か、hoverまで無地（ghost）に留める。ボタンが並んでも騒がしくならない。
export type ButtonVariant =
  | 'primary' // 主要な操作（追加・保存・確定）
  | 'secondary' // キャンセルなどの副次操作
  | 'outline' // 枠線のみ（破壊的ではないが目立たせたい操作）
  | 'ghost' // 一覧の行内など、普段は無地で hover 時だけ背景が付く
  | 'danger' // 破壊的な操作（一覧の行内の削除ボタン）
  | 'dangerSolid' // 破壊的な操作の最終確定（確認ダイアログのボタン）
  | 'toolbar' // ツールバー用

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm',
  secondary: 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 shadow-sm',
  outline: 'bg-white border border-neutral-300 text-neutral-800 hover:bg-neutral-50 shadow-sm',
  ghost: 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100',
  danger: 'text-neutral-500 hover:text-red-600 hover:bg-red-50',
  dangerSolid: 'bg-red-600 text-white hover:bg-red-700 shadow-sm focus-visible:ring-red-500',
  toolbar: 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100',
}

// タッチ端末で押しやすい高さを確保しつつ、マウス操作のPCでは詰めて表示する。
const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'min-h-[30px] px-2.5 text-[13px] gap-1',
  md: 'min-h-[40px] md:min-h-[34px] px-3.5 text-sm gap-1.5',
  lg: 'min-h-[44px] md:min-h-[38px] px-4 text-sm gap-1.5',
  // アイコンだけのボタン。正方形にする
  icon: 'min-h-[34px] min-w-[34px] text-sm',
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
        'inline-flex items-center justify-center rounded-lg font-medium whitespace-nowrap',
        'transition-colors duration-150',
        'outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20 focus-visible:ring-offset-1',
        'disabled:opacity-40 disabled:pointer-events-none',
        // lucide のアイコンは大きさを揃えて渡す
        '[&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    />
  )
}
