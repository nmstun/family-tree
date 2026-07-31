'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FamilyMember, Marriage, ParentChildRelation } from '@/types'
import { computeFamilyTreeLayout, NODE_WIDTH, NODE_HEIGHT, V_GAP } from '@/utils/treeLayout'
import { calculateAge } from '@/utils/age'
import { Alert, Button, EmptyState } from './ui'

interface FamilyTreeViewProps {
  treeId: string
  treeName?: string
  members: FamilyMember[]
  marriages: Marriage[]
  parentChildRelations: ParentChildRelation[]
  selfMemberId?: string | null
}

const COLLAPSE_STORAGE_PREFIX = 'familyTree:collapsed:'

// 大きな家系図でも全体を1画面に収められるよう、下限は思い切って小さくする。
// このあたりまで縮むと文字は読めないが、全体の形と広がりは掴める。
const MIN_SCALE = 0.1
const MAX_SCALE = 2
// ミニマップ（右下に出す全体図）の最大表示サイズ
const MINIMAP_MAX_PX = 130
const SCALE_STEP = 0.1

// 印刷（PDF保存）時の用紙まわりの寸法。globals.css の @media print と対応させる。
//
// 以前は家系図の縦横比に合わせた用紙サイズ（例: 210mm × 677mm）を @page size で
// 指定していたが、Safari は @page の size を無視して用紙をA4のままにするため、
// 実機では効かず横に大きな余白が残っていた。
// そのため用紙はA4固定とし、家系図のほうを用紙の幅いっぱいに拡大したうえで
// 用紙の高さごとに分割する（＝ページを分ける）方式にする。
const PRINT_MARGIN_MM = 6
// 見出し（家系図名と日付）の高さ。globals.css 側と同じ値にすること。
const PRINT_TITLE_MM = 14
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
// PDFに埋め込む画像の解像度。上げるほど綺麗だがファイルも大きくなる。
const PDF_DPI = 200
// 1ページ内で家系図に使える領域の「横幅 ÷ 高さ」。分割する高さの計算に使う。
const PRINT_CONTENT_ASPECT =
  (A4_WIDTH_MM - PRINT_MARGIN_MM * 2) /
  (A4_HEIGHT_MM - PRINT_MARGIN_MM * 2 - PRINT_TITLE_MM)
// ノードのドロップシャドウ（node-shadow フィルタ）が figure の外側へ広がるぶんの余裕。
// フィルタ領域は各ノードの上下左右に20%ずつ取っているので、その最大値に合わせる。
const PRINT_SHADOW_PAD = Math.ceil(NODE_WIDTH * 0.2)

type PrintSlice = { x: number; y: number; width: number; height: number }

/**
 * 家系図を用紙の幅いっぱいに拡大したうえで、用紙1枚に入る高さごとに切り分ける。
 * 1枚に収めようとすると、家系図（縦長）と用紙（A4）の縦横比の差がそのまま
 * 余白になってしまうため（実データで横が約58%余っていた）、ページを分けて
 * 幅を使い切る。
 */
function computePrintSlices(box: {
  x: number
  y: number
  width: number
  height: number
}): PrintSlice[] {
  if (box.width <= 0 || box.height <= 0) return []
  const pad = PRINT_SHADOW_PAD
  const x = box.x - pad
  const width = box.width + pad * 2
  const height = box.height + pad * 2
  // 幅を用紙いっぱいに使ったとき、1ページに収まる家系図の高さ
  const sliceHeight = width / PRINT_CONTENT_ASPECT
  if (sliceHeight >= height) {
    return [{ x, y: box.y - pad, width, height: sliceHeight }]
  }
  // ページの境目でカードが分断されると読めなくなるため、隣のページと少し重ねる。
  // カード1枚ぶんを重ねておけば、切れたカードは次のページに必ず丸ごと現れる。
  const overlap = Math.max(NODE_WIDTH, NODE_HEIGHT)
  const step = sliceHeight - overlap
  const count = Math.max(1, Math.ceil((height - overlap) / step))
  return Array.from({ length: count }, (_, i) => ({
    x,
    y: box.y - pad + i * step,
    width,
    height: sliceHeight,
  }))
}

const GENDER_COLOR: Record<FamilyMember['gender'], { border: string; bg: string }> = {
  male: { border: '#3b82f6', bg: '#eff6ff' },
  female: { border: '#ec4899', bg: '#fdf2f8' },
  other: { border: '#8b5cf6', bg: '#f5f3ff' },
}

function ColorDot({ color }: { color: string }) {
  return (
    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
  )
}

// 凡例は同じ形のチップが並ぶだけなので、見本部分と文言だけを定義にまとめる。
// GENDER_COLOR を読むため、必ずその宣言より後ろに置く。
const LEGEND_ITEMS: { label: string; swatch: React.ReactNode }[] = [
  { label: '男性', swatch: <ColorDot color={GENDER_COLOR.male.border} /> },
  { label: '女性', swatch: <ColorDot color={GENDER_COLOR.female.border} /> },
  { label: 'その他', swatch: <ColorDot color={GENDER_COLOR.other.border} /> },
  { label: '配偶者', swatch: <span className="inline-block w-4 border-t-2 border-gray-400" /> },
  { label: '親子', swatch: <span className="inline-block w-4 border-t-2 border-gray-300" /> },
  { label: 'クリックで子孫を折りたたみ', swatch: <span aria-hidden>ー / ＋</span> },
]

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
  treeId,
  treeName,
  members,
  marriages,
  parentChildRelations,
  selfMemberId = null,
}: FamilyTreeViewProps) {
  const [scale, setScale] = useState(1)
  const [vertical, setVertical] = useState(true)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  // 印刷用に切り分けたページ。印刷中だけ中身が入る。
  const [printSlices, setPrintSlices] = useState<PrintSlice[]>([])
  const [savingPdf, setSavingPdf] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [showMinimap, setShowMinimap] = useState(true)
  // ミニマップに映す「いま見えている範囲」を示す矩形。
  // スクロールのたびに再レンダリングすると73人ぶんのノードを毎回作り直すことになるため、
  // stateには持たせず、この矩形の属性だけを直接書き換える。
  const viewportRectRef = useRef<SVGRectElement>(null)
  const [collapsedRootIds, setCollapsedRootIds] = useState<Set<string>>(() => new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const hasAutoFitRef = useRef(false)

  // 折りたたみ状態はこのブラウザだけに保存する（他の共同編集者には影響しない）。
  // 読み込みはマウント時（treeId確定時）の1回のみ。保存は変更時に直接書き込む
  // （読み込み・保存の両方をuseEffectにすると、マウント時に読み込み直後の
  // 古い状態で保存Effectが走り、直後にlocalStorageを空で上書きしてしまう）。
  useEffect(() => {
    if (!treeId) return
    try {
      const raw = localStorage.getItem(COLLAPSE_STORAGE_PREFIX + treeId)
      setCollapsedRootIds(raw ? new Set(JSON.parse(raw)) : new Set())
    } catch {
      setCollapsedRootIds(new Set())
    }
  }, [treeId])

  const persistCollapsed = (next: Set<string>) => {
    if (!treeId) return
    try {
      localStorage.setItem(COLLAPSE_STORAGE_PREFIX + treeId, JSON.stringify(Array.from(next)))
    } catch {
      // プライベートブラウズなどlocalStorageが使えない環境では諦める
    }
  }

  // 「このメンバーを起点に折りたたんだ場合に隠れるメンバー」の集合を、
  // 子を持つメンバーごとに事前計算しておく。子(down)と配偶者(spouse)を
  // 交互にたどり、選択したメンバーより下の家族グループ全体を1セットにまとめる。
  const { childrenOf, hiddenSetByRoot } = useMemo(() => {
    const childrenMap = new Map<string, string[]>()
    parentChildRelations.forEach((r) => {
      if (!childrenMap.has(r.parentId)) childrenMap.set(r.parentId, [])
      childrenMap.get(r.parentId)!.push(r.childId)
    })
    const spouseMap = new Map<string, string[]>()
    marriages.forEach((m) => {
      if (!spouseMap.has(m.spouse1Id)) spouseMap.set(m.spouse1Id, [])
      spouseMap.get(m.spouse1Id)!.push(m.spouse2Id)
      if (!spouseMap.has(m.spouse2Id)) spouseMap.set(m.spouse2Id, [])
      spouseMap.get(m.spouse2Id)!.push(m.spouse1Id)
    })

    const hiddenByRoot = new Map<string, Set<string>>()
    childrenMap.forEach((_, rootId) => {
      const hidden = new Set<string>()
      const queue = [...(childrenMap.get(rootId) ?? [])]
      while (queue.length > 0) {
        const id = queue.shift()!
        if (hidden.has(id)) continue
        hidden.add(id)
        ;(spouseMap.get(id) ?? []).forEach((s) => {
          if (!hidden.has(s)) queue.push(s)
        })
        ;(childrenMap.get(id) ?? []).forEach((c) => {
          if (!hidden.has(c)) queue.push(c)
        })
      }
      hiddenByRoot.set(rootId, hidden)
    })

    return { childrenOf: childrenMap, hiddenSetByRoot: hiddenByRoot }
  }, [parentChildRelations, marriages])

  const hiddenMemberIds = useMemo(() => {
    const hidden = new Set<string>()
    collapsedRootIds.forEach((rootId) => {
      hiddenSetByRoot.get(rootId)?.forEach((id) => hidden.add(id))
    })
    return hidden
  }, [collapsedRootIds, hiddenSetByRoot])

  const visibleMembers = useMemo(
    () => members.filter((m) => !hiddenMemberIds.has(m.id)),
    [members, hiddenMemberIds]
  )
  const visibleMarriages = useMemo(
    () =>
      marriages.filter(
        (m) => !hiddenMemberIds.has(m.spouse1Id) && !hiddenMemberIds.has(m.spouse2Id)
      ),
    [marriages, hiddenMemberIds]
  )
  const visibleRelations = useMemo(
    () =>
      parentChildRelations.filter(
        (r) => !hiddenMemberIds.has(r.parentId) && !hiddenMemberIds.has(r.childId)
      ),
    [parentChildRelations, hiddenMemberIds]
  )

  const toggleCollapse = (memberId: string) => {
    setCollapsedRootIds((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) next.delete(memberId)
      else next.add(memberId)
      persistCollapsed(next)
      return next
    })
  }

  const layout = useMemo(
    () => computeFamilyTreeLayout(visibleMembers, visibleMarriages, visibleRelations),
    [visibleMembers, visibleMarriages, visibleRelations]
  )

  const padding = 20
  // 縦表示では世代方向（元のY）を画面の横幅、兄弟の並び（元のX）を画面の高さにする
  const svgWidth = (vertical ? layout.height : layout.width) + padding * 2
  const svgHeight = (vertical ? layout.width : layout.height) + padding * 2

  // 世代の境界を帯状の背景色で示す。線が座標変換（縦横切り替え）の都合で
  // たまたま無関係なノードの近くを通ってしまっても、背景の帯を見れば
  // どのノードがどの世代に属すかが一目で分かり、誤って繋がっているように
  // 見えるのを防げる。帯の座標は世代軸（縦表示でも横表示でも常にlayout.height側）
  // を基準に計算し、描画時に必要な軸へ割り当てる。
  const rowSize = NODE_HEIGHT + V_GAP
  const generationCount =
    layout.nodes.length > 0 ? Math.max(...layout.nodes.map((n) => n.generation)) + 1 : 0

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
    const container = containerRef.current
    const containerWidth = container?.clientWidth
    if (!containerWidth) return
    hasAutoFitRef.current = true
    const fitScale = Math.min(1, (containerWidth - 8) / svgWidth)
    const nextScale = fitScale < 0.95 ? Math.max(0.75, +fitScale.toFixed(2)) : 1
    setScale(nextScale)

    // 「自分」が設定されていれば、家系図を開いたときに自分のノードが
    // 見える位置までスクロールしておく（大きな家系図で迷子にならないように）
    if (selfMemberId && container) {
      const selfNode = layout.nodes.find((n) => n.member.id === selfMemberId)
      if (selfNode) {
        const nodeX = vertical ? selfNode.y : selfNode.x
        const nodeY = vertical ? selfNode.x : selfNode.y
        const boxW = vertical ? NODE_HEIGHT : NODE_WIDTH
        const boxH = vertical ? NODE_WIDTH : NODE_HEIGHT
        requestAnimationFrame(() => {
          container.scrollTo({
            left: Math.max(0, (padding + nodeX + boxW / 2) * nextScale - container.clientWidth / 2),
            top: Math.max(0, (padding + nodeY + boxH / 2) * nextScale - container.clientHeight / 2),
          })
        })
      }
    }
  }, [svgWidth])

  // ミニマップの表示サイズ。家系図の縦横比を保ったまま所定の枠に収める。
  const minimapSize = useMemo(() => {
    if (svgWidth === 0 || svgHeight === 0) return { w: 0, h: 0 }
    const s = Math.min(MINIMAP_MAX_PX / svgWidth, MINIMAP_MAX_PX / svgHeight)
    return { w: Math.round(svgWidth * s), h: Math.round(svgHeight * s) }
  }, [svgWidth, svgHeight])

  // ミニマップに描くノードの四角。写真や文字は小さすぎて意味がないうえ
  // 描画も重くなるため、位置と性別の色だけの単純な矩形にする。
  const minimapNodes = useMemo(
    () =>
      layout.nodes.map((node) => ({
        id: node.member.id,
        x: padding + (vertical ? node.y : node.x),
        y: padding + (vertical ? node.x : node.y),
        w: vertical ? NODE_HEIGHT : NODE_WIDTH,
        h: vertical ? NODE_WIDTH : NODE_HEIGHT,
        fill: GENDER_COLOR[node.member.gender].border,
        isSelf: node.member.id === selfMemberId,
      })),
    [layout.nodes, vertical, padding, selfMemberId]
  )

  // いま見えている範囲を家系図の座標系に直し、ミニマップ上の矩形へ反映する。
  const syncViewport = () => {
    const c = containerRef.current
    const rect = viewportRectRef.current
    if (!c || !rect) return
    rect.setAttribute('x', String(c.scrollLeft / scale))
    rect.setAttribute('y', String(c.scrollTop / scale))
    rect.setAttribute('width', String(c.clientWidth / scale))
    rect.setAttribute('height', String(c.clientHeight / scale))
  }

  // ズームや向きが変わると見えている範囲も変わるので測り直す
  useEffect(() => {
    syncViewport()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, vertical, svgWidth, svgHeight, showMinimap])

  // 家系図全体が画面に収まるところまで縮小する（「全体を表示」ボタン用）
  const handleFitAll = () => {
    const c = containerRef.current
    if (!c || svgWidth === 0 || svgHeight === 0) return
    const fit = Math.min((c.clientWidth - 8) / svgWidth, (c.clientHeight - 8) / svgHeight)
    setScale(Math.max(MIN_SCALE, Math.min(1, +fit.toFixed(3))))
    c.scrollTo({ left: 0, top: 0 })
  }

  // ミニマップ上の位置をクリック／ドラッグしたら、そこが画面の中心に来るようスクロールする
  const jumpFromMinimap = (e: React.MouseEvent<SVGSVGElement>) => {
    const c = containerRef.current
    if (!c) return
    const rect = e.currentTarget.getBoundingClientRect()
    const treeX = ((e.clientX - rect.left) / rect.width) * svgWidth
    const treeY = ((e.clientY - rect.top) / rect.height) * svgHeight
    c.scrollTo({
      left: Math.max(0, treeX * scale - c.clientWidth / 2),
      top: Math.max(0, treeY * scale - c.clientHeight / 2),
    })
  }

  // 指定したメンバーのノードが見える位置までスクロールする（「自分の位置へ」ボタン用）
  const centerOnMember = (memberId: string) => {
    const targetNode = layout.nodes.find((n) => n.member.id === memberId)
    const container = containerRef.current
    if (!targetNode || !container) return
    const nodeX = vertical ? targetNode.y : targetNode.x
    const nodeY = vertical ? targetNode.x : targetNode.y
    const boxW = vertical ? NODE_HEIGHT : NODE_WIDTH
    const boxH = vertical ? NODE_WIDTH : NODE_HEIGHT
    container.scrollTo({
      left: Math.max(0, (padding + nodeX + boxW / 2) * scale - container.clientWidth / 2),
      top: Math.max(0, (padding + nodeY + boxH / 2) * scale - container.clientHeight / 2),
      behavior: 'smooth',
    })
  }

  // 家系図全体をPNG画像としてクリップボードにコピーする。画面のズームやスクロール
  // 位置に関わらず、SVGの実寸（viewBox基準）で高解像度に描画することで、
  // 貼り付け先で印刷やLINE共有にも耐えられる画質にする。写真はすでにbase64の
  // data URLで埋め込まれているため、canvasへの描画がクロスオリジンで汚染される
  // 心配はない。
  //
  // svgRef.current の width/height 属性は画面上のズーム倍率（scale）がかかった値になっている
  // （見た目のズームが小さいと、この属性値も小さくなる）。ここをそのままシリアライズすると、
  // ブラウザはSVGをその小さいサイズで一度ラスタライズしてからcanvasに引き伸ばすため、
  // ズームが小さいときほど書き出し画像がぼやける。そのため複製したSVGのwidth/heightを
  // 書き出し用の実解像度に上書きしてから使う。
  //
  // 画像の生成（SVGの読み込み・canvas描画）は非同期のため、生成し終わってから
  // clipboard.write を呼ぶと、クリックのユーザー操作から時間が経ちすぎて
  // ブラウザに書き込みを拒否されることがある。そのため、生成中のPromiseを
  // ClipboardItem に渡す形で clipboard.write 自体はクリック直後（同期的）に
  // 呼び出し、ユーザー操作の有効期限内に書き込みを開始させる。
  const buildTreePngBlob = async (): Promise<Blob> => {
    const svgEl = svgRef.current
    if (!svgEl) throw new Error('家系図が見つかりません')

    // canvasのサイズ上限（ブラウザにより異なるが概ね1万数千px四方）を超えないよう、
    // 大きな家系図では倍率を落として安全側に倒す
    const MAX_EXPORT_DIMENSION = 8000
    const exportScale = Math.min(
      3,
      MAX_EXPORT_DIMENSION / svgWidth,
      MAX_EXPORT_DIMENSION / svgHeight
    )
    const exportWidth = Math.round(svgWidth * exportScale)
    const exportHeight = Math.round(svgHeight * exportScale)

    const clone = svgEl.cloneNode(true) as SVGSVGElement
    clone.setAttribute('width', String(exportWidth))
    clone.setAttribute('height', String(exportHeight))

    const svgString = new XMLSerializer().serializeToString(clone)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = svgUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = exportWidth
    canvas.height = exportHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('このブラウザは画像のコピーに対応していません')

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    URL.revokeObjectURL(svgUrl)

    const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!pngBlob) throw new Error('画像の生成に失敗しました')
    return pngBlob
  }

  // 家系図の指定した範囲（1ページぶん）を、A4用紙1枚ぶんのcanvasに描く。
  // 見出しはcanvasに直接描く。PDFの標準フォントは日本語を持っていないため、
  // PDF側に文字として入れると文字化けしてしまう。
  const renderPageToCanvas = async (
    slice: PrintSlice,
    pageIndex: number,
    pageCount: number
  ): Promise<HTMLCanvasElement> => {
    const svgEl = svgRef.current
    if (!svgEl) throw new Error('家系図が見つかりません')

    const mmToPx = (mm: number) => Math.round((mm / 25.4) * PDF_DPI)
    const pageW = mmToPx(A4_WIDTH_MM)
    const pageH = mmToPx(A4_HEIGHT_MM)
    const margin = mmToPx(PRINT_MARGIN_MM)
    const titleH = mmToPx(PRINT_TITLE_MM)
    const treeW = pageW - margin * 2
    const treeH = pageH - margin * 2 - titleH

    // 画面表示用のSVGを複製し、このページに写す範囲だけを viewBox で切り出す
    const clone = svgEl.cloneNode(true) as SVGSVGElement
    clone.setAttribute('viewBox', `${slice.x} ${slice.y} ${slice.width} ${slice.height}`)
    clone.setAttribute('preserveAspectRatio', 'xMidYMin meet')
    clone.setAttribute('width', String(treeW))
    clone.setAttribute('height', String(treeH))
    // 操作用の折りたたみボタンはPDFには載せない
    clone.querySelectorAll('.print-hide').forEach((el) => el.remove())

    const svgUrl = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(clone)], {
        type: 'image/svg+xml;charset=utf-8',
      })
    )
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = svgUrl
      })

      const canvas = document.createElement('canvas')
      canvas.width = pageW
      canvas.height = pageH
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('このブラウザはPDFの作成に対応していません')

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pageW, pageH)

      const titleFont = Math.round(titleH * 0.34)
      ctx.fillStyle = '#111827'
      ctx.font = `bold ${titleFont}px sans-serif`
      ctx.textBaseline = 'middle'
      ctx.fillText(treeName ?? '家系図', margin, margin + titleH / 2)

      ctx.fillStyle = '#6b7280'
      ctx.font = `${Math.round(titleFont * 0.8)}px sans-serif`
      ctx.textAlign = 'right'
      ctx.fillText(
        `${new Date().toLocaleDateString('ja-JP')} 時点 ／ ${pageIndex + 1} / ${pageCount}`,
        pageW - margin,
        margin + titleH / 2
      )
      ctx.textAlign = 'left'

      ctx.drawImage(image, margin, margin + titleH, treeW, treeH)
      return canvas
    } finally {
      URL.revokeObjectURL(svgUrl)
    }
  }

  // PDFファイルとして保存する。
  // 印刷ダイアログ経由（window.print）はスマホ、とくにiOSでは
  // ファイルとして保存しづらいため、PDFそのものを作ってダウンロードさせる。
  const handleSavePdf = async () => {
    if (savingPdf) return
    setSavingPdf(true)
    setPdfError(null)
    try {
      const contentGroup = svgRef.current?.querySelector('g')
      if (!contentGroup) throw new Error('家系図が見つかりません')
      const slices = computePrintSlices((contentGroup as SVGGraphicsElement).getBBox())

      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

      for (let i = 0; i < slices.length; i++) {
        const canvas = await renderPageToCanvas(slices[i], i, slices.length)
        if (i > 0) pdf.addPage()
        pdf.addImage(
          canvas.toDataURL('image/jpeg', 0.92),
          'JPEG',
          0,
          0,
          A4_WIDTH_MM,
          A4_HEIGHT_MM
        )
      }

      pdf.save(`${treeName ?? '家系図'}-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (err) {
      console.error(err)
      setPdfError('PDFの作成に失敗しました')
    } finally {
      setSavingPdf(false)
    }
  }

  // 印刷時は用紙の余白をできるだけ減らす。
  // (1) 実際に描かれている範囲（bbox）を求める。レイアウト計算の都合で
  //     viewBox には中身の無い領域が残ることがあり（実データで幅1949に対し
  //     中身は1684しかなかった）、そのままだと余白が増える。
  // (2) 家系図を用紙の幅いっぱいに拡大し、用紙の高さごとにページを分ける。
  //     1枚に収める方式だと縦横比の差がそのまま余白になり、
  //     用紙サイズ自体を変える方式は Safari が @page size を無視するため使えない。
  const handlePrint = () => {
    const contentGroup = svgRef.current?.querySelector('g')
    if (!contentGroup) {
      window.print()
      return
    }

    const box = (contentGroup as SVGGraphicsElement).getBBox()
    const slices = computePrintSlices(box)
    setPrintSlices(slices)

    const cleanup = () => {
      setPrintSlices([])
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)

    // 分割したページがDOMに反映されてから印刷ダイアログを開く
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()))
  }

  const handleCopyImage = () => {
    if (!svgRef.current || copying) return
    setCopying(true)
    setCopyError(null)
    navigator.clipboard
      .write([new ClipboardItem({ 'image/png': buildTreePngBlob() })])
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch((err) => {
        console.error(err)
        setCopyError('画像のコピーに失敗しました')
      })
      .finally(() => setCopying(false))
  }

  if (members.length === 0) {
    return <EmptyState variant="inline">メンバーを追加すると、ここに家系図が表示されます</EmptyState>
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="inline-flex items-center gap-1 bg-white rounded-full shadow-sm border border-gray-200 p-1">
          <button
            onClick={() => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)))}
            className="min-w-[44px] min-h-[44px] md:min-w-[32px] md:min-h-[32px] flex items-center justify-center text-base md:text-sm text-gray-600 hover:bg-gray-100 rounded-full transition"
            aria-label="縮小"
          >
            −
          </button>
          <span className="text-xs md:text-sm text-gray-600 w-12 text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)))}
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
          {/* 大きな家系図でも全体の形を一目で掴めるようにする */}
          <button
            onClick={handleFitAll}
            className="min-h-[44px] md:min-h-[32px] px-3 text-sm text-gray-600 hover:bg-gray-100 rounded-full transition whitespace-nowrap"
          >
            全体を表示
          </button>
        </div>

        <Button variant="toolbar" onClick={() => setVertical((v) => !v)}>
          <span aria-hidden>{vertical ? '↔️' : '↕️'}</span>
          {vertical ? '横表示' : '縦表示'}
        </Button>

        <Button variant="toolbar" onClick={handleCopyImage} disabled={copying}>
          <span aria-hidden>{copied ? '✅' : '📋'}</span>
          {copying ? 'コピー中...' : copied ? 'コピーしました' : '画像をコピー'}
        </Button>

        {/* ブラウザの印刷ダイアログで「PDFとして保存」を選ぶとPDFになる。
            SVGのまま印刷するので、用紙に合わせて縮小しても文字が潰れない。 */}
        {/* PDFファイルを直接作って保存する。スマホ（とくにiOS）は印刷ダイアログから
            ファイルとして保存するのが難しいため、こちらを主な導線にする。 */}
        <Button variant="toolbar" onClick={handleSavePdf} disabled={savingPdf}>
          <span aria-hidden>📄</span>
          {savingPdf ? 'PDFを作成中...' : 'PDFで保存'}
        </Button>

        {/* 紙に印刷したい場合はブラウザの印刷ダイアログを使う */}
        <Button variant="toolbar" onClick={handlePrint} className="hidden md:inline-flex">
          <span aria-hidden>🖨️</span>
          印刷
        </Button>

        {selfMemberId && !hiddenMemberIds.has(selfMemberId) && (
          <Button variant="toolbar" onClick={() => centerOnMember(selfMemberId)}>
            <span aria-hidden>📍</span>
            自分の位置へ
          </Button>
        )}

        <label className="min-h-[44px] md:min-h-[32px] px-3 inline-flex items-center gap-1.5 text-sm text-gray-600 bg-white rounded-full shadow-sm border border-gray-200 cursor-pointer">
          <input
            type="checkbox"
            checked={showMinimap}
            onChange={(e) => setShowMinimap(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          全体図
        </label>

        {collapsedRootIds.size > 0 && (
          <Button
            variant="toolbar"
            onClick={() => {
              setCollapsedRootIds(new Set())
              persistCollapsed(new Set())
            }}
          >
            <span aria-hidden>⊕</span>
            すべて展開（{collapsedRootIds.size}）
          </Button>
        )}

        {/* 凡例 */}
        <div className="flex flex-wrap gap-2 text-xs md:text-sm text-gray-600">
          {LEGEND_ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-1.5 bg-white rounded-full border border-gray-200 px-2.5 py-1"
            >
              {item.swatch}
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {copyError && <Alert className="mb-3">{copyError}</Alert>}
      {pdfError && <Alert className="mb-3">{pdfError}</Alert>}

      {/* 印刷用に切り分けたページ。1ページ＝用紙1枚ぶんの高さを持ち、
          同じ家系図の別の区間を viewBox で切り出して表示する。
          アプリの見出しやツールバーが印刷時に場所を取って家系図を下へ押し出さないよう、
          body 直下へ出しておき、印刷時はこちらだけを表示する。 */}
      {printSlices.length > 0 &&
        createPortal(
          <div className="print-root">
            {printSlices.map((slice, i) => (
              <div key={`page-${i}`} className="print-page">
                <div className="print-page-head">
                  {treeName ?? '家系図'}
                  <span className="print-page-no">
                    {new Date().toLocaleDateString('ja-JP')} 時点 ／ {i + 1} / {printSlices.length}
                  </span>
                </div>
                <svg
                  viewBox={`${slice.x} ${slice.y} ${slice.width} ${slice.height}`}
                  preserveAspectRatio="xMidYMin meet"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {renderTreeContent(`p${i}`)}
                </svg>
              </div>
            ))}
          </div>,
          document.body
        )}

      {/* Scrollable canvas */}
      <div className="relative">
        <div
          ref={containerRef}
          onScroll={syncViewport}
          className="print-area overflow-auto rounded-xl bg-gradient-to-br from-gray-50 to-gray-100"
          style={{ maxHeight: '70vh' }}
        >
          <svg
            ref={svgRef}
            width={svgWidth * scale}
            height={svgHeight * scale}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            xmlns="http://www.w3.org/2000/svg"
          >
            {renderTreeContent('screen')}
          </svg>
        </div>

        {/* ミニマップ。家系図全体の形と、いま見ている場所を示す。
            クリック／ドラッグでその位置へ移動できる。
            表示枠は高さ70vhあり下端は画面外になりやすいので、上端側に置く。 */}
        {showMinimap && minimapSize.w > 0 && (
          <div className="absolute right-2 top-2 rounded-lg border border-gray-300 bg-white/90 shadow-md p-1 backdrop-blur-sm">
            <svg
              width={minimapSize.w}
              height={minimapSize.h}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="block cursor-pointer"
              onClick={jumpFromMinimap}
              onMouseMove={(e) => {
                // 左ボタンを押しながら動かしている間は追従させる
                if (e.buttons === 1) jumpFromMinimap(e)
              }}
              role="img"
              aria-label="家系図の全体図。クリックするとその位置へ移動します"
            >
              {minimapNodes.map((n) => (
                <rect
                  key={n.id}
                  x={n.x}
                  y={n.y}
                  width={n.w}
                  height={n.h}
                  rx={20}
                  fill={n.isSelf ? '#f59e0b' : n.fill}
                  opacity={n.isSelf ? 1 : 0.55}
                />
              ))}
              {/* いま見えている範囲。位置と大きさは syncViewport が直接書き換える */}
              <rect
                ref={viewportRectRef}
                x={0}
                y={0}
                width={0}
                height={0}
                fill="#4f46e5"
                fillOpacity={0.12}
                stroke="#4f46e5"
                strokeWidth={Math.max(svgWidth, svgHeight) / 200}
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  )

  function renderTreeContent(idPrefix: string) {
    return (
      <>
        <defs>
          <filter id={`${idPrefix}-node-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="2.5" floodColor="#1f2937" floodOpacity="0.15" />
          </filter>
        </defs>
        <g transform={`translate(${padding}, ${padding})`}>
            {/* Generation bands (drawn first, under everything) */}
            {Array.from({ length: generationCount }, (_, g) => {
              if (g % 2 === 0) return null
              const bandStart = g * rowSize
              return (
                <rect
                  key={`band-${g}`}
                  x={vertical ? bandStart : 0}
                  y={vertical ? 0 : bandStart}
                  width={vertical ? rowSize : layout.width}
                  height={vertical ? layout.width : rowSize}
                  fill="#f1f5f9"
                />
              )
            })}

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
              // 線の座標は元のレイアウト（横=NODE_WIDTH、縦=NODE_HEIGHT）を
              // そのままx⇔y入れ替えて計算しているため、カード自体の見た目上の
              // 幅・高さも縦表示では入れ替えないと、線がカードの本来の端より
              // 手前や奥で止まって見えてしまう（配偶者線がカードに届かない等）。
              const boxWidth = vertical ? NODE_HEIGHT : NODE_WIDTH
              const boxHeight = vertical ? NODE_WIDTH : NODE_HEIGHT
              const centerX = boxWidth / 2
              const isSelf = node.member.id === selfMemberId
              const isCollapsed = collapsedRootIds.has(node.member.id)
              const hiddenCount = hiddenSetByRoot.get(node.member.id)?.size ?? 0
              const hasChildren = childrenOf.has(node.member.id)

              return (
                <g
                  key={node.member.id}
                  transform={`translate(${nodeX}, ${nodeY})`}
                  filter={`url(#${idPrefix}-node-shadow)`}
                >
                  <rect
                    width={boxWidth}
                    height={boxHeight}
                    rx={14}
                    fill={colors.bg}
                    stroke={isSelf ? '#f59e0b' : colors.border}
                    strokeWidth={isSelf ? 3 : 1.5}
                  />
                  {isSelf && (
                    <text x={8} y={16} fontSize={13}>
                      ⭐
                    </text>
                  )}
                  {node.member.photo ? (
                    <>
                      <clipPath id={`${idPrefix}-clip-${node.member.id}`}>
                        <circle cx={centerX} cy={28} r={20} />
                      </clipPath>
                      <image
                        href={node.member.photo}
                        x={centerX - 20}
                        y={8}
                        width={40}
                        height={40}
                        clipPath={`url(#${idPrefix}-clip-${node.member.id})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </>
                  ) : (
                    <circle
                      cx={centerX}
                      cy={28}
                      r={20}
                      fill="white"
                      stroke={colors.border}
                      strokeWidth={1.5}
                    />
                  )}
                  <text
                    x={centerX}
                    y={66}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight={700}
                    fill="#1f2937"
                  >
                    {node.member.lastName} {node.member.firstName}
                  </text>
                  {years && (
                    <text x={centerX} y={81} textAnchor="middle" fontSize={12} fill="#6b7280">
                      {years}
                    </text>
                  )}
                  {age && (
                    <text x={centerX} y={96} textAnchor="middle" fontSize={12} fill="#6b7280">
                      {age}
                    </text>
                  )}
                  {hasChildren && (
                    <g
                      className="print-hide"
                      transform={`translate(${boxWidth - 16}, ${boxHeight - 16})`}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleCollapse(node.member.id)
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <title>
                        {isCollapsed
                          ? `${hiddenCount}人を非表示中（クリックで再表示）`
                          : 'クリックで子孫を折りたたむ'}
                      </title>
                      <circle
                        r={isCollapsed ? 12 : 10}
                        fill={isCollapsed ? '#4f46e5' : '#ffffff'}
                        stroke="#4f46e5"
                        strokeWidth={1.5}
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={isCollapsed ? 11 : 14}
                        fontWeight={700}
                        fill={isCollapsed ? '#ffffff' : '#4f46e5'}
                      >
                        {isCollapsed ? (hiddenCount > 99 ? '99+' : hiddenCount) : '−'}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
        </g>
      </>
    )
  }
}
