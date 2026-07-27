'use client'

import { cn } from './cn'

// input / select / textarea に共通で当てるクラス。
// 以前は同じ意味のクラス列が14箇所に重複しており、
// しかも `text-sm` 版と `text-sm md:text-base` 版が混在していた。
//
// 文字サイズは16px（text-base）を下回らないようにする。
// iOS Safari は font-size が16px未満の入力欄にフォーカスすると画面を自動で
// 拡大してしまい、以降レイアウトがずれたままになるため。
// 以前はスマホだけ14pxで、拡大される側の画面がまさに小さい設定だった。
export const CONTROL_CLASS =
  'w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg text-base ' +
  'outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ' +
  'disabled:bg-gray-50 disabled:text-gray-500'

// 一覧の行内などに置く小さめの入力欄。こちらも同じ理由でスマホでは16pxにする。
export const CONTROL_SM_CLASS =
  'px-2 py-1 border border-gray-300 rounded text-base md:text-xs ' +
  'outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

export const LABEL_CLASS = 'block text-sm font-medium text-gray-700'

interface FieldProps {
  label: string
  required?: boolean
  htmlFor?: string
  // ラベル行の右端に置く補助的なコントロール（日付の精度セレクトなど）
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export default function Field({
  label,
  required = false,
  htmlFor,
  action,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn('mb-4', className)}>
      <div className="flex items-center justify-between gap-2 mb-1 md:mb-2">
        <label htmlFor={htmlFor} className={LABEL_CLASS}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {action}
      </div>
      {children}
    </div>
  )
}
