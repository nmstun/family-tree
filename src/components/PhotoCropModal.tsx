'use client'

import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { getCroppedImage } from '@/utils/cropImage'
import { Button, Modal, LABEL_CLASS, cn } from './ui'

interface PhotoCropModalProps {
  imageSrc: string
  onCancel: () => void
  onComplete: (croppedDataUrl: string) => void
}

const MIN_ZOOM = 0.4
const MAX_ZOOM = 3

// 切り抜きの縦横比。
// 以前は正方形しか選べず、縦長の顔写真を入れると上下が切り落とされていた。
// 一覧や家系図の丸いアイコンは中央を切り出して表示するため見た目は変わらないが、
// 写真そのものは選んだ比率のまま保存され、拡大表示では全体が見える。
const ASPECTS: { label: string; value: number; hint: string }[] = [
  { label: '正方形', value: 1, hint: '1:1' },
  { label: '縦長', value: 3 / 4, hint: '3:4' },
  { label: '横長', value: 4 / 3, hint: '4:3' },
]

export default function PhotoCropModal({ imageSrc, onCancel, onComplete }: PhotoCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [aspect, setAspect] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels) return
    setSaving(true)
    try {
      const cropped = await getCroppedImage(imageSrc, croppedAreaPixels)
      onComplete(cropped)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="写真をトリミング"
      onClose={onCancel}
      footer={
        <>
          <Button fullWidth onClick={handleSave} disabled={saving || !croppedAreaPixels}>
            {saving ? '処理中...' : '確定'}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            キャンセル
          </Button>
        </>
      }
    >
      <div className="relative h-64 w-full overflow-hidden rounded-lg bg-neutral-100">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          restrictPosition={false}
          aspect={aspect}
          // 正方形のときだけ丸く切り抜く。縦長・横長で丸にすると楕円になってしまう
          cropShape={aspect === 1 ? 'round' : 'rect'}
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
        />
      </div>

      <div className="mt-4">
        <span className={LABEL_CLASS}>形</span>
        <div className="mt-1 flex gap-1.5" role="group" aria-label="切り抜きの形">
          {ASPECTS.map((option) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={aspect === option.value}
              onClick={() => setAspect(option.value)}
              className={cn(
                'flex-1 rounded-lg border px-2 py-1.5 text-[13px] font-medium transition-colors',
                aspect === option.value
                  ? 'border-neutral-900 bg-neutral-900 text-white'
                  : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
              )}
            >
              {option.label}
              <span
                className={cn(
                  'ml-1 text-[11px] font-normal',
                  aspect === option.value ? 'text-white/70' : 'text-neutral-400'
                )}
              >
                {option.hint}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="photo-zoom" className={LABEL_CLASS}>
          ズーム
        </label>
        <input
          id="photo-zoom"
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="mt-1 w-full"
        />
        <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">
          顔や頭が切れてしまう場合は、縮小すると余白付きで全体を収められます。
          一覧や家系図では中央を丸く切り出して表示しますが、写真を押すと全体を見られます。
        </p>
      </div>
    </Modal>
  )
}
