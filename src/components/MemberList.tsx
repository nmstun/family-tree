'use client'

import { useMemo, useState } from 'react'
import { FamilyMember } from '@/types'
import { calculateAge, calculateGrade, formatAgeSummary } from '@/utils/age'
import { sortMembersByName } from '@/utils/sortMembers'
import MemberForm from './MemberForm'
import { Button, Card, EmptyState, useConfirm, CONTROL_CLASS } from './ui'

const OTOSHIDAMA_MAX_AGE = 22

interface MemberListProps {
  members: FamilyMember[]
  onUpdate: (id: string, updates: Partial<FamilyMember>) => void
  onDelete: (id: string) => void
  selfMemberId: string | null
  onSetSelfMember: (id: string | null) => void
}

function fullName(member: FamilyMember) {
  return `${member.lastName} ${member.firstName}`
}

function genderLabel(gender: FamilyMember['gender']) {
  if (gender === 'male') return '男性'
  if (gender === 'female') return '女性'
  return 'その他'
}

// 一覧の2行目に出す補足（性別・年齢・学年）を組み立てる
function memberSummary(member: FamilyMember) {
  const grade = calculateGrade(member.birthDate, member.deathDate, member.birthDatePrecision)
  return [genderLabel(member.gender), formatAgeSummary(member), grade].filter(Boolean).join(' ・ ')
}

export default function MemberList({
  members,
  onUpdate,
  onDelete,
  selfMemberId,
  onSetSelfMember,
}: MemberListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [otoshidamaOnly, setOtoshidamaOnly] = useState(false)
  const { confirm, dialog } = useConfirm()

  const sortedMembers = useMemo(() => sortMembersByName(members), [members])
  const filteredMembers = useMemo(() => {
    const q = query.trim()
    return sortedMembers.filter((m) => {
      if (q && !`${m.lastName}${m.firstName}`.includes(q)) return false
      if (otoshidamaOnly) {
        const age = calculateAge(m.birthDate, m.deathDate)
        if (m.deathDate || age === null || age > OTOSHIDAMA_MAX_AGE) return false
      }
      return true
    })
  }, [sortedMembers, query, otoshidamaOnly])

  // メンバーを消すと配偶者・親子関係も連動して消える（DB側の ON DELETE CASCADE）。
  // 取り消せない操作なので、実行前に必ず確認する。
  const handleDelete = async (member: FamilyMember) => {
    const ok = await confirm({
      title: `${fullName(member)} を削除しますか？`,
      message:
        'このメンバーに設定されている配偶者関係・親子関係もあわせて削除されます。\nこの操作は取り消せません。',
      confirmLabel: '削除する',
      destructive: true,
    })
    if (ok) onDelete(member.id)
  }

  if (members.length === 0) {
    return <EmptyState>メンバーはまだ追加されていません</EmptyState>
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="名前で検索..."
        aria-label="メンバーを名前で検索"
        className={`${CONTROL_CLASS} mb-2`}
      />
      <label className="flex items-center gap-1.5 mb-2 md:mb-3 text-xs md:text-sm text-gray-600 cursor-pointer w-fit">
        <input
          type="checkbox"
          checked={otoshidamaOnly}
          onChange={(e) => setOtoshidamaOnly(e.target.checked)}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        🧧 お年玉対象のみ表示（{OTOSHIDAMA_MAX_AGE}歳以下）
      </label>

      {filteredMembers.length === 0 ? (
        <EmptyState>該当するメンバーが見つかりません</EmptyState>
      ) : (
        <Card padding="none" className="divide-y divide-gray-100">
          {filteredMembers.map((member) =>
            editingId === member.id ? (
              <div key={member.id} className="p-3 md:p-4">
                <MemberForm
                  initialMember={member}
                  onSubmit={(updates) => {
                    onUpdate(member.id, updates)
                    setEditingId(null)
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div
                key={member.id}
                className="flex items-center gap-3 px-3 md:px-4 py-2 md:py-2.5 hover:bg-gray-50 transition"
              >
                <div className="flex-shrink-0">
                  {member.photo ? (
                    <img
                      src={member.photo}
                      alt=""
                      className="h-9 w-9 md:h-10 md:w-10 object-cover rounded-full"
                    />
                  ) : (
                    <div className="h-9 w-9 md:h-10 md:w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-base md:text-lg" aria-hidden>
                        {member.gender === 'female' ? '👩' : '👨'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm md:text-base font-medium text-gray-900 truncate">
                    {fullName(member)}
                    {member.id === selfMemberId && (
                      <span className="ml-1.5 text-[10px] md:text-xs font-normal bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full align-middle">
                        ⭐ 自分
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{memberSummary(member)}</p>
                </div>

                <div className="flex-shrink-0 flex gap-1.5 md:gap-2">
                  <Button
                    variant={member.id === selfMemberId ? 'subtle' : 'secondary'}
                    size="sm"
                    onClick={() => onSetSelfMember(member.id === selfMemberId ? null : member.id)}
                    aria-pressed={member.id === selfMemberId}
                    title={
                      member.id === selfMemberId
                        ? '「自分」の設定を解除'
                        : 'このメンバーを自分として設定'
                    }
                    className={
                      member.id === selfMemberId
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : ''
                    }
                  >
                    {member.id === selfMemberId ? '★' : '☆'}
                  </Button>
                  <Button variant="subtle" size="sm" onClick={() => setEditingId(member.id)}>
                    編集
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(member)}>
                    削除
                  </Button>
                </div>
              </div>
            )
          )}
        </Card>
      )}

      {dialog}
    </div>
  )
}
