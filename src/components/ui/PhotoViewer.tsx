'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface PhotoViewerProps {
  src: string
  /** 誰の写真かが分かる文字列（読み上げ・見出しに使う） */
  name: string
  onClose: () => void
}

// 写真を画面いっぱいに近い大きさで見るための表示。
//
// 一覧や家系図に出ている写真は数十pxしかなく、顔の判別が難しい。
// Modal は最大幅が固定（max-w-sm）で写真には狭いため、別の枠にしてある。
// Escキー・背景クリック・閉じるボタンのいずれでも閉じられる。
export default function PhotoViewer({ src, name, onClose }: PhotoViewerProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${name}の写真`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-900/80 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
    >
      <button
        type="button"
        aria-label="閉じる"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>
      {/* 写真はDBに base64 で持っているため next/image では最適化できない */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${name}の写真`}
        className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
      />
      <p className="mt-3 text-[13px] text-white/90">{name}</p>
    </div>
  )
}
