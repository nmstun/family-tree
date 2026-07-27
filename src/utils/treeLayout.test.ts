import { describe, it, expect } from 'vitest'
import { FamilyMember, Gender, Marriage, ParentChildRelation } from '@/types'
import { computeFamilyTreeLayout, NODE_WIDTH, NODE_HEIGHT } from './treeLayout'

// このファイルは「過去に実際に起きた表示崩れ」を再発させないためのテスト。
// 家系図のレイアウトは目視でしか確認できず、直すたびに別の箇所が崩れていたため、
// 修正済みの不具合をそのまま条件として固定する。

function member(id: string, gender: Gender = 'male'): FamilyMember {
  return { id, lastName: '姓', firstName: id, gender, createdAt: 0 }
}

function marriage(a: string, b: string): Marriage {
  return { id: `m-${a}-${b}`, spouse1Id: a, spouse2Id: b }
}

function child(parent: string, childId: string): ParentChildRelation {
  return { parentId: parent, childId }
}

// パスの数値を順に取り出す（`M x y L x y ...` 形式）
function numbersIn(path: string): number[] {
  return (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
}

/**
 * パスを通過点の列に変換する。
 * 線の交差を避けるために A（円弧）が挿入されることがあるので、
 * 数値の並び順に頼らずコマンドを見て解釈する。
 */
function pointsIn(path: string): { x: number; y: number }[] {
  const tokens = path.match(/[MLA]|-?\d+(?:\.\d+)?/g) ?? []
  const points: { x: number; y: number }[] = []
  let i = 0
  while (i < tokens.length) {
    const cmd = tokens[i]
    if (cmd === 'M' || cmd === 'L') {
      points.push({ x: Number(tokens[i + 1]), y: Number(tokens[i + 2]) })
      i += 3
    } else if (cmd === 'A') {
      // rx ry rot largeArc sweep x y のうち終点だけを使う
      points.push({ x: Number(tokens[i + 6]), y: Number(tokens[i + 7]) })
      i += 8
    } else {
      i += 1
    }
  }
  return points
}

/**
 * 親子線の「兄弟をつなぐ横棒」の高さを取り出す。
 * 子が親の真下に1人だけいる場合は横棒の長さが0になり水平な区間が現れないため、
 * その場合は折れ点の高さを使う。
 */
function busBarY(path: string): number {
  const pts = pointsIn(path)
  let best: { y: number; dx: number } | null = null
  for (let i = 0; i + 1 < pts.length; i++) {
    const dx = Math.abs(pts[i + 1].x - pts[i].x)
    if (pts[i].y === pts[i + 1].y && dx > 0 && (!best || dx > best.dx)) {
      best = { y: pts[i].y, dx }
    }
  }
  if (best) return best.y
  // 水平区間がない（子が真下にいる）ときは中間の折れ点
  return pts[1].y
}

/** 夫婦とその子2人をつくる。祖父母の下に複数ぶら下げる用途 */
function familyUnit(prefix: string) {
  return {
    members: [
      member(`${prefix}夫`),
      member(`${prefix}妻`, 'female'),
      member(`${prefix}子A`),
      member(`${prefix}子B`),
    ],
    marriages: [marriage(`${prefix}夫`, `${prefix}妻`)],
    relations: [
      child(`${prefix}夫`, `${prefix}子A`),
      child(`${prefix}妻`, `${prefix}子A`),
      child(`${prefix}夫`, `${prefix}子B`),
      child(`${prefix}妻`, `${prefix}子B`),
    ],
  }
}

describe('computeFamilyTreeLayout', () => {
  it('ノード同士が重ならない', () => {
    // 祖父母の下に5組の家族がぶら下がる構成。
    // 兄弟が多い世代で子孫の幅を考慮できておらず、カードが重なっていた。
    const members = [member('祖父'), member('祖母', 'female')]
    const marriages = [marriage('祖父', '祖母')]
    const relations: ParentChildRelation[] = []
    for (let i = 1; i <= 5; i++) {
      const unit = familyUnit(`第${i}`)
      members.push(...unit.members)
      marriages.push(...unit.marriages)
      relations.push(...unit.relations)
      relations.push(child('祖父', `第${i}夫`), child('祖母', `第${i}夫`))
    }

    const { nodes } = computeFamilyTreeLayout(members, marriages, relations)

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        const overlaps =
          a.x < b.x + NODE_WIDTH &&
          b.x < a.x + NODE_WIDTH &&
          a.y < b.y + NODE_HEIGHT &&
          b.y < a.y + NODE_HEIGHT
        expect(
          overlaps,
          `${a.member.firstName} と ${b.member.firstName} が重なっている`
        ).toBe(false)
      }
    }
  })

  it('配偶者線が2人のカードにぴったり接続する（隙間ができない）', () => {
    // 線がカードの手前で止まり「つながっていないように見える」不具合があった。
    const members = [member('夫'), member('妻', 'female')]
    const { nodes, edges } = computeFamilyTreeLayout(members, [marriage('夫', '妻')], [])

    const edge = edges.find((e) => e.type === 'marriage')
    expect(edge, '配偶者線が生成されていない').toBeDefined()

    const [startX, startY, endX, endY] = numbersIn(edge!.path)
    const left = nodes.reduce((a, b) => (a.x < b.x ? a : b))
    const right = nodes.reduce((a, b) => (a.x > b.x ? a : b))

    // 線の両端が、左のカードの右辺と右のカードの左辺にちょうど一致する
    expect(startX).toBe(left.x + NODE_WIDTH)
    expect(endX).toBe(right.x)
    // 線は水平で、カードの縦中央を通る
    expect(startY).toBe(endY)
    expect(startY).toBe(left.y + NODE_HEIGHT / 2)
  })

  it('同じ世代の別々の兄弟グループの横棒が同じ高さにならない', () => {
    // レーン数を3固定にしていたため、同じ世代に4組以上の家族がいると
    // 4組目以降が1組目と同じ高さになり、無関係な横棒が重なって見えていた。
    const members = [member('祖父'), member('祖母', 'female')]
    const marriages = [marriage('祖父', '祖母')]
    const relations: ParentChildRelation[] = []
    for (let i = 1; i <= 5; i++) {
      const unit = familyUnit(`第${i}`)
      members.push(...unit.members)
      marriages.push(...unit.marriages)
      relations.push(...unit.relations)
      relations.push(child('祖父', `第${i}夫`), child('祖母', `第${i}夫`))
    }

    const { nodes, edges } = computeFamilyTreeLayout(members, marriages, relations)
    const topOf = (id: string) => nodes.find((n) => n.member.id === id)!.y

    // 5組の夫婦はすべて同じ世代にいる（この世代の横棒が重なると読めなくなる）
    const childRow = topOf('第1子A')
    const bars = edges
      .filter((e) => e.type === 'parent-child')
      .map((e) => {
        const pts = pointsIn(e.path)
        return {
          family: pts[0].x, // 線の出発点＝その家族固有の位置
          barY: busBarY(e.path),
          childTop: pts[pts.length - 1].y,
        }
      })
      .filter((b) => b.childTop === childRow)

    // 前提が崩れていないこと（5家族ぶんの線が取れているか）
    expect(new Set(bars.map((b) => b.family)).size).toBe(5)

    const familiesByBarY = new Map<number, Set<number>>()
    for (const bar of bars) {
      if (!familiesByBarY.has(bar.barY)) familiesByBarY.set(bar.barY, new Set())
      familiesByBarY.get(bar.barY)!.add(bar.family)
    }

    for (const [barY, families] of familiesByBarY) {
      expect(
        families.size,
        `高さ ${barY} の横棒を ${families.size} 家族が共有している（重なって見える）`
      ).toBe(1)
    }
  })

  it('親が子どもたちの実際の位置の中央に配置される', () => {
    // 子孫を押し出すだけで親を再配置しておらず、親が子から大きくずれていた。
    const members = [member('親'), member('子1'), member('子2'), member('子3')]
    const relations = [child('親', '子1'), child('親', '子2'), child('親', '子3')]

    const { nodes } = computeFamilyTreeLayout(members, [], relations)
    const centerOf = (id: string) => {
      const n = nodes.find((v) => v.member.id === id)!
      return n.x + NODE_WIDTH / 2
    }

    const childCenters = ['子1', '子2', '子3'].map(centerOf)
    const expected = (Math.min(...childCenters) + Math.max(...childCenters)) / 2

    expect(centerOf('親')).toBeCloseTo(expected, 5)
  })

  it('配偶者を介して世代がずれない（血縁の親同士が同じ世代になる）', () => {
    // 片方の家系だけが深いと、結婚相手の親が実際より下の世代に引きずられていた。
    // 「AがBの親」「BがCと結婚」「DがCの親」なら A と D は同じ世代のはず。
    const members = [member('A'), member('B'), member('C', 'female'), member('D')]
    const marriages = [marriage('B', 'C')]
    const relations = [child('A', 'B'), child('D', 'C')]

    const { nodes } = computeFamilyTreeLayout(members, marriages, relations)
    const generationOf = (id: string) => nodes.find((n) => n.member.id === id)!.generation

    expect(generationOf('A')).toBe(generationOf('D'))
    expect(generationOf('B')).toBe(generationOf('C'))
    expect(generationOf('B')).toBe(generationOf('A') + 1)
  })

  it('メンバーがいない場合でも落ちない', () => {
    const result = computeFamilyTreeLayout([], [], [])
    expect(result.nodes).toEqual([])
    expect(result.edges).toEqual([])
  })
})
