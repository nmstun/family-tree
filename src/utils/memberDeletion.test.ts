import { describe, it, expect } from 'vitest'
import { deletionImpact } from './memberDeletion'
import { FamilyMember, Marriage, ParentChildRelation } from '@/types'

// メンバー削除は ON DELETE CASCADE で配偶者・親子関係まで消える取り消せない操作。
// 「何がどれだけ消えるか」を確認ダイアログに出しているので、その数え方を固定する。
const member = (id: string, lastName = '宮本', firstName = '清'): FamilyMember => ({
  id,
  lastName,
  firstName,
  gender: 'male',
  createdAt: 0,
})
const marriage = (id: string, a: string, b: string): Marriage => ({
  id,
  spouse1Id: a,
  spouse2Id: b,
})
const rel = (parentId: string, childId: string): ParentChildRelation => ({ parentId, childId })

describe('deletionImpact', () => {
  it('見出しには氏名が入る', () => {
    expect(deletionImpact(member('a'), [], []).title).toBe('宮本 清 を削除しますか？')
  })

  it('巻き添えが無ければ件数を並べない', () => {
    const result = deletionImpact(member('a'), [marriage('m', 'x', 'y')], [rel('x', 'y')])
    expect(result.marriageCount).toBe(0)
    expect(result.relationCount).toBe(0)
    expect(result.message).toBe('この操作は取り消せません。')
  })

  it('配偶者関係は spouse1 / spouse2 のどちらでも数える', () => {
    const marriages = [marriage('m1', 'a', 'b'), marriage('m2', 'c', 'a')]
    expect(deletionImpact(member('a'), marriages, []).marriageCount).toBe(2)
  })

  it('親子関係は親側・子側のどちらでも数える', () => {
    const relations = [rel('a', 'child'), rel('parent', 'a'), rel('x', 'y')]
    expect(deletionImpact(member('a'), [], relations).relationCount).toBe(2)
  })

  it('両方あるときは「と」でつなぐ', () => {
    const result = deletionImpact(member('a'), [marriage('m1', 'a', 'b')], [rel('a', 'c')])
    expect(result.message).toContain('配偶者関係 1件と親子関係 1件')
    expect(result.message).toContain('取り消せません')
  })

  it('片方だけのときは余計な接続詞を付けない', () => {
    const onlyMarriage = deletionImpact(member('a'), [marriage('m1', 'a', 'b')], [])
    expect(onlyMarriage.message).toContain('配偶者関係 1件もあわせて')
    expect(onlyMarriage.message).not.toContain('と親子関係')

    const onlyRelation = deletionImpact(member('a'), [], [rel('a', 'c')])
    expect(onlyRelation.message).toContain('親子関係 1件もあわせて')
    expect(onlyRelation.message).not.toContain('配偶者関係')
  })
})
