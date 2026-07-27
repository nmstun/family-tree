'use client'

import { useRef, useState } from 'react'
import { useFamilyTree } from '@/hooks/useFamilyTree'
import { exportToJSON, downloadJSON, importJSON } from '@/utils/jsonExport'
import MemberForm from './MemberForm'
import MemberList from './MemberList'
import RelationshipManager from './RelationshipManager'
import FamilyTreeView from './FamilyTreeView'
import SignOutButton from './SignOutButton'
import CollaboratorsPanel from './CollaboratorsPanel'
import { Alert, Button, Card, useConfirm, cn } from './ui'

type TabId = 'members' | 'relations' | 'view' | 'share' | 'export'

// タブは以前ほぼ同じ<button>を5回書き並べていたので定義だけを配列にまとめる
const TABS: { id: TabId; label: string }[] = [
  { id: 'members', label: '👥 メンバー' },
  { id: 'relations', label: '🔗 関係' },
  { id: 'view', label: '🌳 家系図表示' },
  { id: 'share', label: '🤝 共有' },
  { id: 'export', label: '📥 エクスポート' },
]

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">{children}</h2>
  )
}

export default function FamilyTreeApp() {
  const {
    tree,
    loading,
    syncStatus,
    addMember,
    updateMember,
    deleteMember,
    addMarriage,
    updateMarriage,
    removeMarriage,
    addParentChild,
    removeParentChild,
    importTree,
    selfMemberId,
    setSelfMember,
  } = useFamilyTree()
  const { confirm, dialog } = useConfirm()
  const [activeTab, setActiveTab] = useState<TabId>('members')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const importFileInputRef = useRef<HTMLInputElement>(null)

  if (loading || !tree) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  const handleExport = () => {
    const data = exportToJSON(tree)
    downloadJSON(data, `${tree.name}-${Date.now()}.json`)
  }

  const handleImportFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 同じファイルを連続で選び直せるようにする
    if (!file) return

    setImportError(null)
    const text = await file.text()
    const data = importJSON(text)
    if (!data) {
      setImportError(
        'JSONの形式が正しくありません。このアプリからエクスポートしたファイルを選択してください'
      )
      return
    }

    const confirmed = await confirm({
      title: '家系図を置き換えますか？',
      message:
        `現在の家系図データ（メンバー${tree.members.length}人）はすべて削除され、\n` +
        `インポートするデータ（メンバー${data.tree.members.length}人）に置き換わります。\n` +
        `この操作は取り消せません。`,
      confirmLabel: 'インポートする',
      destructive: true,
    })
    if (!confirmed) return

    setImporting(true)
    try {
      await importTree(data.tree)
    } catch {
      setImportError('インポートに失敗しました。もう一度お試しください')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow">
        {/* 右上には layout.tsx がバージョン表記を固定表示している。
            狭い画面でログアウトと重なるため、上側に余白を足して逃がす */}
        <div className="max-w-6xl mx-auto px-3 md:px-4 pt-7 pb-4 md:py-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-gray-900">{tree.name}</h1>
            <p className="text-xs md:text-base text-gray-600 mt-1">あなたの家系図を整理します</p>
          </div>
          <SignOutButton />
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 md:px-4 flex gap-2 md:gap-4 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={cn(
                'px-2 md:px-4 py-2 md:py-3 text-sm md:text-base font-medium border-b-2 transition whitespace-nowrap',
                'outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-t',
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-700 hover:text-gray-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {activeTab === 'members' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
            <div>
              <SectionHeading>新しいメンバーを追加</SectionHeading>
              <MemberForm onSubmit={addMember} />
            </div>
            <div>
              <SectionHeading>メンバー一覧（{tree.members.length}人）</SectionHeading>
              <MemberList
                members={tree.members}
                onUpdate={updateMember}
                onDelete={deleteMember}
                selfMemberId={selfMemberId}
                onSetSelfMember={setSelfMember}
              />
            </div>
          </div>
        )}

        {activeTab === 'relations' && (
          <div>
            <SectionHeading>家族関係の設定</SectionHeading>
            <RelationshipManager
              members={tree.members}
              marriages={tree.marriages}
              parentChildRelations={tree.parentChildRelations}
              onAddMarriage={addMarriage}
              onUpdateMarriage={updateMarriage}
              onRemoveMarriage={removeMarriage}
              onAddParentChild={addParentChild}
              onRemoveParentChild={removeParentChild}
            />
          </div>
        )}

        {activeTab === 'view' && (
          <Card>
            <SectionHeading>家系図表示</SectionHeading>
            <FamilyTreeView
              treeId={tree.id}
              members={tree.members}
              marriages={tree.marriages}
              parentChildRelations={tree.parentChildRelations}
              selfMemberId={selfMemberId}
            />
          </Card>
        )}

        {activeTab === 'share' && (
          <Card>
            <SectionHeading>家系図を共有</SectionHeading>
            <CollaboratorsPanel treeId={tree.id} />
          </Card>
        )}

        {activeTab === 'export' && (
          <div className="space-y-4 md:space-y-6">
            <Card>
              <SectionHeading>データをエクスポート</SectionHeading>
              <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
                現在の家系図をJSON形式でダウンロードできます。写真を含むすべての情報が含まれます。
              </p>
              <Button size="lg" onClick={handleExport}>
                📥 JSONをダウンロード
              </Button>
            </Card>

            <Card>
              <SectionHeading>データをインポート</SectionHeading>
              <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
                このアプリからエクスポートしたJSONファイルを読み込んで復元できます。
                <br />
                <span className="text-red-600 font-medium">
                  現在の家系図データはすべて削除され、インポートしたデータに置き換わります。
                </span>
              </p>
              <input
                ref={importFileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFileSelected}
                className="hidden"
              />
              <Button
                variant="outline"
                size="lg"
                disabled={importing}
                onClick={() => importFileInputRef.current?.click()}
              >
                {importing ? 'インポート中...' : '📤 JSONを選択してインポート'}
              </Button>
              {importError && <Alert className="mt-3">{importError}</Alert>}
            </Card>
          </div>
        )}

        <div className="mt-4 md:mt-8 flex items-center gap-2" aria-live="polite">
          {syncStatus === 'syncing' && <Alert tone="info">同期中...</Alert>}
          {syncStatus === 'synced' && <Alert tone="success">同期済み</Alert>}
          {syncStatus === 'error' && (
            <Alert>同期に失敗しました。もう一度お試しください</Alert>
          )}
        </div>
      </main>

      {dialog}
    </div>
  )
}
