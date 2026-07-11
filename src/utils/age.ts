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
// 小学校入学前・高校卒業後（大学生・社会人など）は学年を特定できないため null を返す。
export function calculateGrade(birthDate?: string, deathDate?: string): string | null {
  if (!birthDate || deathDate) return null

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
