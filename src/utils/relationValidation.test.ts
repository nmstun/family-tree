import { describe, it, expect } from 'vitest'
import { validateMarriage, validateParentChild } from './relationValidation'
import { Marriage, ParentChildRelation } from '@/types'

// 同じ関係を「関係」タブと家系図のサイドパネルの両方から追加できるようになったため、
// 検証はどちらから来ても同じでなければならない。ここでルールを固定する。
const marriage = (id: string, a: string, b: string): Marriage => ({
  id,
  spouse1Id: a,
  spouse2Id: b,
})
const rel = (parentId: string, childId: string): ParentChildRelation => ({ parentId, childId })

describe('validateMarriage', () => {
  it('選択されていなければエラー', () => {
    expect(validateMarriage('', 'b', [])).toBe('配偶者を2人選択してください')
    expect(validateMarriage('a', '', [])).toBe('配偶者を2人選択してください')
  })

  it('自分自身とは結婚できない', () => {
    expect(validateMarriage('a', 'a', [])).toBe('同じメンバー同士は結婚関係にできません')
  })

  it('すでにある配偶者関係は追加できない（順序が逆でも検出する）', () => {
    const marriages = [marriage('m1', 'a', 'b')]
    expect(validateMarriage('a', 'b', marriages)).toBe('すでに配偶者関係が設定されています')
    expect(validateMarriage('b', 'a', marriages)).toBe('すでに配偶者関係が設定されています')
  })

  it('問題なければ null', () => {
    expect(validateMarriage('a', 'b', [marriage('m1', 'c', 'd')])).toBeNull()
  })
})

describe('validateParentChild', () => {
  it('選択されていなければエラー', () => {
    expect(validateParentChild('', 'c', [])).toBe('親と子を選択してください')
    expect(validateParentChild('p', '', [])).toBe('親と子を選択してください')
  })

  it('自分自身の親にはなれない', () => {
    expect(validateParentChild('a', 'a', [])).toBe('同じメンバーを親子関係にはできません')
  })

  it('すでにある親子関係は追加できない', () => {
    expect(validateParentChild('p', 'c', [rel('p', 'c')])).toBe(
      'すでにこの親子関係が設定されています'
    )
  })

  it('循環する関係は追加できない', () => {
    // 祖父 → 親 → 子 がある状態で「子を祖父の親にする」と循環する
    const relations = [rel('祖父', '親'), rel('親', '子')]
    expect(validateParentChild('子', '祖父', relations)).toBe(
      'この関係を設定すると家系図が循環してしまうため、設定できません'
    )
  })

  it('問題なければ null', () => {
    expect(validateParentChild('p', 'c', [rel('x', 'y')])).toBeNull()
  })
})
