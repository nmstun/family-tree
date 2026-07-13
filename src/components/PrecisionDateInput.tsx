'use client'

import { DatePrecision } from '@/types'

interface PrecisionDateInputProps {
  label: string
  precision: DatePrecision
  value: string
  onPrecisionChange: (precision: DatePrecision) => void
  onValueChange: (value: string) => void
}

export default function PrecisionDateInput({
  label,
  precision,
  value,
  onPrecisionChange,
  onValueChange,
}: PrecisionDateInputProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1 md:mb-2">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <select
          value={precision}
          onChange={(e) => onPrecisionChange(e.target.value as DatePrecision)}
          className="text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="day">年月日</option>
          <option value="month">年月</option>
          <option value="year">年のみ</option>
        </select>
      </div>
      {precision === 'day' && (
        <input
          type="date"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm md:text-base"
        />
      )}
      {precision === 'month' && (
        <input
          type="month"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm md:text-base"
        />
      )}
      {precision === 'year' && (
        <input
          type="number"
          inputMode="numeric"
          placeholder="1850"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm md:text-base"
        />
      )}
    </div>
  )
}
