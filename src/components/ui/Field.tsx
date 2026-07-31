'use client'

import { cn } from './cn'

// input / select / textarea に共通で当てるクラス。
//
// 文字サイズは16px（text-base）を下回らないようにする。iOS Safari は
// font-size が16px未満の入力欄にフォーカスすると画面を自動で拡大してしまい、
// 以降レイアウトがずれたままになるため。
export const CONTROL_CLASS =
  'w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-base ' +
  'text-neutral-900 placeholder:text-neutral-400 ' +
  'outline-none transition-colors focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10 ' +
  'disabled:bg-neutral-50 disabled:text-neutral-400'

// 一覧の行内などに置く小さめの入力欄。こちらも同じ理由でスマホでは16pxにする。
export const CONTROL_SM_CLASS =
  'px-2 py-1 rounded-md border border-neutral-300 bg-white text-base md:text-[13px] ' +
  'outline-none transition-colors focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/10'

export const LABEL_CLASS = 'block text-[13px] font-medium text-neutral-700'

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
    <div className={cn('mb-3.5', className)}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
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
