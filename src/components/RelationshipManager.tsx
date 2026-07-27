'use client'

import { useMemo, useState } from 'react'
import { FamilyMember, Marriage, ParentChildRelation } from '@/types'
import { wouldCreateCycle } from '@/utils/familyTreeValidation'
import { sortMembersByName } from '@/utils/sortMembers'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  useConfirm,
  CONTROL_CLASS,
  CONTROL_SM_CLASS,
} from './ui'

interface RelationshipManagerProps {
  members: FamilyMember[]
  marriages: Marriage[]
  parentChildRelations: ParentChildRelation[]
  onAddMarriage: (spouse1Id: string, spouse2Id: string, marriageDate?: string) => void
  onUpdateMarriage: (id: string, marriageDate: string) => void
  onRemoveMarriage: (id: string) => void
  onAddParentChild: (parentId: string, childId: string) => void
  onRemoveParentChild: (parentId: string, childId: string) => void
}

function displayName(member?: FamilyMember) {
  if (!member) return '（不明なメンバー）'
  return `${member.lastName} ${member.firstName}`
}

// 入力チェックは副作用を持たない関数に切り出しておく。
// 呼び出し側はエラー文言（問題なければ null）を受け取って画面に出すだけにする。
function validateMarriage(
  spouse1: string,
  spouse2: string,
  marriages: Marriage[]
): string | null {
  if (!spouse1 || !spouse2) return '配偶者を2人選択してください'
  if (spouse1 === spouse2) return '同じメンバー同士は結婚関係にできません'
  const alreadyMarried = marriages.some(
    (m) =>
      (m.spouse1Id === spouse1 && m.spouse2Id === spouse2) ||
      (m.spouse1Id === spouse2 && m.spouse2Id === spouse1)
  )
  if (alreadyMarried) return 'すでに配偶者関係が設定されています'
  return null
}

function validateParentChild(
  parentId: string,
  childId: string,
  relations: ParentChildRelation[]
): string | null {
  if (!parentId || !childId) return '親と子を選択してください'
  if (parentId === childId) return '同じメンバーを親子関係にはできません'
  if (relations.some((r) => r.parentId === parentId && r.childId === childId)) {
    return 'すでにこの親子関係が設定されています'
  }
  if (wouldCreateCycle(parentId, childId, relations)) {
    return 'この関係を設定すると家系図が循環してしまうため、設定できません'
  }
  return null
}

export default function RelationshipManager({
  members,
  marriages,
  parentChildRelations,
  onAddMarriage,
  onUpdateMarriage,
  onRemoveMarriage,
  onAddParentChild,
  onRemoveParentChild,
}: RelationshipManagerProps) {
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const { confirm, dialog } = useConfirm()

  const [spouse1, setSpouse1] = useState('')
  const [spouse2, setSpouse2] = useState('')
  const [marriageDate, setMarriageDate] = useState('')
  const [marriageError, setMarriageError] = useState<string | null>(null)

  const [editingMarriageId, setEditingMarriageId] = useState<string | null>(null)
  const [editMarriageDate, setEditMarriageDate] = useState('')

  const [parentId, setParentId] = useState('')
  const [childId, setChildId] = useState('')
  const [relationError, setRelationError] = useState<string | null>(null)

  const sortedMembers = useMemo(() => sortMembersByName(members), [members])

  const handleAddMarriage = () => {
    const error = validateMarriage(spouse1, spouse2, marriages)
    setMarriageError(error)
    if (error) return

    onAddMarriage(spouse1, spouse2, marriageDate || undefined)
    setSpouse1('')
    setSpouse2('')
    setMarriageDate('')
  }

  const handleAddParentChild = () => {
    const error = validateParentChild(parentId, childId, parentChildRelations)
    setRelationError(error)
    if (error) return

    onAddParentChild(parentId, childId)
    setParentId('')
    setChildId('')
  }

  const handleRemoveMarriage = async (m: Marriage) => {
    const ok = await confirm({
      title: '配偶者関係を削除しますか？',
      message: `${displayName(memberMap.get(m.spouse1Id))} と ${displayName(
        memberMap.get(m.spouse2Id)
      )} の配偶者関係を削除します。`,
      confirmLabel: '削除する',
      destructive: true,
    })
    if (ok) onRemoveMarriage(m.id)
  }

  const handleRemoveParentChild = async (r: ParentChildRelation) => {
    const ok = await confirm({
      title: '親子関係を削除しますか？',
      message: `${displayName(memberMap.get(r.parentId))} と ${displayName(
        memberMap.get(r.childId)
      )} の親子関係を削除します。`,
      confirmLabel: '削除する',
      destructive: true,
    })
    if (ok) onRemoveParentChild(r.parentId, r.childId)
  }

  const memberOptions = (excludeId?: string) =>
    sortedMembers
      .filter((m) => m.id !== excludeId)
      .map((m) => (
        <option key={m.id} value={m.id}>
          {displayName(m)}
        </option>
      ))

  if (members.length < 2) {
    return (
      <EmptyState>
        関係を設定するには、まず「メンバー」タブで2人以上のメンバーを追加してください
      </EmptyState>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
      {/* 配偶者関係 */}
      <section>
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 md:mb-3">💍 配偶者関係</h3>
        <Card className="mb-3 md:mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="配偶者A" htmlFor="spouse1">
              <select
                id="spouse1"
                value={spouse1}
                onChange={(e) => setSpouse1(e.target.value)}
                className={CONTROL_CLASS}
              >
                <option value="">選択してください</option>
                {memberOptions(spouse2)}
              </select>
            </Field>
            <Field label="配偶者B" htmlFor="spouse2">
              <select
                id="spouse2"
                value={spouse2}
                onChange={(e) => setSpouse2(e.target.value)}
                className={CONTROL_CLASS}
              >
                <option value="">選択してください</option>
                {memberOptions(spouse1)}
              </select>
            </Field>
          </div>
          <Field label="結婚日（任意）" htmlFor="marriage-date">
            <input
              id="marriage-date"
              type="date"
              value={marriageDate}
              onChange={(e) => setMarriageDate(e.target.value)}
              className={CONTROL_CLASS}
            />
          </Field>
          {marriageError && <Alert className="mb-3">{marriageError}</Alert>}
          <Button fullWidth onClick={handleAddMarriage}>
            配偶者関係を追加
          </Button>
        </Card>

        <div className="space-y-2">
          {marriages.length === 0 && (
            <EmptyState variant="inline">配偶者関係はまだ設定されていません</EmptyState>
          )}
          {marriages.map((m) => (
            <Card
              key={m.id}
              padding="row"
              className="flex items-center justify-between gap-2 flex-wrap"
            >
              <div className="text-sm text-gray-800 min-w-0 flex items-center gap-2 flex-wrap">
                <span className="font-medium">{displayName(memberMap.get(m.spouse1Id))}</span>
                <span className="text-gray-400" aria-hidden>
                  ⚭
                </span>
                <span className="font-medium">{displayName(memberMap.get(m.spouse2Id))}</span>
                {editingMarriageId === m.id ? (
                  <input
                    type="date"
                    value={editMarriageDate}
                    onChange={(e) => setEditMarriageDate(e.target.value)}
                    aria-label="結婚日"
                    className={CONTROL_SM_CLASS}
                  />
                ) : (
                  m.marriageDate && (
                    <span className="text-xs text-gray-500">
                      ({new Date(m.marriageDate).toLocaleDateString('ja-JP')})
                    </span>
                  )
                )}
              </div>
              <div className="flex-shrink-0 flex gap-2">
                {editingMarriageId === m.id ? (
                  <>
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={() => {
                        onUpdateMarriage(m.id, editMarriageDate)
                        setEditingMarriageId(null)
                      }}
                    >
                      保存
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingMarriageId(null)}
                    >
                      キャンセル
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={() => {
                        setEditingMarriageId(m.id)
                        setEditMarriageDate(m.marriageDate ?? '')
                      }}
                    >
                      編集
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleRemoveMarriage(m)}>
                      削除
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* 親子関係 */}
      <section>
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 md:mb-3">
          👨‍👩‍👧 親子関係
        </h3>
        <Card className="mb-3 md:mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="親" htmlFor="parent">
              <select
                id="parent"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className={CONTROL_CLASS}
              >
                <option value="">選択してください</option>
                {memberOptions(childId)}
              </select>
            </Field>
            <Field label="子" htmlFor="child">
              <select
                id="child"
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                className={CONTROL_CLASS}
              >
                <option value="">選択してください</option>
                {memberOptions(parentId)}
              </select>
            </Field>
          </div>
          {relationError && <Alert className="mb-3">{relationError}</Alert>}
          <Button fullWidth onClick={handleAddParentChild}>
            親子関係を追加
          </Button>
        </Card>

        <div className="space-y-2">
          {parentChildRelations.length === 0 && (
            <EmptyState variant="inline">親子関係はまだ設定されていません</EmptyState>
          )}
          {parentChildRelations.map((r) => (
            <Card
              key={`${r.parentId}-${r.childId}`}
              padding="row"
              className="flex items-center justify-between gap-2"
            >
              <div className="text-sm text-gray-800 min-w-0">
                <span className="font-medium">{displayName(memberMap.get(r.parentId))}</span>
                <span className="mx-1.5 text-gray-400" aria-hidden>
                  →
                </span>
                <span className="font-medium">{displayName(memberMap.get(r.childId))}</span>
              </div>
              <Button
                variant="danger"
                size="sm"
                className="flex-shrink-0"
                onClick={() => handleRemoveParentChild(r)}
              >
                削除
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {dialog}
    </div>
  )
}
