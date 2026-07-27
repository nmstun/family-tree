'use client'

import { DatePrecision } from '@/types'
import { Field, CONTROL_CLASS, CONTROL_SM_CLASS } from './ui'

interface PrecisionDateInputProps {
  label: string
  precision: DatePrecision
  value: string
  onPrecisionChange: (precision: DatePrecision) => void
  onValueChange: (value: string) => void
}

// 精度によって使う input の type だけが変わるので、対応表で切り替える
const INPUT_TYPE: Record<DatePrecision, string> = {
  day: 'date',
  month: 'month',
  year: 'number',
}

export default function PrecisionDateInput({
  label,
  precision,
  value,
  onPrecisionChange,
  onValueChange,
}: PrecisionDateInputProps) {
  return (
    <Field
      label={label}
      action={
        <select
          value={precision}
          onChange={(e) => onPrecisionChange(e.target.value as DatePrecision)}
          aria-label={`${label}の精度`}
          className={CONTROL_SM_CLASS}
        >
          <option value="day">年月日</option>
          <option value="month">年月</option>
          <option value="year">年のみ</option>
        </select>
      }
    >
      <input
        type={INPUT_TYPE[precision]}
        inputMode={precision === 'year' ? 'numeric' : undefined}
        placeholder={precision === 'year' ? '1850' : undefined}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={CONTROL_CLASS}
      />
    </Field>
  )
}
