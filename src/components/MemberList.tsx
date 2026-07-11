'use client'

import { useMemo, useState } from 'react'
import { FamilyMember } from '@/types'
import { calculateAge, calculateGrade } from '@/utils/age'
import { sortMembersByName } from '@/utils/sortMembers'
import MemberForm from './MemberForm'

const OTOSHIDAMA_MAX_AGE = 22

interface MemberListProps {
  members: FamilyMember[]
  onUpdate: (id: string, updates: Partial<FamilyMember>) => void
  onDelete: (id: string) => void
}

export default function MemberList({ members, onUpdate, onDelete }: MemberListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [otoshidamaOnly, setOtoshidamaOnly] = useState(false)

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

  if (members.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 md:p-6 text-center text-gray-500 text-sm md:text-base">
        メンバーはまだ追加されていません
      </div>
    )
  }

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="名前で検索..."
        className="w-full mb-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm"
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
        <div className="bg-white rounded-lg shadow p-4 md:p-6 text-center text-gray-500 text-sm md:text-base">
          該当するメンバーが見つかりません
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y divide-gray-100">
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
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {member.photo ? (
                    <img
                      src={member.photo}
                      alt={`${member.lastName}${member.firstName}`}
                      className="h-9 w-9 md:h-10 md:w-10 object-cover rounded-full"
                    />
                  ) : (
                    <div className="h-9 w-9 md:h-10 md:w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-base md:text-lg">
                        {member.gender === 'female' ? '👩' : '👨'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm md:text-base font-medium text-gray-900 truncate">
                    {member.lastName} {member.firstName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {member.gender === 'male' && '男性'}
                    {member.gender === 'female' && '女性'}
                    {member.gender === 'other' && 'その他'}
                    {member.birthDate &&
                      ` ・ ${
                        member.deathDate
                          ? `享年${calculateAge(member.birthDate, member.deathDate)}（${new Date(
                              member.birthDate
                            ).toLocaleDateString('ja-JP')} - ${new Date(
                              member.deathDate
                            ).toLocaleDateString('ja-JP')}）`
                          : `${calculateAge(member.birthDate)}歳（${new Date(
                              member.birthDate
                            ).toLocaleDateString('ja-JP')}）`
                      }`}
                    {calculateGrade(member.birthDate, member.deathDate) &&
                      ` ・ ${calculateGrade(member.birthDate, member.deathDate)}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 flex gap-1.5 md:gap-2">
                  <button
                    onClick={() => setEditingId(member.id)}
                    className="px-2 md:px-3 py-1 text-xs md:text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => onDelete(member.id)}
                    className="px-2 md:px-3 py-1 text-xs md:text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                  >
                    削除
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
