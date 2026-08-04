export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', reject)
    image.src = src
  })
}

/**
 * 切り抜き範囲から、書き出す画像の大きさを決める。
 *
 * 以前は常に 400×400 の正方形へ描き込んでいたため、縦長の写真を選んでも
 * 正方形に切り落とされていた。切り抜き範囲の縦横比をそのまま保ち、
 * 長い辺を maxSize に合わせる。
 * 元の切り抜きより大きくは引き伸ばさない（粗くなるだけのため）。
 */
export function outputSizeFor(
  cropArea: CropArea,
  maxSize: number
): { width: number; height: number } {
  const { width, height } = cropArea
  if (!(width > 0) || !(height > 0)) return { width: maxSize, height: maxSize }
  const scale = Math.min(1, maxSize / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export interface DrawRect {
  sx: number
  sy: number
  sw: number
  sh: number
  dx: number
  dy: number
  dw: number
  dh: number
}

/**
 * 切り抜き範囲のうち、実際に元画像が存在する部分と、その描画先を求める。
 *
 * 縮小すると切り抜き枠が元画像より大きくなり、範囲が画像の外へはみ出す
 * （トリミング画面で restrictPosition を外しているため意図的にできる）。
 * その場合ははみ出したぶんを描かず、残りを白のままにして余白にする。
 * ブラウザの drawImage も範囲外を暗黙に切り詰めるが、挙動が分かりにくく
 * 完全に外れると例外にもなり得るため、ここで明示的に計算する。
 *
 * 元画像と重なりが無ければ null（全面が白）。
 */
export function drawRectFor(
  cropArea: CropArea,
  image: { width: number; height: number },
  output: { width: number; height: number }
): DrawRect | null {
  if (!(cropArea.width > 0) || !(cropArea.height > 0)) return null

  const sx = Math.max(cropArea.x, 0)
  const sy = Math.max(cropArea.y, 0)
  const sw = Math.min(cropArea.x + cropArea.width, image.width) - sx
  const sh = Math.min(cropArea.y + cropArea.height, image.height) - sy
  if (!(sw > 0) || !(sh > 0)) return null

  // 切り抜き範囲 → 書き出す画像 への倍率
  const scaleX = output.width / cropArea.width
  const scaleY = output.height / cropArea.height

  return {
    sx,
    sy,
    sw,
    sh,
    dx: (sx - cropArea.x) * scaleX,
    dy: (sy - cropArea.y) * scaleY,
    dw: sw * scaleX,
    dh: sh * scaleY,
  }
}

export async function getCroppedImage(
  imageSrc: string,
  cropArea: CropArea,
  maxSize = 400
): Promise<string> {
  const image = await loadImage(imageSrc)
  const { width, height } = outputSizeFor(cropArea, maxSize)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('このブラウザは画像のトリミングに対応していません')

  // 縮小して余白ができる場合、はみ出た部分が透明→JPEG変換時に黒くならないよう
  // 先に白で塗りつぶしておく
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  const rect = drawRectFor(
    cropArea,
    { width: image.naturalWidth, height: image.naturalHeight },
    { width, height }
  )
  // 重なりが無ければ何も描かない（白いだけの画像になる）
  if (rect) {
    ctx.drawImage(image, rect.sx, rect.sy, rect.sw, rect.sh, rect.dx, rect.dy, rect.dw, rect.dh)
  }

  return canvas.toDataURL('image/jpeg', 0.9)
}
