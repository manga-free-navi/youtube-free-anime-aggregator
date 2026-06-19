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
    </div>
  );
}
