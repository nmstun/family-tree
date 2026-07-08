'use client'

import { useState, useCallback, useEffect } from 'react'
import { FamilyTree, FamilyMember, Marriage, ParentChildRelation } from '@/types'
import { useIndexedDB } from './useIndexedDB'

const generateId = () => Math.random().toString(36).slice(2)

export function useFamilyTree(initialTreeId?: string) {
  const [tree, setTree] = useState<FamilyTree | null>(null)
  const [loading, setLoading] = useState(true)
  const { isReady, saveTree, loadTree } = useIndexedDB()

  // Initialize or create new tree
  useEffect(() => {
    const initTree = async () => {
      if (!isReady) return

      if (initialTreeId) {
        const loaded = await loadTree(initialTreeId)
        if (loaded) {
          setTree(loaded)
        }
      } else {
        // Create new tree
        const newTree: FamilyTree = {
          id: generateId(),
          name: '我が家の家系図',
          members: [],
          marriages: [],
          parentChildRelations: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        setTree(newTree)
      }
      setLoading(false)
    }

    initTree()
  }, [isReady, initialTreeId, loadTree])

  // Add member
  const addMember = useCallback(
    (member: Omit<FamilyMember, 'id' | 'createdAt'>) => {
      if (!tree) return

      const newMember: FamilyMember = {
        ...member,
        id: generateId(),
        createdAt: Date.now(),
      }

      setTree({
        ...tree,
        members: [...tree.members, newMember],
        updatedAt: Date.now(),
      })
    },
    [tree]
  )

  // Update member
  const updateMember = useCallback(
    (id: string, updates: Partial<FamilyMember>) => {
      if (!tree) return

      setTree({
        ...tree,
        members: tree.members.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
        updatedAt: Date.now(),
      })
    },
    [tree]
  )

  // Delete member
  const deleteMember = useCallback(
    (id: string) => {
      if (!tree) return

      setTree({
        ...tree,
        members: tree.members.filter((m) => m.id !== id),
        marriages: tree.marriages.filter(
          (m) => m.spouse1Id !== id && m.spouse2Id !== id
        ),
        parentChildRelations: tree.parentChildRelations.filter(
          (r) => r.parentId !== id && r.childId !== id
        ),
        updatedAt: Date.now(),
      })
    },
    [tree]
  )

  // Add marriage
  const addMarriage = useCallback(
    (spouse1Id: string, spouse2Id: string, marriageDate?: string) => {
      if (!tree) return

      const marriage: Marriage = {
        id: generateId(),
        spouse1Id,
        spouse2Id,
        marriageDate,
      }

      setTree({
        ...tree,
        marriages: [...tree.marriages, marriage],
        updatedAt: Date.now(),
      })
    },
    [tree]
  )

  // Remove marriage
  const removeMarriage = useCallback(
    (id: string) => {
      if (!tree) return

      setTree({
        ...tree,
        marriages: tree.marriages.filter((m) => m.id !== id),
        updatedAt: Date.now(),
      })
    },
    [tree]
  )

  // Add parent-child relation
  const addParentChild = useCallback(
    (parentId: string, childId: string) => {
      if (!tree) return

      const relation: ParentChildRelation = {
        parentId,
        childId,
      }

      setTree({
        ...tree,
        parentChildRelations: [...tree.parentChildRelations, relation],
        updatedAt: Date.now(),
      })
    },
    [tree]
  )

  // Remove parent-child relation
  const removeParentChild = useCallback(
    (parentId: string, childId: string) => {
      if (!tree) return

      setTree({
        ...tree,
        parentChildRelations: tree.parentChildRelations.filter(
          (r) => !(r.parentId === parentId && r.childId === childId)
        ),
        updatedAt: Date.now(),
      })
    },
    [tree]
  )

  // Get member by ID
  const getMember = useCallback(
    (id: string) => {
      return tree?.members.find((m) => m.id === id)
    },
    [tree]
  )

  // Save tree
  const save = useCallback(async () => {
    if (!tree || !isReady) return false
    return await saveTree(tree)
  }, [tree, saveTree, isReady])

  return {
    tree,
    loading,
    addMember,
    updateMember,
    deleteMember,
    addMarriage,
    removeMarriage,
    addParentChild,
    removeParentChild,
    getMember,
    save,
  }
}
