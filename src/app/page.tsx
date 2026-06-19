'use client';

import dynamic from 'next/dynamic';

// ハイドレーションミスマッチ（React #418）を構造的に防止するため、メインアプリをSSR無効で動的ロード
const MainApp = dynamic(() => import('../components/MainApp'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '70vh',
        color: '#f8fafc',
        backgroundColor: '#0b0f19',
        fontSize: '1.2rem',
        fontWeight: 600
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '3.5rem',
          height: '3.5rem',
          background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          color: '#0b0f19',
          fontSize: '1.5rem',
          boxShadow: '0 0 15px rgba(0, 242, 254, 0.35)'
        }}>V</div>
        <span>公式アニメ情報をロード中...</span>
      </div>
    </div>
  ),
});

export default function Home() {
  return <MainApp />;
}
