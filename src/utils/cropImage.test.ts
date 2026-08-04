import { describe, it, expect } from 'vitest'
import { outputSizeFor, drawRectFor } from './cropImage'

// 以前は切り抜き範囲によらず常に 400×400 へ描き込んでいたため、
// 縦長の写真を選んでも正方形に切り落とされていた。
// 書き出す大きさが切り抜きの縦横比を保つことを固定する。
describe('outputSizeFor', () => {
  it('正方形の切り抜きは正方形のまま', () => {
    expect(outputSizeFor({ x: 0, y: 0, width: 800, height: 800 }, 400)).toEqual({
      width: 400,
      height: 400,
    })
  })

  it('縦長の切り抜きは縦長のまま（長い辺が上限に合う）', () => {
    expect(outputSizeFor({ x: 0, y: 0, width: 600, height: 800 }, 400)).toEqual({
      width: 300,
      height: 400,
    })
  })

  it('横長の切り抜きは横長のまま', () => {
    expect(outputSizeFor({ x: 0, y: 0, width: 800, height: 600 }, 400)).toEqual({
      width: 400,
      height: 300,
    })
  })

  it('縦横比が保たれる（歪まない）', () => {
    const crop = { x: 0, y: 0, width: 1234, height: 2000 }
    const out = outputSizeFor(crop, 400)
    expect(out.width / out.height).toBeCloseTo(crop.width / crop.height, 2)
  })

  it('元より大きくは引き伸ばさない', () => {
    // 上限より小さい切り抜きは、そのままの大きさで書き出す
    expect(outputSizeFor({ x: 0, y: 0, width: 120, height: 160 }, 400)).toEqual({
      width: 120,
      height: 160,
    })
  })

  it('大きさが取れない場合でも落ちない', () => {
    expect(outputSizeFor({ x: 0, y: 0, width: 0, height: 0 }, 400)).toEqual({
      width: 400,
      height: 400,
    })
    expect(outputSizeFor({ x: 0, y: 0, width: -10, height: 100 }, 400)).toEqual({
      width: 400,
      height: 400,
    })
  })
})

// 縮小すると切り抜き枠が元画像より大きくなる（restrictPosition を外しているため）。
// はみ出したぶんは描かず、白い余白として残す。
describe('drawRectFor', () => {
  const image = { width: 600, height: 1000 }

  it('切り抜きが画像の内側なら、そのまま全面に描く', () => {
    const out = { width: 400, height: 400 }
    expect(drawRectFor({ x: 100, y: 200, width: 400, height: 400 }, image, out)).toEqual({
      sx: 100,
      sy: 200,
      sw: 400,
      sh: 400,
      dx: 0,
      dy: 0,
      dw: 400,
      dh: 400,
    })
  })

  it('左右にはみ出したぶんは白余白になる（中央に寄る）', () => {
    // 縦長画像を正方形の枠いっぱいに縮小した状態。左右が画像の外へ出る。
    const crop = { x: -200, y: 0, width: 1000, height: 1000 }
    const out = { width: 400, height: 400 }
    const r = drawRectFor(crop, image, out)!
    // 元画像の全幅が使われる
    expect({ sx: r.sx, sy: r.sy, sw: r.sw, sh: r.sh }).toEqual({ sx: 0, sy: 0, sw: 600, sh: 1000 })
    // 描画先は中央、左右に等しい余白
    expect(r.dx).toBeCloseTo(80, 6)
    expect(r.dw).toBeCloseTo(240, 6)
    expect(r.dy).toBeCloseTo(0, 6)
    expect(r.dh).toBeCloseTo(400, 6)
    expect(r.dx).toBeCloseTo(out.width - (r.dx + r.dw), 6)
  })

  it('上下にはみ出す場合も同様', () => {
    const crop = { x: 0, y: -300, width: 600, height: 1600 }
    const out = { width: 150, height: 400 }
    const r = drawRectFor(crop, image, out)!
    expect({ sx: r.sx, sy: r.sy, sw: r.sw, sh: r.sh }).toEqual({ sx: 0, sy: 0, sw: 600, sh: 1000 })
    expect(r.dy).toBeCloseTo(75, 6)
    expect(r.dh).toBeCloseTo(250, 6)
    expect(r.dy).toBeCloseTo(out.height - (r.dy + r.dh), 6)
  })

  it('描画先が書き出す画像の中に収まる', () => {
    const out = { width: 400, height: 400 }
    const r = drawRectFor({ x: -500, y: -500, width: 2000, height: 2000 }, image, out)!
    expect(r.dx).toBeGreaterThanOrEqual(0)
    expect(r.dy).toBeGreaterThanOrEqual(0)
    expect(r.dx + r.dw).toBeLessThanOrEqual(out.width + 1e-6)
    expect(r.dy + r.dh).toBeLessThanOrEqual(out.height + 1e-6)
  })

  it('縦横比が元画像と変わらない（歪まない）', () => {
    const crop = { x: -200, y: 0, width: 1000, height: 1000 }
    const r = drawRectFor(crop, image, { width: 400, height: 400 })!
    expect(r.dw / r.dh).toBeCloseTo(r.sw / r.sh, 6)
  })

  it('元画像とまったく重ならなければ null（全面が白）', () => {
    expect(drawRectFor({ x: 900, y: 0, width: 200, height: 200 }, image, { width: 400, height: 400 })).toBeNull()
    expect(drawRectFor({ x: 0, y: -400, width: 200, height: 200 }, image, { width: 400, height: 400 })).toBeNull()
  })

  it('大きさが取れない切り抜きでも落ちない', () => {
    expect(drawRectFor({ x: 0, y: 0, width: 0, height: 100 }, image, { width: 400, height: 400 })).toBeNull()
  })
})
