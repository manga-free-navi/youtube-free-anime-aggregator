'use client';

import { useState, useMemo, useEffect } from 'react';
import channelsData from '../scraper/channels.json';
import videosData from '../data/videos.json';
import manualVideosData from '../data/manual_videos.json';

import FilterBar from './FilterBar';
import VideoCard from './VideoCard';
import VideoModal from './VideoModal';
import AdContainer from './AdContainer';

interface Video {
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
  playlistId?: string;
  url?: string;
  episodeInfo?: string;
  isBulk?: boolean;
  isLatest?: boolean;
  mangaSaleInfo?: {
    hasSale: boolean;
    maxDiscount: number;
    minPrice: number;
    id: string;
    mangaUrl: string;
  } | null;
}

export default function MainApp() {
  // ステート管理
  const [selectedChannelId, setSelectedChannelId] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  // ユーザー利便性向上ステート (配信予定非表示、お気に入りのみ表示、お気に入りIDリスト)
  const [hideUpcoming, setHideUpcoming] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // 新規追加：プラットフォーム（配信元）ステート、および漫画お気に入りIDリスト（横断同期用）
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [mangaFavorites, setMangaFavorites] = useState<string[]>([]);
  const [showBulkOnly, setShowBulkOnly] = useState(false);

  // マウント時に閲覧設定を復元
  useEffect(() => {
    try {
      const savedChannel = localStorage.getItem('anime_filter_channel');
      const savedCategory = localStorage.getItem('anime_filter_category');
      const savedSort = localStorage.getItem('anime_sort_by');
      const savedHideUpcoming = localStorage.getItem('anime_hide_upcoming');
      const savedShowFavoritesOnly = localStorage.getItem('anime_show_favorites_only');
      const savedFavorites = localStorage.getItem('anime_favorites');
      const savedPlatform = localStorage.getItem('anime_filter_platform');
      const savedShowBulkOnly = localStorage.getItem('anime_show_bulk_only');
      
      if (savedChannel) setSelectedChannelId(savedChannel);
      if (savedCategory) setSelectedCategory(savedCategory);
      if (savedSort) setSortBy(savedSort);
      if (savedHideUpcoming) setHideUpcoming(savedHideUpcoming === 'true');
      if (savedShowFavoritesOnly) setShowFavoritesOnly(savedShowFavoritesOnly === 'true');
      if (savedFavorites) {
        try {
          setFavorites(JSON.parse(savedFavorites));
        } catch (e) { console.error(e); }
      }
      if (savedPlatform) setSelectedPlatform(savedPlatform);
      if (savedShowBulkOnly) setShowBulkOnly(savedShowBulkOnly === 'true');

      // 同一ドメイン共有領域から、漫画ナビ側のお気に入り「manga_favorites」を読み取る！
      const savedMangaFavs = localStorage.getItem('manga_favorites');
      if (savedMangaFavs) {
        try {
          setMangaFavorites(JSON.parse(savedMangaFavs));
        } catch (e) { console.error(e); }
      }
    } catch (e) {
      console.error('Failed to load anime preferences:', e);
    }
  }, []);

  // 設定保存用ハンドラー
  const handleChannelChange = (channelId: string) => {
    setSelectedChannelId(channelId);
    try {
      localStorage.setItem('anime_filter_channel', channelId);
    } catch (e) { console.error(e); }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    try {
      localStorage.setItem('anime_filter_category', category);
    } catch (e) { console.error(e); }
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    try {
      localStorage.setItem('anime_sort_by', sort);
    } catch (e) { console.error(e); }
  };

  const handlePlatformChange = (platform: string) => {
    setSelectedPlatform(platform);
    try {
      localStorage.setItem('anime_filter_platform', platform);
    } catch (e) { console.error(e); }
  };

  const handleToggleHideUpcoming = () => {
    const newVal = !hideUpcoming;
    setHideUpcoming(newVal);
    try {
      localStorage.setItem('anime_hide_upcoming', String(newVal));
    } catch (e) { console.error(e); }
  };

  const handleToggleShowFavoritesOnly = () => {
    const newVal = !showFavoritesOnly;
    setShowFavoritesOnly(newVal);
    try {
      localStorage.setItem('anime_show_favorites_only', String(newVal));
    } catch (e) { console.error(e); }
  };

  const handleToggleShowBulkOnly = () => {
    const newVal = !showBulkOnly;
    setShowBulkOnly(newVal);
    try {
      localStorage.setItem('anime_show_bulk_only', String(newVal));
    } catch (e) { console.error(e); }
  };

  const handleToggleFavorite = (videoId: string) => {
    setFavorites((prev) => {
      const isFav = prev.includes(videoId);
      const nextFavs = isFav 
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId];
      try {
        localStorage.setItem('anime_favorites', JSON.stringify(nextFavs));
      } catch (e) { console.error(e); }
      return nextFavs;
    });
  };

  // 1. 自動収集と手動登録動画データをマージ
  const allVideos = useMemo(() => {
    // 重複排除（手動データと自動データの動画IDが被っている場合、手動データを優先）
    const manualIds = new Set((manualVideosData as Video[]).map(v => v.id));
    const filteredAutoVideos = (videosData as Video[]).filter(v => !manualIds.has(v.id));
    
    return [...(manualVideosData as Video[]), ...filteredAutoVideos];
  }, []);

  // 2. 検索・絞り込みの適用
  const filteredVideos = useMemo(() => {
    const now = new Date();
    return allVideos.filter((video) => {
      // 検索キーワードマッチ（動画タイトル、チャンネル名、原作名、あらすじ）
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = query === '' || 
        video.title.toLowerCase().includes(query) ||
        video.channelName.toLowerCase().includes(query) ||
        (video.originalWorkTitle && video.originalWorkTitle.toLowerCase().includes(query)) ||
        video.description.toLowerCase().includes(query);

      // チャンネル絞り込み
      const matchesChannel = selectedChannelId === 'all' || video.channelId === selectedChannelId;

      // カテゴリ絞り込み
      const matchesCategory = selectedCategory === 'すべて' || video.category === selectedCategory;

      // 配信予定（未来公開）の非表示
      const isUpcoming = new Date(video.publishedAt) > now;
      const matchesUpcoming = !hideUpcoming || !isUpcoming;

      // お気に入りのみ表示
      const matchesFavorites = !showFavoritesOnly || favorites.includes(video.id);

      // 一挙公開のみ表示
      const matchesBulk = !showBulkOnly || video.isBulk === true;

      // プラットフォーム（配信元）絞り込み
      const matchesPlatform = selectedPlatform === 'all' || 
        (selectedPlatform === 'youtube' && !video.url) || 
        (selectedPlatform === 'abema' && video.url && video.url.includes('abema.tv'));

      return matchesSearch && matchesChannel && matchesCategory && matchesUpcoming && matchesFavorites && matchesBulk && matchesPlatform;
    });
  }, [allVideos, searchTerm, selectedChannelId, selectedCategory, hideUpcoming, showFavoritesOnly, favorites, showBulkOnly, selectedPlatform]);

  // 3. ソート処理（手動注目動画を常に最上部に優先ピン留め）
  const sortedVideos = useMemo(() => {
    return [...filteredVideos].sort((a, b) => {
      // 手動注目作品 (isManual: true) を最優先で上に並べる
      if (a.isManual && !b.isManual) return -1;
      if (!a.isManual && b.isManual) return 1;

      // 手動同士、または自動同士の中でのソート
      if (sortBy === 'newest') {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime();
      } else if (sortBy === 'channel') {
        return a.channelName.localeCompare(b.channelName, 'ja');
      } else if (sortBy === 'urgency') {
        const timeA = a.endDate ? new Date(a.endDate).getTime() : Infinity;
        const timeB = b.endDate ? new Date(b.endDate).getTime() : Infinity;
        return timeA - timeB;
      }
      return 0;
    });
  }, [filteredVideos, sortBy]);

  // 動画モーダルを開く
  const handlePlayVideo = (video: Video) => {
    setActiveVideo(video);
  };

  // 動画モーダルを閉じる
  const handleCloseModal = () => {
    setActiveVideo(null);
  };

  return (
    <div id="main-app-root">
      {/* ヒーローセクション */}
      <section className="hero-section">
        <h1 className="hero-title">
          無料 アニメ ＆ 公式配信映画 <span>最新まとめ</span>
        </h1>
        <p className="hero-subtitle">
          YouTubeの公式チャンネルで期間限定公開されている「無料 アニメ」（TVシリーズ・劇場版・一挙配信）や公式無料映画の情報を自動集約。その場で直接再生できます。
        </p>
      </section>

      {/* 広告枠（上部） */}
      <AdContainer slot="top-banner-ad" format="horizontal" />

      {/* 検索・絞り込みツールバー */}
      <FilterBar
        channels={channelsData}
        selectedChannelId={selectedChannelId}
        onSelectChannelId={handleChannelChange}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategoryChange}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        hideUpcoming={hideUpcoming}
        onToggleHideUpcoming={handleToggleHideUpcoming}
        showFavoritesOnly={showFavoritesOnly}
        onToggleShowFavoritesOnly={handleToggleShowFavoritesOnly}
        showBulkOnly={showBulkOnly}
        onToggleShowBulkOnly={handleToggleShowBulkOnly}
        selectedPlatform={selectedPlatform}
        onSelectPlatform={handlePlatformChange}
      />

      {/* 件数表示 */}
      <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-sub)' }}>
        該当作品: <strong>{sortedVideos.length}</strong> 件
      </div>

      {/* 動画グリッド表示（途中に広告を美しくサンドイッチ） */}
      {sortedVideos.length > 0 ? (
        <div className="video-grid" id="video-display-grid">
          {sortedVideos.map((video, index) => {
            const cardElement = (
              <VideoCard 
                key={video.id} 
                video={video} 
                onPlay={handlePlayVideo} 
                isFavorite={favorites.includes(video.id)}
                onToggleFavorite={handleToggleFavorite}
                isMangaFavorite={video.mangaSaleInfo?.id ? mangaFavorites.includes(video.mangaSaleInfo.id) : false}
              />
            );

            // 8枚のカードごとに広告を挟む（最初の広告は4枚目の後に配置して見えやすくする）
            if ((index + 1) % 8 === 4) {
              return (
                <div key={`wrapper-${video.id}`} style={{ display: 'contents' }}>
                  {cardElement}
                  <div key={`grid-ad-${index}`} style={{ gridColumn: '1 / -1' }}>
                    <AdContainer slot={`in-grid-ad-${index}`} format="fluid" />
                  </div>
                </div>
              );
            }

            return cardElement;
          })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: 'rgba(17, 24, 39, 0.4)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          color: 'var(--text-sub)',
          marginBottom: '3rem'
        }}>
          🔍 条件に一致する無料公開中の動画は見つかりませんでした。
        </div>
      )}

      {/* 再生モーダル */}
      <VideoModal video={activeVideo} onClose={handleCloseModal} />

      {/* フッター前アドセンス広告 */}
      <AdContainer slot="bottom-footer-ad" />

      {/* 簡易プライバシーポリシーアンカー移動用の隠しセクション（AdSense審査対策） */}
      <section id="privacy" style={{ 
        marginTop: '5rem', 
        paddingTop: '2.5rem', 
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        lineHeight: '1.7'
      }}>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text-sub)', marginBottom: '1rem', fontWeight: 700 }}>プライバシーポリシー・免責事項</h2>
        <p style={{ marginBottom: '0.75rem' }}>
          アニフリー（以下、当サイト）は、YouTube上の公式アニメ・映画配信チャンネルが一般公開している動画（埋め込み許可動画）を整理・紹介するアンテナ・まとめサイトです。
        </p>
        <p style={{ marginBottom: '0.75rem' }}>
          当サイトは著作権の侵害を目的としておりません。紹介している動画、画像の著作権・肖像権等は各権利所有者・公式チャンネルに帰属します。動画の配信終了や内容変更等について当サイトが保証するものではありません。
        </p>
        <p style={{ marginBottom: '0.75rem' }}>
          当サイトでは、第三者配信による広告サービス（Google AdSense）およびアフィリエイトプログラム（楽天アフィリエイト）を利用しています。広告配信事業者は、ユーザーの興味に応じた商品やサービスの広告を表示するため、当サイトや他サイトへのアクセスに関する情報「Cookie」（氏名、住所、メールアドレス、電話番号は含まれません）を使用することがあります。
        </p>
        <p>
          また、本アフィリエイトリンクを経由したお買い物に関するお問い合わせは、当サイトではお受けできかねます。移動先の販売店等にてご確認ください。
        </p>
      </section>
    </div>
  );
}
