'use client'

import { useCallback, useRef, useState } from 'react'
import Button from './Button'
import Modal from './Modal'

export interface ConfirmOptions {
  title: string
  message?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  // 破壊的な操作かどうか。確定ボタンの色が変わる。
  destructive?: boolean
}

// 確認ダイアログを Promise で扱えるようにするフック。
//
// 以前は「共同編集者の削除」だけが native の confirm() を使い、
// メンバー削除や関係の削除には確認が一切無かった。
// メンバー削除は ON DELETE CASCADE で配偶者・親子関係まで消えるため、
// 実際にはいちばん確認が必要な操作だったにも関わらず素通りしていた。
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  // resolve をstateに入れるとStrictModeの二重実行で扱いが面倒になるためrefに置く
  const resolverRef = useRef<((result: boolean) => void) | null>(null)

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolverRef.current = resolve
        setOptions(opts)
      }),
    []
  )

  const close = useCallback((result: boolean) => {
    resolverRef.current?.(result)
    resolverRef.current = null
    setOptions(null)
  }, [])

  const dialog = options ? (
    <Modal
      title={options.title}
      onClose={() => close(false)}
      footer={
        <>
          <Button
            variant={options.destructive ? 'dangerSolid' : 'primary'}
            fullWidth
            onClick={() => close(true)}
          >
            {options.confirmLabel ?? 'OK'}
          </Button>
          <Button variant="secondary" onClick={() => close(false)}>
            {options.cancelLabel ?? 'キャンセル'}
          </Button>
        </>
      }
    >
      {options.message && (
        <p className="text-sm text-gray-600 whitespace-pre-line">{options.message}</p>
      )}
    </Modal>
  ) : null

  return { confirm, dialog }
}
