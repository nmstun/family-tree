'use client'

import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { getCroppedImage } from '@/utils/cropImage'
import { Button, Modal, LABEL_CLASS } from './ui'

interface PhotoCropModalProps {
  imageSrc: string
  onCancel: () => void
  onComplete: (croppedDataUrl: string) => void
}

const MIN_ZOOM = 0.4
const MAX_ZOOM = 3

export default function PhotoCropModal({ imageSrc, onCancel, onComplete }: PhotoCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
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
      <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          restrictPosition={false}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
        />
      </div>

      <div className="mt-4">
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
          className="w-full mt-1"
        />
        <p className="text-xs text-gray-500 mt-1">
          顔や頭が切れてしまう場合は、縮小すると余白付きで全体を収められます
        </p>
      </div>
    </Modal>
  )
}
