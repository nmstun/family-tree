import { describe, it, expect } from 'vitest'
import { resolveTreeToOpen } from './treeSelection'

// このファイルが守っているのは「本番で空の家系図が勝手に増えた」不具合。
// 所属ツリーの取得が失敗したときに新規作成へ倒すと、通信が一瞬切れただけで
// 既定名の空ツリーが増え、本来の家系図が見えなくなる。
describe('resolveTreeToOpen', () => {
  it('所属している家系図があればそれを開く', () => {
    expect(resolveTreeToOpen([{ tree_id: 'tree-1' }], null)).toEqual({
      action: 'open',
      treeId: 'tree-1',
    })
  })

  it('取得に成功して0件のときだけ新規作成する（初回ログイン）', () => {
    expect(resolveTreeToOpen([], null)).toEqual({ action: 'create' })
  })

  it('取得に失敗したら新規作成せず失敗として扱う', () => {
    // ここが本丸。エラー時に create を返すと空ツリーが量産される。
    expect(resolveTreeToOpen(null, new Error('network'))).toEqual({ action: 'fail' })
  })

  it('エラーと同時に空配列が来ても新規作成しない', () => {
    // PostgREST はエラー時に data を null ではなく [] で返すことがある。
    // 「0件だから初回ログイン」と誤判定しないことを固定する。
    expect(resolveTreeToOpen([], new Error('network'))).toEqual({ action: 'fail' })
  })

  it('data が undefined でもエラーが無ければ初回ログイン扱い', () => {
    expect(resolveTreeToOpen(undefined, null)).toEqual({ action: 'create' })
  })

  it('複数所属していても先頭（追加が最も古いもの）を開く', () => {
    // 呼び出し側で added_at 昇順に固定しているので、開く家系図が実行ごとに
    // 入れ替わらない。ここでは「先頭を選ぶ」という約束だけを固定する。
    expect(resolveTreeToOpen([{ tree_id: 'old' }, { tree_id: 'new' }], null)).toEqual({
      action: 'open',
      treeId: 'old',
    })
  })
})
