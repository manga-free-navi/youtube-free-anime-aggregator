import { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import HomeClient from './page_client';

// 静的エクスポート時に現在配信中の主要アニメを description / OGP画像に動的埋め込みするSEO対策
export async function generateMetadata(): Promise<Metadata> {
  let topAnimes = '';
  let ogImage = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=60'; // デフォルトOGP

  try {
    const filePath = path.join(process.cwd(), 'src', 'data', 'videos.json');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      const videos = JSON.parse(content);
      if (Array.isArray(videos)) {
        // 無料配信中の主要作品（ABEMA枠、または一挙配信）を最大5作品抽出
        const targetAnimes = videos
          .filter(v => v.channelId === 'abema' || v.isBulk)
          .slice(0, 5);
          
        if (targetAnimes.length > 0) {
          topAnimes = targetAnimes.map(v => v.title.replace(/\s*\(ABEMA無料配信(中|予定)\)/, '')).join('、');
          // 403画像のブロックを避けるため、YouTube側のサムネイルを最優先でOGP画像にする
          const bestThumb = targetAnimes.find(v => v.thumbnailUrl && !v.thumbnailUrl.includes('hayabusa.io') && !v.thumbnailUrl.includes('abema'));
          if (bestThumb) {
            ogImage = bestThumb.thumbnailUrl;
          } else if (targetAnimes[0]?.thumbnailUrl) {
            ogImage = targetAnimes[0].thumbnailUrl;
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed to generate dynamic SEO metadata:', e);
  }

  const baseDescription = 'YouTubeの公式アニメチャンネルやABEMAで期間限定無料公開されている人気アニメ本編や劇場版映画の情報を自動集約。その場で直接再生できます。';
  const description = topAnimes 
    ? `【公式無料アニメ配信中】現在、${topAnimes} などを期間限定で無料公開中！ ${baseDescription}`
    : baseDescription;

  return {
    title: 'アニメ公式無料配信情報ナビ | アニフリー',
    description: description,
    openGraph: {
      title: 'アニメ公式無料配信情報ナビ | アニフリー',
      description: description,
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'アニメ公式無料配信情報ナビ | アニフリー',
      description: description,
      images: [ogImage],
    }
  };
}

export default function Home() {
  return <HomeClient />;
}
