import { DatePrecision, FamilyMember } from '@/types'

export function calculateAge(birthDate?: string, deathDate?: string): number | null {
  if (!birthDate) return null

  const birth = new Date(birthDate)
  const end = deathDate ? new Date(deathDate) : new Date()

  let age = end.getFullYear() - birth.getFullYear()
  const monthDiff = end.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && end.getDate() < birth.getDate())) {
    age--
  }

  return age
}

// 日本の学年（4/2〜翌4/1生まれが同学年、その年度の4/1時点の学年）を返す。
// 生年が「年のみ」までしか分からない場合、4/2の区切りをまたぐかどうか
// 判定できず学年を特定できないため null を返す。
// 小学校入学前・高校卒業後（大学生・社会人など）も同様に null。
export function calculateGrade(
  birthDate?: string,
  deathDate?: string,
  birthDatePrecision: DatePrecision = 'day'
): string | null {
  if (!birthDate || deathDate || birthDatePrecision === 'year') return null

  const birth = new Date(birthDate)
  if (Number.isNaN(birth.getTime())) return null

  const birthMonth = birth.getMonth() + 1
  const birthDay = birth.getDate()
  const cohortYear =
    birthMonth > 4 || (birthMonth === 4 && birthDay >= 2)
      ? birth.getFullYear()
      : birth.getFullYear() - 1

  const today = new Date()
  const currentSchoolYear = today.getMonth() + 1 >= 4 ? today.getFullYear() : today.getFullYear() - 1

  const grade = currentSchoolYear - cohortYear - 6

  if (grade < 1 || grade > 12) return null
  if (grade <= 6) return `小学${grade}年`
  if (grade <= 9) return `中学${grade - 6}年`
  return `高校${grade - 9}年`
}

// 精度に応じて日付の表示形式を切り替える（不明な月日は表示に出さない）
export function formatDateByPrecision(dateStr: string, precision: DatePrecision): string {
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''

  const year = d.getFullYear()
  if (precision === 'year') return `${year}年`

  const month = d.getMonth() + 1
  if (precision === 'month') return `${year}/${month}`

  return d.toLocaleDateString('ja-JP')
}

// 一覧・家系図表示で使う「年齢＋生没年」のまとめ文字列。
// 精度が日単位に満たない場合は年齢に(推定)を付ける。
export function formatAgeSummary(
  member: Pick<FamilyMember, 'birthDate' | 'birthDatePrecision' | 'deathDate' | 'deathDatePrecision'>
): string | null {
  if (!member.birthDate) return null

  const birthPrecision = member.birthDatePrecision ?? 'day'
  const deathPrecision = member.deathDatePrecision ?? 'day'
  const isEstimate = birthPrecision !== 'day' || (!!member.deathDate && deathPrecision !== 'day')
  const birthText = formatDateByPrecision(member.birthDate, birthPrecision)
  const estimateLabel = isEstimate ? '(推定)' : ''

  if (member.deathDate) {
    const age = calculateAge(member.birthDate, member.deathDate)
    const deathText = formatDateByPrecision(member.deathDate, deathPrecision)
    return `享年${age}${estimateLabel}（${birthText} - ${deathText}）`
  }

  const age = calculateAge(member.birthDate)
  return `${age}${estimateLabel}歳（${birthText}）`
}
