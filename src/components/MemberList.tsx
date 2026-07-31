'use client'

import { useMemo, useState } from 'react'
import { FamilyMember, Marriage, ParentChildRelation } from '@/types'
import { calculateAge, calculateGrade, formatAgeSummary } from '@/utils/age'
import { sortMembersByName } from '@/utils/sortMembers'
import { fullName, initial } from '@/utils/memberName'
import MemberForm from './MemberForm'
import { Search, Star, Pencil, Trash2, Users } from 'lucide-react'
import { Avatar, Badge, Button, Card, EmptyState, useConfirm, CONTROL_CLASS } from './ui'

const OTOSHIDAMA_MAX_AGE = 22

interface MemberListProps {
  members: FamilyMember[]
  marriages: Marriage[]
  parentChildRelations: ParentChildRelation[]
  onUpdate: (id: string, updates: Partial<FamilyMember>) => void
  onDelete: (id: string) => void
  selfMemberId: string | null
  onSetSelfMember: (id: string | null) => void
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
  marriages,
  parentChildRelations,
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
  // 取り消せない操作なので、何がどれだけ消えるのかを具体的に示してから確認する。
  const handleDelete = async (member: FamilyMember) => {
    const marriageCount = marriages.filter(
      (m) => m.spouse1Id === member.id || m.spouse2Id === member.id
    ).length
    const relationCount = parentChildRelations.filter(
      (r) => r.parentId === member.id || r.childId === member.id
    ).length

    const affected = [
      marriageCount > 0 && `配偶者関係 ${marriageCount}件`,
      relationCount > 0 && `親子関係 ${relationCount}件`,
    ].filter(Boolean)

    const ok = await confirm({
      title: `${fullName(member)} を削除しますか？`,
      message:
        affected.length > 0
          ? `${affected.join('と')}もあわせて削除されます。\nこの操作は取り消せません。`
          : 'この操作は取り消せません。',
      confirmLabel: '削除する',
      destructive: true,
    })
    if (ok) onDelete(member.id)
  }

  if (members.length === 0) {
    return <EmptyState icon={<Users />}>メンバーはまだ追加されていません</EmptyState>
  }

  return (
    <div>
      <div className="relative mb-2">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="名前で検索"
          aria-label="メンバーを名前で検索"
          className={`${CONTROL_CLASS} pl-9`}
        />
      </div>
      <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-[13px] text-neutral-500 transition-colors hover:text-neutral-900">
        <input
          type="checkbox"
          checked={otoshidamaOnly}
          onChange={(e) => setOtoshidamaOnly(e.target.checked)}
          className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900/20"
        />
        お年玉対象のみ（{OTOSHIDAMA_MAX_AGE}歳以下）
      </label>

      {filteredMembers.length === 0 ? (
        <EmptyState icon={<Search />}>該当するメンバーが見つかりません</EmptyState>
      ) : (
        <Card padding="none" className="divide-y divide-neutral-100 overflow-hidden">
          {filteredMembers.map((member) =>
            editingId === member.id ? (
              <div key={member.id} className="bg-neutral-50 p-3">
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
              // 操作ボタンは普段は控えめにし、hover/フォーカス時にはっきりさせる。
              // タッチ端末には hover が無いので、隠さず薄く出したままにする。
              <div
                key={member.id}
                className="group flex items-center gap-3 px-3 py-2 transition-colors hover:bg-neutral-50"
              >
                <Avatar photo={member.photo} initial={initial(member)} />

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-neutral-900">
                    {fullName(member)}
                    {member.id === selfMemberId && (
                      <Badge tone="warning">
                        <Star className="fill-current" aria-hidden />
                        自分
                      </Badge>
                    )}
                  </p>
                  <p className="truncate text-[12px] text-neutral-500">{memberSummary(member)}</p>
                </div>

                <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onSetSelfMember(member.id === selfMemberId ? null : member.id)}
                    aria-pressed={member.id === selfMemberId}
                    title={
                      member.id === selfMemberId
                        ? '「自分」の設定を解除'
                        : 'このメンバーを自分として設定'
                    }
                    className={member.id === selfMemberId ? 'text-amber-500 hover:text-amber-600' : ''}
                  >
                    <Star className={member.id === selfMemberId ? 'fill-current' : ''} aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="編集"
                    onClick={() => setEditingId(member.id)}
                  >
                    <Pencil aria-hidden />
                  </Button>
                  <Button
                    variant="danger"
                    size="icon"
                    title="削除"
                    onClick={() => handleDelete(member)}
                  >
                    <Trash2 aria-hidden />
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
