'use client'

import { useEffect, useRef } from 'react'
import { cn } from './cn'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

// モーダルの外枠。写真トリミングと確認ダイアログで共通の見た目・操作にする。
// Escキーと背景クリックで閉じられるのは以前はどちらも無かった挙動で、
// ここに集約したことで両方のモーダルに一度に行き渡る。
export default function Modal({ title, onClose, children, footer, className }: ModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    // モーダル表示中は背後のページがスクロールしないようにする
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
      aria-label={title}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      // クリックの「押し始め」が背景そのものだった場合だけ閉じる。
      // トリミングのドラッグ操作が枠外で終わったときに閉じてしまうのを防ぐ。
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
    >
      <div className={cn('bg-white rounded-lg shadow-xl w-full max-w-sm p-4 md:p-6', className)}>
        <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3">{title}</h3>
        {children}
        {footer && <div className="flex gap-2 mt-4">{footer}</div>}
      </div>
    </div>
  )
}
