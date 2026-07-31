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
// Escキーと背景クリックで閉じられる。
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 p-4 backdrop-blur-[2px]"
      // クリックの「押し始め」が背景そのものだった場合だけ閉じる。
      // トリミングのドラッグ操作が枠外で終わったときに閉じてしまうのを防ぐ。
      onMouseDown={(e) => {
        if (e.target === backdropRef.current) onClose()
      }}
    >
      <div
        className={cn(
          'w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl ring-1 ring-neutral-900/5',
          className
        )}
      >
        <h3 className="mb-2 text-[15px] font-semibold tracking-tight text-neutral-900">{title}</h3>
        {children}
        {footer && <div className="mt-5 flex gap-2">{footer}</div>}
      </div>
    </div>
  )
}
