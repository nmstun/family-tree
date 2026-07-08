'use client'

import { useMemo, useState } from 'react'
import { FamilyMember, Marriage, ParentChildRelation } from '@/types'
import { wouldCreateCycle } from '@/utils/familyTreeValidation'

interface RelationshipManagerProps {
  members: FamilyMember[]
  marriages: Marriage[]
  parentChildRelations: ParentChildRelation[]
  onAddMarriage: (spouse1Id: string, spouse2Id: string, marriageDate?: string) => void
  onRemoveMarriage: (id: string) => void
  onAddParentChild: (parentId: string, childId: string) => void
  onRemoveParentChild: (parentId: string, childId: string) => void
}

function displayName(member?: FamilyMember) {
  if (!member) return '（不明なメンバー）'
  return `${member.lastName} ${member.firstName}`
}

export default function RelationshipManager({
  members,
  marriages,
  parentChildRelations,
  onAddMarriage,
  onRemoveMarriage,
  onAddParentChild,
  onRemoveParentChild,
}: RelationshipManagerProps) {
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  const [spouse1, setSpouse1] = useState('')
  const [spouse2, setSpouse2] = useState('')
  const [marriageDate, setMarriageDate] = useState('')

  const [parentId, setParentId] = useState('')
  const [childId, setChildId] = useState('')

  const sortedMembers = useMemo(
    () =>
      members
        .slice()
        .sort((a, b) => `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'ja')),
    [members]
  )

  const handleAddMarriage = () => {
    if (!spouse1 || !spouse2) {
      alert('配偶者を2人選択してください')
      return
    }
    if (spouse1 === spouse2) {
      alert('同じメンバー同士は結婚関係にできません')
      return
    }
    const alreadyMarried = marriages.some(
      (m) =>
        (m.spouse1Id === spouse1 && m.spouse2Id === spouse2) ||
        (m.spouse1Id === spouse2 && m.spouse2Id === spouse1)
    )
    if (alreadyMarried) {
      alert('すでに配偶者関係が設定されています')
      return
    }

    onAddMarriage(spouse1, spouse2, marriageDate || undefined)
    setSpouse1('')
    setSpouse2('')
    setMarriageDate('')
  }

  const handleAddParentChild = () => {
    if (!parentId || !childId) {
      alert('親と子を選択してください')
      return
    }
    if (parentId === childId) {
      alert('同じメンバーを親子関係にはできません')
      return
    }
    const alreadyExists = parentChildRelations.some(
      (r) => r.parentId === parentId && r.childId === childId
    )
    if (alreadyExists) {
      alert('すでにこの親子関係が設定されています')
      return
    }
    if (wouldCreateCycle(parentId, childId, parentChildRelations)) {
      alert('この関係を設定すると家系図が循環してしまうため、設定できません')
      return
    }

    onAddParentChild(parentId, childId)
    setParentId('')
    setChildId('')
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
      <div className="bg-white rounded-lg shadow p-4 md:p-6 text-center text-gray-500 text-sm md:text-base">
        関係を設定するには、まず「メンバー」タブで2人以上のメンバーを追加してください
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
      {/* Marriage relationships */}
      <div>
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 md:mb-3">💍 配偶者関係</h3>
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-3 md:mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">配偶者A</label>
              <select
                value={spouse1}
                onChange={(e) => setSpouse1(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
              >
                <option value="">選択してください</option>
                {memberOptions(spouse2)}
              </select>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">配偶者B</label>
              <select
                value={spouse2}
                onChange={(e) => setSpouse2(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
              >
                <option value="">選択してください</option>
                {memberOptions(spouse1)}
              </select>
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
              結婚日（任意）
            </label>
            <input
              type="date"
              value={marriageDate}
              onChange={(e) => setMarriageDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <button
            onClick={handleAddMarriage}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm"
          >
            配偶者関係を追加
          </button>
        </div>

        <div className="space-y-2">
          {marriages.length === 0 && (
            <div className="text-xs md:text-sm text-gray-500 text-center py-2">
              配偶者関係はまだ設定されていません
            </div>
          )}
          {marriages.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-lg shadow p-3 flex items-center justify-between gap-2"
            >
              <div className="text-sm text-gray-800 min-w-0">
                <span className="font-medium">{displayName(memberMap.get(m.spouse1Id))}</span>
                <span className="mx-1.5 text-gray-400">⚭</span>
                <span className="font-medium">{displayName(memberMap.get(m.spouse2Id))}</span>
                {m.marriageDate && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({new Date(m.marriageDate).toLocaleDateString('ja-JP')})
                  </span>
                )}
              </div>
              <button
                onClick={() => onRemoveMarriage(m.id)}
                className="flex-shrink-0 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Parent-child relationships */}
      <div>
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-2 md:mb-3">👨‍👩‍👧 親子関係</h3>
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-3 md:mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">親</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
              >
                <option value="">選択してください</option>
                {memberOptions(childId)}
              </select>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">子</label>
              <select
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
              >
                <option value="">選択してください</option>
                {memberOptions(parentId)}
              </select>
            </div>
          </div>
          <button
            onClick={handleAddParentChild}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm"
          >
            親子関係を追加
          </button>
        </div>

        <div className="space-y-2">
          {parentChildRelations.length === 0 && (
            <div className="text-xs md:text-sm text-gray-500 text-center py-2">
              親子関係はまだ設定されていません
            </div>
          )}
          {parentChildRelations.map((r) => (
            <div
              key={`${r.parentId}-${r.childId}`}
              className="bg-white rounded-lg shadow p-3 flex items-center justify-between gap-2"
            >
              <div className="text-sm text-gray-800 min-w-0">
                <span className="font-medium">{displayName(memberMap.get(r.parentId))}</span>
                <span className="mx-1.5 text-gray-400">→</span>
                <span className="font-medium">{displayName(memberMap.get(r.childId))}</span>
              </div>
              <button
                onClick={() => onRemoveParentChild(r.parentId, r.childId)}
                className="flex-shrink-0 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
