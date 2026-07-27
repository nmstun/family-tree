'use client'

import { useState } from 'react'
import { useTreeCollaborators } from '@/hooks/useTreeCollaborators'
import { Alert, Button, Card, useConfirm, CONTROL_CLASS } from './ui'

interface CollaboratorsPanelProps {
  treeId: string
}

type Feedback = { tone: 'success' | 'error'; text: string }

export default function CollaboratorsPanel({ treeId }: CollaboratorsPanelProps) {
  const { collaborators, myRole, loading, inviting, error, invite, resendInvite, remove } =
    useTreeCollaborators(treeId)
  const { confirm, dialog } = useConfirm()
  const [email, setEmail] = useState('')
  const [inviteFeedback, setInviteFeedback] = useState<Feedback | null>(null)
  const [resendingEmail, setResendingEmail] = useState<string | null>(null)
  const [resendFeedback, setResendFeedback] = useState<(Feedback & { email: string }) | null>(null)

  const isOwner = myRole === 'owner'

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setInviteFeedback(null)
    const { error: inviteError } = await invite(email)
    setInviteFeedback(
      inviteError
        ? { tone: 'error', text: inviteError }
        : { tone: 'success', text: `${email} を招待しました` }
    )
    if (!inviteError) setEmail('')
  }

  const handleResend = async (memberEmail: string) => {
    setResendingEmail(memberEmail)
    setResendFeedback(null)
    const { error: resendError } = await resendInvite(memberEmail)
    setResendingEmail(null)
    setResendFeedback({
      email: memberEmail,
      tone: resendError ? 'error' : 'success',
      text: resendError ?? '招待メールを再送信しました',
    })
  }

  const handleRemove = async (userId: string, memberEmail: string) => {
    const ok = await confirm({
      title: '共同編集者を削除しますか？',
      message: `${memberEmail} はこの家系図を閲覧・編集できなくなります。`,
      confirmLabel: '削除する',
      destructive: true,
    })
    if (ok) await remove(userId)
  }

  if (loading) {
    return <div className="text-sm text-gray-500">読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      {isOwner && (
        <section>
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">共同編集者を招待</h3>
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
              aria-label="招待する相手のメールアドレス"
              className={CONTROL_CLASS}
            />
            <Button type="submit" disabled={inviting} className="whitespace-nowrap">
              {inviting ? '招待中...' : '招待する'}
            </Button>
          </form>
          {inviteFeedback && (
            <Alert tone={inviteFeedback.tone} className="mt-2">
              {inviteFeedback.text}
            </Alert>
          )}
        </section>
      )}

      <section>
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2">
          メンバー一覧（{collaborators.length}人）
        </h3>
        {error && <Alert className="mb-2">{error}</Alert>}
        <Card padding="none" className="divide-y divide-gray-100">
          {collaborators.map((c) => (
            <div key={c.userId} className="px-3 md:px-4 py-2 md:py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm md:text-base text-gray-900 truncate">
                    {c.email}
                    {c.isMe && <span className="text-gray-400 text-xs ml-1">(自分)</span>}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    {c.role === 'owner' ? 'オーナー' : '編集者'}
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[10px] ${
                        c.hasLoggedIn
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {c.hasLoggedIn ? '参加済み' : '招待中（未ログイン）'}
                    </span>
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  {isOwner && !c.hasLoggedIn && (
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={() => handleResend(c.email)}
                      disabled={resendingEmail === c.email}
                    >
                      {resendingEmail === c.email ? '送信中...' : '再送信'}
                    </Button>
                  )}
                  {isOwner && c.role === 'editor' && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRemove(c.userId, c.email)}
                    >
                      削除
                    </Button>
                  )}
                </div>
              </div>
              {resendFeedback?.email === c.email && (
                <Alert tone={resendFeedback.tone} className="mt-1">
                  {resendFeedback.text}
                </Alert>
              )}
            </div>
          ))}
        </Card>
      </section>

      {dialog}
    </div>
  )
}
