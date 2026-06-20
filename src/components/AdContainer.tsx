'use client';

import { useEffect, useState } from 'react';

interface AdContainerProps {
  slot: string; // 広告枠のスロットID
  format?: string;
  responsive?: string;
}

// アドブロック検知結果のキャッシュ用変数（モジュールレベル）
let isAdBlockDetectedCached: boolean | null = null;

export default function AdContainer({ slot, format = 'auto', responsive = 'true' }: AdContainerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [isAdBlocked, setIsAdBlocked] = useState(false);
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '';

  useEffect(() => {
    setIsMounted(true);
    
    // アドブロック検知ロジック
    const checkAdBlock = () => {
      if (isAdBlockDetectedCached !== null) {
        setIsAdBlocked(isAdBlockDetectedCached);
        return;
      }

      // ダミー要素をDOMに配置してスタイルの非表示化をチェック
      const dummy = document.createElement('div');
      dummy.id = 'ad-placement-zone';
      dummy.className = 'adsbygoogle adsbox ad-placement ad-content advertisement';
      
      // positionと座標のみ設定し、displayやsizeのインラインスタイルは指定しない（アドブロッカーの display: none !important を有効化）
      dummy.style.position = 'absolute';
      dummy.style.left = '-9999px';
      dummy.style.top = '-9999px';
      dummy.style.width = '10px';
      dummy.style.height = '10px';
      
      document.body.appendChild(dummy);

      // 反応時間を300msに延長し、アドブロッカーによるスタイル適用時間を確保
      window.setTimeout(() => {
        try {
          const styles = window.getComputedStyle(dummy);
          const isBlocked = styles.display === 'none' || 
                            styles.visibility === 'hidden' || 
                            dummy.offsetHeight === 0;
          
          if (dummy.parentNode) {
            dummy.parentNode.removeChild(dummy);
          }
          
          isAdBlockDetectedCached = isBlocked;
          setIsAdBlocked(isBlocked);
        } catch (e) {
          isAdBlockDetectedCached = true;
          setIsAdBlocked(true);
        }
      }, 300);
    };

    checkAdBlock();
  }, []);

  useEffect(() => {
    // アドブロック有効時はAdSenseの読み込みをスキップ
    if (isAdBlocked) return;
    
    // AdSense IDが未設定、またはダミーの場合は何もしない
    if (!adsenseClient || adsenseClient === 'ca-pub-XXXXXXXXXXXXXXXX') {
      return;
    }
    
    // AdSenseの本体スクリプトがすでに読み込まれているかチェックし、なければ動的に挿入
    const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
    if (!existingScript) {
      const newScript = document.createElement('script');
      newScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`;
      newScript.async = true;
      newScript.crossOrigin = 'anonymous';
      document.head.appendChild(newScript);
    }

    // 広告描画の実行
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch (e) {
      // ローカル開発環境などでのロードエラーをキャッチ
      console.debug('AdSense load bypass in dev mode:', e);
    }
  }, [adsenseClient, isAdBlocked]);

  const isDummyClient = !adsenseClient || adsenseClient === 'ca-pub-XXXXXXXXXXXXXXXX';

  // マウント前は静的なコンテナ枠のみを描画（ハイドレーションミスマッチ対策）
  if (!isMounted) {
    return (
      <div className="ad-container-outer" id={`ad-container-${slot}`}>
        <div className="ad-placeholder">
          <span className="ad-label">スポンサー広告 / PR</span>
          <div style={{ height: '100px', width: '100%' }} />
        </div>
      </div>
    );
  }

  // アドブロックが検知された場合の代替表示（プレミアム回遊バナー）
  if (isAdBlocked) {
    return (
      <div className="promo-banner-card" id={`promo-banner-${slot}`}>
        <div className="promo-banner-glow" />
        <div className="promo-banner-inner">
          <div className="promo-header">
            <span className="promo-badge">RECOMMEND</span>
            <h3 className="promo-title">姉妹サイトも毎日更新中！</h3>
          </div>
          <p className="promo-desc">
            広告ブロッカーをご利用中の皆様へ。当サイトの姉妹サイト「漫画セール」と「ゲームセール」情報ナビも、ぜひ合わせてお楽しみください！
          </p>
          <div className="promo-actions">
            <a
              href="https://manga-free-navi.github.io/manga-sale-aggregator/"
              className="promo-btn manga-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="btn-icon">📚</span>
              <span className="btn-text">漫画セールナビ</span>
            </a>
            <a
              href="https://manga-free-navi.github.io/game-sale-aggregator/"
              className="promo-btn game-btn"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="btn-icon">🎮</span>
              <span className="btn-text">ゲームセールナビ</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // 通常表示（アドブロック無効時）
  return (
    <div className="ad-container-outer" id={`ad-container-${slot}`}>
      <div className="ad-placeholder">
        <span className="ad-label">スポンサー広告 / PR</span>
        {isDummyClient ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '15px 0', minHeight: '100px' }}>
            {/* バリューコマース アフィリエイトバナー広告 */}
            <a
              href="https://ck.jp.ap.valuecommerce.com/servlet/referral?sid=3773863&pid=892640994"
              rel="nofollow"
              target="_blank"
              style={{ display: 'block', maxWidth: '100%', overflow: 'hidden' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://ad.jp.ap.valuecommerce.com/servlet/gifbanner?sid=3773863&pid=892640994"
                alt="Sponsor Ad"
                onError={() => {
                  // 万が一DOM検知をすり抜けてブロックされた場合、エラー発生時に検知して自己修復（回遊バナーへ切り替え）
                  console.log('Ad-block detected via image load failure. Switching to promo banner.');
                  isAdBlockDetectedCached = true;
                  setIsAdBlocked(true);
                }}
                style={{ display: 'block', margin: '0 auto', maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
              />
            </a>
          </div>
        ) : (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', minHeight: '90px' }}
            data-ad-client={adsenseClient}
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive={responsive}
          />
        )}
      </div>
    </div>
  );
}
