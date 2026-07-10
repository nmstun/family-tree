'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export type CollaboratorRole = 'owner' | 'editor'

export interface Collaborator {
  userId: string
  email: string
  role: CollaboratorRole
  addedAt: number
  isMe: boolean
}

type CollaboratorRow = {
  user_id: string
  email: string
  role: CollaboratorRole
  added_at: string
}

export function useTreeCollaborators(treeId: string | null) {
  const supabase = createClient()
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [myRole, setMyRole] = useState<CollaboratorRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!treeId) return
    setLoading(true)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error: rpcError } = await supabase.rpc('list_tree_collaborators', {
      p_tree_id: treeId,
    })

    if (rpcError) {
      setError(rpcError.message)
      setLoading(false)
      return
    }

    const rows = (data ?? []) as CollaboratorRow[]
    setCollaborators(
      rows.map((r) => ({
        userId: r.user_id,
        email: r.email,
        role: r.role,
        addedAt: new Date(r.added_at).getTime(),
        isMe: r.user_id === user?.id,
      }))
    )
    setMyRole(rows.find((r) => r.user_id === user?.id)?.role ?? null)
    setLoading(false)
  }, [supabase, treeId])

  useEffect(() => {
    refetch()
  }, [refetch])

  const invite = useCallback(
    async (email: string) => {
      if (!treeId) return { error: '家系図が見つかりません' }
      setInviting(true)
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treeId, email: email.trim() }),
      })
      const body = await res.json().catch(() => ({}))
      setInviting(false)
      if (!res.ok) return { error: body.error ?? '招待に失敗しました' }
      await refetch()
      return { error: null }
    },
    [treeId, refetch]
  )

  const remove = useCallback(
    async (userId: string) => {
      if (!treeId) return { error: '家系図が見つかりません' }
      const { error: deleteError } = await supabase
        .from('family_tree_members')
        .delete()
        .eq('tree_id', treeId)
        .eq('user_id', userId)
      if (deleteError) return { error: deleteError.message }
      await refetch()
      return { error: null }
    },
    [supabase, treeId, refetch]
  )

  return { collaborators, myRole, loading, inviting, error, invite, remove }
}
