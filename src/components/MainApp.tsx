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
}

export default function MainApp() {
  // ステート管理
  const [selectedChannelId, setSelectedChannelId] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('すべて');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  // マウント時に閲覧設定を復元
  useEffect(() => {
    try {
      const savedChannel = localStorage.getItem('anime_filter_channel');
      const savedCategory = localStorage.getItem('anime_filter_category');
      const savedSort = localStorage.getItem('anime_sort_by');
      
      if (savedChannel) setSelectedChannelId(savedChannel);
      if (savedCategory) setSelectedCategory(savedCategory);
      if (savedSort) setSortBy(savedSort);
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

  // 1. 自動収集と手動登録動画データをマージ
  const allVideos = useMemo(() => {
    // 重複排除（手動データと自動データの動画IDが被っている場合、手動データを優先）
    const manualIds = new Set(manualVideosData.map(v => v.id));
    const filteredAutoVideos = (videosData as Video[]).filter(v => !manualIds.has(v.id));
    
    return [...(manualVideosData as Video[]), ...filteredAutoVideos];
  }, []);

  // 2. 検索・絞り込みの適用
  const filteredVideos = useMemo(() => {
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

      return matchesSearch && matchesChannel && matchesCategory;
    });
  }, [allVideos, searchTerm, selectedChannelId, selectedCategory]);

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
          公式無料アニメ・映画 <span>最新まとめ</span>
        </h1>
        <p className="hero-subtitle">
          YouTubeのアニメ公式チャンネルで期間限定公開されている無料TVシリーズ・劇場版・一挙配信の動画情報を自動集約。その場で直接再生できます。
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
