import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { calculateAge, calculateGrade, formatAgeSummary } from './age'

// 年齢・学年は「今日」に依存するため、時刻を固定しないとテストが年を跨いで壊れる。
const NOW = new Date('2026-08-02T12:00:00+09:00')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('calculateAge', () => {
  it('生年月日が無ければ null', () => {
    expect(calculateAge(undefined)).toBeNull()
  })

  it('誕生日を迎えていれば満年齢', () => {
    expect(calculateAge('1990-06-15')).toBe(36)
  })

  it('誕生日前ならひとつ手前の年齢', () => {
    expect(calculateAge('1990-12-31')).toBe(35)
  })

  it('誕生日当日は加算済み', () => {
    expect(calculateAge('1990-08-02')).toBe(36)
  })

  it('誕生日の前日はまだ加算されない', () => {
    expect(calculateAge('1990-08-03')).toBe(35)
  })

  it('没年月日があればその時点での年齢（享年）', () => {
    expect(calculateAge('1950-03-10', '2000-03-09')).toBe(49)
    expect(calculateAge('1950-03-10', '2000-03-10')).toBe(50)
  })
})

describe('calculateGrade', () => {
  it('生年月日が無ければ null', () => {
    expect(calculateGrade(undefined)).toBeNull()
  })

  it('故人には学年を出さない', () => {
    expect(calculateGrade('2015-05-10', '2020-01-01')).toBeNull()
  })

  it('生年が年単位までしか分からなければ null', () => {
    // 4/1 生まれか 4/2 生まれかで学年が1つずれるため、年だけでは決められない
    expect(calculateGrade('2015-01-01', undefined, 'year')).toBeNull()
  })

  it('学年を返す', () => {
    expect(calculateGrade('2015-05-10')).toBe('小学5年')
  })

  it('4/1 生まれは 4/2 生まれより1学年上（早生まれ）', () => {
    expect(calculateGrade('2015-04-01')).toBe('小学6年')
    expect(calculateGrade('2015-04-02')).toBe('小学5年')
  })

  it('中学・高校の表記に切り替わる', () => {
    expect(calculateGrade('2013-05-10')).toBe('中学1年')
    expect(calculateGrade('2010-05-10')).toBe('高校1年')
  })

  it('就学前と高校卒業後は null', () => {
    expect(calculateGrade('2023-05-10')).toBeNull()
    expect(calculateGrade('2007-05-10')).toBeNull()
  })

  it('年度が変わる4月に学年が上がる', () => {
    vi.setSystemTime(new Date('2026-03-31T12:00:00+09:00'))
    expect(calculateGrade('2015-05-10')).toBe('小学4年')
    vi.setSystemTime(new Date('2026-04-01T12:00:00+09:00'))
    expect(calculateGrade('2015-05-10')).toBe('小学5年')
  })

  it('不正な日付文字列では落ちずに null', () => {
    expect(calculateGrade('not-a-date')).toBeNull()
  })
})

describe('formatAgeSummary', () => {
  it('生年月日が無ければ null', () => {
    expect(formatAgeSummary({})).toBeNull()
  })

  it('存命なら年齢と生年月日', () => {
    expect(formatAgeSummary({ birthDate: '1990-06-15' })).toBe('36歳（1990/6/15）')
  })

  it('没年があれば享年と生没年', () => {
    expect(formatAgeSummary({ birthDate: '1950-03-10', deathDate: '2000-03-10' })).toBe(
      '享年50（1950/3/10 - 2000/3/10）'
    )
  })

  it('生年の精度が粗ければ(推定)を付け、分からない月日は表示しない', () => {
    expect(formatAgeSummary({ birthDate: '1950-01-01', birthDatePrecision: 'year' })).toBe(
      '76(推定)歳（1950年）'
    )
    expect(formatAgeSummary({ birthDate: '1950-06-01', birthDatePrecision: 'month' })).toBe(
      '76(推定)歳（1950/6）'
    )
  })

  it('没年の精度が粗い場合も(推定)扱い', () => {
    expect(
      formatAgeSummary({
        birthDate: '1950-03-10',
        deathDate: '2000-01-01',
        deathDatePrecision: 'year',
      })
    ).toBe('享年49(推定)（1950/3/10 - 2000年）')
  })

  it('精度の指定が無ければ日単位として扱う（推定を付けない）', () => {
    expect(formatAgeSummary({ birthDate: '1990-06-15' })).not.toContain('推定')
  })
})
