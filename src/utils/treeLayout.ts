import { FamilyMember, Marriage, ParentChildRelation } from '@/types'

export const NODE_WIDTH = 140
export const NODE_HEIGHT = 112
export const H_GAP = 36
export const V_GAP = 150

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
  // 親子関係（子は親の1つ下の世代）・配偶者関係（同じ世代）を「制約」として扱い、
  // つながっている人たち全体で矛盾なく世代を割り当てる。
  // 単純に「親の登録がない人＝最上段（0世代目）」と決め打ちすると、
  // その人の子が結婚相手を通じてもっと深い家系と繋がっている場合に、
  // 子だけが配偶者の世代に合わせて下にずれ、親は最上段に取り残されてしまう
  // （＝血のつながった親なのに、その子の配偶者の親より何世代も上に表示される）。
  // そのため親→子・配偶者同士の「相対的な世代差」を基準にたどり、
  // つながっている一族（連結成分）ごとに矛盾のない世代を求める。
  const generation = new Map<string, number>()
  {
    const adjacency = new Map<string, { to: string; delta: number }[]>()
    const addEdge = (from: string, to: string, delta: number) => {
      if (!adjacency.has(from)) adjacency.set(from, [])
      adjacency.get(from)!.push({ to, delta })
    }
    relations.forEach((r) => {
      if (!memberMap.has(r.parentId) || !memberMap.has(r.childId)) return
      addEdge(r.parentId, r.childId, 1)
      addEdge(r.childId, r.parentId, -1)
    })
    validMarriages.forEach((m) => {
      addEdge(m.spouse1Id, m.spouse2Id, 0)
      addEdge(m.spouse2Id, m.spouse1Id, 0)
    })

    const visited = new Set<string>()
    members.forEach((root) => {
      if (visited.has(root.id)) return
      // 連結成分ごとにBFSで相対的な世代差をたどる
      const relative = new Map<string, number>()
      relative.set(root.id, 0)
      visited.add(root.id)
      const queue = [root.id]
      while (queue.length > 0) {
        const id = queue.shift()!
        const g = relative.get(id)!
        ;(adjacency.get(id) || []).forEach(({ to, delta }) => {
          if (visited.has(to)) return
          visited.add(to)
          relative.set(to, g + delta)
          queue.push(to)
        })
      }
      // その成分内でいちばん上（最小値）を0世代目として揃える
      const minGen = Math.min(...Array.from(relative.values()))
      relative.forEach((g, id) => generation.set(id, g - minGen))
    })
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

  // --- Step 5: レイアウトの木構造を組み立て、幅計算→配置の2段階で座標を求める ---
  // 各人物を「クラスタ」（本人単独、または配偶者とのペア）にまとめ、クラスタ同士の
  // 親子関係を木構造として扱う。まず子孫の実際のサイズ（幅）をボトムアップに
  // 計算してから、その幅に基づいてトップダウンに配置することで、
  // 「一部の子孫グループだけ極端に大きい」場合でも、後から重なりを直したり
  // 親を再調整したりする繰り返し処理なしに、1回の計算で
  // 重なりのない・親が実子の中心に来る配置に収束する
  // （以前は「重なったら押し出す」処理を後から繰り返していたが、
  // 押し出しにつられて子孫の重心が変わっても親の位置は再調整されず、
  // 兄弟の親同士の間に不自然な余白ができる不具合があった）。
  //
  // 同じ子クラスタが両方の配偶者の実の親から辿れる場合（他の家系から嫁いできた
  // 配偶者など）は、どちらか一方だけを配置計算上の「主たる親」とする
  // （もう一方の親からの線は、実際に配置された位置まで伸ばして描画される）。
  const positions = new Map<string, { x: number; y: number }>()
  const nodeByMemberId = new Map<string, LayoutNode>()
  const clusterOf = new Map<string, string[]>()
  const nodes: LayoutNode[] = []

  const clusterOrderIndex = new Map<string, number>()
  generations.forEach((g) => {
    const clusters = toClusters(byGen.get(g)!)
    clusters.forEach((cluster, i) => {
      cluster.forEach((memberId) => {
        clusterOf.set(memberId, cluster)
        clusterOrderIndex.set(memberId, i)
      })
    })
  })

  // 各クラスタの「主たる親クラスタ」を決める（無ければ配置上のルート）。
  // クラスタは配列の参照そのものを識別子として使う（Map/Setのキーは参照一致）。
  const primaryChildrenOf = new Map<string[], string[][]>()
  const roots: string[][] = []
  {
    const visited = new Set<string[]>()
    members.forEach((child) => {
      const childCluster = clusterOf.get(child.id)
      if (!childCluster || visited.has(childCluster)) return
      visited.add(childCluster)

      const candidateParents: string[][] = []
      const seenParents = new Set<string[]>()
      childCluster.forEach((memberId) => {
        ;(parentsOf.get(memberId) || []).forEach((parentId) => {
          const parentCluster = clusterOf.get(parentId)
          if (parentCluster && parentCluster !== childCluster && !seenParents.has(parentCluster)) {
            seenParents.add(parentCluster)
            candidateParents.push(parentCluster)
          }
        })
      })

      if (candidateParents.length === 0) {
        roots.push(childCluster)
        return
      }
      const primary = candidateParents[0]
      if (!primaryChildrenOf.has(primary)) primaryChildrenOf.set(primary, [])
      primaryChildrenOf.get(primary)!.push(childCluster)
    })

    primaryChildrenOf.forEach((children) => {
      children.sort(
        (a, b) => (clusterOrderIndex.get(a[0]) ?? 0) - (clusterOrderIndex.get(b[0]) ?? 0)
      )
    })
    roots.sort((a, b) => {
      const ga = generation.get(a[0])!
      const gb = generation.get(b[0])!
      if (ga !== gb) return ga - gb
      return (clusterOrderIndex.get(a[0]) ?? 0) - (clusterOrderIndex.get(b[0]) ?? 0)
    })
  }

  const clusterWidthOf = (cluster: string[]) => clusterWidth(cluster.length)

  // ボトムアップ：各クラスタの子孫全体が必要とする幅を計算する
  // （循環はあり得ないはずだが、万一のデータ不整合で無限再帰しないよう防御する）
  const widthMemo = new Map<string[], number>()
  const computingWidth = new Set<string[]>()
  function computeRequiredWidth(cluster: string[]): number {
    const memo = widthMemo.get(cluster)
    if (memo !== undefined) return memo
    const cw = clusterWidthOf(cluster)
    if (computingWidth.has(cluster)) return cw
    computingWidth.add(cluster)
    const children = primaryChildrenOf.get(cluster) || []
    const width =
      children.length === 0
        ? cw
        : Math.max(
            cw,
            children.reduce((s, c) => s + computeRequiredWidth(c), 0) + H_GAP * (children.length - 1)
          )
    computingWidth.delete(cluster)
    widthMemo.set(cluster, width)
    return width
  }

  // トップダウン：親に割り当てられた枠（slotLeft〜slotLeft+slotWidth）の中で、
  // 子クラスタをそれぞれの必要幅ぶんの枠に配置し、自分は実子の中心に置く
  const positioning = new Set<string[]>()
  function assignPositions(cluster: string[], slotLeft: number, slotWidth: number) {
    if (positioning.has(cluster)) return
    positioning.add(cluster)
    const g = generation.get(cluster[0])!
    const y = g * (NODE_HEIGHT + V_GAP) + V_GAP / 2
    const cw = clusterWidthOf(cluster)
    const children = primaryChildrenOf.get(cluster) || []

    let left: number
    if (children.length === 0) {
      left = slotLeft + (slotWidth - cw) / 2
    } else {
      const childWidths = children.map((c) => computeRequiredWidth(c))
      const childrenTotal = childWidths.reduce((s, w) => s + w, 0) + H_GAP * (children.length - 1)
      let cursor = slotLeft + (slotWidth - childrenTotal) / 2
      children.forEach((childCluster, i) => {
        assignPositions(childCluster, cursor, childWidths[i])
        cursor += childWidths[i] + H_GAP
      })
      const centers = children.map((c) => positions.get(c[0])!.x + clusterWidthOf(c) / 2)
      const idealCenter = centers.reduce((s, x) => s + x, 0) / centers.length
      left = idealCenter - cw / 2
    }

    cluster.forEach((memberId, i) => {
      const x = left + i * (NODE_WIDTH + H_GAP)
      const node: LayoutNode = { member: memberMap.get(memberId)!, x, y, generation: g }
      positions.set(memberId, { x, y })
      nodeByMemberId.set(memberId, node)
      nodes.push(node)
    })
  }

  let rootCursor = H_GAP
  roots.forEach((rootCluster) => {
    const w = computeRequiredWidth(rootCluster)
    assignPositions(rootCluster, rootCursor, w)
    rootCursor += w + H_GAP
  })

  nodes.sort((a, b) => a.generation - b.generation)

  const width =
    Math.max(...Array.from(positions.values()).map((p) => p.x + NODE_WIDTH)) + H_GAP
  const height = generations.length * (NODE_HEIGHT + V_GAP) + V_GAP / 2

  // --- Step 6: build connector paths ---
  const edges: LayoutEdge[] = []

  // 夫婦の「親の組み合わせキー」から、その配偶者線のエッジIDを引けるようにしておく
  // （子への線が自分の配偶者線と交差判定されて誤ってジャンプ扱いされるのを防ぐため）。
  const marriageEdgeIdByPairKey = new Map<string, string>()

  validMarriages.forEach((m) => {
    const p1 = positions.get(m.spouse1Id)
    const p2 = positions.get(m.spouse2Id)
    if (!p1 || !p2) return
    const y = p1.y + NODE_HEIGHT / 2
    const leftX = Math.min(p1.x, p2.x) + NODE_WIDTH
    const rightX = Math.max(p1.x, p2.x)
    const edgeId = `marriage-${m.id}`
    marriageEdgeIdByPairKey.set([m.spouse1Id, m.spouse2Id].sort().join(','), edgeId)
    edges.push({
      id: edgeId,
      type: 'marriage',
      path: `M ${leftX} ${y} L ${rightX} ${y}`,
    })
  })

  // 親子の線を「親の組み合わせ」（＝兄弟姉妹のまとまり）ごとにグループ化する。
  // 同じ親から複数の子がいる場合は、そのグループ内では同じ高さの横棒でつなぐ
  // （＝兄弟であることが分かる）。
  type ChildLink = { child: FamilyMember; parents: string[] }
  const groupKey = (parents: string[]) => parents.slice().sort().join(',')
  const groups = new Map<
    string,
    {
      startX: number
      startY: number
      rowBottomEdge: number
      connectedMarriageEdgeId?: string
      children: ChildLink[]
    }
  >()

  const processedChildren = new Set<string>()
  members.forEach((child) => {
    if (processedChildren.has(child.id)) return
    const parents = (parentsOf.get(child.id) || []).filter((p) => positions.has(p))
    if (parents.length === 0) return
    processedChildren.add(child.id)

    const key = groupKey(parents)
    if (!groups.has(key)) {
      const parentPositions = parents.map((p) => positions.get(p)!)
      const startX =
        parentPositions.reduce((s, p) => s + p.x, 0) / parentPositions.length + NODE_WIDTH / 2
      // 世代の境界（＝親ノードの下端。世代の区切りとして常に一定）。
      // 横棒の高さ（レーン）はこれを基準に計算し、夫婦かどうかに関わらず
      // 必ず親ノードの下端より下（実際の世代間の隙間の中）に収まるようにする。
      const rowBottomEdge = Math.max(...parentPositions.map((p) => p.y)) + NODE_HEIGHT
      // 両親が夫婦の場合、子への線の起点をノード下端ではなく配偶者線と同じ高さ
      // （ノードの縦中央）にする。起点のX座標は2人の間の隙間（ノードの外）なので、
      // 配偶者線から子への線がそのまま繋がって見える（下端までは親ノードの裏を通る）。
      const connectedMarriageEdgeId = marriageEdgeIdByPairKey.get(key)
      const startY = rowBottomEdge - (connectedMarriageEdgeId ? NODE_HEIGHT / 2 : 0)
      groups.set(key, { startX, startY, rowBottomEdge, connectedMarriageEdgeId, children: [] })
    }
    groups.get(key)!.children.push({ child, parents })
  })

  // 世代の境界（同じrowBottomEdge）から線が伸びる家族が複数あるとき、
  // 横棒をすべて同じ高さで描くと隣の家族の横棒とつながって見えてしまい、
  // どの親子の線か分からなくなる。家族（親の組み合わせ）ごとに横棒の高さを
  // 数段に分けてずらし、それでも他の家族の線と交差する箇所は
  // addCrossingJumps でジャンプさせて「別の線を飛び越えているだけ」と分かるようにする。
  //
  // レーン数は固定にせず、同じ世代境界を共有する家族の数に合わせて動的に決める。
  // 固定レーン数＋mod割り当てだと、その数を超える家族がいたときに
  // 別の家族と同じレーン（＝同じ高さ）に割り当てられ、横棒が完全に重なってしまう。
  const laneIndexByGroup = new Map<string, number>()
  const laneCountByRowBottomEdge = new Map<number, number>()
  const groupsByRowBottomEdge = new Map<number, string[]>()
  groups.forEach((g, key) => {
    if (!groupsByRowBottomEdge.has(g.rowBottomEdge)) groupsByRowBottomEdge.set(g.rowBottomEdge, [])
    groupsByRowBottomEdge.get(g.rowBottomEdge)!.push(key)
  })
  groupsByRowBottomEdge.forEach((keys, rowBottomEdge) => {
    laneCountByRowBottomEdge.set(rowBottomEdge, keys.length)
    keys
      .slice()
      .sort((a, b) => groups.get(a)!.startX - groups.get(b)!.startX)
      .forEach((key, i) => laneIndexByGroup.set(key, i))
  })

  // 子への線のうち、自分の親の配偶者線とだけは交差判定・ジャンプの対象外にする
  // （正規の接続点であり、無関係な交差ではないため）。他の無関係な線との交差は
  // 通常どおり判定する（例：離れた実の親から伸びる線が、他の家族の横棒を
  // 実際に横切る場合はきちんとジャンプさせたい）。
  const skipJumpPairs = new Set<string>()

  groups.forEach((group, key) => {
    const lane = laneIndexByGroup.get(key) ?? 0
    const laneCount = laneCountByRowBottomEdge.get(group.rowBottomEdge) ?? 1
    const laneFraction = laneCount <= 1 ? 0.5 : 0.2 + (0.6 * lane) / (laneCount - 1)
    group.children.forEach(({ child, parents }) => {
      const childPos = positions.get(child.id)!
      const endX = childPos.x + NODE_WIDTH / 2
      const endY = childPos.y
      const midY = group.rowBottomEdge + (endY - group.rowBottomEdge) * laneFraction

      const edgeId = `pc-${parents.join('-')}-${child.id}`
      if (group.connectedMarriageEdgeId) {
        skipJumpPairs.add(`${edgeId}|${group.connectedMarriageEdgeId}`)
      }
      edges.push({
        id: edgeId,
        type: 'parent-child',
        path: `M ${group.startX} ${group.startY} L ${group.startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`,
      })
    })
  })

  return { nodes, edges: addCrossingJumps(edges, skipJumpPairs), width, height }
}

// 無関係な線同士がただ交差しているだけなのか、実際に繋がっているのかを見分けられるように、
// 縦方向のセグメントが他の線（別のエッジ）の横方向のセグメントと交差する箇所で、
// 小さな円弧を描いて「ジャンプ」させる（横線側はまっすぐ繋げたままにし、
// 縦線がその上を飛び越えているように見せる）。単に隙間を空けるだけだと、
// 線がそこで途切れているのか繋がっているのか紛らわしいため、
// 明確に「よけている」形にする。
// 端点同士が触れているだけの本当の接続点は、セグメント内部での交差ではないため対象外。
const CROSSING_HOP_RADIUS = 7

function addCrossingJumps(
  edges: LayoutEdge[],
  skipPairs: Set<string> = new Set()
): LayoutEdge[] {
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

  // segmentKey -> このセグメント上でジャンプさせるべき交差点のY座標一覧
  const hopsBySegment = new Map<string, number[]>()
  const segmentKey = (edgeIndex: number, a: Point, b: Point) =>
    `${edgeIndex}:${a.x},${a.y}-${b.x},${b.y}`

  verticals.forEach((v) => {
    const vy1 = Math.min(v.a.y, v.b.y)
    const vy2 = Math.max(v.a.y, v.b.y)
    horizontals.forEach((h) => {
      if (h.edgeIndex === v.edgeIndex) return
      // 子への線と、その線が起点とする配偶者線同士の組み合わせは、
      // 正規の接続点であり無関係な交差ではないため対象から除外する
      // （他の無関係な線との交差は、高さが偶然一致していてもきちんと判定する）。
      const vId = edges[v.edgeIndex].id
      const hId = edges[h.edgeIndex].id
      if (skipPairs.has(`${vId}|${hId}`) || skipPairs.has(`${hId}|${vId}`)) return
      const hx1 = Math.min(h.a.x, h.b.x)
      const hx2 = Math.max(h.a.x, h.b.x)
      // 同じ世代間をつなぐ親子線は必ず同じY（midY）を通るため、無関係な線同士の
      // 交差点でも縦線の端点（startY/midY/endY）とちょうど一致することが多い。
      // Y側は端点も含めて判定し、X側だけ「横線の端点ちょうどではない」を条件にすることで、
      // 本当の接続点（縦線の端点がその横線自身の端点と一致する場合）とだけ区別する。
      const crossesInterior = h.a.y >= vy1 && h.a.y <= vy2 && v.a.x > hx1 && v.a.x < hx2
      if (!crossesInterior) return
      const key = segmentKey(v.edgeIndex, v.a, v.b)
      if (!hopsBySegment.has(key)) hopsBySegment.set(key, [])
      hopsBySegment.get(key)!.push(h.a.y)
    })
  })

  if (hopsBySegment.size === 0) return edges

  return edges.map((edge, i) => {
    const points = edgePoints[i]
    if (points.length === 0) return edge
    let path = `M ${points[0].x} ${points[0].y}`
    for (let j = 0; j + 1 < points.length; j++) {
      const a = points[j]
      const b = points[j + 1]
      if (a.x === b.x && a.y === b.y) continue
      const crossings = hopsBySegment.get(segmentKey(i, a, b))
      if (a.x === b.x && crossings && crossings.length > 0) {
        const dir = b.y > a.y ? 1 : -1
        const sorted = crossings.slice().sort((p, q) => (p - q) * dir)
        let cursorY = a.y
        sorted.forEach((cy) => {
          const hopStart = cy - CROSSING_HOP_RADIUS * dir
          const hopEnd = cy + CROSSING_HOP_RADIUS * dir
          if ((hopStart - cursorY) * dir > 0) {
            path += ` L ${a.x} ${hopStart}`
          }
          // 半円を描いて右側へよける（＝下の横線の上を飛び越える）
          path += ` A ${CROSSING_HOP_RADIUS} ${CROSSING_HOP_RADIUS} 0 0 1 ${a.x} ${hopEnd}`
          cursorY = hopEnd
        })
        if ((b.y - cursorY) * dir > 0) {
          path += ` L ${a.x} ${b.y}`
        }
      } else {
        path += ` L ${b.x} ${b.y}`
      }
    }
    return { ...edge, path }
  })
}
