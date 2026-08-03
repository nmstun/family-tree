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
- 🌳 **家系図の可視化** - SVGによる家系図の描画・拡大縮小。縦表示/横表示の切り替えに対応し、スマホなど画面が狭い場合でも見やすい。画面表示の縮尺によらず高解像度のPNG画像としてクリップボードにコピー可能（LINEやメールへの貼り付け向け）
- 🎨 **長い線の色分け** - 家系図が横に広がると、親から遠く離れた子へ伸びる線が図の大半を横切り、途中で何本もの線と交差して目で追えなくなる（実データでは最長の線が図の幅の65%を走っていた）。そういう長い線にだけ色を付け、短い線はグレーのままにしてある。色は5色で、近くにある線同士が同じ色にならないよう割り当てる（同じ色＝同じ家系という意味は持たない。あくまで線を追うための目印）。同じ親から伸びる兄弟の線は縦棒・横棒を共有するため、まとまりごとに1色
- 🗺️ **全体像の把握** - 人数が増えても全体を見失わないよう、「全体を表示」で家系図全体が1画面に収まるまで縮小できる。あわせて右上に常時ミニマップ（全体図）を表示し、いま見ている範囲を枠で示す。ミニマップ上をクリック／ドラッグするとその位置へ移動できる
- 📄 **PDFで保存** - 「PDFで保存」ボタンでPDFファイルを直接作成してダウンロードする。スマホ（とくにiOS）は印刷ダイアログからファイルとして保存しづらいため、PCでもスマホでも同じ手順で保存できるようにしている
- 🖨️ **印刷** - PCではブラウザの印刷ダイアログからも出力できる（「印刷」ボタン。スマホでは非表示）
- いずれもA4縦で、家系図を用紙の幅いっぱいに拡大したうえでページを分割する。家系図は縦横比が極端になりやすく（実データで約3.3:1）、1枚に収めるとA4（約1.4:1）との差がそのまま余白になるため。ページの境目でカードが分断されないよう、隣のページと1枚ぶん重ねてある。家系図以外の画面要素と折りたたみボタンは出力されない
- ⭐ **「自分」の設定** - ログインユーザーごとに家系図上の1人を「自分」として設定可能。家系図表示で自分のノードが強調表示され、開いたときに自動でその位置までスクロールする（大きな家系図でも迷子にならない）
- ➖ **家系図の折りたたみ** - 家系図が大きくなりすぎたとき、任意のメンバーをクリックしてその子孫グループ（子・孫とその配偶者）を折りたたんで非表示にできる。折りたたみ状態は自分のブラウザにのみ保存され、他の共同編集者の表示には影響しない
- 📥 **JSON エクスポート / インポート** - 家系図データ（写真含む全情報）を JSON 形式でダウンロード可能。エクスポートした JSON を読み込んで家系図を完全に復元することも可能（既存データは上書きされるため確認ダイアログあり）。インポートは既存メンバーを全削除してから挿入するため、削除の前に構造（3つの配列が揃っているか、関係が実在するメンバーを指しているか）を検証し、不正なファイルでは何も消さずにエラーを出す

## アプリアイコン

タブや iOS のホーム画面に表示されるアイコンは、**アプリのロゴと同じ図柄**にしてある。ロゴはログイン画面とヘッダーの黒い角丸四角（`bg-neutral-900`）に lucide-react の `Network` を白で置いたもので、アイコン側もそれを 24px グリッドから 64px へ写して描き起こしている。線幅だけは lucide 既定の2倍相当（4.0）ではなく 4.5 にしてある（16px 表示では 4.0 だと 1px を割って線が薄れるため）。

タブバーの「家系図」タブも同じ `Network` を使っているが、あちらは メンバー/関係/共有/データ と並ぶ lucide アイコンの1つなので、揃えるのはロゴ2箇所とアイコンだけでよい。

実体は `app/icon.svg` の1ファイルで、他はすべてそこから書き出している。図形の変更は SVG 側だけを直し、以下で残りを作り直す。**ロゴを変えたときはこのアイコンも合わせて作り直すこと**（別々に育つと今回のように食い違う）。

```sh
rsvg-convert -w 180 -h 180 app/icon.svg -o app/apple-icon.png
rsvg-convert -w 192 -h 192 app/icon.svg -o public/icon-192.png
rsvg-convert -w 512 -h 512 app/icon.svg -o public/icon-512.png
node scripts/make-favicon-ico.mjs app/icon.svg app/favicon.ico
```

`app/favicon.ico` を SVG と併せて置いているのは **Safari が `rel="icon"` の SVG を使わない**ため。SVG だけだと Safari のタブが空になる。Next.js は `favicon.ico` と `icon.svg` の両方を `link` タグとして出力するので、Safari は ico を、Chrome は SVG を使う。

ico の作り方には制約が2つあり、[`scripts/make-favicon-ico.mjs`](./scripts/make-favicon-ico.mjs) がそれを吸収している。ico の中身は BMP ではなく PNG をそのまま詰めており、その PNG は **RGBA でなければならない**（`rsvg-convert` は全ピクセルが不透明だと RGB で書き出すが、Next.js の ICO デコーダーは RGBA を要求し、RGB のままだとビルドが 500 になる）。

`app/manifest.ts` がホーム画面追加時の名称とアイコンを定義する（Next.js が `/manifest.webmanifest` として配信し、`link` タグも自動で挿入する）。未ログインの `/login` 画面からもホーム画面に追加できるよう、`middleware.ts` の `matcher` で `manifest.webmanifest` を認証リダイレクトの対象外にしている。

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + React 18
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS（ボタン・入力欄・カードなどの見た目は `src/components/ui/` の共通部品に集約）
- **アイコン**: lucide-react（線画で統一。以前は絵文字を使っていたが、環境による字形の差が大きく見た目も揃わないため置き換えた）
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

# テスト（過去に起きた不具合を条件として固定した回帰テスト）
npm test
# ├ treeLayout      … 兄弟をつなぐ線の重なり・世代の間隔などの表示崩れ、長い線の色分け
# ├ treeSelection   … 通信エラー時に空の家系図を作ってしまわないこと
# ├ treeExport      … 印刷・PDFの分割（余白・ページ境目でのカード切れ）
# ├ age             … 年齢・享年・学年（時刻を固定して判定）
# ├ datePrecision   … 生没年の精度と入力欄の往復変換
# ├ familyTreeValidation … 親子関係の循環検出
# ├ jsonExport      … インポート時の検証（壊れたJSONで家系図を消さないこと）
# └ memberName      … 氏名・頭文字・並べ替え

# ビルド
npm run build

# 本番サーバー起動
npm start

# ESLint
npm run lint
```

## 依存関係の更新

Renovate（`renovate.json`）により、依存パッケージの更新PRが週次で自動作成されます（実際に動かすにはGitHub Appとして[Renovate](https://github.com/apps/renovate)を本リポジトリにインストールしてください）。lockfile（`package-lock.json`）によりインストールされるバージョンは常に固定されているため、PRを確認してからマージする運用です。

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
│   │   ├── ui/                   # 共通UI部品（Button/Card/Field/Alert/Modal/確認ダイアログ）
│   │   ├── FamilyTreeApp.tsx     # アプリ全体のレイアウト・タブ切り替え
│   │   ├── MemberForm.tsx        # メンバーの追加・編集フォーム
│   │   ├── MemberList.tsx        # メンバー一覧・編集・削除
│   │   ├── RelationshipManager.tsx # 配偶者・親子関係の追加・編集・削除
│   │   ├── FamilyTreeView.tsx    # 家系図のSVG可視化
│   │   ├── CollaboratorsPanel.tsx # 共同編集者の招待・一覧・削除
│   │   └── SignOutButton.tsx
│   ├── hooks/
│   │   ├── useFamilyTree.ts      # 家系図データのCRUD・Realtime購読
│   │   ├── useCollapsibleTree.ts # 枝の折りたたみ状態と表示対象の絞り込み
│   │   └── useTreeCollaborators.ts # 共同編集者の一覧取得・招待・削除
│   ├── lib/supabase/             # Supabaseクライアント（ブラウザ/サーバー/管理者用）
│   ├── utils/
│   │   ├── age.ts                # 年齢・享年・学年の計算
│   │   ├── datePrecision.ts      # 生没年の精度（年/年月/年月日）と入力欄の変換
│   │   ├── familyTreeValidation.ts # 親子関係の循環チェック
│   │   ├── memberName.ts         # 氏名・頭文字の表示
│   │   ├── sortMembers.ts        # 氏名順の並べ替え
│   │   ├── treeLayout.ts         # 家系図の座標レイアウト計算
│   │   ├── treeExport.ts         # 画像コピー・印刷・PDF書き出し
│   │   ├── treeSelection.ts      # ログイン後にどの家系図を開くかの判断
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
- `family_tree_members` - 家系図ごとの編集権限（`owner` / `editor`）と、そのユーザーが「自分」として設定した `family_members` への参照（`member_id`）
- `family_members` - 人物
- `marriages` - 配偶者関係
- `parent_child_relations` - 親子関係

## 使い方

1. **ログイン**：メールアドレスを入力し、届いたリンクをクリック（初回ログイン時に家系図が自動作成されます）
2. **メンバーを追加・編集**：「メンバー」タブで名前、生年月日、写真などを入力。カードの「編集」ボタンから既存メンバーの情報を変更可能。☆ボタンでそのメンバーを「自分」として設定できる
3. **家系図を構築**：「関係」タブで配偶者関係・親子関係を設定。配偶者関係は結婚日を後から編集可能
4. **共有**：「共有」タブでメールアドレスを指定して共同編集者を招待（オーナーのみ）
5. **家系図を確認**：「家系図表示」タブでSVGとして可視化。「自分」を設定していればそのノードが強調表示され、開いたときに自動でスクロールする。各ノード右下の「－」をクリックすると子孫グループを折りたたんで非表示にできる（もう一度クリックで再表示）
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

- [ ] 複数の家系図の切り替え・管理
