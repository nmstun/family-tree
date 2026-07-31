import { NODE_WIDTH, NODE_HEIGHT } from './treeLayout'

// 家系図の書き出し（画像コピー・PDF・印刷）に関する処理をまとめる。
// 画面の状態には触れず、SVG要素と寸法を受け取って結果を返すだけにしてある。

// ---- 用紙まわりの寸法。globals.css の @media print と対応させること ----
//
// 以前は家系図の縦横比に合わせた用紙サイズ（例: 210mm × 677mm）を @page size で
// 指定していたが、Safari は @page の size を無視して用紙をA4のままにするため、
// 実機では効かず横に大きな余白が残っていた。
// そのため用紙はA4固定とし、家系図のほうを用紙の幅いっぱいに拡大したうえで
// 用紙の高さごとに分割する（＝ページを分ける）方式にしている。
const PRINT_MARGIN_MM = 6
// 見出し（家系図名と日付）の高さ。globals.css 側と同じ値にすること。
const PRINT_TITLE_MM = 14
const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
// PDFに埋め込む画像の解像度。上げるほど綺麗だがファイルも大きくなる。
const PDF_DPI = 200
// 1ページ内で家系図に使える領域の「横幅 ÷ 高さ」。分割する高さの計算に使う。
const PRINT_CONTENT_ASPECT =
  (A4_WIDTH_MM - PRINT_MARGIN_MM * 2) / (A4_HEIGHT_MM - PRINT_MARGIN_MM * 2 - PRINT_TITLE_MM)
// ノードのドロップシャドウ（node-shadow フィルタ）が図形の外側へ広がるぶんの余裕。
// フィルタ領域は各ノードの上下左右に20%ずつ取っているので、その最大値に合わせる。
const PRINT_SHADOW_PAD = Math.ceil(NODE_WIDTH * 0.2)
// canvasのサイズ上限（ブラウザにより異なるが概ね1万数千px四方）を超えないための上限
const MAX_EXPORT_DIMENSION = 8000

export type PrintSlice = { x: number; y: number; width: number; height: number }
export type Box = { x: number; y: number; width: number; height: number }

/**
 * 家系図を用紙の幅いっぱいに拡大したうえで、用紙1枚に入る高さごとに切り分ける。
 * 1枚に収めようとすると、家系図（縦長）と用紙（A4）の縦横比の差がそのまま
 * 余白になってしまうため（実データで横が約58%余っていた）、ページを分けて
 * 幅を使い切る。
 */
export function computePrintSlices(box: Box): PrintSlice[] {
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

/** SVG要素の中身が実際に占めている範囲。viewBox には余白が残っていることがある */
export function contentBoxOf(svgEl: SVGSVGElement): Box | null {
  const group = svgEl.querySelector('g')
  if (!group) return null
  const box = (group as SVGGraphicsElement).getBBox()
  return box.width > 0 && box.height > 0 ? box : null
}

/** SVGを画像として読み込む。読み込み後に objectURL を必ず解放する */
async function withSvgImage<T>(
  svgEl: SVGSVGElement,
  configure: (clone: SVGSVGElement) => void,
  use: (image: HTMLImageElement) => T | Promise<T>
): Promise<T> {
  const clone = svgEl.cloneNode(true) as SVGSVGElement
  configure(clone)
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(clone)], {
      type: 'image/svg+xml;charset=utf-8',
    })
  )
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
    return await use(image)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * 家系図全体をPNGにする。
 *
 * svgRef.current の width/height 属性は画面上のズーム倍率がかかった値になっている。
 * そのままシリアライズすると、ブラウザはSVGをその小さいサイズで一度ラスタライズしてから
 * canvasに引き伸ばすため、ズームが小さいときほど書き出し画像がぼやける。
 * そのため複製したSVGの width/height を書き出し用の実解像度に上書きしてから使う。
 */
export async function buildTreePngBlob(
  svgEl: SVGSVGElement,
  svgWidth: number,
  svgHeight: number
): Promise<Blob> {
  const exportScale = Math.min(
    3,
    MAX_EXPORT_DIMENSION / svgWidth,
    MAX_EXPORT_DIMENSION / svgHeight
  )
  const width = Math.round(svgWidth * exportScale)
  const height = Math.round(svgHeight * exportScale)

  return withSvgImage(
    svgEl,
    (clone) => {
      clone.setAttribute('width', String(width))
      clone.setAttribute('height', String(height))
    },
    async (image) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('このブラウザは画像のコピーに対応していません')

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(image, 0, 0, width, height)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/png')
      )
      if (!blob) throw new Error('画像の生成に失敗しました')
      return blob
    }
  )
}

/**
 * 家系図の指定した範囲（1ページぶん）を、A4用紙1枚ぶんのcanvasに描く。
 * 見出しはcanvasに直接描く。PDFの標準フォントは日本語を持っていないため、
 * PDF側に文字として入れると文字化けしてしまう。
 */
async function renderPageToCanvas(
  svgEl: SVGSVGElement,
  slice: PrintSlice,
  pageIndex: number,
  pageCount: number,
  title: string
): Promise<HTMLCanvasElement> {
  const mmToPx = (mm: number) => Math.round((mm / 25.4) * PDF_DPI)
  const pageW = mmToPx(A4_WIDTH_MM)
  const pageH = mmToPx(A4_HEIGHT_MM)
  const margin = mmToPx(PRINT_MARGIN_MM)
  const titleH = mmToPx(PRINT_TITLE_MM)
  const treeW = pageW - margin * 2
  const treeH = pageH - margin * 2 - titleH

  return withSvgImage(
    svgEl,
    (clone) => {
      // このページに写す範囲だけを viewBox で切り出す
      clone.setAttribute('viewBox', `${slice.x} ${slice.y} ${slice.width} ${slice.height}`)
      clone.setAttribute('preserveAspectRatio', 'xMidYMin meet')
      clone.setAttribute('width', String(treeW))
      clone.setAttribute('height', String(treeH))
      // 操作用の折りたたみボタンはPDFには載せない
      clone.querySelectorAll('.print-hide').forEach((el) => el.remove())
    },
    (image) => {
      const canvas = document.createElement('canvas')
      canvas.width = pageW
      canvas.height = pageH
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('このブラウザはPDFの作成に対応していません')

      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pageW, pageH)

      const titleFont = Math.round(titleH * 0.34)
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#171717'
      ctx.font = `bold ${titleFont}px sans-serif`
      ctx.fillText(title, margin, margin + titleH / 2)

      ctx.fillStyle = '#737373'
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
    }
  )
}

/**
 * 家系図をPDFファイルとして保存する。
 * 印刷ダイアログ経由（window.print）はスマホ、とくにiOSでは
 * ファイルとして保存しづらいため、PDFそのものを作ってダウンロードさせる。
 */
export async function saveTreeAsPdf(svgEl: SVGSVGElement, title: string): Promise<void> {
  const box = contentBoxOf(svgEl)
  if (!box) throw new Error('家系図が見つかりません')
  const slices = computePrintSlices(box)

  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  for (let i = 0; i < slices.length; i++) {
    const canvas = await renderPageToCanvas(svgEl, slices[i], i, slices.length, title)
    if (i > 0) pdf.addPage()
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM)
  }

  pdf.save(`${title}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
