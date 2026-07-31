'use client'

import { useEffect, useMemo, useState } from 'react'
import { FamilyMember, Marriage, ParentChildRelation } from '@/types'

const COLLAPSE_STORAGE_PREFIX = 'familyTree:collapsed:'

/**
 * 家系図の一部（あるメンバーより下の子孫グループ）を折りたたむ機能。
 *
 * 折りたたみ状態はこのブラウザにのみ保存する（他の共同編集者には影響しない）。
 * 読み込みはツリーが決まった時の1回だけ。保存は変更時に直接書き込む。
 * 読み込みと保存の両方を useEffect にすると、マウント直後に「読み込む前の空の状態」で
 * 保存Effectが走り、localStorage を空で上書きしてしまうため。
 */
export function useCollapsibleTree(
  treeId: string,
  members: FamilyMember[],
  marriages: Marriage[],
  parentChildRelations: ParentChildRelation[]
) {
  const [collapsedRootIds, setCollapsedRootIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    if (!treeId) return
    try {
      const raw = localStorage.getItem(COLLAPSE_STORAGE_PREFIX + treeId)
      setCollapsedRootIds(raw ? new Set(JSON.parse(raw)) : new Set())
    } catch {
      setCollapsedRootIds(new Set())
    }
  }, [treeId])

  const persist = (next: Set<string>) => {
    if (!treeId) return
    try {
      localStorage.setItem(COLLAPSE_STORAGE_PREFIX + treeId, JSON.stringify(Array.from(next)))
    } catch {
      // プライベートブラウズなどlocalStorageが使えない環境では諦める
    }
  }

  // 「このメンバーを起点に折りたたんだ場合に隠れるメンバー」の集合を、
  // 子を持つメンバーごとに事前計算しておく。子(down)と配偶者(spouse)を
  // 交互にたどり、選択したメンバーより下の家族グループ全体を1セットにまとめる。
  const { childrenOf, hiddenSetByRoot } = useMemo(() => {
    const childrenMap = new Map<string, string[]>()
    parentChildRelations.forEach((r) => {
      if (!childrenMap.has(r.parentId)) childrenMap.set(r.parentId, [])
      childrenMap.get(r.parentId)!.push(r.childId)
    })
    const spouseMap = new Map<string, string[]>()
    marriages.forEach((m) => {
      if (!spouseMap.has(m.spouse1Id)) spouseMap.set(m.spouse1Id, [])
      spouseMap.get(m.spouse1Id)!.push(m.spouse2Id)
      if (!spouseMap.has(m.spouse2Id)) spouseMap.set(m.spouse2Id, [])
      spouseMap.get(m.spouse2Id)!.push(m.spouse1Id)
    })

    const hiddenByRoot = new Map<string, Set<string>>()
    childrenMap.forEach((_, rootId) => {
      const hidden = new Set<string>()
      const queue = [...(childrenMap.get(rootId) ?? [])]
      while (queue.length > 0) {
        const id = queue.shift()!
        if (hidden.has(id)) continue
        hidden.add(id)
        ;(spouseMap.get(id) ?? []).forEach((s) => {
          if (!hidden.has(s)) queue.push(s)
        })
        ;(childrenMap.get(id) ?? []).forEach((c) => {
          if (!hidden.has(c)) queue.push(c)
        })
      }
      hiddenByRoot.set(rootId, hidden)
    })

    return { childrenOf: childrenMap, hiddenSetByRoot: hiddenByRoot }
  }, [parentChildRelations, marriages])

  const hiddenMemberIds = useMemo(() => {
    const hidden = new Set<string>()
    collapsedRootIds.forEach((rootId) => {
      hiddenSetByRoot.get(rootId)?.forEach((id) => hidden.add(id))
    })
    return hidden
  }, [collapsedRootIds, hiddenSetByRoot])

  // 折りたたまれたぶんを除いた、実際に描画する対象
  const visibleMembers = useMemo(
    () => members.filter((m) => !hiddenMemberIds.has(m.id)),
    [members, hiddenMemberIds]
  )
  const visibleMarriages = useMemo(
    () =>
      marriages.filter(
        (m) => !hiddenMemberIds.has(m.spouse1Id) && !hiddenMemberIds.has(m.spouse2Id)
      ),
    [marriages, hiddenMemberIds]
  )
  const visibleRelations = useMemo(
    () =>
      parentChildRelations.filter(
        (r) => !hiddenMemberIds.has(r.parentId) && !hiddenMemberIds.has(r.childId)
      ),
    [parentChildRelations, hiddenMemberIds]
  )

  const toggleCollapse = (memberId: string) => {
    setCollapsedRootIds((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      persist(next)
      return next
    })
  }

  const expandAll = () => {
    setCollapsedRootIds(new Set())
    persist(new Set())
  }

  return {
    collapsedRootIds,
    /** 子を持つメンバーのID → 子のID一覧（折りたたみボタンを出すかの判定に使う） */
    childrenOf,
    /** メンバーID → そこを折りたたんだときに隠れるメンバーの集合（件数表示に使う） */
    hiddenSetByRoot,
    hiddenMemberIds,
    visibleMembers,
    visibleMarriages,
    visibleRelations,
    toggleCollapse,
    expandAll,
  }
}
