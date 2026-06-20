'use client';

interface Channel {
  id: string;
  name: string;
  displayName: string;
  category: string;
}

interface FilterBarProps {
  channels: Channel[];
  selectedChannelId: string;
  onSelectChannelId: (id: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  hideUpcoming: boolean;
  onToggleHideUpcoming: () => void;
  showFavoritesOnly: boolean;
  onToggleShowFavoritesOnly: () => void;
  showBulkOnly: boolean;
  onToggleShowBulkOnly: () => void;
  selectedPlatform: string;
  onSelectPlatform: (platform: string) => void;
}

export default function FilterBar({
  channels,
  selectedChannelId,
  onSelectChannelId,
  selectedCategory,
  onSelectCategory,
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  hideUpcoming,
  onToggleHideUpcoming,
  showFavoritesOnly,
  onToggleShowFavoritesOnly,
  showBulkOnly,
  onToggleShowBulkOnly,
  selectedPlatform,
  onSelectPlatform,
}: FilterBarProps) {
  // 重複しないカテゴリリストの作成
  const categories = ['すべて', ...Array.from(new Set(channels.map((c) => c.category)))];

  // 選択されたカテゴリに基づいてチャンネルリストを絞る
  const filteredChannels = selectedCategory === 'すべて' 
    ? channels 
    : channels.filter((c) => c.category === selectedCategory);

  return (
    <div className="filter-bar" id="filter-bar-container">
      {/* 上段：検索・ソート */}
      <div className="filter-row">
        <div className="search-input-wrapper">
          <svg
            className="search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="作品名・チャンネル名で検索..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            id="input-search-query"
          />
        </div>
        
        <div>
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            id="select-sort-order"
          >
            <option value="newest">公開日が新しい順</option>
            <option value="oldest">公開日が古い順</option>
            <option value="urgency">配信終了が近い順</option>
            <option value="channel">チャンネル順</option>
          </select>
        </div>
      </div>

      {/* 中段：ジャンル・カテゴリ */}
      <div className="filter-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, minWidth: '70px' }}>カテゴリ:</span>
        <div className="filter-group">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => {
                onSelectCategory(cat);
                // カテゴリを変更したら、チャンネル絞り込みは一度すべて表示に戻す
                onSelectChannelId('all');
              }}
              id={`btn-category-${cat}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 下段：チャンネル絞り込み */}
      <div className="filter-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, minWidth: '70px' }}>チャンネル:</span>
        <div className="filter-group">
          <button
            className={`filter-btn ${selectedChannelId === 'all' ? 'active' : ''}`}
            onClick={() => onSelectChannelId('all')}
            id="btn-channel-all"
          >
            すべて表示
          </button>
          {filteredChannels.map((chan) => (
            <button
              key={chan.id}
              className={`filter-btn ${selectedChannelId === chan.id ? 'active' : ''}`}
              onClick={() => onSelectChannelId(chan.id)}
              id={`btn-channel-${chan.id}`}
            >
              {chan.displayName}
            </button>
          ))}
        </div>
      </div>

      {/* 配信元プラットフォーム絞り込み */}
      <div className="filter-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, minWidth: '70px' }}>配信元:</span>
        <div className="filter-group">
          <button
            className={`filter-btn ${selectedPlatform === 'all' ? 'active' : ''}`}
            onClick={() => onSelectPlatform('all')}
            id="btn-platform-all"
          >
            すべて表示
          </button>
          <button
            className={`filter-btn ${selectedPlatform === 'youtube' ? 'active' : ''}`}
            onClick={() => onSelectPlatform('youtube')}
            id="btn-platform-youtube"
          >
            📺 YouTubeのみ
          </button>
          <button
            className={`filter-btn ${selectedPlatform === 'abema' ? 'active' : ''}`}
            onClick={() => onSelectPlatform('abema')}
            id="btn-platform-abema"
          >
            🟢 ABEMAのみ
          </button>
        </div>
      </div>

      {/* オプション絞り込み */}
      <div className="filter-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, minWidth: '70px' }}>オプション:</span>
        <div className="filter-group">
          <button
            className={`filter-btn toggle-btn ${showFavoritesOnly ? 'active' : ''}`}
            onClick={onToggleShowFavoritesOnly}
            style={{
              borderColor: showFavoritesOnly ? '#ec4899' : 'rgba(255,255,255,0.1)',
              background: showFavoritesOnly ? 'rgba(236,72,153,0.15)' : 'none',
              color: showFavoritesOnly ? '#f472b6' : 'var(--text-sub)'
            }}
            id="btn-toggle-favorites-only"
          >
            ♥ お気に入りのみ表示
          </button>
          <button
            className={`filter-btn toggle-btn ${showBulkOnly ? 'active' : ''}`}
            onClick={onToggleShowBulkOnly}
            style={{
              borderColor: showBulkOnly ? '#06b6d4' : 'rgba(255,255,255,0.1)',
              background: showBulkOnly ? 'rgba(6,182,212,0.15)' : 'none',
              color: showBulkOnly ? '#06b6d4' : 'var(--text-sub)'
            }}
            id="btn-toggle-bulk-only"
          >
            📚 一挙公開のみ表示
          </button>
          <button
            className={`filter-btn toggle-btn ${hideUpcoming ? 'active' : ''}`}
            onClick={onToggleHideUpcoming}
            style={{
              borderColor: hideUpcoming ? '#f59e0b' : 'rgba(255,255,255,0.1)',
              background: hideUpcoming ? 'rgba(245,158,11,0.15)' : 'none',
              color: hideUpcoming ? '#fbbf24' : 'var(--text-sub)'
            }}
            id="btn-toggle-hide-upcoming"
          >
            🎬 配信予定を表示しない
          </button>
        </div>
      </div>
    </div>
  );
}
