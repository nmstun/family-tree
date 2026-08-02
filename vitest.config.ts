import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    // アプリ側と同じ `@/` エイリアスをテストでも使えるようにする
    alias: { '@': resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // 生年月日は「YYYY-MM-DD」＝UTC0時として解釈されるため、実行環境の
    // タイムゾーン次第で日付が1日ずれ、学年の 4/1・4/2 判定などが変わる。
    // 想定利用環境（日本）に固定して、どの端末でも同じ結果にする。
    env: { TZ: 'Asia/Tokyo' },
  },
})
