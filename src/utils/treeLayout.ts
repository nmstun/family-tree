import { FamilyMember, Marriage, ParentChildRelation } from '@/types'

export const NODE_WIDTH = 140
export const NODE_HEIGHT = 96
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

  // Cluster a generation's members so spouses sit next to each other
  function clusterBySpouse(ids: string[]): string[] {
    const seen = new Set<string>()
    const idSet = new Set(ids)
    const result: string[] = []
    ids.forEach((id) => {
      if (seen.has(id)) return
      result.push(id)
      seen.add(id)
      const spouses = (spouseOf.get(id) || []).filter((s) => idSet.has(s))
      spouses.forEach((s) => {
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
      ids = clusterBySpouse(
        ids.slice().sort((a, b) => memberMap.get(a)!.createdAt - memberMap.get(b)!.createdAt)
      )
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
        return avgA - avgB
      })
      ids = clusterBySpouse(ids)
    }
    ids.forEach((id, i) => orderIndex.set(id, i))
    byGen.set(g, ids)
  })

  // --- Step 5: assign coordinates ---
  const positions = new Map<string, { x: number; y: number }>()
  const nodes: LayoutNode[] = []
  let maxCols = 0
  generations.forEach((g) => {
    const ids = byGen.get(g)!
    maxCols = Math.max(maxCols, ids.length)
    ids.forEach((id, i) => {
      const x = i * (NODE_WIDTH + H_GAP) + H_GAP
      const y = g * (NODE_HEIGHT + V_GAP) + V_GAP / 2
      positions.set(id, { x, y })
      nodes.push({ member: memberMap.get(id)!, x, y, generation: g })
    })
  })

  const width = maxCols * (NODE_WIDTH + H_GAP) + H_GAP
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

  return { nodes, edges, width, height }
}
