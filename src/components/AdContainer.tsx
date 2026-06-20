'use client';

import { useEffect, useState } from 'react';

interface AdContainerProps {
  slot: string; // 広告枠のスロットID
  format?: string;
  responsive?: string;
}

export default function AdContainer({ slot, format = 'auto', responsive = 'true' }: AdContainerProps) {
  const [isMounted, setIsMounted] = useState(false);
  const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || '';

  useEffect(() => {
    setIsMounted(true);
    
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
  }, [adsenseClient]);

  const isDummyClient = !adsenseClient || adsenseClient === 'ca-pub-XXXXXXXXXXXXXXXX';

  return (
    <div className="ad-container-outer" id={`ad-container-${slot}`}>
      <div className="ad-placeholder">
        <span className="ad-label">スポンサー広告 / PR</span>
        {!isMounted ? (
          <div style={{ height: '100px', width: '100%' }} />
        ) : isDummyClient ? (
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

