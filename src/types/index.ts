export type Gender = 'male' | 'female' | 'other'

// 古い世代ほど生年月日・没年月日が日単位までは分からないことが多いため、
// どこまでの精度で分かっているかを別途保持する
export type DatePrecision = 'day' | 'month' | 'year'

export interface FamilyMember {
  id: string
  lastName: string
  firstName: string
  birthDate?: string
  birthDatePrecision?: DatePrecision
  deathDate?: string
  deathDatePrecision?: DatePrecision
  gender: Gender
  photo?: string // Base64 or Blob URL
  notes?: string
  createdAt: number
}

export interface Marriage {
  id: string
  spouse1Id: string
  spouse2Id: string
  marriageDate?: string
}

export interface ParentChildRelation {
  parentId: string
  childId: string
}

export interface FamilyTree {
  id: string
  name: string
  members: FamilyMember[]
  marriages: Marriage[]
  parentChildRelations: ParentChildRelation[]
  updatedAt: number
  createdAt: number
}

export interface ExportData {
  version: string
  exportedAt: string
  tree: FamilyTree
}
