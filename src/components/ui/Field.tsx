'use client'

import { cn } from './cn'

// input / select / textarea に共通で当てるクラス。
// 以前は同じ意味のクラス列が14箇所に重複しており、
// しかも `text-sm` 版と `text-sm md:text-base` 版が混在していた。
export const CONTROL_CLASS =
  'w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg text-sm md:text-base ' +
  'outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ' +
  'disabled:bg-gray-50 disabled:text-gray-500'

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
