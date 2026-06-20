'use client';

import { useRef, useState, useEffect, useMemo } from 'react';

export interface Video {
  id: string;
  title: string;
  channelId: string;
  channelName: string;
  category: string;
  publishedAt: string;
  description: string;
  thumbnailUrl: string;
  originalWorkTitle?: string;
  isManual?: boolean;
  duration?: string;
  endDate?: string | null;
  playlistId?: string; // 再生リスト一挙対応用のプロパティ
  url?: string;
  episodeInfo?: string;
  isBulk?: boolean;
  isLatest?: boolean;
}

interface VideoCardProps {
  video: Video;
  onPlay: (video: Video) => void;
}

export default function VideoCard({ video, onPlay }: VideoCardProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [showReadMore, setShowReadMore] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // あらすじ（説明文）の行はみ出し判定
  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        const hasOverflow = textRef.current.scrollHeight > textRef.current.clientHeight;
        setShowReadMore(hasOverflow || isExpanded);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [video.description, isExpanded]);

  // 日付のフォーマット (YYYY/MM/DD)
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    } catch (e) {
      return dateStr;
    }
  };

  // 配信予定（未来の公開日時）かどうかを判定
  const isUpcoming = useMemo(() => {
    if (!mounted) return false;
    const now = new Date();
    const pubDate = new Date(video.publishedAt);
    return pubDate > now;
  }, [video.publishedAt, mounted]);

  // 配信終了までの残り日数表示の計算
  const remainingDaysText = useMemo(() => {
    if (!video.endDate || !mounted) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(video.endDate);
    end.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return '配信終了';
    } else if (diffDays === 0) {
      return '本日配信終了！';
    } else if (diffDays === 1) {
      return '明日配信終了！';
    } else if (diffDays <= 7) {
      return `あと ${diffDays} 日で終了`;
    }
    return `${formatDate(video.endDate)} まで`;
  }, [video.endDate, mounted]);

  // 終了期限までの残り日数を数値で取得
  const diffDaysVal = useMemo(() => {
    if (!video.endDate || !mounted) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(video.endDate); end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [video.endDate, mounted]);

  // コピー処理
  const handleCopyUrl = () => {
    const url = video.url || `https://www.youtube.com/watch?v=${video.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy URL:', err);
    });
  };

  // Xシェア
  const handleShareX = () => {
    const url = video.url || `https://www.youtube.com/watch?v=${video.id}`;
    const text = video.url
      ? `【公式無料アニメ】『${video.title}』が期間限定無料配信中！\n終了期限：${remainingDaysText || 'お早めに'}\nいますぐ視聴：`
      : `【公式無料アニメ】『${video.title}』がYouTubeで期間限定公開中！\n終了期限：${remainingDaysText || 'お早めに'}\nいますぐ視聴：`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  // アニメの話数から続きの原作コミックス巻数を自動で推奨するロジック
  const originalWorkGuide = useMemo(() => {
    if (!video.originalWorkTitle) return null;

    // タイトルから「第X話」や「#X」などを抽出
    const epMatch = video.title.match(/(?:第|#|#\s*)(\d+)[\s話]?/);
    if (!epMatch) return null;

    const epNum = parseInt(epMatch[1], 10);
    const title = video.originalWorkTitle;

    // 主要タイトル固有の消化ペースに基づく推定
    if (title === '葬送のフリーレン') {
      if (epNum <= 4) return 'コミックス1巻 (旅立ち)';
      if (epNum <= 12) return 'コミックス2巻〜3巻付近';
      if (epNum <= 28) return 'コミックス4巻〜8巻付近';
      return 'コミックス8巻〜 (一級魔法使い試験編以降)';
    } else if (title === 'キャプテン翼') {
      // 平均して1話あたり0.6〜0.8巻分
      const estVol = Math.max(1, Math.ceil(epNum * 0.7));
      return `コミックス${estVol}巻付近 (小学生編〜中学生編)`;
    } else if (title === '呪術廻戦') {
      // 1期(24話)で約8巻(起首雷同編まで)
      const estVol = Math.max(1, Math.ceil(epNum * 0.35));
      return `コミックス${estVol}巻付近`;
    } else if (title === 'ブルーロック') {
      // 1期(24話)で約11巻
      const estVol = Math.max(1, Math.ceil(epNum * 0.45));
      return `コミックス${estVol}巻付近`;
    }

    // 汎用推奨：アニメ1話 ＝ コミックス0.4巻換算
    const estVol = Math.max(1, Math.ceil(epNum * 0.4));
    return `コミックス${estVol}巻付近`;
  }, [video.title, video.originalWorkTitle]);

  // 楽天ブックス原作コミックス検索アフィリエイトURLの生成
  const getRakutenUrl = (title: string, originalWorkTitle?: string) => {
    const affiliateId = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID || '55071401.125a7966.55071402.d568cde0';
    let keyword = originalWorkTitle || '';
    
    if (!keyword) {
      let kw = title;
      kw = kw.replace(/【[^】]*】/g, ' ');
      kw = kw.replace(/\[[^\]]*\]/g, ' ');
      kw = kw.replace(/「[^」]*」/g, (match) => match.slice(1, -1));
      kw = kw.replace(/第\s*\d+\s*話.*/g, ' ');
      kw = kw.replace(/\d+\s*話.*/g, ' ');
      kw = kw.replace(/#\s*\d+.*/g, ' ');
      kw = kw.replace(/期間限定.*/g, ' ');
      kw = kw.replace(/一挙.*/g, ' ');
      kw = kw.replace(/公式.*/g, ' ');
      kw = kw.replace(/特別配信.*/g, ' ');
      kw = kw.replace(/(前|後)編/g, ' ');
      kw = kw.replace(/HD画質/g, ' ');
      kw = kw.replace(/アニメ/g, ' ');
      kw = kw.replace(/\s+/g, ' ');
      kw = kw.trim();
      keyword = kw || title;
    }

    const searchKeyword = `${keyword} コミック`;
    const pcUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(searchKeyword)}/books/`;
    return `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=${encodeURIComponent(pcUrl)}&link_type=hybrid_html`;
  };

  return (
    <article className={`video-card ${isUpcoming ? 'upcoming' : ''}`} id={`video-card-${video.id}`}>
      {/* サムネイル */}
      <div className="thumbnail-container" onClick={() => video.url ? window.open(video.url, '_blank', 'noopener,noreferrer') : onPlay(video)}>
        <img 
          src={video.thumbnailUrl} 
          alt={video.title} 
          className="thumbnail-img" 
          loading="lazy"
        />
        {isUpcoming ? (
          <div className="upcoming-overlay">
            <span className="upcoming-icon">🎬</span>
            <span className="upcoming-label">配信予定</span>
          </div>
        ) : (
          <div className="play-overlay">
            <div className="play-btn-circle">
              <svg className="play-icon" width="20" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
        
        {/* バッジ表示 */}
        <div className="card-badges">
          {isUpcoming && <span className="badge-item badge-upcoming" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>公開前</span>}
          {video.isLatest && <span className="badge-item badge-latest" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>最新話</span>}
          {video.isBulk && <span className="badge-item badge-bulk" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' }}>一挙公開</span>}
          {video.episodeInfo && <span className="badge-item badge-episode" style={{ background: 'rgba(255, 255, 255, 0.15)', border: '1px solid rgba(255, 255, 255, 0.25)', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{video.episodeInfo}</span>}
          {video.url && <span className="badge-item badge-manual" style={{ background: 'linear-gradient(135deg, #ff1744 0%, #ec4899 100%)' }}>外部配信</span>}
          {video.playlistId && <span className="badge-item badge-manual" style={{ background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)' }}>全話一挙</span>}
          {video.isManual && !video.playlistId && <span className="badge-item badge-manual">注目作</span>}
          <span className="badge-item badge-channel">{video.channelName}</span>
        </div>
        
        {/* 再生時間 */}
        {video.duration && <span className="video-duration">{video.duration}</span>}
      </div>

      {/* カードコンテンツ */}
      <div className="card-body">
        <div className="publish-date">
          {isUpcoming ? (
            <span style={{ color: '#fbbf24', fontWeight: 700 }}>⏰ {formatDate(video.publishedAt)} 配信予定</span>
          ) : (
            <>公開日: {formatDate(video.publishedAt)}</>
          )}
          {mounted && remainingDaysText && (
            <span 
              className={`remaining-badge ${diffDaysVal !== null && diffDaysVal <= 3 && diffDaysVal >= 0 ? 'urgent' : ''}`}
              style={{ 
                color: remainingDaysText.includes('終了！') || remainingDaysText.includes('あと') ? '#ff1744' : '#f02fc2', 
                marginLeft: '0.75rem', 
                fontWeight: 700 
              }}
            >
              ⏰ {diffDaysVal !== null && diffDaysVal <= 3 && diffDaysVal >= 0 ? '⚠️ ' : ''}{remainingDaysText}
            </span>
          )}
        </div>
        
        <h3 
          className="video-title" 
          onClick={() => video.url ? window.open(video.url, '_blank', 'noopener,noreferrer') : onPlay(video)}
          title={video.title}
        >
          {video.title}
        </h3>

        {/* 公開形態の補足説明テキスト */}
        {(video.episodeInfo || video.isLatest || video.isBulk) && (
          <div className="release-format-info" style={{ 
            fontSize: '0.775rem', 
            margin: '0.5rem 0 0.75rem 0', 
            padding: '0.4rem 0.6rem', 
            borderRadius: '6px',
            background: video.isBulk ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255, 255, 255, 0.03)',
            border: video.isBulk ? '1px solid rgba(6, 182, 212, 0.15)' : '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 600
          }}>
            {video.isBulk ? (
              <>
                <span style={{ color: '#06b6d4' }}>📚 一挙無料公開</span>
                <span style={{ color: 'var(--text-sub)', fontSize: '0.7rem' }}>({video.episodeInfo}を一気見可能！)</span>
              </>
            ) : video.isLatest ? (
              <>
                <span style={{ color: '#10b981' }}>🔥 最新話無料公開</span>
                {video.episodeInfo && <span style={{ color: 'var(--text-sub)', fontSize: '0.7rem' }}>({video.episodeInfo}が公開中)</span>}
              </>
            ) : (
              <>
                <span style={{ color: 'var(--text-muted)' }}>📺 無料配信中</span>
                {video.episodeInfo && <span style={{ color: 'var(--text-sub)', fontSize: '0.7rem' }}>({video.episodeInfo}を公開中)</span>}
              </>
            )}
          </div>
        )}

        {/* あらすじ */}
        <div className="synopsis-container">
          <p 
            ref={textRef} 
            className={`synopsis-text ${isExpanded ? 'expanded' : ''}`}
          >
            {video.description || '公式あらすじ・動画説明は登録されていません。'}
          </p>
          {showReadMore && (
            <button 
              className="read-more-btn" 
              onClick={() => setIsExpanded(!isExpanded)}
              id={`read-more-btn-${video.id}`}
            >
              {isExpanded ? '▲ あらすじを閉じる' : '▼ あらすじを読む'}
            </button>
          )}
        </div>

        {/* シェア＆コピーボタン */}
        <div className="share-actions-row" style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', marginBottom: '0.8rem' }}>
          <button 
            onClick={handleCopyUrl}
            className="action-btn copy-btn"
            style={{
              flex: 1,
              padding: '0.45rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-sub)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              transition: 'all 0.2s'
            }}
            id={`btn-copy-${video.id}`}
          >
            <span>🔗</span> {copied ? 'コピー完了！' : '動画URLコピー'}
          </button>
          <button 
            onClick={handleShareX}
            className="action-btn share-btn"
            style={{
              flex: 1,
              padding: '0.45rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: '#1d9bf0',
              border: 'none',
              color: '#ffffff',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              transition: 'all 0.2s'
            }}
            id={`btn-share-${video.id}`}
          >
            <span>𝕏</span> シェアする
          </button>
        </div>

        {/* 原作コミックス アフィリエイトリンク ＆ 続き of 目安表示 */}
        <div className="affiliate-section">
          {originalWorkGuide && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: '#00f2fe', 
              background: 'rgba(0, 242, 254, 0.06)', 
              border: '1px solid rgba(0, 242, 254, 0.15)', 
              padding: '0.35rem 0.5rem', 
              borderRadius: '6px', 
              marginBottom: '0.6rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              📖 続きの目安: <strong>{originalWorkGuide}</strong>
            </div>
          )}
          <div className="affiliate-label">原作コミックをチェック</div>
          <div className="affiliate-buttons">
            <a 
              href={getRakutenUrl(video.title, video.originalWorkTitle)} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="affiliate-btn btn-rakuten"
              id={`btn-rakuten-${video.id}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              楽天で書籍を検索
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
