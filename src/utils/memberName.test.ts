import { describe, it, expect } from 'vitest'
import { fullName, displayName, initial } from './memberName'
import { sortMembersByName } from './sortMembers'
import { FamilyMember } from '@/types'

const member = (over: Partial<FamilyMember> = {}): FamilyMember => ({
  id: 'id',
  lastName: '宮本',
  firstName: '清',
  gender: 'male',
  createdAt: 0,
  ...over,
})

describe('fullName', () => {
  it('姓と名を半角スペースで並べる', () => {
    expect(fullName(member())).toBe('宮本 清')
  })
})

describe('displayName', () => {
  it('メンバーが見つからない場合の表記', () => {
    expect(displayName(undefined)).toBe('（不明なメンバー）')
  })

  it('見つかれば氏名', () => {
    expect(displayName(member())).toBe('宮本 清')
  })
})

describe('initial', () => {
  it('名の頭文字を使う', () => {
    expect(initial(member())).toBe('清')
  })

  it('名が空なら姓の頭文字', () => {
    expect(initial(member({ firstName: '' }))).toBe('宮')
  })

  it('どちらも空なら ?（アバターが空にならない）', () => {
    expect(initial(member({ firstName: '', lastName: '' }))).toBe('?')
  })

  it('前後の空白は無視する', () => {
    expect(initial(member({ firstName: '  太郎 ' }))).toBe('太')
  })
})

describe('sortMembersByName', () => {
  it('元の配列を書き換えない', () => {
    const list = [member({ id: '2', lastName: '田中' }), member({ id: '1', lastName: '安藤' })]
    const sorted = sortMembersByName(list)
    expect(list[0].id).toBe('2')
    expect(sorted[0].id).toBe('1')
  })

  it('姓が同じなら名で並ぶ', () => {
    const list = [
      member({ id: 'b', firstName: '花子' }),
      member({ id: 'a', firstName: '一郎' }),
    ]
    expect(sortMembersByName(list).map((m) => m.id)).toEqual(['a', 'b'])
  })
})
