'use client'

import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { getCroppedImage } from '@/utils/cropImage'

interface PhotoCropModalProps {
  imageSrc: string
  onCancel: () => void
  onComplete: (croppedDataUrl: string) => void
}

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 md:p-6">
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3">写真をトリミング</h3>

        <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            minZoom={0.4}
            maxZoom={3}
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
          <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
            ズーム
          </label>
          <input
            type="range"
            min={0.4}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            顔や頭が切れてしまう場合は、縮小すると余白付きで全体を収められます
          </p>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !croppedAreaPixels}
            className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition font-medium text-sm disabled:opacity-50"
          >
            {saving ? '処理中...' : '確定'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium text-sm"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
