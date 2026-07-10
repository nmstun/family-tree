'use client'

import { useMemo, useState } from 'react'
import { FamilyMember, Marriage, ParentChildRelation } from '@/types'
import { computeFamilyTreeLayout, NODE_WIDTH, NODE_HEIGHT } from '@/utils/treeLayout'
import { calculateAge } from '@/utils/age'

interface FamilyTreeViewProps {
  members: FamilyMember[]
  marriages: Marriage[]
  parentChildRelations: ParentChildRelation[]
}

const GENDER_COLOR: Record<FamilyMember['gender'], { border: string; bg: string }> = {
  male: { border: '#3b82f6', bg: '#eff6ff' },
  female: { border: '#ec4899', bg: '#fdf2f8' },
  other: { border: '#8b5cf6', bg: '#f5f3ff' },
}

function formatYear(dateStr?: string) {
  if (!dateStr) return ''
  const year = new Date(dateStr).getFullYear()
  return Number.isNaN(year) ? '' : `${year}`
}

function formatAge(member: FamilyMember) {
  if (!member.birthDate) return ''
  const age = calculateAge(member.birthDate, member.deathDate)
  if (age === null) return ''
  return member.deathDate ? `享年${age}` : `${age}歳`
}

export default function FamilyTreeView({
  members,
  marriages,
  parentChildRelations,
}: FamilyTreeViewProps) {
  const [scale, setScale] = useState(1)

  const layout = useMemo(
    () => computeFamilyTreeLayout(members, marriages, parentChildRelations),
    [members, marriages, parentChildRelations]
  )

  if (members.length === 0) {
    return (
      <div className="text-center text-gray-500 text-sm md:text-base py-12">
        メンバーを追加すると、ここに家系図が表示されます
      </div>
    )
  }

  const padding = 20
  const svgWidth = layout.width + padding * 2
  const svgHeight = layout.height + padding * 2

  return (
    <div>
      {/* Zoom controls */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setScale((s) => Math.max(0.4, +(s - 0.1).toFixed(2)))}
          className="px-2 md:px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
          aria-label="縮小"
        >
          −
        </button>
        <span className="text-xs md:text-sm text-gray-600 w-12 text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.min(2, +(s + 0.1).toFixed(2)))}
          className="px-2 md:px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
          aria-label="拡大"
        >
          ＋
        </button>
        <button
          onClick={() => setScale(1)}
          className="px-2 md:px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition"
        >
          リセット
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 md:gap-4 mb-3 text-xs md:text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: GENDER_COLOR.male.border }} />
          男性
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: GENDER_COLOR.female.border }} />
          女性
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: GENDER_COLOR.other.border }} />
          その他
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-5 border-t-2 border-gray-400" />
          配偶者
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-5 border-t-2 border-gray-300" />
          親子
        </div>
      </div>

      {/* Scrollable canvas */}
      <div className="overflow-auto border border-gray-200 rounded-lg bg-gray-50" style={{ maxHeight: '70vh' }}>
        <svg
          width={svgWidth * scale}
          height={svgHeight * scale}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform={`translate(${padding}, ${padding})`}>
            {/* Edges (drawn first, under the nodes) */}
            {layout.edges.map((edge) => (
              <path
                key={edge.id}
                d={edge.path}
                fill="none"
                stroke={edge.type === 'marriage' ? '#9ca3af' : '#d1d5db'}
                strokeWidth={edge.type === 'marriage' ? 2 : 1.75}
              />
            ))}

            {/* Nodes */}
            {layout.nodes.map((node) => {
              const colors = GENDER_COLOR[node.member.gender]
              const birthYear = formatYear(node.member.birthDate)
              const deathYear = formatYear(node.member.deathDate)
              const years =
                birthYear || deathYear ? `${birthYear || '?'} - ${deathYear || ''}` : ''
              const age = formatAge(node.member)

              return (
                <g key={node.member.id} transform={`translate(${node.x}, ${node.y})`}>
                  <rect
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx={10}
                    fill={colors.bg}
                    stroke={colors.border}
                    strokeWidth={2}
                  />
                  {node.member.photo ? (
                    <>
                      <clipPath id={`clip-${node.member.id}`}>
                        <circle cx={NODE_WIDTH / 2} cy={26} r={18} />
                      </clipPath>
                      <image
                        href={node.member.photo}
                        x={NODE_WIDTH / 2 - 18}
                        y={8}
                        width={36}
                        height={36}
                        clipPath={`url(#clip-${node.member.id})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </>
                  ) : (
                    <circle
                      cx={NODE_WIDTH / 2}
                      cy={26}
                      r={18}
                      fill="white"
                      stroke={colors.border}
                      strokeWidth={1.5}
                    />
                  )}
                  <text
                    x={NODE_WIDTH / 2}
                    y={62}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight={600}
                    fill="#1f2937"
                  >
                    {node.member.lastName} {node.member.firstName}
                  </text>
                  {years && (
                    <text x={NODE_WIDTH / 2} y={76} textAnchor="middle" fontSize={11} fill="#6b7280">
                      {years}
                    </text>
                  )}
                  {age && (
                    <text x={NODE_WIDTH / 2} y={90} textAnchor="middle" fontSize={11} fill="#6b7280">
                      {age}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
      </div>
    </div>
  )
}
