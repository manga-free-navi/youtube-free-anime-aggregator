'use client';

import { useEffect, useState } from 'react';

interface AdContainerProps {
  slot: string; // 広告枠のスロットID
  format?: string;
  responsive?: string;
}

export default function AdContainer({ slot, format = 'auto', responsive = 'true' }: AdContainerProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // 環境変数またはダミーのアドセンスID
    const adClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-55071401125a7966';
    
    // AdSenseの本体スクリプトがすでに読み込まれているかチェックし、なければ動的に挿入
    const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
    if (!existingScript) {
      const newScript = document.createElement('script');
      newScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClientId}`;
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
  }, []);

  return (
    <div className="ad-container-outer" id={`ad-container-${slot}`}>
      <div className="ad-placeholder">
        <span className="ad-label">スポンサー広告</span>
        {isMounted ? (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', minHeight: '90px' }}
            data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-55071401125a7966'}
            data-ad-slot={slot}
            data-ad-format={format}
            data-full-width-responsive={responsive}
          />
        ) : (
          <div style={{ height: '90px', width: '100%' }} />
        )}
      </div>
    </div>
  );
}
