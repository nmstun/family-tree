'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FamilyMember, Marriage, ParentChildRelation } from '@/types'
import {
  computeFamilyTreeLayout,
  NODE_WIDTH,
  NODE_HEIGHT,
  V_GAP,
  EDGE_COLORS,
} from '@/utils/treeLayout'
import { calculateAge } from '@/utils/age'
import { fullName, initial } from '@/utils/memberName'
import { useCollapsibleTree } from '@/hooks/useCollapsibleTree'
import {
  buildTreePngBlob,
  computePrintSlices,
  contentBoxOf,
  saveTreeAsPdf,
  type PrintSlice,
} from '@/utils/treeExport'
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  MoveHorizontal,
  MoveVertical,
  Map as MapIcon,
  LocateFixed,
  Expand,
  Copy,
  Check,
  FileDown,
  Printer,
} from 'lucide-react'
import { Alert, Button, EmptyState, cn } from './ui'

interface FamilyTreeViewProps {
  treeId: string
  treeName?: string
  members: FamilyMember[]
  marriages: Marriage[]
  parentChildRelations: ParentChildRelation[]
  selfMemberId?: string | null
}

// 大きな家系図でも全体を1画面に収められるよう、下限は思い切って小さくする。
// このあたりまで縮むと文字は読めないが、全体の形と広がりは掴める。
const MIN_SCALE = 0.1
const MAX_SCALE = 2
// ミニマップ（右下に出す全体図）の最大表示サイズ
const MINIMAP_MAX_PX = 130
const SCALE_STEP = 0.1

// カードは白地にして、性別は枠線とアイコンの色だけで示す。
// 以前は面全体を性別色で塗っていたため、人数が増えるほど画面が
// 青とピンクで埋まって、家系の形そのものが読み取りにくかった。
const GENDER_COLOR: Record<FamilyMember['gender'], { border: string; bg: string; tint: string }> = {
  male: { border: '#93c5fd', bg: '#ffffff', tint: '#eff6ff' },
  female: { border: '#f9a8d4', bg: '#ffffff', tint: '#fdf2f8' },
  other: { border: '#c4b5fd', bg: '#ffffff', tint: '#f5f3ff' },
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
  { label: '配偶者', swatch: <span className="inline-block w-4 border-t-2 border-neutral-400" /> },
  { label: '親子', swatch: <span className="inline-block w-4 border-t-2 border-neutral-300" /> },
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
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const hasAutoFitRef = useRef(false)

  // 折りたたみ（あるメンバーより下の子孫グループを隠す）はフックに切り出してある
  const {
    collapsedRootIds,
    childrenOf,
    hiddenSetByRoot,
    hiddenMemberIds,
    visibleMembers,
    visibleMarriages,
    visibleRelations,
    toggleCollapse,
    expandAll,
  } = useCollapsibleTree(treeId, members, marriages, parentChildRelations)

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
    // 家系図の大きさが初めて確定したときに1回だけ実行したいので、依存は svgWidth のみ。
    // layout.nodes / selfMemberId / vertical を足すと、ノードを1人追加しただけで
    // 倍率と位置が勝手に戻ってしまう（hasAutoFitRef で止めてはいるが、意図を明示しておく）。
    // このコンポーネントは家系図タブを開いたときに初めてマウントされ、
    // その時点で selfMemberId は読み込み済みのため、値を取りこぼすことはない。
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 以下は書き出しの入り口。実処理は utils/treeExport.ts にある。
  // ここでは進行中・エラーといった画面の状態だけを扱う。

  // 画像の生成は非同期だが、生成し終わってから clipboard.write を呼ぶと
  // クリック操作から時間が経ちすぎてブラウザに書き込みを拒否されることがある。
  // そのため生成中のPromiseを ClipboardItem に渡し、clipboard.write 自体は
  // クリック直後（同期的）に呼び出す。
  const handleCopyImage = () => {
    const svgEl = svgRef.current
    if (!svgEl || copying) return
    setCopying(true)
    setCopyError(null)
    navigator.clipboard
      .write([
        new ClipboardItem({ 'image/png': buildTreePngBlob(svgEl, svgWidth, svgHeight) }),
      ])
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

  const handleSavePdf = async () => {
    const svgEl = svgRef.current
    if (!svgEl || savingPdf) return
    setSavingPdf(true)
    setPdfError(null)
    try {
      await saveTreeAsPdf(svgEl, treeName ?? '家系図')
    } catch (err) {
      console.error(err)
      setPdfError('PDFの作成に失敗しました')
    } finally {
      setSavingPdf(false)
    }
  }

  // 印刷は、家系図を用紙の幅いっぱいに拡大したうえで用紙の高さごとに
  // ページを分けたものを一時的にDOMへ描き出してから印刷ダイアログを開く。
  const handlePrint = () => {
    const svgEl = svgRef.current
    const box = svgEl ? contentBoxOf(svgEl) : null
    if (!box) {
      window.print()
      return
    }
    setPrintSlices(computePrintSlices(box))

    const cleanup = () => {
      setPrintSlices([])
      window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)

    // 分割したページがDOMに反映されてから印刷ダイアログを開く
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()))
  }

  if (members.length === 0) {
    return <EmptyState variant="inline">メンバーを追加すると、ここに家系図が表示されます</EmptyState>
  }

  return (
    <div>
      {/* ツールバー。以前はピル状のボタンが横一列に8個以上並んで見分けが付かなかったので、
          「表示倍率」「向き」「書き出し」など役割ごとにまとめ、区切り線で分ける。 */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-sm">
        {/* 表示倍率 */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="toolbar"
            size="icon"
            aria-label="縮小"
            onClick={() => setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)))}
          >
            <ZoomOut aria-hidden />
          </Button>
          <span className="w-11 text-center text-[12px] tabular-nums text-neutral-500">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="toolbar"
            size="icon"
            aria-label="拡大"
            onClick={() => setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)))}
          >
            <ZoomIn aria-hidden />
          </Button>
          <Button variant="toolbar" size="icon" title="等倍に戻す" onClick={() => setScale(1)}>
            <RotateCcw aria-hidden />
          </Button>
          {/* 大きな家系図でも全体の形を一目で掴めるようにする */}
          <Button variant="toolbar" size="sm" onClick={handleFitAll}>
            <Maximize2 aria-hidden />
            全体
          </Button>
        </div>

        <span className="mx-0.5 h-5 w-px bg-neutral-200" aria-hidden />

        <Button variant="toolbar" size="sm" onClick={() => setVertical((v) => !v)}>
          {vertical ? <MoveHorizontal aria-hidden /> : <MoveVertical aria-hidden />}
          {vertical ? '横表示' : '縦表示'}
        </Button>

        <label
          className={cn(
            'inline-flex min-h-[34px] cursor-pointer select-none items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors',
            showMinimap
              ? 'bg-neutral-100 text-neutral-900'
              : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
          )}
        >
          <input
            type="checkbox"
            checked={showMinimap}
            onChange={(e) => setShowMinimap(e.target.checked)}
            className="sr-only"
          />
          <MapIcon className="h-4 w-4" aria-hidden />
          全体図
        </label>

        {selfMemberId && !hiddenMemberIds.has(selfMemberId) && (
          <Button variant="toolbar" size="sm" onClick={() => centerOnMember(selfMemberId)}>
            <LocateFixed aria-hidden />
            自分へ
          </Button>
        )}

        {collapsedRootIds.size > 0 && (
          <Button
            variant="toolbar"
            size="sm"
            onClick={expandAll}
          >
            <Expand aria-hidden />
            すべて展開（{collapsedRootIds.size}）
          </Button>
        )}

        {/* 書き出し系は右端にまとめる */}
        <div className="ml-auto flex items-center gap-0.5">
          <Button variant="toolbar" size="sm" onClick={handleCopyImage} disabled={copying}>
            {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
            {copying ? 'コピー中' : copied ? 'コピーしました' : '画像'}
          </Button>
          {/* PDFファイルを直接作って保存する。スマホ（とくにiOS）は印刷ダイアログから
              ファイルとして保存するのが難しいため、こちらを主な導線にする。 */}
          <Button variant="toolbar" size="sm" onClick={handleSavePdf} disabled={savingPdf}>
            <FileDown aria-hidden />
            {savingPdf ? '作成中' : 'PDF'}
          </Button>
          {/* 紙に印刷したい場合はブラウザの印刷ダイアログを使う */}
          <Button
            variant="toolbar"
            size="icon"
            title="印刷"
            onClick={handlePrint}
            className="hidden md:inline-flex"
          >
            <Printer aria-hidden />
          </Button>
        </div>
      </div>

      {/* 凡例。操作ではないので、ツールバーとは分けて控えめに置く */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[12px] text-neutral-500">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            {item.swatch}
            {item.label}
          </div>
        ))}
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
          className="print-area overflow-auto rounded-xl border border-neutral-200 bg-neutral-50"
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
          <div className="absolute right-3 top-3 rounded-lg border border-neutral-200 bg-white/90 p-1 shadow-sm backdrop-blur-sm">
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
                fill="#171717"
                fillOpacity={0.08}
                stroke="#171717"
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
                  fill="#fafafa"
                />
              )
            })}

            {/* Edges (drawn first, under the nodes) */}
            {layout.edges.map((edge) => {
              // 遠くまで伸びていて目で追いにくい線にだけ色と太さを与える。
              // それ以外はグレーのままにして、色が付いた線が埋もれないようにする。
              const long = edge.colorIndex !== undefined
              return (
                <path
                  key={edge.id}
                  d={vertical ? transposePath(edge.path) : edge.path}
                  fill="none"
                  stroke={
                    edge.type === 'marriage'
                      ? '#a3a3a3'
                      : long
                        ? EDGE_COLORS[edge.colorIndex!]
                        : '#d4d4d4'
                  }
                  strokeWidth={edge.type === 'marriage' ? 2.25 : long ? 2.75 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )
            })}

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
                    rx={12}
                    fill={colors.bg}
                    stroke={isSelf ? '#f59e0b' : colors.border}
                    strokeWidth={isSelf ? 2 : 1.25}
                  />
                  {node.member.photo ? (
                    <>
                      <clipPath id={`${idPrefix}-clip-${node.member.id}`}>
                        <circle cx={centerX} cy={28} r={19} />
                      </clipPath>
                      <image
                        href={node.member.photo}
                        x={centerX - 19}
                        y={9}
                        width={38}
                        height={38}
                        clipPath={`url(#${idPrefix}-clip-${node.member.id})`}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </>
                  ) : (
                    // 写真が無い場合は空の丸ではなく頭文字を出す。
                    // 空の丸が並ぶと「まだ何も入っていない」ように見えてしまう。
                    <>
                      <circle cx={centerX} cy={28} r={19} fill={colors.tint} />
                      <text
                        x={centerX}
                        y={28}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={16}
                        fontWeight={600}
                        fill={colors.border}
                      >
                        {initial(node.member)}
                      </text>
                    </>
                  )}
                  {/* 「自分」の印。左上に小さく置く */}
                  {isSelf && (
                    <circle cx={12} cy={12} r={4} fill="#f59e0b" />
                  )}
                  <text
                    x={centerX}
                    y={66}
                    textAnchor="middle"
                    fontSize={14}
                    fontWeight={600}
                    fill="#171717"
                  >
                    {fullName(node.member)}
                  </text>
                  {years && (
                    <text x={centerX} y={81} textAnchor="middle" fontSize={11} fill="#a3a3a3">
                      {years}
                    </text>
                  )}
                  {age && (
                    <text x={centerX} y={96} textAnchor="middle" fontSize={11} fill="#a3a3a3">
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
                        fill={isCollapsed ? '#171717' : '#ffffff'}
                        stroke={isCollapsed ? '#171717' : '#d4d4d4'}
                        strokeWidth={1.5}
                      />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={isCollapsed ? 11 : 14}
                        fontWeight={700}
                        fill={isCollapsed ? '#ffffff' : '#737373'}
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
