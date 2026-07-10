'use client'

import { useState } from 'react'
import { useTreeCollaborators } from '@/hooks/useTreeCollaborators'

interface CollaboratorsPanelProps {
  treeId: string
}

export default function CollaboratorsPanel({ treeId }: CollaboratorsPanelProps) {
  const { collaborators, myRole, loading, inviting, error, invite, remove } =
    useTreeCollaborators(treeId)
  const [email, setEmail] = useState('')
  const [inviteMessage, setInviteMessage] = useState<
    { type: 'success' | 'error'; text: string } | null
  >(null)

  const isOwner = myRole === 'owner'

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setInviteMessage(null)
    const { error: inviteError } = await invite(email)
    if (inviteError) {
      setInviteMessage({ type: 'error', text: inviteError })
    } else {
      setInviteMessage({ type: 'success', text: `${email} を招待しました` })
      setEmail('')
    }
  }

  const handleRemove = async (userId: string, memberEmail: string) => {
    if (!confirm(`${memberEmail} をこの家系図から削除しますか？`)) return
    await remove(userId)
  }

  if (loading) {
    return <div className="text-sm text-gray-500">読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      {isOwner && (
        <div>
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">
            共同編集者を招待
          </h3>
          <p className="text-xs md:text-sm text-gray-600 mb-3">
            まだこのアプリを使ったことがない相手でも招待できます。招待メールが届き、そこからログインするとすぐに編集を始められます。
          </p>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="invite@example.com"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
            />
            <button
              type="submit"
              disabled={inviting}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm disabled:opacity-50 whitespace-nowrap"
            >
              {inviting ? '招待中...' : '招待する'}
            </button>
          </form>
          {inviteMessage && (
            <p
              className={`text-xs md:text-sm mt-2 ${
                inviteMessage.type === 'error' ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {inviteMessage.type === 'error' ? '⚠ ' : '✓ '}
              {inviteMessage.text}
            </p>
          )}
        </div>
      )}

      <div>
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">
          メンバー一覧（{collaborators.length}人）
        </h3>
        {error && <p className="text-xs md:text-sm text-red-600 mb-2">⚠ {error}</p>}
        <ul className="divide-y divide-gray-200 bg-white rounded-lg border border-gray-200">
          {collaborators.map((c) => (
            <li
              key={c.userId}
              className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 gap-2"
            >
              <div className="min-w-0">
                <p className="text-sm md:text-base text-gray-900 truncate">
                  {c.email}
                  {c.isMe && <span className="text-gray-400 text-xs ml-1">(自分)</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {c.role === 'owner' ? 'オーナー' : '編集者'}
                </p>
              </div>
              {isOwner && c.role === 'editor' && (
                <button
                  onClick={() => handleRemove(c.userId, c.email)}
                  className="text-xs md:text-sm text-red-600 hover:text-red-700 transition whitespace-nowrap"
                >
                  削除
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
