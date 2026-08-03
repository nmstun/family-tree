import { FamilyMember, Marriage, ParentChildRelation } from '@/types'
import { fullName } from './memberName'

// メンバーを消すと配偶者・親子関係も連動して消える（DB側の ON DELETE CASCADE）。
// 取り消せない操作なので、何がどれだけ消えるのかを具体的に示してから確認する。
//
// 同じ確認をメンバー一覧と家系図のサイドパネルの2箇所から出すため、
// 「何件消えるか」の数え方と文言をここにまとめる。
// 片方だけ件数を数え忘れる、といったずれを防ぐのが目的。
export function deletionImpact(
  member: FamilyMember,
  marriages: Marriage[],
  parentChildRelations: ParentChildRelation[]
): { title: string; message: string; marriageCount: number; relationCount: number } {
  const marriageCount = marriages.filter(
    (m) => m.spouse1Id === member.id || m.spouse2Id === member.id
  ).length
  const relationCount = parentChildRelations.filter(
    (r) => r.parentId === member.id || r.childId === member.id
  ).length

  const affected = [
    marriageCount > 0 && `配偶者関係 ${marriageCount}件`,
    relationCount > 0 && `親子関係 ${relationCount}件`,
  ].filter(Boolean) as string[]

  return {
    title: `${fullName(member)} を削除しますか？`,
    message:
      affected.length > 0
        ? `${affected.join('と')}もあわせて削除されます。\nこの操作は取り消せません。`
        : 'この操作は取り消せません。',
    marriageCount,
    relationCount,
  }
}
