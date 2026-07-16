# Family Tree App

家系図を写真付きで整理できる、複数人でリアルタイム編集できるWebアプリケーションです。

## 特徴

- 🔐 **メールマジックリンク認証** - Supabase Authによるパスワードレスログイン
- 👨‍👩‍👧 **複数人でのリアルタイム共同編集** - 家系図をユーザー間で共有し、変更を即座に同期
- 🤝 **共同編集者の招待** - オーナーがメールアドレス指定で編集権限を付与。未登録のメールアドレスでも招待可能（管理者APIでアカウントを作成し、日本語の招待メールを送信）。招待メールの再送信、ログイン済みかどうかの確認も可能
- 📸 **写真付きメンバー管理** - 各人物の写真を登録・編集・削除可能（登録時・登録済みの写真ともトリミング可）。名前検索付きの一覧で数十人規模でも探しやすい
- 🎂 **年齢・学年の自動計算・表示** - 生年月日/没年月日から現在の年齢・享年、学齢期なら学年（小1〜高3）も算出
- 📅 **日付の精度指定** - 古い世代など生年月日が正確に分からない場合、「年のみ」「年月のみ」でも登録可能（推定年齢として表示）
- 🧧 **お年玉対象フィルタ** - メンバー一覧で22歳以下のメンバーだけを絞り込み表示
- 📋 **家系図の構築** - 親子関係・配偶者関係（結婚日の編集含む）を管理
- 🌳 **家系図の可視化** - SVGによる家系図の描画・拡大縮小。縦表示/横表示の切り替えに対応し、スマホなど画面が狭い場合でも見やすい。画面表示の縮尺によらず高解像度のPNG画像としてクリップボードにコピー可能（LINEやメールへの貼り付け・印刷向け）
- 📥 **JSON エクスポート / インポート** - 家系図データ（写真含む全情報）を JSON 形式でダウンロード可能。エクスポートした JSON を読み込んで家系図を完全に復元することも可能（既存データは上書きされるため確認ダイアログあり）

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + React 18
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **バックエンド**: Supabase（Auth / Postgres / Realtime）
- **ホスティング**: Vercel

## セットアップ

### 1. Supabase プロジェクトの準備

ローカル開発には [Supabase CLI](https://supabase.com/docs/guides/cli) を使用します。

```bash
# ローカルの Supabase を起動（Docker が必要）
supabase start

# マイグレーションを適用（初回・スキーマ変更時）
supabase db reset
```

`supabase start` の出力に表示される `API URL` / `anon key`（`publishable key`）/ `service_role key`（`secret key`）を `.env.local` に設定してください（`.env.local.example` を参照）。`SUPABASE_SERVICE_ROLE_KEY` は未登録メールアドレスへの招待（管理者API）に使用するサーバー専用の秘密情報のため、`NEXT_PUBLIC_` を付けないこと。

### 2. アプリの起動

```bash
# 依存パッケージをインストール
npm install

# 開発サーバーを起動
npm run dev

# ブラウザで http://localhost:3000 を開く
```

ログインはメールマジックリンク方式です。ローカル開発では実際にメールは送信されず、Supabase付属のメールキャッチャー **Mailpit**（`http://127.0.0.1:54324`）で受信内容を確認できます。

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

## デプロイ

- **Vercel**: GitHubリポジトリ連携によりmainブランチへのpushで自動デプロイ
- **Supabase**: `supabase/migrations/` 配下のマイグレーションを本番プロジェクトに適用する必要があります（`supabase db push`、またはSupabaseダッシュボードのGitHub連携）

本番のSupabaseプロジェクトでは、以下の設定も必要です。

- **Authentication → URL Configuration** の `Site URL` / `Redirect URLs` に本番ドメインを登録（未設定だとメールのログインリンクが機能しません）
- 本番運用する場合は **Project Settings → Authentication → SMTP Settings** で独自SMTPを設定（Supabase組み込みメーラーは検証用途でレート制限が厳しいため）
- Vercel側の環境変数に **`SUPABASE_SERVICE_ROLE_KEY`**（Production環境向け）を追加してください。未登録メールアドレスへの招待（管理者API経由でのユーザー作成）に必要です。`NEXT_PUBLIC_` を付けず、サーバー専用の秘密情報として登録すること

## プロジェクト構成

```
family-tree-app/
├── app/                          # Next.js App Router
│   ├── api/invite/route.ts       # 未登録メールアドレスへの招待（管理者API使用）
│   ├── api/invite/resend/route.ts # 招待メールの再送信
│   ├── auth/callback/route.ts    # マジックリンクのコールバック（PKCEコード交換、同一ブラウザ専用）
│   ├── auth/confirm/route.ts     # 招待メールなどのコールバック（token_hash方式、他端末でも可）
│   ├── login/page.tsx            # ログイン画面
│   ├── layout.tsx
│   └── page.tsx
├── middleware.ts                 # 未ログインユーザーのリダイレクト・セッション更新
├── src/
│   ├── components/
│   │   ├── FamilyTreeApp.tsx     # アプリ全体のレイアウト・タブ切り替え
│   │   ├── MemberForm.tsx        # メンバーの追加・編集フォーム
│   │   ├── MemberList.tsx        # メンバー一覧・編集・削除
│   │   ├── RelationshipManager.tsx # 配偶者・親子関係の追加・編集・削除
│   │   ├── FamilyTreeView.tsx    # 家系図のSVG可視化
│   │   ├── CollaboratorsPanel.tsx # 共同編集者の招待・一覧・削除
│   │   └── SignOutButton.tsx
│   ├── hooks/
│   │   ├── useFamilyTree.ts      # 家系図データのCRUD・Realtime購読
│   │   └── useTreeCollaborators.ts # 共同編集者の一覧取得・招待・削除
│   ├── lib/supabase/             # Supabaseクライアント（ブラウザ/サーバー/管理者用）
│   ├── utils/
│   │   ├── age.ts                # 年齢・享年の計算
│   │   ├── familyTreeValidation.ts # 親子関係の循環チェック
│   │   ├── treeLayout.ts         # 家系図の座標レイアウト計算
│   │   └── jsonExport.ts
│   └── types/index.ts
├── supabase/
│   ├── migrations/                # DBスキーマ・RLSポリシー・RPC関数
│   └── templates/invite.html      # 招待メールのテンプレート（日本語）
├── public/
├── package.json
├── tsconfig.json
├── next.config.js
└── tailwind.config.js
```

## データモデル

Supabase（Postgres）上に以下のテーブルがあります。Row Level Security（RLS）により、各家系図（`family_trees`）にアクセスできるのは `family_tree_members` に登録されたユーザーのみです。

- `family_trees` - 家系図本体
- `family_tree_members` - 家系図ごとの編集権限（`owner` / `editor`）
- `family_members` - 人物
- `marriages` - 配偶者関係
- `parent_child_relations` - 親子関係

## 使い方

1. **ログイン**：メールアドレスを入力し、届いたリンクをクリック（初回ログイン時に家系図が自動作成されます）
2. **メンバーを追加・編集**：「メンバー」タブで名前、生年月日、写真などを入力。カードの「編集」ボタンから既存メンバーの情報を変更可能
3. **家系図を構築**：「関係」タブで配偶者関係・親子関係を設定。配偶者関係は結婚日を後から編集可能
4. **共有**：「共有」タブでメールアドレスを指定して共同編集者を招待（オーナーのみ）
5. **家系図を確認**：「家系図表示」タブでSVGとして可視化
6. **エクスポート／インポート**：「エクスポート」タブで JSON をダウンロード、またはエクスポート済みの JSON ファイルを選択して家系図を復元（現在のデータはすべて置き換わります）

## データ形式

エクスポートされる JSON は以下の構造を持ちます。

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

## ライセンス

MIT

## 今後の改善予定

- [ ] 家系図の印刷機能
- [ ] 複数の家系図の切り替え・管理
