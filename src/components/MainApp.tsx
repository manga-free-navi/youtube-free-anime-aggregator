'use client';

import { useState, useMemo, useEffect } from 'react';
import channelsData from '../scraper/channels.json';
import videosData from '../data/videos.json';
import manualVideosData from '../data/manual_videos.json';

import FilterBar from './FilterBar';
import VideoCard from './VideoCard';
import VideoModal from './VideoModal';
import AdContainer from './AdContainer';
import LazyRender from './LazyRender';

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
  seasonInfo?: string; // 期・シーズン情報
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
  
  // 表示件数制御ステート（大量レンダリングによるパフォーマンス低下対策）
  const [visibleCount, setVisibleCount] = useState(24);

  // 同期コード管理ステート
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [syncError, setSyncError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState(false);

  // 10大改善追加：テーマ、表示モード、3Way横断ステート
  const [theme, setTheme] = useState('dark');
  const [viewMode, setViewMode] = useState<'grid' | 'timetable'>('grid');
  const [gameWishlist, setGameWishlist] = useState<string[]>([]);
  const [mangaSales, setMangaSales] = useState<any[]>([]);
  const [gameSales, setGameSales] = useState<any[]>([]);

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
      const savedMangaFavs = localStorage.getItem('manga_favorites') || localStorage.getItem('manga_read_list');
      if (savedMangaFavs) {
        try {
          setMangaFavorites(JSON.parse(savedMangaFavs));
        } catch (e) { console.error(e); }
      }

      // ゲームのウィッシュリストのロード
      const savedGameFavs = localStorage.getItem('game-wishlist');
      if (savedGameFavs) {
        try {
          setGameWishlist(JSON.parse(savedGameFavs));
        } catch (e) { console.error(e); }
      }

      // テーマ復元
      const savedTheme = localStorage.getItem('anime-theme') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      setTheme(savedTheme);
      
      const savedViewMode = localStorage.getItem('anime-view-mode');
      if (savedViewMode) setViewMode(savedViewMode as 'grid' | 'timetable');
    } catch (e) {
      console.error('Failed to load anime preferences:', e);
    }
  }, []);

  // 漫画とゲーム of sales.json / games.json フェッチ
  useEffect(() => {
    const fetchCrossData = async () => {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const mangaEnvUrl = process.env.NEXT_PUBLIC_MANGA_SITE_URL || '';
      const mangaUrls: string[] = [];
      
      if (mangaEnvUrl) {
        mangaUrls.push(`${mangaEnvUrl.replace(/\/$/, '')}/sales.json`);
      }
      if (origin) {
        mangaUrls.push(`${origin}/manga-sale-aggregator/sales.json`);
        mangaUrls.push(`${origin}/manga-sale-aggregator/data/sales.json`);
      }
      mangaUrls.push('/manga-sale-aggregator/sales.json');
      mangaUrls.push('/manga-sale-aggregator/data/sales.json');
      mangaUrls.push('/sales.json');

      for (const url of mangaUrls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              setMangaSales(data);
              break;
            }
          }
        } catch (e) {
          // ignore
        }
      }
      
      const gameEnvUrl = process.env.NEXT_PUBLIC_GAME_SITE_URL || '';
      const gameUrls: string[] = [];
      
      if (gameEnvUrl) {
        gameUrls.push(`${gameEnvUrl.replace(/\/$/, '')}/games.json`);
      }
      if (origin) {
        gameUrls.push(`${origin}/game-sale-aggregator/games.json`);
        gameUrls.push(`${origin}/game-sale-aggregator/data/games.json`);
      }
      gameUrls.push('/game-sale-aggregator/games.json');
      gameUrls.push('/game-sale-aggregator/data/games.json');
      gameUrls.push('/games.json');

      for (const url of gameUrls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              setGameSales(data);
              break;
            }
          }
        } catch (e) {
          // ignore
        }
      }
    };
    fetchCrossData();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('anime-theme', newTheme);
  };

  const handleSetViewMode = (mode: 'grid' | 'timetable') => {
    setViewMode(mode);
    localStorage.setItem('anime-view-mode', mode);
  };

  // フィルター・ソート条件が変わったら表示件数を初期値にリセット
  useEffect(() => {
    setVisibleCount(24);
  }, [selectedChannelId, selectedCategory, searchTerm, sortBy, hideUpcoming, showFavoritesOnly, selectedPlatform, showBulkOnly]);

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

  // お気に入りをBase64コード化して出力 (同期用)
  const favoritesCode = useMemo(() => {
    try {
      return btoa(JSON.stringify(favorites));
    } catch (e) {
      return '';
    }
  }, [favorites]);

  // 同期コードからお気に入りを復元 (インポート)
  const handleImportFavorites = () => {
    setSyncError('');
    setSyncSuccess(false);
    try {
      const trimmed = syncCodeInput.trim();
      if (!trimmed) {
        setSyncError('同期コードを入力してください。');
        return;
      }
      const parsed = JSON.parse(atob(trimmed));
      if (!Array.isArray(parsed)) {
        setSyncError('無効な同期コード形式です。');
        return;
      }
      // 重複を排除してマージ
      const merged = Array.from(new Set([...favorites, ...parsed]));
      setFavorites(merged);
      localStorage.setItem('anime_favorites', JSON.stringify(merged));
      setSyncSuccess(true);
      setSyncCodeInput('');
      setTimeout(() => {
        setShowSyncModal(false);
        setSyncSuccess(false);
      }, 1500);
    } catch (e) {
      setSyncError('コードの解析に失敗しました。正しいコードを入力してください。');
    }
  };

  // 1. 自動収集と手動登録動画データをマージ
  const allVideos = useMemo(() => {
    // 重複排除（手動データと自動データの動画IDが被っている場合、手動データを優先）
    const manualIds = new Set((manualVideosData as Video[]).map(v => v.id));
    const filteredAutoVideos = (videosData as Video[]).filter(v => !manualIds.has(v.id));
    
    return [...(manualVideosData as Video[]), ...filteredAutoVideos];
  }, []);

  // 10大改善：アニメ ➔ 原作漫画 ➔ 関連ゲーム 3Way自動名寄せマージ
  const allVideosWithCrossInfo = useMemo(() => {
    const clean = (t: string) => {
      return t.replace(/【[^】]*】/g, '')
              .replace(/\[[^\]]*\]/g, '')
              .replace(/[\s　]+/g, '')
              .toLowerCase();
    };

    return allVideos.map((video: any) => {
      const cleanTitle = clean(video.originalWorkTitle || video.title);
      
      // 1. 漫画セールの検索
      let matchedManga = null;
      if (mangaSales.length > 0) {
        matchedManga = mangaSales.find((manga: any) => {
          const cleanMangaTitle = clean(manga.title);
          return cleanTitle.includes(cleanMangaTitle) || cleanMangaTitle.includes(cleanTitle);
        });
      }
      
      // 2. ゲームセールの検索
      let matchedGame = null;
      if (gameSales.length > 0) {
        matchedGame = gameSales.find((game: any) => {
          const cleanGameTitle = clean(game.title);
          return cleanTitle.includes(cleanGameTitle) || cleanGameTitle.includes(cleanTitle);
        });
      }

      let mangaSaleInfo = video.mangaSaleInfo || null;
      if (matchedManga) {
        const deals = Object.values(matchedManga.stores).filter(Boolean) as any[];
        const minPrice = deals.length > 0 ? Math.min(...deals.map(d => d.salePrice)) : 0;
        const maxDiscount = deals.length > 0 ? Math.max(...deals.map(d => d.discountRate)) : 0;
        const firstStoreKey = Object.keys(matchedManga.stores)[0];
        const mangaUrl = matchedManga.stores[firstStoreKey]?.url || '';

        mangaSaleInfo = {
          hasSale: true,
          maxDiscount,
          minPrice,
          id: matchedManga.id,
          mangaUrl
        };
      }

      let gameSaleInfo = null;
      if (matchedGame) {
        gameSaleInfo = {
          hasSale: true,
          id: matchedGame.id,
          title: matchedGame.title,
          salePrice: matchedGame.salePrice,
          discountRate: matchedGame.discountRate,
          storeUrl: matchedGame.storeUrl
        };
      }

      return {
        ...video,
        mangaSaleInfo,
        gameSaleInfo
      };
    });
  }, [allVideos, mangaSales, gameSales]);

  // 2. 検索・絞り込みの適用
  const filteredVideos = useMemo(() => {
    const now = new Date();
    return allVideosWithCrossInfo.filter((video) => {
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
  }, [allVideosWithCrossInfo, searchTerm, selectedChannelId, selectedCategory, hideUpcoming, showFavoritesOnly, favorites, showBulkOnly, selectedPlatform]);

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

  // 終了間近（残り3日以下、かつ本日以降）のお気に入り動画件数を集計
  const urgentFavoriteCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return allVideos.filter(video => {
      if (!favorites.includes(video.id)) return false;
      if (!video.endDate) return false;
      
      const end = new Date(video.endDate);
      end.setHours(0, 0, 0, 0);
      
      const diffTime = end.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 && diffDays <= 3;
    }).length;
  }, [allVideos, favorites]);

  // 曜日ごとの番組表データの生成
  const timetableData = useMemo(() => {
    const dayMap: { [key: number]: Video[] } = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    
    filteredVideos.forEach(video => {
      const d = new Date(video.publishedAt);
      const day = d.getDay();
      dayMap[day].push(video);
    });

    const formatTime = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.getHours() * 60 + d.getMinutes();
    };

    Object.keys(dayMap).forEach((day: any) => {
      dayMap[day].sort((a, b) => formatTime(a.publishedAt) - formatTime(b.publishedAt));
    });

    return dayMap;
  }, [filteredVideos]);

  const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  
  const renderTimetable = () => {
    return (
      <div className="timetable-container" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginTop: '1.5rem',
        marginBottom: '2rem'
      }}>
        {dayNames.map((dayName, idx) => {
          const videos = timetableData[idx] || [];
          return (
            <div key={idx} style={{
              background: 'rgba(30, 41, 59, 0.4)',
              border: '1px solid var(--border-color, rgba(255,255,255,0.05))',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              boxSizing: 'border-box'
            }}>
              <h3 style={{
                fontSize: '0.95rem',
                fontWeight: 800,
                color: idx === 0 || idx === 6 ? '#ff3e6c' : 'var(--accent-cyan, #06b6d4)',
                borderBottom: '2px solid rgba(255,255,255,0.05)',
                paddingBottom: '0.5rem',
                margin: 0,
                textAlign: 'center'
              }}>
                {dayName} ({videos.length}件)
              </h3>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                overflowY: 'auto',
                maxHeight: '450px'
              }}>
                {videos.length === 0 ? (
                  <div style={{ color: 'var(--text-sub, #64748b)', fontSize: '0.75rem', textAlign: 'center', padding: '1rem 0' }}>
                    配信予定なし
                  </div>
                ) : (
                  videos.map(video => {
                    const timeStr = new Date(video.publishedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div 
                        key={video.id} 
                        onClick={() => handlePlayVideo(video)}
                        style={{
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '8px',
                          padding: '0.5rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.borderColor = 'var(--text-main)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 800 }}>{timeStr}</span>
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-sub, #94a3b8)', background: 'rgba(255,255,255,0.05)', padding: '1px 4px', borderRadius: '3px' }}>
                            {video.channelName}
                          </span>
                        </div>
                        <div style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 700, 
                          color: 'var(--text-main, #f8fafc)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: '1.3'
                        }}>
                          {video.title.replace(/\(ABEMA無料配信予定\)/g, '')}
                        </div>
                      </div>
                    );
                  })
                )}
               </div>
             </div>
           );
         })}
       </div>
     );
   };

  // 表示件数分だけ動画を切り出し
  const displayedVideos = useMemo(() => {
    return sortedVideos.slice(0, visibleCount);
  }, [sortedVideos, visibleCount]);

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

      {/* 操作バー (同期・テーマ切り替え・表示モード) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem', marginTop: '-0.5rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        {/* 左側：表示モード切り替え */}
        <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255, 255, 255, 0.02)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <button
            onClick={() => handleSetViewMode('grid')}
            style={{
              background: viewMode === 'grid' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              border: 'none',
              color: viewMode === 'grid' ? 'var(--text-main)' : 'var(--text-sub)',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🎬 グリッド表示
          </button>
          <button
            onClick={() => handleSetViewMode('timetable')}
            style={{
              background: viewMode === 'timetable' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              border: 'none',
              color: viewMode === 'timetable' ? 'var(--text-main)' : 'var(--text-sub)',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🗓️ 週間番組表
          </button>
        </div>

        {/* 右側：同期＆テーマ切り替え */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={toggleTheme}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-sub)',
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: '0.45rem 0.95rem',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s',
              backdropFilter: 'blur(5px)'
            }}
          >
            {theme === 'dark' ? '💡 ライトネオン' : '🌙 ダークネオン'}
          </button>
          <button
            onClick={() => setShowSyncModal(true)}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-sub)',
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: '0.45rem 0.95rem',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s',
              backdropFilter: 'blur(5px)'
            }}
          >
            <span>🔄</span> 同期・バックアップ
          </button>
        </div>
      </div>

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
        urgentFavoriteCount={urgentFavoriteCount}
      />

      {/* 件数表示 */}
      <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-sub)' }}>
        該当作品: <strong>{sortedVideos.length}</strong> 件
      </div>

      {/* 週間番組表または動画グリッド表示 */}
      {displayedVideos.length > 0 ? (
        viewMode === 'timetable' ? (
          renderTimetable()
        ) : (
          <>
            <div className="video-grid" id="video-display-grid">
              {displayedVideos.map((video, index) => {
                const cardElement = (
                  <LazyRender key={video.id}>
                    <VideoCard 
                      video={video} 
                      onPlay={handlePlayVideo} 
                      isFavorite={favorites.includes(video.id)}
                      onToggleFavorite={handleToggleFavorite}
                      isMangaFavorite={video.mangaSaleInfo?.id ? mangaFavorites.includes(video.mangaSaleInfo.id) : false}
                      isGameFavorite={video.gameSaleInfo?.id ? gameWishlist.includes(video.gameSaleInfo.id) : false}
                    />
                  </LazyRender>
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

            {/* さらに読み込むボタン */}
            {sortedVideos.length > visibleCount && (
              <div className="load-more-container" style={{
                display: 'flex',
                justifyContent: 'center',
                margin: '3.5rem 0 1.5rem 0',
              }}>
                <button
                  onClick={() => setVisibleCount(prev => prev + 24)}
                  className="load-more-btn"
                  style={{
                    padding: '0.85rem 2.8rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '30px',
                    color: 'var(--text-main)',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.borderColor = 'var(--text-main)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.35)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.24)';
                  }}
                >
                  <span>🎬</span> さらに読み込む ({sortedVideos.length - visibleCount} 件の作品)
                </button>
              </div>
            )}
          </>
        )
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

      {/* 同期モーダル */}
      {showSyncModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          padding: '1rem',
          boxSizing: 'border-box'
        }} onClick={() => setShowSyncModal(false)}>
          <div className="modal-content" style={{
            background: 'rgba(30, 41, 59, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            color: 'var(--text-main)',
            backdropFilter: 'blur(20px)',
            position: 'relative',
            boxSizing: 'border-box'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🔄</span> お気に入りデータの同期・移行
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              このコードをコピペすることで、他のブラウザやスマホとお気に入りを同期したり、バックアップを取ることができます。
            </p>

            {/* エクスポートコード */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                あなたのお気に入り同期コード (コピー用):
              </label>
              <textarea
                readOnly
                value={favoritesCode}
                onClick={(e) => {
                  const el = e.currentTarget;
                  el.select();
                  navigator.clipboard.writeText(favoritesCode);
                }}
                style={{
                  width: '100%',
                  height: '80px',
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#a7f3d0',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  padding: '0.5rem',
                  boxSizing: 'border-box',
                  resize: 'none',
                  cursor: 'pointer'
                }}
                title="クリックで全選択コピー"
              />
              <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'block', marginTop: '0.2rem' }}>
                ※クリックすると全選択され、クリップボードにコピーされます。
              </span>
            </div>

            {/* インポート入力 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem' }}>
                同期コードをインポート (貼り付け用):
              </label>
              <textarea
                placeholder="ここに同期コードを貼り付けてください..."
                value={syncCodeInput}
                onChange={(e) => setSyncCodeInput(e.target.value)}
                style={{
                  width: '100%',
                  height: '80px',
                  background: 'rgba(15, 23, 42, 0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  padding: '0.5rem',
                  boxSizing: 'border-box',
                  resize: 'none'
                }}
              />
            </div>

            {/* エラー／成功メッセージ */}
            {syncError && (
              <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
                ⚠️ {syncError}
              </div>
            )}
            {syncSuccess && (
              <div style={{ color: '#10b981', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
                ✅ 同期に成功しました！
              </div>
            )}

            {/* アクションボタン */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowSyncModal(false);
                  setSyncError('');
                  setSyncCodeInput('');
                }}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-sub)',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleImportFavorites}
                style={{
                  background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
                  border: 'none',
                  color: '#fff',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}
              >
                インポート実行
              </button>
            </div>
          </div>
        </div>
      )}

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
