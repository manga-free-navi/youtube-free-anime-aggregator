import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "無料 アニメ・映画まとめナビ - アニフリー | YouTube公式無料配信を網羅",
  description: "【毎日自動更新】「無料 アニメ」や「無料映画」情報をまとめてお届け！YouTube公式チャンネルで期間限定公開されているアニメ（TVシリーズ・劇場版）を網羅。その場で動画再生も可能です。",
  keywords: "無料 アニメ, 無料 アニメ おすすめ, アニメ 無料動画, YouTube 無料アニメ, アニメ 一挙配信, 無料映画, 期間限定公開, アニフリー",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = process.env.NEXT_PUBLIC_ANIME_SITE_URL || 'https://manga-free-navi.github.io/youtube-free-anime-aggregator/';

  return (
    <html lang="ja" suppressHydrationWarning={true}>
      <head>
        <link rel="manifest" href="manifest.json" />
        <link rel="apple-touch-icon" href="icon.svg" />
        <meta name="theme-color" content="#ef4444" />
        
        {/* Google Analytics (GA4) */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`} />
            <script dangerouslySetInnerHTML={{__html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
            `}} />
          </>
        )}

        {/* SEO用構造化データ (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "無料 アニメ・映画まとめナビ - アニフリー",
              "url": siteUrl,
              "description": "YouTube公式配信の期間限定無料アニメや映画の情報をリアルタイムで自動集約。",
              "inLanguage": "ja",
              "publisher": {
                "@type": "Organization",
                "name": "アニフリー 運営チーム"
              }
            })
          }}
        />
      </head>


      <body suppressHydrationWarning={true}>
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('sw.js').then(function(reg) {
                console.log('SW registered:', reg.scope);
              }).catch(function(err) {
                console.error('SW registration failed:', err);
              });
            });
          }
        `}} />
        <div className="page-container">
          <div className="background-glow" />
          
          <header className="site-header">
            <div className="header-content">
              <a href="#" className="logo-container">
                <div className="logo-icon">V</div>
                <span className="logo-text">アニフリー</span>
                <span className="logo-badge">Official Free</span>
              </a>

              {/* サイト切り替えタブ */}
              <div className="header-tabs">
                <a href="#" className="header-tab active">
                  <span>📺 無料アニメ</span>
                </a>
                <a 
                  href={process.env.NEXT_PUBLIC_MANGA_SITE_URL || "https://manga-free-navi.github.io/manga-sale-aggregator/"} 
                  className="header-tab"
                  id="tab-to-manga"
                >
                  <span>📚 漫画セール</span>
                </a>
                <a 
                  href={process.env.NEXT_PUBLIC_GAME_SITE_URL || "https://manga-free-navi.github.io/game-sale-aggregator/"} 
                  className="header-tab"
                  id="tab-to-game"
                >
                  <span>🎮 ゲームセール</span>
                </a>
              </div>

              <nav className="nav-links">
                <a href="#" className="nav-link">ホーム</a>
                <a href="#privacy" className="nav-link">プライバシー</a>
              </nav>
            </div>
          </header>

          <main className="main-content">
            {children}
          </main>

          <footer className="site-footer">
            <div className="footer-content">
              <div className="footer-logo">アニフリー - YouTube公式無料アニメ・映画まとめ</div>
              <div className="footer-links">
                <a href="#" className="footer-link">ホーム</a>
                <a href="#privacy" className="footer-link">プライバシーポリシー・免責事項</a>
              </div>
              <p className="copyright">
                © {new Date().getFullYear()} アニフリー. All Rights Reserved. 本サイトは公式配信動画へのリンク・埋め込み機能を提供するまとめサイトであり、各著作物の権利は権利元に帰属します。
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
