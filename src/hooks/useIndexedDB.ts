'use client'

import { useEffect, useState, useCallback } from 'react'
import { FamilyTree } from '@/types'

const DB_NAME = 'FamilyTreeDB'
const DB_VERSION = 1
const STORE_NAME = 'trees'

export function useIndexedDB() {
  const [db, setDb] = useState<IDBDatabase | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Initialize IndexedDB
  useEffect(() => {
    const initDB = async () => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => {
          console.error('Failed to open IndexedDB')
        }

        request.onsuccess = () => {
          const database = request.result
          setDb(database)
          setIsReady(true)
        }

        request.onupgradeneeded = (event) => {
          const database = (event.target as IDBOpenDBRequest).result
          if (!database.objectStoreNames.contains(STORE_NAME)) {
            database.createObjectStore(STORE_NAME, { keyPath: 'id' })
          }
        }
      } catch (error) {
        console.error('IndexedDB initialization failed:', error)
      }
    }

    initDB()
  }, [])

  // Save tree
  const saveTree = useCallback(
    async (tree: FamilyTree) => {
      if (!db) return false

      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.put(tree)

        request.onsuccess = () => {
          resolve(true)
        }

        request.onerror = () => {
          resolve(false)
        }
      })
    },
    [db]
  )

  // Load tree by ID
  const loadTree = useCallback(
    async (id: string): Promise<FamilyTree | null> => {
      if (!db) return null

      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(id)

        request.onsuccess = () => {
          resolve(request.result || null)
        }

        request.onerror = () => {
          resolve(null)
        }
      })
    },
    [db]
  )

  // Get all trees
  const getAllTrees = useCallback(async (): Promise<FamilyTree[]> => {
    if (!db) return []

    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.getAll()

      request.onsuccess = () => {
        resolve(request.result || [])
      }

      request.onerror = () => {
        resolve([])
      }
    })
  }, [db])

  // Delete tree
  const deleteTree = useCallback(
    async (id: string) => {
      if (!db) return false

      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.delete(id)

        request.onsuccess = () => {
          resolve(true)
        }

        request.onerror = () => {
          resolve(false)
        }
      })
    },
    [db]
  )

  return {
    isReady,
    saveTree,
    loadTree,
    getAllTrees,
    deleteTree,
  }
}
