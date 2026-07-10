import FamilyTreeApp from '@/components/FamilyTreeApp'

// ログイン状態・リアルタイムデータに依存するため、静的生成せず動的にレンダリングする
export const dynamic = 'force-dynamic'

export default function Home() {
  return (
    <main className="min-h-screen">
      <FamilyTreeApp />
    </main>
  )
}
