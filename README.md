# Family Tree App

家系図を写真付きで整理できるWebアプリケーションです。

## 特徴

- ✨ **ブラウザベースの軽量設計** - DBやサーバー不要
- 📸 **写真付きメンバー管理** - 各人物の写真を登録可能
- 📋 **家系図の構築** - 親子関係、配偶者関係を管理
- 💾 **ローカル保存** - IndexedDB を使用したブラウザ内保存
- 📥 **JSON エクスポート** - 家系図データを JSON 形式でダウンロード可能

## 技術スタック

- **フロントエンド**: Next.js 14+ (App Router) + React 18+
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **ストレージ**: IndexedDB（ブラウザネイティブ）
- **ビルドツール**: Vite (Next.js built-in)

## セットアップ

```bash
# 依存パッケージをインストール
npm install

# 開発サーバーを起動
npm run dev

# ブラウザで http://localhost:3000 を開く
```

## 開発

```bash
# 型チェック
npm run type-check

# ビルド
npm run build

# 本番サーバー起動
npm start

# ESLint
npm run lint
```

## プロジェクト構成

```
family-tree-app/
├── app/                    # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── src/
│   ├── components/         # React コンポーネント
│   │   ├── FamilyTreeApp.tsx
│   │   ├── MemberForm.tsx
│   │   └── MemberList.tsx
│   ├── hooks/              # カスタムフック
│   │   ├── useIndexedDB.ts
│   │   └── useFamilyTree.ts
│   ├── utils/              # ユーティリティ関数
│   │   └── jsonExport.ts
│   └── types/              # TypeScript 型定義
│       └── index.ts
├── public/                 # 静的資産
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 主な機能

### Phase 1（完了予定）
- ✅ メンバーの追加・編集・削除
- ✅ 写真のアップロード
- ✅ ローカルストレージ（IndexedDB）
- ✅ JSON エクスポート

### Phase 2（開発予定）
- 親子関係、配偶者関係の定義
- 家系図の可視化（SVG/Canvas）

### Phase 3（今後）
- JSON インポート
- 家系図の印刷機能
- 複数の家系図管理

## 使い方

1. **メンバーを追加**：「メンバー」タブで名前、生年月日、写真を入力して追加
2. **家系図を構築**：メンバー間の関係性を定義
3. **保存**：「💾 保存」ボタンでブラウザに保存
4. **エクスポート**：「📥 エクスポート」タブで JSON をダウンロード

## データ形式

エクスポートされる JSON は以下の構造を持ちます：

```json
{
  "version": "1.0.0",
  "exportedAt": "2024-01-01T00:00:00Z",
  "tree": {
    "id": "xxx",
    "name": "我が家の家系図",
    "members": [],
    "marriages": [],
    "parentChildRelations": [],
    "createdAt": 1234567890,
    "updatedAt": 1234567890
  }
}
```

## ブラウザ対応

- Chrome/Edge: 対応
- Firefox: 対応
- Safari: 対応（IndexedDB サポート必須）

## ライセンス

MIT

## 今後の改善予定

- [ ] 複数の家系図を同時管理
- [ ] 家系図を SVG で可視化
- [ ] ドラッグ&ドロップで関係性を定義
- [ ] 画像の自動圧縮
- [ ] 暗号化による保護
