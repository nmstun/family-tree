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
import {
  Users,
  Link2,
  Network,
  UserPlus,
  Download,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { Alert, Button, Card, SectionHeading, useConfirm, cn } from './ui'

type TabId = 'members' | 'relations' | 'view' | 'share' | 'export'

// タブは同じ形の<button>が並ぶだけなので定義だけを配列にまとめる。
// 絵文字ではなく線画のアイコンで揃える（見た目の統一と、環境差による字形のばらつき回避）。
const TABS: { id: TabId; label: string; Icon: LucideIcon }[] = [
  { id: 'members', label: 'メンバー', Icon: Users },
  { id: 'relations', label: '関係', Icon: Link2 },
  { id: 'view', label: '家系図', Icon: Network },
  { id: 'share', label: '共有', Icon: UserPlus },
  { id: 'export', label: 'データ', Icon: Download },
]

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
    retrySync,
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
    <div className="min-h-screen bg-neutral-50">
      {/* ヘッダーとタブは1枚の面としてまとめ、スクロールしても残す */}
      <div className="sticky top-0 z-20 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
        {/* 右上には layout.tsx がバージョン表記を固定表示している。
            狭い画面でログアウトと重なるため、上側に余白を足して逃がす */}
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-6 pb-2 md:py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white">
              <Network className="h-4 w-4" aria-hidden />
            </span>
            <h1 className="truncate text-[15px] font-semibold tracking-tight text-neutral-900">
              {tree.name}
            </h1>
          </div>
          <SignOutButton />
        </div>

        <nav className="mx-auto max-w-6xl px-2 md:px-3">
          <div className="flex gap-0.5 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 py-2.5',
                  'text-[13px] font-medium transition-colors',
                  'outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/20',
                  activeTab === tab.id
                    ? 'text-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-900'
                )}
              >
                <tab.Icon className="h-4 w-4" aria-hidden />
                {tab.label}
                {/* 選択中のタブを示す下線。文字色だけだと分かりにくいため */}
                <span
                  className={cn(
                    'absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-colors',
                    activeTab === tab.id ? 'bg-neutral-900' : 'bg-transparent'
                  )}
                />
              </button>
            ))}
          </div>
        </nav>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-5 md:py-7">
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
                marriages={tree.marriages}
                parentChildRelations={tree.parentChildRelations}
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

        {/* タブ名が「家系図」なので、この画面には見出しを置かずツールバーから始める */}
        {activeTab === 'view' && (
          <Card padding="none" className="p-3">
            <FamilyTreeView
              treeId={tree.id}
              treeName={tree.name}
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
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <SectionHeading>エクスポート</SectionHeading>
              <p className="mb-4 text-[13px] leading-relaxed text-neutral-500">
                現在の家系図をJSON形式でダウンロードします。写真を含むすべての情報が含まれます。
              </p>
              <Button onClick={handleExport}>
                <Download aria-hidden />
                JSONをダウンロード
              </Button>
            </Card>

            <Card>
              <SectionHeading>インポート</SectionHeading>
              <p className="mb-4 text-[13px] leading-relaxed text-neutral-500">
                このアプリから書き出したJSONを読み込んで復元します。
                <span className="mt-1 block font-medium text-red-600">
                  現在のデータはすべて置き換わります。
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
                disabled={importing}
                onClick={() => importFileInputRef.current?.click()}
              >
                <Upload aria-hidden />
                {importing ? 'インポート中...' : 'JSONを選択'}
              </Button>
              {importError && <Alert className="mt-3">{importError}</Alert>}
            </Card>
          </div>
        )}

        {/* 保存状態。普段は目立たせず、失敗したときだけ操作を促す */}
        <div className="mt-5 flex items-center gap-2" aria-live="polite">
          {syncStatus === 'syncing' && <Alert tone="info">保存中...</Alert>}
          {syncStatus === 'synced' && <Alert tone="success">保存しました</Alert>}
          {syncStatus === 'error' && (
            <>
              <Alert>保存に失敗しました</Alert>
              <Button variant="secondary" size="sm" onClick={retrySync}>
                再試行
              </Button>
            </>
          )}
        </div>
      </main>

      {dialog}
    </div>
  )
}
