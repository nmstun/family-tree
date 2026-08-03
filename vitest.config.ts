import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  // JSXを含むテスト（.test.tsx）を変換できるようにする
  plugins: [react()],
  resolve: {
    // アプリ側と同じ `@/` エイリアスをテストでも使えるようにする
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    // 画面部品のテスト（.test.tsx）はブラウザ相当の環境が要るので、
    // ファイル先頭の `// @vitest-environment jsdom` で個別に切り替える
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // 生年月日は「YYYY-MM-DD」＝UTC0時として解釈されるため、実行環境の
    // タイムゾーン次第で日付が1日ずれ、学年の 4/1・4/2 判定などが変わる。
    // 想定利用環境（日本）に固定して、どの端末でも同じ結果にする。
    env: { TZ: 'Asia/Tokyo' },
  },
})
