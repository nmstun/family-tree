export type Gender = 'male' | 'female' | 'other'

export interface FamilyMember {
  id: string
  lastName: string
  firstName: string
  birthDate?: string
  deathDate?: string
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
