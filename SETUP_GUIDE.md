# 📺 アニフリー 運営・管理用セットアップガイド

本プロジェクト（YouTube公式無料アニメ・映画まとめ - アニフリー）を本番環境でリリース・公開し、自動運転を開始するまでに必要な管理者向け設定手順書です。

---

## 🛠️ 1. GitHub Actions (自動運転) の本番設定

GitHub Pages や外部サーバーにサイトを毎日自動デプロイし、最新の無料アニメ配信情報を更新し続けるには、GitHub リポジトリ上で環境変数（Secrets / Variables）を登録する必要があります。

### 設定方法
1. GitHub上のアニフリー用リポジトリページを開きます。
2. **Settings** (設定) > **Secrets and variables** > **Actions** の順に移動します。
3. 以下の環境変数を用途に応じて追加してください。

### 🔑 登録が必要な環境変数一覧

| 区分 | 変数名 | 種別 | 説明 |
| :--- | :--- | :---: | :--- |
| **データ自動収集** | `YOUTUBE_API_KEY` | **Secret** | YouTube Data API v3 のキー。YouTube公式チャンネルから最新の無料アニメ・一挙配信動画データを毎日自動収集するために**必須**です。 |
| | `NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID` | **Secret** | 楽天アフィリエイトID（任意）。アニメの続きの推奨原作コミックスなどのアフィリエイトリンク生成に使用されます。 |
| **アクセス解析** | `NEXT_PUBLIC_GA_MEASUREMENT_ID` | **Variable** | Google Analytics (GA4) の測定ID (例: `G-XXXXXXXXXX`)。設定すると自動で測定が始まります。 |
| **広告・収益化** | `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | **Variable** | Google AdSense のクライアントID (例: `ca-pub-XXXXXXXXXXXXXXXX`)。広告配信タグが有効になります。 |
| **3サイト相互回遊** | `NEXT_PUBLIC_MANGA_SITE_URL` | **Variable** | 姉妹サイト「漫画セールナビ」の公開URL。 |
| | `NEXT_PUBLIC_ANIME_SITE_URL` | **Variable** | 本サイト（アニフリー）の公開URL。 |
| | `NEXT_PUBLIC_GAME_SITE_URL` | **Variable** | 姉妹サイト「ゲームナビ」の公開URL。 |

---

## 📈 2. Google Analytics (GA4) ＆ Search Console の設定

### Google Analytics 4 (GA4)
1. [Google アナリティクス](https://analytics.google.com/)にて、プロパティ（ウェブ）を作成します。
2. 発行される **「測定ID (G-XXXXXXXXXX)」** をコピーします。
3. 上記の通り、GitHub リポジトリの **Variables** タブに `NEXT_PUBLIC_GA_MEASUREMENT_ID` という名前で登録してください。

### Google Search Console (サチコ)
1. [Google Search Console](https://search.google.com/search-console/)にサイトのURLを登録し、所有権の確認のために「HTMLタグ」を選択します。
2. コピーしたメタタグ（例: `<meta name="google-site-verification" content="..." />`）を `src/app/layout.tsx` の `<head>` 内に追記してプッシュしてください。

---

## 💰 3. Google AdSense (広告収益化)

*   **プライバシーポリシー・免責事項の設置済み**: フッターのリンクから閲覧できる簡易プライバシーポリシーセクション ([MainApp.tsx](file:///C:/Users/MASAYUKI/.gemini/antigravity/scratch/youtube-free-anime-aggregator/src/components/MainApp.tsx)) に、アドセンスやCookieに関する免責表記があらかじめ設置されています。
*   **アフィリエイト広告への自動切替**: AdSenseIDが未設定の間は、自動的にバリューコマースのアフィリエイトバナーがプレースホルダーとして表示され、即座に収益化が可能です。合格後に `NEXT_PUBLIC_ADSENSE_CLIENT_ID` を登録すると、自動的にGoogle AdSense広告に切り替わります。

---

## 🎨 4. サイトアイコン・favicon の本番用への差し替え

本番公開にあたっては、以下のファイルをオリジナルデザインの画像に上書きしてください。

*   **favicon**: [public/favicon.ico](file:///C:/Users/MASAYUKI/.gemini/antigravity/scratch/youtube-free-anime-aggregator/public/favicon.ico) (ブラウザのタブ用アイコン)
*   **PWAアイコン**: [public/icon.svg](file:///C:/Users/MASAYUKI/.gemini/antigravity/scratch/youtube-free-anime-aggregator/public/icon.svg) (ホーム画面追加時用のアイコン)

---

## 🔄 5. サイトの動作確認（ローカル環境）

```bash
# 1. 依存関係のインストール
npm install

# 2. ローカルテストデータの収集
node src/scraper/run-scraper.js

# 3. 本番用ビルドの検証
npm run build

# 4. ローカル検証サーバーの起動
npm run dev
```
