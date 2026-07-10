'use client'

import { useState } from 'react'
import { useFamilyTree } from '@/hooks/useFamilyTree'
import { exportToJSON, downloadJSON } from '@/utils/jsonExport'
import MemberForm from './MemberForm'
import MemberList from './MemberList'
import RelationshipManager from './RelationshipManager'
import FamilyTreeView from './FamilyTreeView'
import SignOutButton from './SignOutButton'
import CollaboratorsPanel from './CollaboratorsPanel'

export default function FamilyTreeApp() {
  const {
    tree,
    loading,
    syncStatus,
    addMember,
    updateMember,
    deleteMember,
    addMarriage,
    removeMarriage,
    addParentChild,
    removeParentChild,
  } = useFamilyTree()
  const [activeTab, setActiveTab] = useState<
    'members' | 'relations' | 'view' | 'share' | 'export'
  >('members')

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-gray-900">{tree.name}</h1>
            <p className="text-xs md:text-base text-gray-600 mt-1">あなたの家系図を整理します</p>
          </div>
          <SignOutButton />
        </div>
      </header>

      {/* ナビゲーション */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-3 md:px-4 flex gap-2 md:gap-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-2 md:px-4 py-2 md:py-3 text-sm md:text-base font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'members'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-700 hover:text-gray-900'
            }`}
          >
            👥 メンバー
          </button>
          <button
            onClick={() => setActiveTab('relations')}
            className={`px-2 md:px-4 py-2 md:py-3 text-sm md:text-base font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'relations'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-700 hover:text-gray-900'
            }`}
          >
            🔗 関係
          </button>
          <button
            onClick={() => setActiveTab('view')}
            className={`px-2 md:px-4 py-2 md:py-3 text-sm md:text-base font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'view'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-700 hover:text-gray-900'
            }`}
          >
            🌳 家系図表示
          </button>
          <button
            onClick={() => setActiveTab('share')}
            className={`px-2 md:px-4 py-2 md:py-3 text-sm md:text-base font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'share'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-700 hover:text-gray-900'
            }`}
          >
            🤝 共有
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-2 md:px-4 py-2 md:py-3 text-sm md:text-base font-medium border-b-2 transition whitespace-nowrap ${
              activeTab === 'export'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-700 hover:text-gray-900'
            }`}
          >
            📥 エクスポート
          </button>
        </div>
      </nav>

      {/* コンテンツ */}
      <main className="max-w-6xl mx-auto px-3 md:px-4 py-4 md:py-8">
        {activeTab === 'members' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
            <div>
              <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
                新しいメンバーを追加
              </h2>
              <MemberForm onSubmit={addMember} />
            </div>
            <div>
              <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
                メンバー一覧（{tree.members.length}人）
              </h2>
              <MemberList
                members={tree.members}
                onUpdate={updateMember}
                onDelete={deleteMember}
              />
            </div>
          </div>
        )}

        {activeTab === 'relations' && (
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
              家族関係の設定
            </h2>
            <RelationshipManager
              members={tree.members}
              marriages={tree.marriages}
              parentChildRelations={tree.parentChildRelations}
              onAddMarriage={addMarriage}
              onRemoveMarriage={removeMarriage}
              onAddParentChild={addParentChild}
              onRemoveParentChild={removeParentChild}
            />
          </div>
        )}

        {activeTab === 'view' && (
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
              家系図表示
            </h2>
            <FamilyTreeView
              members={tree.members}
              marriages={tree.marriages}
              parentChildRelations={tree.parentChildRelations}
            />
          </div>
        )}

        {activeTab === 'share' && (
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
              家系図を共有
            </h2>
            <CollaboratorsPanel treeId={tree.id} />
          </div>
        )}

        {activeTab === 'export' && (
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-3 md:mb-4">
              データをエクスポート
            </h2>
            <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
              現在の家系図をJSON形式でダウンロードできます。
            </p>
            <button
              onClick={handleExport}
              className="bg-indigo-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-indigo-700 transition text-sm md:text-base"
            >
              📥 JSONをダウンロード
            </button>
          </div>
        )}

        {/* 同期ステータス */}
        <div className="mt-4 md:mt-8 flex items-center gap-2">
          {syncStatus === 'syncing' && (
            <span className="text-xs md:text-sm text-gray-500">同期中...</span>
          )}
          {syncStatus === 'synced' && (
            <span className="text-xs md:text-sm text-green-600">✓ 同期済み</span>
          )}
          {syncStatus === 'error' && (
            <span className="text-xs md:text-sm text-red-600">
              ⚠ 同期に失敗しました。もう一度お試しください
            </span>
          )}
        </div>
      </main>
    </div>
  )
}
