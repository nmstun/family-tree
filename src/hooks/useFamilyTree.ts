'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  FamilyTree,
  FamilyMember,
  Marriage,
  ParentChildRelation,
  Gender,
  DatePrecision,
} from '@/types'
import { createClient } from '@/lib/supabase/client'
import { wouldCreateCycle } from '@/utils/familyTreeValidation'

// ---- DB の行 <-> アプリの型 の変換 ----

type MemberRow = {
  id: string
  last_name: string
  first_name: string
  birth_date: string | null
  birth_date_precision: DatePrecision
  death_date: string | null
  death_date_precision: DatePrecision
  gender: Gender
  photo: string | null
  notes: string | null
  created_at: string
}

type MarriageRow = {
  id: string
  spouse1_id: string
  spouse2_id: string
  marriage_date: string | null
}

type RelationRow = {
  parent_id: string
  child_id: string
}

type TreeRow = {
  id: string
  name: string
  created_at: string
  updated_at: string
}

function mapMember(row: MemberRow): FamilyMember {
  return {
    id: row.id,
    lastName: row.last_name,
    firstName: row.first_name,
    birthDate: row.birth_date ?? undefined,
    birthDatePrecision: row.birth_date_precision,
    deathDate: row.death_date ?? undefined,
    deathDatePrecision: row.death_date_precision,
    gender: row.gender,
    photo: row.photo ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  }
}

function mapMarriage(row: MarriageRow): Marriage {
  return {
    id: row.id,
    spouse1Id: row.spouse1_id,
    spouse2Id: row.spouse2_id,
    marriageDate: row.marriage_date ?? undefined,
  }
}

function mapRelation(row: RelationRow): ParentChildRelation {
  return { parentId: row.parent_id, childId: row.child_id }
}

export function useFamilyTree() {
  const supabase = createClient()
  const [tree, setTree] = useState<FamilyTree | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle')
  const treeIdRef = useRef<string | null>(null)

  // 現在のツリーの最新データを Supabase から取得し直す
  // （自分の操作・他のユーザーの操作、どちらの後にも呼ばれる）
  const refetchTree = useCallback(
    async (treeId: string) => {
      const [{ data: treeRow }, { data: memberRows }, { data: marriageRows }, { data: relationRows }] =
        await Promise.all([
          supabase.from('family_trees').select('*').eq('id', treeId).single(),
          supabase
            .from('family_members')
            .select('*')
            .eq('tree_id', treeId)
            .order('created_at', { ascending: true }),
          supabase.from('marriages').select('*').eq('tree_id', treeId),
          supabase.from('parent_child_relations').select('*').eq('tree_id', treeId),
        ])

      if (!treeRow) return

      const t = treeRow as TreeRow
      setTree({
        id: t.id,
        name: t.name,
        members: ((memberRows ?? []) as MemberRow[]).map(mapMember),
        marriages: ((marriageRows ?? []) as MarriageRow[]).map(mapMarriage),
        parentChildRelations: ((relationRows ?? []) as RelationRow[]).map(mapRelation),
        createdAt: new Date(t.created_at).getTime(),
        updatedAt: new Date(t.updated_at).getTime(),
      })
    },
    [supabase]
  )

  // 初期化: ログイン中のユーザーが所属する家系図を探し、
  // なければ新規作成して、以後はリアルタイム購読で変更を反映する
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    let cancelled = false

    const init = async () => {
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user || cancelled) {
        setLoading(false)
        return
      }

      const { data: memberships } = await supabase
        .from('family_tree_members')
        .select('tree_id')
        .eq('user_id', user.id)
        .limit(1)

      let treeId = memberships?.[0]?.tree_id as string | undefined

      if (!treeId) {
        const { data: newTree, error } = await supabase
          .rpc('create_family_tree', { p_name: '我が家の家系図' })
          .single()
        if (error || !newTree || cancelled) {
          setLoading(false)
          return
        }
        treeId = (newTree as TreeRow).id
      }

      if (cancelled || !treeId) {
        setLoading(false)
        return
      }

      treeIdRef.current = treeId
      await refetchTree(treeId)

      channel = supabase
        .channel(`family_tree_${treeId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'family_members', filter: `tree_id=eq.${treeId}` },
          () => refetchTree(treeId!)
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'marriages', filter: `tree_id=eq.${treeId}` },
          () => refetchTree(treeId!)
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'parent_child_relations',
            filter: `tree_id=eq.${treeId}`,
          },
          () => refetchTree(treeId!)
        )
        .subscribe()

      if (!cancelled) setLoading(false)
    }

    init()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [supabase, refetchTree])

  const withSyncStatus = useCallback(
    async (promise: PromiseLike<{ error: unknown }>) => {
      setSyncStatus('syncing')
      const result = await promise
      setSyncStatus(result.error ? 'error' : 'synced')
    },
    []
  )

  // メンバーを追加
  const addMember = useCallback(
    async (member: Omit<FamilyMember, 'id' | 'createdAt'>) => {
      const treeId = treeIdRef.current
      if (!treeId) return
      await withSyncStatus(
        supabase.from('family_members').insert({
          tree_id: treeId,
          last_name: member.lastName,
          first_name: member.firstName,
          birth_date: member.birthDate || null,
          birth_date_precision: member.birthDatePrecision || 'day',
          death_date: member.deathDate || null,
          death_date_precision: member.deathDatePrecision || 'day',
          gender: member.gender,
          photo: member.photo || null,
          notes: member.notes || null,
        })
      )
    },
    [supabase, withSyncStatus]
  )

  // メンバーを更新
  const updateMember = useCallback(
    async (id: string, updates: Partial<FamilyMember>) => {
      const dbUpdates: Record<string, unknown> = {}
      if (updates.lastName !== undefined) dbUpdates.last_name = updates.lastName
      if (updates.firstName !== undefined) dbUpdates.first_name = updates.firstName
      if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate || null
      if (updates.birthDatePrecision !== undefined)
        dbUpdates.birth_date_precision = updates.birthDatePrecision
      if (updates.deathDate !== undefined) dbUpdates.death_date = updates.deathDate || null
      if (updates.deathDatePrecision !== undefined)
        dbUpdates.death_date_precision = updates.deathDatePrecision
      if (updates.gender !== undefined) dbUpdates.gender = updates.gender
      if (updates.photo !== undefined) dbUpdates.photo = updates.photo || null
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null

      await withSyncStatus(supabase.from('family_members').update(dbUpdates).eq('id', id))
    },
    [supabase, withSyncStatus]
  )

  // メンバーを削除
  // marriages / parent_child_relations は DB 側の ON DELETE CASCADE で
  // 自動的に連動削除される
  const deleteMember = useCallback(
    async (id: string) => {
      await withSyncStatus(supabase.from('family_members').delete().eq('id', id))
    },
    [supabase, withSyncStatus]
  )

  // 婚姻関係を追加
  const addMarriage = useCallback(
    async (spouse1Id: string, spouse2Id: string, marriageDate?: string) => {
      const treeId = treeIdRef.current
      if (!treeId) return
      await withSyncStatus(
        supabase.from('marriages').insert({
          tree_id: treeId,
          spouse1_id: spouse1Id,
          spouse2_id: spouse2Id,
          marriage_date: marriageDate || null,
        })
      )
    },
    [supabase, withSyncStatus]
  )

  // 婚姻日を更新
  const updateMarriage = useCallback(
    async (id: string, marriageDate: string) => {
      await withSyncStatus(
        supabase.from('marriages').update({ marriage_date: marriageDate || null }).eq('id', id)
      )
    },
    [supabase, withSyncStatus]
  )

  // 婚姻関係を削除
  const removeMarriage = useCallback(
    async (id: string) => {
      await withSyncStatus(supabase.from('marriages').delete().eq('id', id))
    },
    [supabase, withSyncStatus]
  )

  // 親子関係を追加
  // 親に配偶者がいる場合は、配偶者も自動的に同じ子の親として登録する
  const addParentChild = useCallback(
    async (parentId: string, childId: string) => {
      const treeId = treeIdRef.current
      if (!tree || !treeId) return

      const existingRelations = tree.parentChildRelations
      const newRelations: ParentChildRelation[] = []

      const tryAddRelation = (pId: string, cId: string) => {
        if (pId === cId) return
        const alreadyExists = existingRelations.some((r) => r.parentId === pId && r.childId === cId)
        const alreadyQueued = newRelations.some((r) => r.parentId === pId && r.childId === cId)
        if (alreadyExists || alreadyQueued) return
        if (wouldCreateCycle(pId, cId, [...existingRelations, ...newRelations])) return
        newRelations.push({ parentId: pId, childId: cId })
      }

      tryAddRelation(parentId, childId)

      const spouseIds = tree.marriages
        .filter((m) => m.spouse1Id === parentId || m.spouse2Id === parentId)
        .map((m) => (m.spouse1Id === parentId ? m.spouse2Id : m.spouse1Id))
      spouseIds.forEach((spouseId) => tryAddRelation(spouseId, childId))

      if (newRelations.length === 0) return

      await withSyncStatus(
        supabase.from('parent_child_relations').upsert(
          newRelations.map((r) => ({
            tree_id: treeId,
            parent_id: r.parentId,
            child_id: r.childId,
          })),
          { onConflict: 'tree_id,parent_id,child_id', ignoreDuplicates: true }
        )
      )
    },
    [tree, supabase, withSyncStatus]
  )

  // 親子関係を削除
  const removeParentChild = useCallback(
    async (parentId: string, childId: string) => {
      const treeId = treeIdRef.current
      if (!treeId) return
      await withSyncStatus(
        supabase
          .from('parent_child_relations')
          .delete()
          .eq('tree_id', treeId)
          .eq('parent_id', parentId)
          .eq('child_id', childId)
      )
    },
    [supabase, withSyncStatus]
  )

  // IDでメンバーを取得
  const getMember = useCallback(
    (id: string) => {
      return tree?.members.find((m) => m.id === id)
    },
    [tree]
  )

  return {
    tree,
    loading,
    syncStatus,
    addMember,
    updateMember,
    deleteMember,
    addMarriage,
    updateMarriage,
    removeMarriage,
    addParentChild,
    removeParentChild,
    getMember,
  }
}
