'use client';

import { useEffect } from 'react';

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
  // モーダル展開時に背後の親画面スクロールを制御
  useEffect(() => {
    if (video) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [video]);

  if (!video) return null;

  // 外側（背景）をクリックした時に閉じる
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const embedUrl = video.playlistId 
    ? `https://www.youtube.com/embed?listType=playlist&list=${video.playlistId}&autoplay=1&rel=0`
    : `https://www.youtube.com/embed/${video.id}?autoplay=1&rel=0`;

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} id="video-modal-overlay">
      <div className="modal-content">
        <button 
          className="modal-close" 
          onClick={onClose} 
          aria-label="モーダルを閉じる" 
          id="btn-close-modal"
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
      </div>
    </div>
  );
}
