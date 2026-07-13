import { FamilyMember, Marriage, ParentChildRelation } from '@/types'

export const NODE_WIDTH = 140
export const NODE_HEIGHT = 112
export const H_GAP = 36
export const V_GAP = 90

export interface LayoutNode {
  member: FamilyMember
  x: number
  y: number
  generation: number
}

export interface LayoutEdge {
  id: string
  type: 'marriage' | 'parent-child'
  path: string
}

export interface LayoutResult {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  width: number
  height: number
}

/**
 * Compute a readable, non-overlapping layout for a family tree.
 * - Members are grouped into generations (rows) based on parent-child relations.
 * - Spouses are placed on the same generation/row and kept adjacent.
 * - Children are ordered under their parents to minimize crossing lines.
 */
export function computeFamilyTreeLayout(
  members: FamilyMember[],
  marriages: Marriage[],
  relations: ParentChildRelation[]
): LayoutResult {
  if (members.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 }
  }

  const memberMap = new Map(members.map((m) => [m.id, m]))

  const parentsOf = new Map<string, string[]>()
  relations.forEach((r) => {
    if (!memberMap.has(r.parentId) || !memberMap.has(r.childId)) return
    if (!parentsOf.has(r.childId)) parentsOf.set(r.childId, [])
    parentsOf.get(r.childId)!.push(r.parentId)
  })

  const spouseOf = new Map<string, string[]>()
  const validMarriages = marriages.filter(
    (m) => memberMap.has(m.spouse1Id) && memberMap.has(m.spouse2Id)
  )
  validMarriages.forEach((m) => {
    if (!spouseOf.has(m.spouse1Id)) spouseOf.set(m.spouse1Id, [])
    spouseOf.get(m.spouse1Id)!.push(m.spouse2Id)
    if (!spouseOf.has(m.spouse2Id)) spouseOf.set(m.spouse2Id, [])
    spouseOf.get(m.spouse2Id)!.push(m.spouse1Id)
  })

  // --- Step 1: assign a generation (row) to every member ---
  const generation = new Map<string, number>()
  const visiting = new Set<string>()

  function calcGen(id: string): number {
    if (generation.has(id)) return generation.get(id)!
    if (visiting.has(id)) return 0 // guard against accidental cycles
    visiting.add(id)
    const parents = parentsOf.get(id) || []
    const gen = parents.length > 0 ? Math.max(...parents.map((p) => calcGen(p) + 1)) : 0
    visiting.delete(id)
    generation.set(id, gen)
    return gen
  }
  members.forEach((m) => calcGen(m.id))

  // --- Step 2: equalize spouses' generations and re-propagate to children ---
  const maxIterations = members.length + validMarriages.length + 5
  for (let i = 0; i < maxIterations; i++) {
    let changed = false
    validMarriages.forEach((m) => {
      const g1 = generation.get(m.spouse1Id)!
      const g2 = generation.get(m.spouse2Id)!
      if (g1 !== g2) {
        const g = Math.max(g1, g2)
        generation.set(m.spouse1Id, g)
        generation.set(m.spouse2Id, g)
        changed = true
      }
    })
    relations.forEach((r) => {
      if (!memberMap.has(r.parentId) || !memberMap.has(r.childId)) return
      const pg = generation.get(r.parentId)!
      const cg = generation.get(r.childId)!
      if (cg <= pg) {
        generation.set(r.childId, pg + 1)
        changed = true
      }
    })
    if (!changed) break
  }

  // --- Step 3: group members by generation ---
  const byGen = new Map<number, string[]>()
  members.forEach((m) => {
    const g = generation.get(m.id)!
    if (!byGen.has(g)) byGen.set(g, [])
    byGen.get(g)!.push(m.id)
  })
  const generations = Array.from(byGen.keys()).sort((a, b) => a - b)

  // 生年月日が分かっているメンバーを古い順に、不明なメンバーは末尾に回す
  function compareBirthDate(a: string, b: string): number {
    const da = memberMap.get(a)!.birthDate
    const db = memberMap.get(b)!.birthDate
    if (da && db) return da.localeCompare(db)
    if (da) return -1
    if (db) return 1
    return 0
  }

  // Cluster a generation's members so spouses sit next to each other
  // （配偶者同士は男性を左（先）にする）
  function clusterBySpouse(ids: string[]): string[] {
    const seen = new Set<string>()
    const idSet = new Set(ids)
    const result: string[] = []
    ids.forEach((id) => {
      if (seen.has(id)) return
      const spouses = (spouseOf.get(id) || []).filter((s) => idSet.has(s) && !seen.has(s))
      if (spouses.length === 0) {
        result.push(id)
        seen.add(id)
        return
      }
      const [primarySpouse, ...restSpouses] = spouses
      const idIsMale = memberMap.get(id)!.gender === 'male'
      const spouseIsMale = memberMap.get(primarySpouse)!.gender === 'male'
      const pair = !idIsMale && spouseIsMale ? [primarySpouse, id] : [id, primarySpouse]
      pair.forEach((m) => {
        result.push(m)
        seen.add(m)
      })
      restSpouses.forEach((s) => {
        if (!seen.has(s)) {
          result.push(s)
          seen.add(s)
        }
      })
    })
    return result
  }

  // --- Step 4: order members within each generation to reduce line crossings ---
  const orderIndex = new Map<string, number>()
  generations.forEach((g, idx) => {
    let ids = byGen.get(g)!
    if (idx === 0) {
      ids = clusterBySpouse(ids.slice().sort(compareBirthDate))
    } else {
      ids = ids.slice().sort((a, b) => {
        const pa = parentsOf.get(a) || []
        const pb = parentsOf.get(b) || []
        const avgA = pa.length
          ? pa.reduce((s, p) => s + (orderIndex.get(p) ?? 0), 0) / pa.length
          : Number.MAX_SAFE_INTEGER
        const avgB = pb.length
          ? pb.reduce((s, p) => s + (orderIndex.get(p) ?? 0), 0) / pb.length
          : Number.MAX_SAFE_INTEGER
        // 同じ親を持つ兄弟同士（avgが同じ）は生年月日順に並べる
        if (avgA !== avgB) return avgA - avgB
        return compareBirthDate(a, b)
      })
      ids = clusterBySpouse(ids)
    }
    ids.forEach((id, i) => orderIndex.set(id, i))
    byGen.set(g, ids)
  })

  // 各世代を単純に横幅基準で中央揃えするだけだと、子が少ない/多い枝が混在したときに
  // 実際の親子の真上・真下からずれてしまい、線が長く伸びて親子が離れて見えてしまう。
  // そのため、いちばん下の世代（子がいない末端）から上の世代に向かって、
  // 「親は自分の実の子供たちの中心の真上に置く」方式で座標を決める。
  const childrenOf = new Map<string, string[]>()
  relations.forEach((r) => {
    if (!memberMap.has(r.parentId) || !memberMap.has(r.childId)) return
    if (!childrenOf.has(r.parentId)) childrenOf.set(r.parentId, [])
    childrenOf.get(r.parentId)!.push(r.childId)
  })

  // 世代内で並んでいる順序（byGen）はすでに配偶者が隣り合うようクラスタ化されているため、
  // 隣接する2人が配偶者ならまとめて1クラスタとして扱う
  function toClusters(orderedIds: string[]): string[][] {
    const clusters: string[][] = []
    const seen = new Set<string>()
    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i]
      if (seen.has(id)) continue
      const next = orderedIds[i + 1]
      if (next && !seen.has(next) && (spouseOf.get(id) || []).includes(next)) {
        clusters.push([id, next])
        seen.add(id)
        seen.add(next)
      } else {
        clusters.push([id])
        seen.add(id)
      }
    }
    return clusters
  }

  const clusterWidth = (count: number) => count * NODE_WIDTH + (count - 1) * H_GAP

  // --- Step 5: assign coordinates（末端の世代から上に向かって配置） ---
  const positions = new Map<string, { x: number; y: number }>()
  const nodeByMemberId = new Map<string, LayoutNode>()
  const clusterOf = new Map<string, string[]>()
  const nodes: LayoutNode[] = []

  // 兄弟（無関係な隣のクラスタ）との重なりを避けるために親が右にずれた場合、
  // 位置決め済みの子孫（下の世代）を置き去りにすると、親子の線が斜めに
  // ズレて「子が親の真下に来ていない」ように見えてしまう。
  // ずれた分だけ子孫全員も一緒に横へずらし、親子の位置関係を保つ。
  // 子だけでなく、その配偶者（クラスタ全体）も一緒にずらさないと
  // 夫婦の並びが崩れてしまうため、クラスタ単位でずらす。
  function shiftDescendants(rootIds: string[], delta: number) {
    if (delta === 0) return
    const queue = [...rootIds]
    const seen = new Set<string>()
    while (queue.length > 0) {
      const id = queue.shift()!
      ;(childrenOf.get(id) || []).forEach((childId) => {
        if (seen.has(childId)) return
        const cluster = clusterOf.get(childId) || [childId]
        cluster.forEach((memberId) => {
          if (seen.has(memberId)) return
          seen.add(memberId)
          const pos = positions.get(memberId)
          const node = nodeByMemberId.get(memberId)
          if (pos) pos.x += delta
          if (node) node.x += delta
          queue.push(memberId)
        })
      })
    }
  }

  for (let idx = generations.length - 1; idx >= 0; idx--) {
    const g = generations[idx]
    const clusters = toClusters(byGen.get(g)!)
    const y = g * (NODE_HEIGHT + V_GAP) + V_GAP / 2

    let cursorX = H_GAP
    clusters.forEach((cluster) => {
      const cw = clusterWidth(cluster.length)

      // このクラスタ（本人、または配偶者どちらの子も含む）の実子の中心座標を求める
      const childCenters: number[] = []
      cluster.forEach((memberId) => {
        ;(childrenOf.get(memberId) || []).forEach((childId) => {
          const childPos = positions.get(childId)
          if (childPos) childCenters.push(childPos.x + NODE_WIDTH / 2)
        })
      })
      const idealCenterX =
        childCenters.length > 0
          ? childCenters.reduce((s, x) => s + x, 0) / childCenters.length
          : null

      // 兄弟同士が重ならないよう、cursorX より左には置かない
      const desiredLeft = idealCenterX !== null ? idealCenterX - cw / 2 : cursorX
      const left = Math.max(desiredLeft, cursorX)

      cluster.forEach((memberId, i) => {
        const x = left + i * (NODE_WIDTH + H_GAP)
        const node: LayoutNode = { member: memberMap.get(memberId)!, x, y, generation: g }
        positions.set(memberId, { x, y })
        nodeByMemberId.set(memberId, node)
        clusterOf.set(memberId, cluster)
        nodes.push(node)
      })

      shiftDescendants(cluster, left - desiredLeft)

      cursorX = left + cw + H_GAP
    })
  }

  nodes.sort((a, b) => a.generation - b.generation)

  const width =
    Math.max(...Array.from(positions.values()).map((p) => p.x + NODE_WIDTH)) + H_GAP
  const height = generations.length * (NODE_HEIGHT + V_GAP) + V_GAP / 2

  // --- Step 6: build connector paths ---
  const edges: LayoutEdge[] = []

  validMarriages.forEach((m) => {
    const p1 = positions.get(m.spouse1Id)
    const p2 = positions.get(m.spouse2Id)
    if (!p1 || !p2) return
    const y = p1.y + NODE_HEIGHT / 2
    const leftX = Math.min(p1.x, p2.x) + NODE_WIDTH
    const rightX = Math.max(p1.x, p2.x)
    edges.push({
      id: `marriage-${m.id}`,
      type: 'marriage',
      path: `M ${leftX} ${y} L ${rightX} ${y}`,
    })
  })

  const processedChildren = new Set<string>()
  members.forEach((child) => {
    if (processedChildren.has(child.id)) return
    const parents = (parentsOf.get(child.id) || []).filter((p) => positions.has(p))
    if (parents.length === 0) return
    processedChildren.add(child.id)

    const parentPositions = parents.map((p) => positions.get(p)!)
    const startX =
      parentPositions.reduce((s, p) => s + p.x, 0) / parentPositions.length + NODE_WIDTH / 2
    const startY = Math.max(...parentPositions.map((p) => p.y)) + NODE_HEIGHT

    const childPos = positions.get(child.id)!
    const endX = childPos.x + NODE_WIDTH / 2
    const endY = childPos.y
    const midY = (startY + endY) / 2

    edges.push({
      id: `pc-${parents.join('-')}-${child.id}`,
      type: 'parent-child',
      path: `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`,
    })
  })

  return { nodes, edges: addCrossingGaps(edges), width, height }
}

// 無関係な線同士がただ交差しているだけなのか、実際に繋がっているのかを見分けられるように、
// 縦方向のセグメントが他の線（別のエッジ）の横方向のセグメントと交差する箇所に
// 小さな隙間を入れる（横線側は繋げたままにし、縦線が下を通っているように見せる）。
// 端点同士が触れているだけの本当の接続点は、セグメント内部での交差ではないため対象外。
const CROSSING_GAP = 10

function addCrossingGaps(edges: LayoutEdge[]): LayoutEdge[] {
  type Point = { x: number; y: number }
  type Segment = { edgeIndex: number; a: Point; b: Point }

  function parsePoints(path: string): Point[] {
    const nums = (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
    const points: Point[] = []
    for (let i = 0; i + 1 < nums.length; i += 2) points.push({ x: nums[i], y: nums[i + 1] })
    return points
  }

  function pointsToSegments(edgeIndex: number, points: Point[]): Segment[] {
    const segments: Segment[] = []
    for (let i = 0; i + 1 < points.length; i++) {
      const a = points[i]
      const b = points[i + 1]
      if (a.x === b.x && a.y === b.y) continue
      segments.push({ edgeIndex, a, b })
    }
    return segments
  }

  const edgePoints = edges.map((e) => parsePoints(e.path))
  const allSegments = edgePoints.flatMap((points, i) => pointsToSegments(i, points))
  const verticals = allSegments.filter((s) => s.a.x === s.b.x)
  const horizontals = allSegments.filter((s) => s.a.y === s.b.y)

  // segmentKey -> このセグメント上で隙間を入れるべき交差点のY座標一覧
  const gapsBySegment = new Map<string, number[]>()
  const segmentKey = (edgeIndex: number, a: Point, b: Point) =>
    `${edgeIndex}:${a.x},${a.y}-${b.x},${b.y}`

  verticals.forEach((v) => {
    const vy1 = Math.min(v.a.y, v.b.y)
    const vy2 = Math.max(v.a.y, v.b.y)
    horizontals.forEach((h) => {
      if (h.edgeIndex === v.edgeIndex) return
      const hx1 = Math.min(h.a.x, h.b.x)
      const hx2 = Math.max(h.a.x, h.b.x)
      // 同じ世代間をつなぐ親子線は必ず同じY（midY）を通るため、無関係な線同士の
      // 交差点でも縦線の端点（startY/midY/endY）とちょうど一致することが多い。
      // Y側は端点も含めて判定し、X側だけ「横線の端点ちょうどではない」を条件にすることで、
      // 本当の接続点（縦線の端点がその横線自身の端点と一致する場合）とだけ区別する。
      const crossesInterior = h.a.y >= vy1 && h.a.y <= vy2 && v.a.x > hx1 && v.a.x < hx2
      if (!crossesInterior) return
      const key = segmentKey(v.edgeIndex, v.a, v.b)
      if (!gapsBySegment.has(key)) gapsBySegment.set(key, [])
      gapsBySegment.get(key)!.push(h.a.y)
    })
  })

  if (gapsBySegment.size === 0) return edges

  return edges.map((edge, i) => {
    const points = edgePoints[i]
    const parts: string[] = []
    for (let j = 0; j + 1 < points.length; j++) {
      const a = points[j]
      const b = points[j + 1]
      if (a.x === b.x && a.y === b.y) continue
      const crossings = gapsBySegment.get(segmentKey(i, a, b))
      if (a.x === b.x && crossings && crossings.length > 0) {
        const dir = b.y > a.y ? 1 : -1
        const sorted = crossings.slice().sort((p, q) => (p - q) * dir)
        let cursorY = a.y
        sorted.forEach((cy) => {
          const gapStart = cy - (CROSSING_GAP / 2) * dir
          if ((gapStart - cursorY) * dir > 0) {
            parts.push(`M ${a.x} ${cursorY} L ${a.x} ${gapStart}`)
          }
          cursorY = cy + (CROSSING_GAP / 2) * dir
        })
        if ((b.y - cursorY) * dir > 0) {
          parts.push(`M ${a.x} ${cursorY} L ${b.x} ${b.y}`)
        }
      } else {
        parts.push(`M ${a.x} ${a.y} L ${b.x} ${b.y}`)
      }
    }
    return { ...edge, path: parts.join(' ') }
  })
}
