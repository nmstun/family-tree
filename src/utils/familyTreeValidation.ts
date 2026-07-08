import { ParentChildRelation } from '@/types'

/**
 * Returns true if adding a parentId -> childId relation would create a
 * cycle in the family tree (i.e. childId is already an ancestor of parentId).
 */
export function wouldCreateCycle(
  parentId: string,
  childId: string,
  relations: ParentChildRelation[]
): boolean {
  const parentsMap = new Map<string, string[]>()
  relations.forEach((r) => {
    if (!parentsMap.has(r.childId)) parentsMap.set(r.childId, [])
    parentsMap.get(r.childId)!.push(r.parentId)
  })

  const stack = [parentId]
  const visited = new Set<string>()
  while (stack.length > 0) {
    const current = stack.pop()!
    if (current === childId) return true
    if (visited.has(current)) continue
    visited.add(current)
    const ancestors = parentsMap.get(current) || []
    stack.push(...ancestors)
  }
  return false
}
