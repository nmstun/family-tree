import type { MetadataRoute } from 'next'

// ホーム画面に追加したときのアイコンと名称を定義する。
// Next.jsがこのファイルを検出して /manifest.webmanifest を配信し、link タグも自動で挿入する
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Family Tree App',
    short_name: '家系図',
    description: '家系図を写真付きで整理できるWebアプリ',
    start_url: '/',
    theme_color: '#2d6a4f',
    background_color: '#fafafa',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
