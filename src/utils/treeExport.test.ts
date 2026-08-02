import { describe, it, expect } from 'vitest'
import { computePrintSlices, type Box } from './treeExport'
import { NODE_WIDTH, NODE_HEIGHT } from './treeLayout'

// 印刷・PDFの分割は「実データで確認したら余白が半分以上余っていた」「ページの境目で
// カードが切れて読めない」という不具合の再発防止が目的。見た目は自動テストで見られない
// ので、代わりに“分割が満たすべき性質”を固定する。
const CARD = Math.max(NODE_WIDTH, NODE_HEIGHT)

/** 分割された各ページを合わせて、家系図全体が必ずどこかに写っていること */
function coversWholeTree(box: Box, slices: ReturnType<typeof computePrintSlices>) {
  const first = slices[0]
  const last = slices[slices.length - 1]
  return first.y <= box.y && last.y + last.height >= box.y + box.height
}

describe('computePrintSlices', () => {
  it('大きさが無ければ何も出力しない', () => {
    expect(computePrintSlices({ x: 0, y: 0, width: 0, height: 100 })).toEqual([])
    expect(computePrintSlices({ x: 0, y: 0, width: 100, height: 0 })).toEqual([])
  })

  it('1ページに収まる家系図は1ページ', () => {
    // 横長（用紙より縦横比が平たい）なら分割不要
    const slices = computePrintSlices({ x: 0, y: 0, width: 2000, height: 500 })
    expect(slices).toHaveLength(1)
  })

  it('1ページに収まる場合でも用紙の縦横比に合わせた高さを返す', () => {
    // 家系図の高さのままだと用紙に対して横が余る。用紙いっぱいに使うため、
    // 実際の中身より高い viewBox を返して縦位置を用紙に合わせる。
    const box: Box = { x: 0, y: 0, width: 2000, height: 500 }
    const [slice] = computePrintSlices(box)
    expect(slice.height).toBeGreaterThan(box.height)
    expect(slice.width / slice.height).toBeLessThan(box.width / box.height)
  })

  it('縦長の家系図は複数ページに分割される', () => {
    const slices = computePrintSlices({ x: 0, y: 0, width: 1000, height: 8000 })
    expect(slices.length).toBeGreaterThan(1)
  })

  it('全ページを合わせると家系図全体が収まる', () => {
    const box: Box = { x: -300, y: -120, width: 1000, height: 8000 }
    const slices = computePrintSlices(box)
    expect(coversWholeTree(box, slices)).toBe(true)
  })

  it('隣り合うページはカード1枚ぶん以上重なる（境目でカードが消えない）', () => {
    const slices = computePrintSlices({ x: 0, y: 0, width: 1000, height: 8000 })
    for (let i = 1; i < slices.length; i++) {
      const prevBottom = slices[i - 1].y + slices[i - 1].height
      // 浮動小数の誤差ぶんだけ緩める
      expect(prevBottom - slices[i].y).toBeGreaterThan(CARD - 0.001)
    }
  })

  it('各ページの縦横比は用紙の印刷領域と一致する', () => {
    // ここがずれると、拡大時に上下または左右へ余白が出る（＝余白が多すぎる不具合）
    const slices = computePrintSlices({ x: 0, y: 0, width: 1000, height: 8000 })
    const ratios = slices.map((s) => s.width / s.height)
    ratios.forEach((r) => expect(r).toBeCloseTo(ratios[0], 10))
  })

  it('すべてのページが同じ横位置・同じ大きさ（拡大率がページ間でぶれない）', () => {
    const slices = computePrintSlices({ x: 40, y: 0, width: 1000, height: 8000 })
    slices.forEach((s) => {
      expect(s.x).toBe(slices[0].x)
      expect(s.width).toBe(slices[0].width)
      expect(s.height).toBe(slices[0].height)
    })
  })

  it('ノードの影が切れないよう左右に余白を足す', () => {
    const box: Box = { x: 0, y: 0, width: 1000, height: 500 }
    const [slice] = computePrintSlices(box)
    expect(slice.x).toBeLessThan(box.x)
    expect(slice.width).toBeGreaterThan(box.width)
  })

  it('極端に細長くてもページ数が発散せず全体を覆う', () => {
    // 1ページに入る高さがカード1枚ぶんを下回ると送り幅が0以下になり、
    // 分割が1ページで打ち切られて下が丸ごと印刷されなかった。
    const box: Box = { x: 0, y: 0, width: 60, height: 4000 }
    const slices = computePrintSlices(box)
    expect(coversWholeTree(box, slices)).toBe(true)
    expect(slices.length).toBeLessThan(200)
  })
})
