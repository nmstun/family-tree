'use client'

import { FamilyMember } from '@/types'

interface MemberListProps {
  members: FamilyMember[]
  onUpdate: (id: string, updates: Partial<FamilyMember>) => void
  onDelete: (id: string) => void
}

export default function MemberList({
  members,
  onDelete,
}: MemberListProps) {
  if (members.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 md:p-6 text-center text-gray-500 text-sm md:text-base">
        メンバーはまだ追加されていません
      </div>
    )
  }

  return (
    <div className="space-y-2 md:space-y-3">
      {members.map((member) => (
        <div
          key={member.id}
          className="bg-white rounded-lg shadow p-3 md:p-4 flex flex-col sm:flex-row gap-3 md:gap-4 items-start hover:shadow-md transition"
        >
          {/* Photo */}
          <div className="flex-shrink-0">
            {member.photo ? (
              <img
                src={member.photo}
                alt={`${member.lastName}${member.firstName}`}
                className="h-16 w-16 md:h-24 md:w-24 object-cover rounded-lg"
              />
            ) : (
              <div className="h-16 w-16 md:h-24 md:w-24 bg-gray-200 rounded-lg flex items-center justify-center">
                <span className="text-2xl md:text-3xl">
                  {member.gender === 'female' ? '👩' : '👨'}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-semibold text-gray-900">
              {member.lastName} {member.firstName}
            </h3>
            <p className="text-xs md:text-sm text-gray-600">
              {member.gender === 'male' && '男性'}
              {member.gender === 'female' && '女性'}
              {member.gender === 'other' && 'その他'}
            </p>
            {member.birthDate && (
              <p className="text-xs md:text-sm text-gray-600">
                生: {new Date(member.birthDate).toLocaleDateString('ja-JP')}
              </p>
            )}
            {member.deathDate && (
              <p className="text-xs md:text-sm text-gray-600">
                没: {new Date(member.deathDate).toLocaleDateString('ja-JP')}
              </p>
            )}
            {member.notes && (
              <p className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2 italic line-clamp-2">
                {member.notes}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => onDelete(member.id)}
              className="flex-1 sm:flex-initial px-3 py-1 text-xs md:text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
            >
              削除
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
