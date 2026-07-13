import { DatePrecision } from '@/types'

// フォーム入力欄の値（精度に応じて YYYY / YYYY-MM / YYYY-MM-DD）を
// 保存用のフルの日付文字列（YYYY-MM-DD、不明な月日は 01 で埋める）に変換する
export function toFullDate(value: string, precision: DatePrecision): string {
  if (!value) return ''
  if (precision === 'year') return `${value}-01-01`
  if (precision === 'month') return `${value}-01`
  return value
}

// 保存されているフルの日付文字列を、精度に応じたフォーム入力欄の値に変換する
export function toInputValue(fullDate: string, precision: DatePrecision): string {
  if (!fullDate) return ''
  if (precision === 'year') return fullDate.slice(0, 4)
  if (precision === 'month') return fullDate.slice(0, 7)
  return fullDate.slice(0, 10)
}
