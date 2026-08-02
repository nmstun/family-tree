import { describe, it, expect } from 'vitest'
import { toFullDate, toInputValue } from './datePrecision'
import { DatePrecision } from '@/types'

describe('toFullDate', () => {
  it('空文字はそのまま', () => {
    expect(toFullDate('', 'day')).toBe('')
  })

  it('年のみは1月1日で埋める', () => {
    expect(toFullDate('1950', 'year')).toBe('1950-01-01')
  })

  it('年月は1日で埋める', () => {
    expect(toFullDate('1950-06', 'month')).toBe('1950-06-01')
  })

  it('日まで分かっていればそのまま', () => {
    expect(toFullDate('1950-06-15', 'day')).toBe('1950-06-15')
  })
})

describe('toInputValue', () => {
  it('空文字はそのまま', () => {
    expect(toInputValue('', 'day')).toBe('')
  })

  it('精度に応じて切り詰める', () => {
    expect(toInputValue('1950-06-15', 'year')).toBe('1950')
    expect(toInputValue('1950-06-15', 'month')).toBe('1950-06')
    expect(toInputValue('1950-06-15', 'day')).toBe('1950-06-15')
  })
})

describe('往復変換', () => {
  // 精度を変えずに「保存 → 編集画面に戻す → また保存」しても値が動かないこと。
  // ここが崩れると、開いて閉じただけで生年月日が書き換わる。
  const cases: { precision: DatePrecision; stored: string }[] = [
    { precision: 'year', stored: '1950-01-01' },
    { precision: 'month', stored: '1950-06-01' },
    { precision: 'day', stored: '1950-06-15' },
  ]

  cases.forEach(({ precision, stored }) => {
    it(`${precision}: ${stored} は往復しても変わらない`, () => {
      expect(toFullDate(toInputValue(stored, precision), precision)).toBe(stored)
    })
  })
})
