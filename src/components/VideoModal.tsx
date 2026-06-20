'use client';

import { useEffect, useState } from 'react';

interface Video {
  id: string;
  title: string;
  channelName: string;
  description: string;
  playlistId?: string;
}

interface VideoModalProps {
  video: Video | null;
  onClose: () => void;
}

export default function VideoModal({ video, onClose }: VideoModalProps) {
  const [modalMode, setModalMode] = useState<'normal' | 'cinema' | 'mini'>('normal');

  // モーダル展開時に背後の親画面スクロールを制御 (ミニプレイヤー時はスクロール可能にする)
  useEffect(() => {
    if (video && modalMode !== 'mini') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [video, modalMode]);

  if (!video) return null;

  // 外側（背景）をクリックした時に閉じる
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && modalMode !== 'mini') {
      onClose();
    }
  };

  const embedUrl = video.playlistId 
    ? `https://www.youtube.com/embed?listType=playlist&list=${video.playlistId}&autoplay=1&rel=0`
    : `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`;

  // モードに応じたオーバーレイの動的スタイル
  const overlayStyle: React.CSSProperties = modalMode === 'mini' ? {
    position: 'fixed',
    bottom: 0,
    right: 0,
    width: '0px',
    height: '0px',
    background: 'transparent',
    pointerEvents: 'none',
    zIndex: 9999
  } : modalMode === 'cinema' ? {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: '#000000',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    transition: 'background 0.3s'
  } : {};

  // モードに応じたコンテンツエリアの動的スタイル
  const contentStyle: React.CSSProperties = modalMode === 'mini' ? {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '360px',
    maxWidth: '360px',
    background: 'rgba(15, 23, 42, 0.95)',
    border: '2px solid var(--accent-cyan, #00f2fe)',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0, 242, 254, 0.3)',
    padding: '8px',
    zIndex: 9999,
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  } : modalMode === 'cinema' ? {
    width: '95vw',
    maxWidth: '1200px',
    background: '#0a0a0a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  } : {};

  return (
    <div 
      className={`modal-overlay ${modalMode}`} 
      onClick={handleOverlayClick} 
      id="video-modal-overlay"
      style={overlayStyle}
    >
      <div className="modal-content" style={contentStyle}>
        {/* 操作ボタン類 */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          position: 'absolute',
          top: modalMode === 'mini' ? '12px' : '1.2rem',
          right: modalMode === 'mini' ? '40px' : '3.5rem',
          zIndex: 10
        }}>
          <button 
            onClick={() => setModalMode(modalMode === 'cinema' ? 'normal' : 'cinema')}
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              padding: '3px 6px',
              fontSize: '0.7rem',
              cursor: 'pointer',
              fontWeight: 700,
              transition: 'all 0.2s'
            }}
            title="シネマモード切替"
          >
            {modalMode === 'cinema' ? '🎬 通常' : '🎬 シネマ'}
          </button>
          <button 
            onClick={() => setModalMode(modalMode === 'mini' ? 'normal' : 'mini')}
            style={{
              background: 'rgba(0, 0, 0, 0.6)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              padding: '3px 6px',
              fontSize: '0.7rem',
              cursor: 'pointer',
              fontWeight: 700,
              transition: 'all 0.2s'
            }}
            title="ミニプレイヤー切替"
          >
            {modalMode === 'mini' ? '📱 通常' : '📱 ミニ'}
          </button>
        </div>

        <button 
          className="modal-close" 
          onClick={onClose} 
          aria-label="モーダルを閉じる" 
          id="btn-close-modal"
          style={modalMode === 'mini' ? {
            top: '8px',
            right: '8px',
            width: '24px',
            height: '24px',
            fontSize: '0.8rem'
          } : {}}
        >
          ✕
        </button>
        
        <div className="video-wrapper">
          <iframe
            src={embedUrl}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
        
        {modalMode !== 'mini' && (
          <div className="modal-info">
            <div className="modal-info-channel">{video.channelName}</div>
            <h3 className="modal-info-title">{video.title}</h3>
            {video.description && (
              <div className="modal-info-desc">
                {video.description.split('\n').map((line, idx) => (
                  <p key={idx} style={{ marginBottom: '0.4rem' }}>
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
