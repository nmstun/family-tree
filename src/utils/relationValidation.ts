import { Marriage, ParentChildRelation } from '@/types'
import { wouldCreateCycle } from './familyTreeValidation'

// 関係の入力チェック。副作用を持たず、エラー文言（問題なければ null）を返す。
//
// 以前は「関係」タブの中だけに置いてあったが、家系図表示のサイドパネルからも
// 同じ関係を追加できるようにしたため、片方だけルールが緩いということが
// 起きないよう共通の場所へ出した。

export function validateMarriage(
  spouse1: string,
  spouse2: string,
  marriages: Marriage[]
): string | null {
  if (!spouse1 || !spouse2) return '配偶者を2人選択してください'
  if (spouse1 === spouse2) return '同じメンバー同士は結婚関係にできません'
  const alreadyMarried = marriages.some(
    (m) =>
      (m.spouse1Id === spouse1 && m.spouse2Id === spouse2) ||
      (m.spouse1Id === spouse2 && m.spouse2Id === spouse1)
  )
  if (alreadyMarried) return 'すでに配偶者関係が設定されています'
  return null
}

export function validateParentChild(
  parentId: string,
  childId: string,
  relations: ParentChildRelation[]
): string | null {
  if (!parentId || !childId) return '親と子を選択してください'
  if (parentId === childId) return '同じメンバーを親子関係にはできません'
  if (relations.some((r) => r.parentId === parentId && r.childId === childId)) {
    return 'すでにこの親子関係が設定されています'
  }
  if (wouldCreateCycle(parentId, childId, relations)) {
    return 'この関係を設定すると家系図が循環してしまうため、設定できません'
  }
  return null
}
