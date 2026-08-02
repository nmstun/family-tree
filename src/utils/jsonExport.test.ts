import { describe, it, expect } from 'vitest'
import { exportToJSON, importJSON } from './jsonExport'
import { FamilyTree } from '@/types'

// インポートは「既存のメンバーを全削除してから挿入する」処理なので、
// ここで通してしまうと家系図が壊れたまま残る。
// 以前は version / tree / exportedAt の有無しか見ておらず、
// marriages が欠けたJSONで全削除だけが実行されていた。
const tree: FamilyTree = {
  id: 'tree-1',
  name: '我が家の家系図',
  members: [
    { id: 'a', lastName: '宮本', firstName: '清', gender: 'male', createdAt: 1 },
    { id: 'b', lastName: '宮本', firstName: '花', gender: 'female', createdAt: 2 },
    { id: 'c', lastName: '宮本', firstName: '一', gender: 'male', createdAt: 3 },
  ],
  marriages: [{ id: 'm1', spouse1Id: 'a', spouse2Id: 'b' }],
  parentChildRelations: [
    { parentId: 'a', childId: 'c' },
    { parentId: 'b', childId: 'c' },
  ],
  createdAt: 0,
  updatedAt: 0,
}

const valid = () => JSON.parse(JSON.stringify(exportToJSON(tree)))
const load = (data: unknown) => importJSON(JSON.stringify(data))

describe('exportToJSON', () => {
  it('書き出したものはそのまま読み込める（往復できる）', () => {
    const restored = importJSON(JSON.stringify(exportToJSON(tree)))
    expect(restored).not.toBeNull()
    expect(restored!.tree).toEqual(tree)
  })
})

describe('importJSON', () => {
  it('JSONとして壊れていれば null', () => {
    expect(importJSON('{')).toBeNull()
    expect(importJSON('')).toBeNull()
  })

  it('オブジェクト以外は null', () => {
    expect(importJSON('[]')).toBeNull()
    expect(importJSON('"文字列"')).toBeNull()
    expect(importJSON('null')).toBeNull()
  })

  it('version / exportedAt / tree が欠けていれば null', () => {
    const base = valid()
    ;['version', 'exportedAt', 'tree'].forEach((key) => {
      const broken = valid()
      delete broken[key]
      expect(load(broken), `${key} が無いのに通った`).toBeNull()
    })
    expect(load(base)).not.toBeNull()
  })

  it('members / marriages / parentChildRelations のどれかが配列でなければ null', () => {
    // ここが本丸。1つでも欠けていると、全削除したあとで挿入に失敗する。
    ;['members', 'marriages', 'parentChildRelations'].forEach((key) => {
      const missing = valid()
      delete missing.tree[key]
      expect(load(missing), `${key} が無いのに通った`).toBeNull()

      const notArray = valid()
      notArray.tree[key] = {}
      expect(load(notArray), `${key} が配列でないのに通った`).toBeNull()
    })
  })

  it('メンバーの形が壊れていれば null', () => {
    const noId = valid()
    delete noId.tree.members[0].id
    expect(load(noId)).toBeNull()

    const badName = valid()
    badName.tree.members[0].lastName = 123
    expect(load(badName)).toBeNull()

    const notObject = valid()
    notObject.tree.members[0] = 'メンバー'
    expect(load(notObject)).toBeNull()
  })

  it('姓か名が空文字でも受け入れる（片方しか記録が無い人がいる）', () => {
    const data = valid()
    data.tree.members[0].lastName = ''
    expect(load(data)).not.toBeNull()
  })

  it('存在しないメンバーを指す配偶者関係があれば null', () => {
    const data = valid()
    data.tree.marriages[0].spouse2Id = 'いない人'
    expect(load(data)).toBeNull()
  })

  it('存在しないメンバーを指す親子関係があれば null', () => {
    const data = valid()
    data.tree.parentChildRelations[0].parentId = 'いない人'
    expect(load(data)).toBeNull()
  })

  it('関係が壊れた形（IDが文字列でない）でも null', () => {
    const data = valid()
    data.tree.parentChildRelations[0] = { parentId: 1, childId: 2 }
    expect(load(data)).toBeNull()
  })

  it('メンバーも関係も空の家系図は受け入れる（新規作成直後の書き出し）', () => {
    const empty = valid()
    empty.tree.members = []
    empty.tree.marriages = []
    empty.tree.parentChildRelations = []
    expect(load(empty)).not.toBeNull()
  })
})
