'use client'

import { useMemo, useState } from 'react'
import { FamilyMember, Marriage, ParentChildRelation } from '@/types'
import { fullName, initial } from '@/utils/memberName'
import { formatAgeSummary } from '@/utils/age'
import { sortMembersByName } from '@/utils/sortMembers'
import { validateMarriage, validateParentChild } from '@/utils/relationValidation'
import MemberForm from './MemberForm'
import { Heart, GitBranch, Pencil, Plus, Star, Trash2, Users, X } from 'lucide-react'
import { Alert, Avatar, Button, CONTROL_SM_CLASS, cn } from './ui'

interface MemberDetailPanelProps {
  member: FamilyMember
  members: FamilyMember[]
  marriages: Marriage[]
  parentChildRelations: ParentChildRelation[]
  isSelf: boolean
  onClose: () => void
  onSelectMember: (id: string) => void
  onUpdateMember: (id: string, updates: Partial<Omit<FamilyMember, 'id' | 'createdAt'>>) => void
  onDeleteMember: (id: string) => void
  onSetSelf: (id: string) => void
  onAddMarriage: (spouse1Id: string, spouse2Id: string) => void
  onRemoveMarriage: (id: string) => void
  onAddParentChild: (parentId: string, childId: string) => void
  onRemoveParentChild: (parentId: string, childId: string) => void
  onRequestDelete: (member: FamilyMember) => void
}

type RelationKind = 'spouse' | 'parent' | 'child'

const SECTIONS: {
  kind: RelationKind
  label: string
  addLabel: string
  icon: typeof Heart
}[] = [
  { kind: 'spouse', label: '配偶者', addLabel: '配偶者を追加', icon: Heart },
  { kind: 'parent', label: '親', addLabel: '親を追加', icon: GitBranch },
  { kind: 'child', label: '子', addLabel: '子を追加', icon: Users },
]

export default function MemberDetailPanel({
  member,
  members,
  marriages,
  parentChildRelations,
  isSelf,
  onClose,
  onSelectMember,
  onUpdateMember,
  onSetSelf,
  onAddMarriage,
  onRemoveMarriage,
  onAddParentChild,
  onRemoveParentChild,
  onRequestDelete,
}: MemberDetailPanelProps) {
  const [editing, setEditing] = useState(false)
  // どの関係を追加しようとしているか（開いている追加フォーム）
  const [adding, setAdding] = useState<RelationKind | null>(null)
  const [pickedId, setPickedId] = useState('')
  const [error, setError] = useState<string | null>(null)

  // 表示対象が変わったら、開いていたフォームをすべて閉じる。
  //
  // これが無いと、編集中に家系図の別のノードをクリックしたとき
  // member だけが差し替わり、フォームの中身と editing はそのまま残る。
  // その状態で「更新」を押すと、新しく選んだ人のIDに前の人の内容が
  // 書き込まれてしまう（本番で1人ぶんの氏名・生没年・写真が失われた）。
  // 関係の追加フォームも同様に、前の人向けに選んだ相手が
  // 新しく選んだ人の関係として登録されてしまう。
  const [shownMemberId, setShownMemberId] = useState(member.id)
  if (shownMemberId !== member.id) {
    setShownMemberId(member.id)
    setEditing(false)
    setAdding(null)
    setPickedId('')
    setError(null)
  }

  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  const related = useMemo(() => {
    const spouseIds = marriages
      .filter((m) => m.spouse1Id === member.id || m.spouse2Id === member.id)
      .map((m) => ({
        id: m.spouse1Id === member.id ? m.spouse2Id : m.spouse1Id,
        marriageId: m.id,
      }))
    const parentIds = parentChildRelations
      .filter((r) => r.childId === member.id)
      .map((r) => ({ id: r.parentId }))
    const childIds = parentChildRelations
      .filter((r) => r.parentId === member.id)
      .map((r) => ({ id: r.childId }))
    return { spouse: spouseIds, parent: parentIds, child: childIds }
  }, [member.id, marriages, parentChildRelations])

  // 追加候補は「本人以外」かつ「すでにその関係にある人以外」
  const candidates = useMemo(() => {
    if (!adding) return []
    const taken = new Set(related[adding].map((r) => r.id))
    return sortMembersByName(members.filter((m) => m.id !== member.id && !taken.has(m.id)))
  }, [adding, members, member.id, related])

  const closeAddForm = () => {
    setAdding(null)
    setPickedId('')
    setError(null)
  }

  const handleAdd = () => {
    if (!adding || !pickedId) return
    // 「関係」タブと同じ検証を通す（循環チェックを含む）
    const message =
      adding === 'spouse'
        ? validateMarriage(member.id, pickedId, marriages)
        : adding === 'parent'
          ? validateParentChild(pickedId, member.id, parentChildRelations)
          : validateParentChild(member.id, pickedId, parentChildRelations)
    if (message) {
      setError(message)
      return
    }
    if (adding === 'spouse') onAddMarriage(member.id, pickedId)
    else if (adding === 'parent') onAddParentChild(pickedId, member.id)
    else onAddParentChild(member.id, pickedId)
    closeAddForm()
  }

  const removeRelation = (kind: RelationKind, otherId: string, marriageId?: string) => {
    if (kind === 'spouse' && marriageId) onRemoveMarriage(marriageId)
    else if (kind === 'parent') onRemoveParentChild(otherId, member.id)
    else if (kind === 'child') onRemoveParentChild(member.id, otherId)
  }

  if (editing) {
    return (
      <PanelShell title="メンバーを編集" onClose={onClose}>
        <MemberForm
          // 入力欄の値はマウント時にしか読まれないため、人が変わったら作り直す
          key={member.id}
          initialMember={member}
          onSubmit={(updates) => {
            onUpdateMember(member.id, updates)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      </PanelShell>
    )
  }

  const ageSummary = formatAgeSummary(member)

  return (
    <PanelShell title="メンバーの詳細" onClose={onClose}>
      <div className="flex items-center gap-3">
        <Avatar
          photo={member.photo}
          initial={initial(member)}
          className="h-12 w-12"
        />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-neutral-900">{fullName(member)}</p>
          {ageSummary && <p className="mt-0.5 text-[12px] text-neutral-500">{ageSummary}</p>}
        </div>
      </div>

      {member.notes && (
        <p className="mt-3 whitespace-pre-line rounded-lg bg-neutral-50 p-2.5 text-[12px] leading-relaxed text-neutral-600">
          {member.notes}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" aria-hidden />
          編集
        </Button>
        <Button
          size="sm"
          variant={isSelf ? 'primary' : 'secondary'}
          onClick={() => onSetSelf(member.id)}
          disabled={isSelf}
          title={isSelf ? 'この人が「自分」に設定されています' : 'この人を「自分」に設定する'}
        >
          <Star className="h-3.5 w-3.5" aria-hidden />
          {isSelf ? '自分' : '自分に設定'}
        </Button>
        <Button size="sm" variant="danger" onClick={() => onRequestDelete(member)}>
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          削除
        </Button>
      </div>

      {SECTIONS.map(({ kind, label, addLabel, icon: Icon }) => {
        const list = related[kind]
        return (
          <section key={kind} className="mt-4 border-t border-neutral-100 pt-3">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-[12px] font-semibold text-neutral-700">
                <Icon className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
                {label}
                <span className="font-normal text-neutral-400">{list.length}</span>
              </h4>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  if (adding === kind) closeAddForm()
                  else {
                    setAdding(kind)
                    setPickedId('')
                    setError(null)
                  }
                }}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                追加
              </Button>
            </div>

            {list.length === 0 && adding !== kind && (
              <p className="mt-1 text-[12px] text-neutral-400">まだ登録されていません</p>
            )}

            <ul className="mt-1.5 space-y-1">
              {list.map((rel) => {
                const other = byId.get(rel.id)
                return (
                  <li
                    key={`${kind}-${rel.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-2 py-1.5"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 truncate text-left text-[13px] text-neutral-800 hover:underline"
                      onClick={() => other && onSelectMember(other.id)}
                      disabled={!other}
                      title={other ? `${fullName(other)}を開く` : undefined}
                    >
                      {other ? fullName(other) : '（不明なメンバー）'}
                    </button>
                    <button
                      type="button"
                      aria-label={`${label}から外す`}
                      title={`${label}から外す`}
                      className="shrink-0 rounded p-1 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      onClick={() => removeRelation(kind, rel.id, 'marriageId' in rel ? rel.marriageId : undefined)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                )
              })}
            </ul>

            {adding === kind && (
              <div className="mt-2 rounded-lg border border-neutral-200 p-2">
                <label className="sr-only" htmlFor={`add-${kind}`}>
                  {addLabel}
                </label>
                <select
                  id={`add-${kind}`}
                  className={CONTROL_SM_CLASS}
                  value={pickedId}
                  onChange={(e) => {
                    setPickedId(e.target.value)
                    setError(null)
                  }}
                >
                  <option value="">{addLabel}...</option>
                  {candidates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {fullName(m)}
                    </option>
                  ))}
                </select>
                {error && <Alert className="mt-1.5">{error}</Alert>}
                <div className="mt-2 flex gap-1.5">
                  <Button size="sm" onClick={handleAdd} disabled={!pickedId}>
                    追加
                  </Button>
                  <Button size="sm" variant="secondary" onClick={closeAddForm}>
                    キャンセル
                  </Button>
                </div>
              </div>
            )}
          </section>
        )
      })}
    </PanelShell>
  )
}

/** パネルの外枠。スマホでは下から出るシート、PCでは右側の縦長パネルになる */
function PanelShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-col bg-white',
        // スマホ: 画面下部に固定して出す（家系図の上に重ねる）
        'fixed inset-x-0 bottom-0 z-30 max-h-[70vh] rounded-t-2xl border-t border-neutral-200 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]',
        // PC: 家系図の右隣に並べる
        'md:static md:max-h-none md:w-[320px] md:shrink-0 md:rounded-none md:rounded-r-xl md:border-l md:border-t-0 md:shadow-none'
      )}
    >
      <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
        <h3 className="text-[13px] font-semibold text-neutral-900">{title}</h3>
        <button
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">{children}</div>
    </div>
  )
}
