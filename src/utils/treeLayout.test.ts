import { describe, it, expect } from 'vitest'
import { FamilyMember, Gender, Marriage, ParentChildRelation } from '@/types'
import {
  computeFamilyTreeLayout,
  NODE_WIDTH,
  NODE_HEIGHT,
  EDGE_COLORS,
  LONG_EDGE_MIN_RUN,
} from './treeLayout'

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

// 家系図が横に広がると、親から遠い子へ伸びる線が図の幅の大半を横切り、
// 途中で何本もの線と交差して目で追えなくなる（実データで最長3696px＝図幅の65%）。
// そういう線にだけ色を付けるので、「長い線が塗られる」「短い線は塗られない」
// 「近くの長い線同士が同じ色にならない」の3点を固定する。
describe('長い線の色分け', () => {
  /** エッジIDから「兄弟のまとまり」を取り出す（pc-<親...>-<子> という形） */
  function groupOf(edgeId: string) {
    return edgeId.slice(0, edgeId.lastIndexOf('-'))
  }

  /** 長い線を作る: 親が1組、その下に大勢の兄弟がいると端の子への線が長くなる */
  function wideFamily(childCount: number) {
    const members = [member('父'), member('母', 'female')]
    const relations: ParentChildRelation[] = []
    for (let i = 0; i < childCount; i++) {
      members.push(member(`子${i}`))
      relations.push(child('父', `子${i}`), child('母', `子${i}`))
    }
    return { members, marriages: [marriage('父', '母')], relations }
  }

  it('配偶者線には色を付けない（常に短く、追いにくくならない）', () => {
    const { members, marriages, relations } = wideFamily(8)
    const { edges } = computeFamilyTreeLayout(members, marriages, relations)
    edges
      .filter((e) => e.type === 'marriage')
      .forEach((e) => expect(e.colorIndex).toBeUndefined())
  })

  it('短い親子線には色を付けない', () => {
    // 子が1人だけなら線はまっすぐ下りるだけで、追いにくくならない
    const members = [member('親'), member('子')]
    const { edges } = computeFamilyTreeLayout(members, [], [child('親', '子')])
    edges.forEach((e) => expect(e.colorIndex).toBeUndefined())
  })

  it('しきい値以上の直線区間を含む兄弟のまとまりに色が付く', () => {
    const { members, marriages, relations } = wideFamily(8)
    const { edges } = computeFamilyTreeLayout(members, marriages, relations)

    const colored = edges.filter((e) => e.colorIndex !== undefined)
    expect(colored.length).toBeGreaterThan(0)

    // 色が付いたまとまりは、いずれかの線が LONG_EDGE_MIN_RUN 以上であること
    const runsByGroup = new Map<string, number>()
    colored.forEach((e) => {
      const pts = pointsIn(e.path)
      let run = 0
      for (let i = 0; i + 1 < pts.length; i++) {
        run = Math.max(run, Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y))
      }
      const g = groupOf(e.id)
      runsByGroup.set(g, Math.max(runsByGroup.get(g) ?? 0, run))
    })
    runsByGroup.forEach((run) => expect(run).toBeGreaterThanOrEqual(LONG_EDGE_MIN_RUN))
  })

  it('同じ親から伸びる線（兄弟）は同じ色になる', () => {
    // 兄弟の線は親の下の縦棒と横棒を共有しているため、色が違うと
    // 共有部分がどちらの色で塗られるかが不定になり、途中で色が変わって見える。
    const { members, marriages, relations } = wideFamily(8)
    const { edges } = computeFamilyTreeLayout(members, marriages, relations)

    const colorByGroup = new Map<string, number | undefined>()
    edges
      .filter((e) => e.type === 'parent-child')
      .forEach((e) => {
        const g = groupOf(e.id)
        if (colorByGroup.has(g)) {
          expect(e.colorIndex).toBe(colorByGroup.get(g))
        } else {
          colorByGroup.set(g, e.colorIndex)
        }
      })
    expect(colorByGroup.size).toBeGreaterThan(0)
  })

  it('色の添字は用意した色数の範囲に収まる', () => {
    const { members, marriages, relations } = wideFamily(20)
    const { edges } = computeFamilyTreeLayout(members, marriages, relations)
    edges
      .filter((e) => e.colorIndex !== undefined)
      .forEach((e) => {
        expect(e.colorIndex).toBeGreaterThanOrEqual(0)
        expect(e.colorIndex).toBeLessThan(EDGE_COLORS.length)
      })
  })

  it('重なり合う別々のまとまり同士は違う色になる', () => {
    // 左右2つの家系。左右の子同士が結婚することで子が反対側へ引っ張られ、
    // 親からその子への線が家系図を横切って互いに重なる（本番で起きている状況）。
    const members: FamilyMember[] = []
    const marriages: Marriage[] = []
    const relations: ParentChildRelation[] = []
    for (const side of ['左', '右']) {
      members.push(member(`${side}父`), member(`${side}母`, 'female'))
      marriages.push(marriage(`${side}父`, `${side}母`))
      for (let i = 0; i < 5; i++) {
        members.push(member(`${side}子${i}`, i % 2 === 0 ? 'male' : 'female'))
        relations.push(child(`${side}父`, `${side}子${i}`), child(`${side}母`, `${side}子${i}`))
      }
    }
    marriages.push(marriage('左子0', '右子1'), marriage('左子2', '右子3'))

    const { edges } = computeFamilyTreeLayout(members, marriages, relations)

    // まとまりごとに、色と外接範囲をまとめる
    const boxes = new Map<
      string,
      { colorIndex: number; x1: number; x2: number; y1: number; y2: number }
    >()
    edges
      .filter((e) => e.colorIndex !== undefined)
      .forEach((e) => {
        const pts = pointsIn(e.path)
        const xs = pts.map((p) => p.x)
        const ys = pts.map((p) => p.y)
        const g = groupOf(e.id)
        const cur = boxes.get(g)
        const next = {
          colorIndex: e.colorIndex!,
          x1: Math.min(...xs, cur?.x1 ?? Infinity),
          x2: Math.max(...xs, cur?.x2 ?? -Infinity),
          y1: Math.min(...ys, cur?.y1 ?? Infinity),
          y2: Math.max(...ys, cur?.y2 ?? -Infinity),
        }
        boxes.set(g, next)
      })

    const list = Array.from(boxes.values())
    expect(list.length).toBeGreaterThan(1)
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]
        const b = list[j]
        const overlap = a.x1 <= b.x2 && b.x1 <= a.x2 && a.y1 <= b.y2 && b.y1 <= a.y2
        if (overlap) expect(a.colorIndex).not.toBe(b.colorIndex)
      }
    }
  })
})

// 兄弟2人が、よその姉妹2人と結婚しているとき、どちらの子夫婦も片方の親にしか
// ぶら下げられない。負けたほうの親は子を1つも持たないルートとして図の端へ流れ、
// 子への線が図幅の65%（実データで3696px）まで伸びていた。
// 世代は同じなので、勝ったほうの親の隣に並べれば線は数百pxに収まる。
describe('子を持てなかった親の配置', () => {
  // 兄弟3人が、よその姉妹3人とそれぞれ結婚している構成。
  // どの子夫婦も片方の親にしかぶら下げられないため、姉妹側の父は
  // 子を1つも持たないルートになる。
  function siblingsMarrySiblings() {
    const members = [member('兄の父'), member('兄の母', 'female'), member('嫁の父')]
    const marriages = [marriage('兄の父', '兄の母')]
    const relations: ParentChildRelation[] = []
    for (let i = 0; i < 3; i++) {
      members.push(member(`息子${i}`), member(`娘${i}`, 'female'))
      marriages.push(marriage(`息子${i}`, `娘${i}`))
      relations.push(
        child('兄の父', `息子${i}`),
        child('兄の母', `息子${i}`),
        child('嫁の父', `娘${i}`)
      )
    }
    // 端に流されやすくするための、無関係で大きな家系
    members.push(member('他家父'), member('他家母', 'female'))
    marriages.push(marriage('他家父', '他家母'))
    for (let i = 0; i < 6; i++) {
      members.push(member(`他家子${i}`))
      relations.push(child('他家父', `他家子${i}`), child('他家母', `他家子${i}`))
    }
    return { members, marriages, relations }
  }

  const layout = () => {
    const { members, marriages, relations } = siblingsMarrySiblings()
    return { ...computeFamilyTreeLayout(members, marriages, relations), relations }
  }
  const centerOf = (nodes: ReturnType<typeof layout>['nodes'], id: string) => {
    const n = nodes.find((v) => v.member.id === id)!
    return n.x + NODE_WIDTH / 2
  }

  it('子を1つも持てなかった親も、子のすぐ近くに置かれる', () => {
    const { nodes } = layout()
    const father = centerOf(nodes, '嫁の父')
    const distances = [0, 1, 2].map((i) => Math.abs(centerOf(nodes, `娘${i}`) - father))
    // カード数枚ぶんに収まっていること。
    // 実データではこれが3696px（図幅の65%）まで伸びていた。
    distances.forEach((d) => expect(d).toBeLessThan(NODE_WIDTH * 5))
  })

  it('隣に置いた親の縦線が、下の世代のカードの真上に重ならない', () => {
    // 親から子へ下ろす縦線は親の中央から出る。そこが下の世代のカードの中央と
    // 一致すると、そのカードへ別の親から下りている縦線とぴったり重なり、
    // 2本が1本に見えてしまう（実データで x=2218 に2本が重なっていた）。
    // 自分の子の真上に来るぶんには線が繋がって見えるだけなので、対象外。
    const { nodes, relations } = layout()
    const father = nodes.find((n) => n.member.id === '嫁の父')!
    const dropX = father.x + NODE_WIDTH / 2
    const ownChildren = new Set(
      relations.filter((r) => r.parentId === '嫁の父').map((r) => r.childId)
    )

    nodes
      .filter((n) => n.generation === father.generation + 1 && !ownChildren.has(n.member.id))
      .forEach((n) => {
        expect(
          Math.abs(n.x + NODE_WIDTH / 2 - dropX),
          `${n.member.firstName} の真上に縦線が重なっている`
        ).toBeGreaterThanOrEqual(NODE_WIDTH / 4)
      })
  })

  it('近くに置いてもカードは重ならない', () => {
    const { nodes } = layout()
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

  it('親と子は必ず隣り合う世代に置かれる（縦の距離が均一）', () => {
    const { nodes, relations } = layout()
    const nodeOf = (id: string) => nodes.find((v) => v.member.id === id)!
    const gaps = new Set(
      relations.map(({ parentId, childId }) => nodeOf(childId).y - nodeOf(parentId).y)
    )
    expect(gaps.size).toBe(1)
  })
})
