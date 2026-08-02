import { describe, it, expect } from 'vitest'
import { wouldCreateCycle } from './familyTreeValidation'
import { ParentChildRelation } from '@/types'

const rel = (parentId: string, childId: string): ParentChildRelation => ({ parentId, childId })

// 循環を作れてしまうとレイアウトが無限再帰に入って画面が固まるため、
// 「入力時点で弾ける」ことをここで固定する。
describe('wouldCreateCycle', () => {
  it('関係が空なら循環しない', () => {
    expect(wouldCreateCycle('a', 'b', [])).toBe(false)
  })

  it('自分自身を子にすると循環', () => {
    expect(wouldCreateCycle('a', 'a', [])).toBe(true)
  })

  it('親を自分の子にすると循環', () => {
    expect(wouldCreateCycle('child', 'parent', [rel('parent', 'child')])).toBe(true)
  })

  it('祖父を孫の子にすると循環（多段でも検出）', () => {
    const relations = [rel('grand', 'parent'), rel('parent', 'child')]
    expect(wouldCreateCycle('child', 'grand', relations)).toBe(true)
  })

  it('普通の親子追加は循環しない', () => {
    const relations = [rel('grand', 'parent')]
    expect(wouldCreateCycle('parent', 'child', relations)).toBe(false)
  })

  it('兄弟を親子にしても循環しない（不自然だが循環ではない）', () => {
    const relations = [rel('parent', 'a'), rel('parent', 'b')]
    expect(wouldCreateCycle('a', 'b', relations)).toBe(false)
  })

  it('両親がいる（親が複数）場合もすべての系統をたどる', () => {
    const relations = [rel('father', 'child'), rel('mother', 'child'), rel('grand', 'mother')]
    // 母方の祖父母をたどらないと見つからない循環
    expect(wouldCreateCycle('child', 'grand', relations)).toBe(true)
  })

  it('既存データが循環していても無限ループしない', () => {
    // 万一データ側が壊れていても関数が返ってくること（visited による打ち切り）
    const relations = [rel('a', 'b'), rel('b', 'a')]
    expect(wouldCreateCycle('x', 'y', relations)).toBe(false)
  })
})
