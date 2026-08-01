import type { Metadata } from 'next'
import './globals.css'
import { version as APP_VERSION } from '../package.json'

export const metadata: Metadata = {
  title: 'Family Tree App',
  description: 'Organize your family tree with photos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className="bg-neutral-50">
        {children}
        {/* 全画面共通で右上に常時表示するアプリバージョン。動作確認・問い合わせ時に
            どのビルドを見ているか分かるようにする目的。スクロールしても隠れないようfixed */}
        <div
          className="fixed z-50 text-[10px] text-neutral-400 select-none pointer-events-none"
          style={{
            top: 'max(0.5rem, env(safe-area-inset-top))',
            right: 'max(0.5rem, env(safe-area-inset-right))',
          }}
        >
          v{APP_VERSION}
        </div>
      </body>
    </html>
  )
}
