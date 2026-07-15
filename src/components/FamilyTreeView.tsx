'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
  const birthPrecision = member.birthDatePrecision ?? 'day'
  const deathPrecision = member.deathDatePrecision ?? 'day'
  const isEstimate = birthPrecision !== 'day' || (!!member.deathDate && deathPrecision !== 'day')
  const label = isEstimate ? '(推定)' : ''
  return member.deathDate ? `享年${age}${label}` : `${age}${label}歳`
}

// 縦表示（世代を左右ではなく上下ではなく左右にする＝スマホ向け）にする際、
// レイアウト計算自体（世代=Y、兄弟順=X）はそのままに、描画時だけ座標を
// x⇔yで入れ替えて90度回転相当の見た目にする。円弧（線の飛び越え）は
// 座標を入れ替えると鏡映になるため、sweepフラグを反転して向きを保つ。
function transposePath(path: string): string {
  const tokens = path.match(/[MLA]|-?\d+(?:\.\d+)?/g) ?? []
  const out: string[] = []
  let i = 0
  while (i < tokens.length) {
    const cmd = tokens[i]
    if (cmd === 'M' || cmd === 'L') {
      const x = tokens[i + 1]
      const y = tokens[i + 2]
      out.push(cmd, y, x)
      i += 3
    } else if (cmd === 'A') {
      const rx = tokens[i + 1]
      const ry = tokens[i + 2]
      const rot = tokens[i + 3]
      const largeArc = tokens[i + 4]
      const sweep = tokens[i + 5]
      const x = tokens[i + 6]
      const y = tokens[i + 7]
      out.push(cmd, rx, ry, rot, largeArc, sweep === '1' ? '0' : '1', y, x)
      i += 8
    } else {
      out.push(cmd)
      i += 1
    }
  }
  return out.join(' ')
}

export default function FamilyTreeView({
  members,
  marriages,
  parentChildRelations,
}: FamilyTreeViewProps) {
  const [scale, setScale] = useState(1)
  const [vertical, setVertical] = useState(true)
  const [exporting, setExporting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const hasAutoFitRef = useRef(false)

  const layout = useMemo(
    () => computeFamilyTreeLayout(members, marriages, parentChildRelations),
    [members, marriages, parentChildRelations]
  )

  const padding = 20
  // 縦表示では世代方向（元のY）を画面の横幅、兄弟の並び（元のX）を画面の高さにする
  const svgWidth = (vertical ? layout.height : layout.width) + padding * 2
  const svgHeight = (vertical ? layout.width : layout.height) + padding * 2

  // スマホなど画面が狭い場合、初期表示で家系図が極端にはみ出さないように
  // 自動でスケールを合わせる（ユーザーが手動でズームした後は上書きしない）。
  // 縦横を切り替えたときは、はみ出し具合が変わるため合わせ直す。
  // 文字が読めなくなるほどは縮小しないよう下限を高めに設定し、
  // はみ出す分はスクロールで見る前提にする。
  useEffect(() => {
    hasAutoFitRef.current = false
  }, [vertical])

  useEffect(() => {
    if (hasAutoFitRef.current || svgWidth === 0) return
    const containerWidth = containerRef.current?.clientWidth
    if (!containerWidth) return
    hasAutoFitRef.current = true
    const fitScale = Math.min(1, (containerWidth - 8) / svgWidth)
    if (fitScale < 0.95) {
      setScale(Math.max(0.75, +fitScale.toFixed(2)))
    } else {
      setScale(1)
    }
  }, [svgWidth])

  // 家系図全体をPNG画像として書き出す。画面のズームやスクロール位置に関わらず、
  // SVGの実寸（viewBox基準）で高解像度（2倍）に描画することで、印刷やLINE共有にも
  // 耐えられる画質にする。写真はすでにbase64のdata URLで埋め込まれているため、
  // canvasへの描画がクロスオリジンで汚染される心配はない。
  const handleExportPng = async () => {
    const svgEl = svgRef.current
    if (!svgEl || exporting) return
    setExporting(true)
    try {
      const svgString = new XMLSerializer().serializeToString(svgEl)
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const svgUrl = URL.createObjectURL(svgBlob)

      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = svgUrl
      })

      const exportScale = 2
      const canvas = document.createElement('canvas')
      canvas.width = svgWidth * exportScale
      canvas.height = svgHeight * exportScale
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('このブラウザは画像の書き出しに対応していません')

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(svgUrl)

      const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!pngBlob) throw new Error('画像の生成に失敗しました')

      const downloadUrl = URL.createObjectURL(pngBlob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = '家系図.png'
      link.click()
      URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error(err)
      alert('画像の書き出しに失敗しました')
    } finally {
      setExporting(false)
    }
  }

  if (members.length === 0) {
    return (
      <div className="text-center text-gray-500 text-sm md:text-base py-12">
        メンバーを追加すると、ここに家系図が表示されます
      </div>
    )
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="inline-flex items-center gap-1 bg-white rounded-full shadow-sm border border-gray-200 p-1">
          <button
            onClick={() => setScale((s) => Math.max(0.6, +(s - 0.1).toFixed(2)))}
            className="min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center text-base md:text-sm text-gray-600 hover:bg-gray-100 rounded-full transition"
            aria-label="縮小"
          >
            −
          </button>
          <span className="text-xs md:text-sm text-gray-600 w-12 text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(2, +(s + 0.1).toFixed(2)))}
            className="min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center text-base md:text-sm text-gray-600 hover:bg-gray-100 rounded-full transition"
            aria-label="拡大"
          >
            ＋
          </button>
          <button
            onClick={() => setScale(1)}
            className="min-h-[44px] md:min-h-[32px] px-3 text-sm text-gray-600 hover:bg-gray-100 rounded-full transition"
          >
            リセット
          </button>
        </div>

        <button
          onClick={() => setVertical((v) => !v)}
          className="min-h-[44px] md:min-h-[32px] px-3 inline-flex items-center gap-1.5 text-sm text-gray-600 bg-white hover:bg-gray-100 rounded-full shadow-sm border border-gray-200 transition"
        >
          <span aria-hidden>{vertical ? '↔️' : '↕️'}</span>
          {vertical ? '横表示' : '縦表示'}
        </button>

        <button
          onClick={handleExportPng}
          disabled={exporting}
          className="min-h-[44px] md:min-h-[32px] px-3 inline-flex items-center gap-1.5 text-sm text-gray-600 bg-white hover:bg-gray-100 rounded-full shadow-sm border border-gray-200 transition disabled:opacity-50"
        >
          <span aria-hidden>🖼️</span>
          {exporting ? '書き出し中...' : '画像として保存'}
        </button>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-xs md:text-sm text-gray-600">
          <div className="flex items-center gap-1.5 bg-white rounded-full border border-gray-200 px-2.5 py-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GENDER_COLOR.male.border }} />
            男性
          </div>
          <div className="flex items-center gap-1.5 bg-white rounded-full border border-gray-200 px-2.5 py-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GENDER_COLOR.female.border }} />
            女性
          </div>
          <div className="flex items-center gap-1.5 bg-white rounded-full border border-gray-200 px-2.5 py-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GENDER_COLOR.other.border }} />
            その他
          </div>
          <div className="flex items-center gap-1.5 bg-white rounded-full border border-gray-200 px-2.5 py-1">
            <span className="inline-block w-4 border-t-2 border-gray-400" />
            配偶者
          </div>
          <div className="flex items-center gap-1.5 bg-white rounded-full border border-gray-200 px-2.5 py-1">
            <span className="inline-block w-4 border-t-2 border-gray-300" />
            親子
          </div>
        </div>
      </div>

      {/* Scrollable canvas */}
      <div
        ref={containerRef}
        className="overflow-auto rounded-xl bg-gradient-to-br from-gray-50 to-gray-100"
        style={{ maxHeight: '70vh' }}
      >
        <svg
          ref={svgRef}
          width={svgWidth * scale}
          height={svgHeight * scale}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#1f2937" floodOpacity="0.15" />
            </filter>
          </defs>
          <g transform={`translate(${padding}, ${padding})`}>
            {/* Edges (drawn first, under the nodes) */}
            {layout.edges.map((edge) => (
              <path
                key={edge.id}
                d={vertical ? transposePath(edge.path) : edge.path}
                fill="none"
                stroke={edge.type === 'marriage' ? '#9ca3af' : '#c7cdd6'}
                strokeWidth={edge.type === 'marriage' ? 2.25 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
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
              const nodeX = vertical ? node.y : node.x
              const nodeY = vertical ? node.x : node.y

              return (
                <g
                  key={node.member.id}
                  transform={`translate(${nodeX}, ${nodeY})`}
                  filter="url(#node-shadow)"
                >
                  <rect
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx={14}
                    fill={colors.bg}
                    stroke={colors.border}
                    strokeWidth={1.5}
                  />
                  {node.member.photo ? (
                    <>
                      <clipPath id={`clip-${node.member.id}`}>
                        <circle cx={NODE_WIDTH / 2} cy={28} r={20} />
                      </clipPath>
                      <image
                        href={node.member.photo}
                        x={NODE_WIDTH / 2 - 20}
                        y={8}
                        width={40}
                        height={40}
                        clipPath={`url(#clip-${node.member.id})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </>
                  ) : (
                    <circle
                      cx={NODE_WIDTH / 2}
                      cy={28}
                      r={20}
                      fill="white"
                      stroke={colors.border}
                      strokeWidth={1.5}
                    />
                  )}
                  <text
                    x={NODE_WIDTH / 2}
                    y={66}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={700}
                    fill="#1f2937"
                  >
                    {node.member.lastName} {node.member.firstName}
                  </text>
                  {years && (
                    <text x={NODE_WIDTH / 2} y={81} textAnchor="middle" fontSize={12} fill="#6b7280">
                      {years}
                    </text>
                  )}
                  {age && (
                    <text x={NODE_WIDTH / 2} y={96} textAnchor="middle" fontSize={12} fill="#6b7280">
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
