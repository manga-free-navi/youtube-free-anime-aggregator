const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
require('dotenv').config();

// チャンネルリストを読み込む
const channelsPath = path.join(__dirname, 'channels.json');
const channels = JSON.parse(fs.readFileSync(channelsPath, 'utf8'));

// 出力先ディレクトリの準備
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const outputPath = path.join(dataDir, 'videos.json');

// 原作タイトル推測用キーワードマップ
const ORIGINAL_WORK_MAP = {
  "フリーレン": "葬送のフリーレン",
  "キャプテン翼": "キャプテン翼",
  "ガンダム": "機動戦士ガンダム",
  "名探偵コナン": "名探偵コナン",
  "ルパン三世": "ルパン三世",
  "デュエル・マスターズ": "デュエル・マスターズ",
  "デュエマ": "デュエル・マスターズ",
  "イナズマイレブン": "イナズマイレブン",
  "妖怪ウォッチ": "妖怪ウォッチ",
  "ブルーロック": "ブルーロック",
  "転スラ": "転生したらスライムだった件",
  "転生したらスライムだった件": "転生したらスライムだった件",
  "呪術廻戦": "呪術廻戦",
  "チェンソーマン": "チェンソーマン",
  "鬼滅の刃": "鬼滅の刃",
  "僕のヒーローアカデミア": "僕のヒーローアカデミア",
  "ヒロアカ": "僕のヒーローアカデミア",
  "ハイキュー": "ハイキュー!!",
  "ワンピース": "ONE PIECE",
  "ONE PIECE": "ONE PIECE",
  "ドラゴンボール": "ドラゴンボール",
  "ナルト": "NARUTO",
  "NARUTO": "NARUTO"
};

/**
 * 動画タイトルから原作コミック名を推測する
 */
function guessOriginalWorkTitle(title) {
  for (const [key, value] of Object.entries(ORIGINAL_WORK_MAP)) {
    if (title.includes(key)) {
      return value;
    }
  }
  return "";
}

/**
 * 動画の説明文（あらすじ等）から配信終了日を正規表現で自動抽出する
 */
function extractEndDate(description) {
  if (!description) return null;
  
  // 日付抽出用パターン（「まで」「終了」「公開終了」などの文脈から推測）
  const datePatterns = [
    // 2026/06/30, 2026-06-30, 2026年6月30日
    /(\d{4})[/\-年](\d{1,2})[/\-月](\d{1,2})[日]?(?:\s*\d{1,2}:\d{2})?\s*(?:まで|公開終了|配信終了|終了|キャンペーン期間)/i,
    // 6/30, 6月30日 (年がない場合は現在の年を補完)
    /(\d{1,2})[/\-月](\d{1,2})[日]?(?:\s*\d{1,2}:\d{2})?\s*(?:まで|公開終了|配信終了|終了|キャンペーン期間)/i
  ];

  const now = new Date();
  const currentYear = now.getFullYear();

  for (const pattern of datePatterns) {
    const match = description.match(pattern);
    if (match) {
      if (match[1].length === 4) {
        // 年月日がすべて揃っている場合
        const year = match[1];
        const month = String(match[2]).padStart(2, '0');
        const day = String(match[3]).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } else {
        // 月日のみの場合、現在の年を補完
        const month = String(match[1]).padStart(2, '0');
        const day = String(match[2]).padStart(2, '0');
        return `${currentYear}-${month}-${day}`;
      }
    }
  }
  return null;
}

/**
 * 各チャンネルのRSSフィードを取得・パースする
 */
async function fetchChannelRss(channel) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`;
  console.log(`Fetching RSS for ${channel.displayName} (${channel.name})...`);
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });
    
    // XMLモードで読み込み
    const $ = cheerio.load(response.data, { xmlMode: true });
    const videos = [];
    
    $('entry').each((index, element) => {
      const entry = $(element);
      const id = entry.find('yt\\:videoId').text() || entry.find('videoId').text();
      const title = entry.find('title').text();
      const publishedAt = entry.find('published').text();
      const description = entry.find('media\\:description').text() || entry.find('description').text() || "";
      const thumbnailUrl = entry.find('media\\:thumbnail').attr('url') || `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
      
      if (id && title) {
        videos.push({
          id,
          title,
          channelId: channel.id,
          channelName: channel.displayName,
          category: channel.category,
          publishedAt,
          description,
          thumbnailUrl,
          originalWorkTitle: guessOriginalWorkTitle(title),
          endDate: extractEndDate(description),
          isManual: false
        });
      }
    });
    
    console.log(`Successfully fetched ${videos.length} videos from ${channel.displayName}.`);
    return videos;
  } catch (error) {
    console.error(`Error fetching RSS for ${channel.displayName}:`, error.message);
    return [];
  }
}

// ISO 8601 duration から秒数に変換するヘルパー関数
function parseISO8601Duration(durationStr) {
  const match = durationStr.match(/P(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || 0, 10);
  const minutes = parseInt(match[2] || 0, 10);
  const seconds = parseInt(match[3] || 0, 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// PVや切り抜きなどの典型的なキーワード判定
function isPvOrClip(title) {
  const patterns = [
    /pv/i, /予告/i, /特報/i, /ティザー/i, /ノンクレジット/i, /ノンクレ/i,
    /オープニング/i, /エンディング/i, /\bOP\b/i, /\bED\b/i, /【OP】/i, /【ED】/i,
    /宣伝/i, /\bCM\b/i, /コメント/i, /一問一答/i, /ダイジェスト/i, /切り抜き/i,
    /\bMV\b/i, /ミュージックビデオ/i, /ボイスコミック/i, /コミック動画/i,
    /映画公開記念/i, /舞台挨拶/i, /特別映像/i, /紹介映像/i, /番宣/i, /インタビュー/i
  ];
  return patterns.some(pattern => pattern.test(title));
}

// YouTube APIを使用して動画の長さを一括取得し、4分（240秒）以下のものを除外する
async function filterShortVideosWithApi(videos, apiKey) {
  const videoIds = videos.map(v => v.id);
  const durationMap = new Map();

  // 50件ずつバッチ処理
  const batchSize = 50;
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batchIds = videoIds.slice(i, i + batchSize).join(',');
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${batchIds}&key=${apiKey}`;
    
    try {
      const response = await axios.get(url);
      if (response.data && response.data.items) {
        for (const item of response.data.items) {
          const durationStr = item.contentDetails?.duration;
          if (durationStr) {
            const seconds = parseISO8601Duration(durationStr);
            durationMap.set(item.id, seconds);
          }
        }
      }
    } catch (e) {
      console.error(`Error fetching video details from YouTube API: ${e.message}`);
    }
  }

  // 4分（240秒）を超えるもの、または再生時間が取得できなかった（APIエラーなど）ものだけを残す
  return videos.filter(video => {
    const seconds = durationMap.get(video.id);
    if (seconds !== undefined) {
      return seconds > 240; // 4分（240秒）超
    }
    // API情報がない場合は、念のためキーワードフィルタでフォールバック
    return !isPvOrClip(video.title);
  });
}

// ABEMA本家からのメタデータ抽出処理
async function fetchAbemaMetadata(item) {
  console.log(`Fetching ABEMA metadata for: ${item.url}...`);
  try {
    const response = await axios.get(item.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const ogImage = $('meta[property="og:image"]').attr('content') || '';
    const ogDescription = $('meta[property="og:description"]').attr('content') || '';

    // __DEHYDRATED_STATE__ からタイトル抽出を試みる（フォールバック）
    let dehydratedTitle = null;
    const htmlContent = response.data;
    const stateMatch = htmlContent.match(/window\.__DEHYDRATED_STATE__\s*=\s*(\{.*?\});/);
    if (stateMatch) {
      const titleMatch = stateMatch[1].match(/'title'\s*:\s*'(.*?)'/);
      if (titleMatch) {
        try {
          dehydratedTitle = titleMatch[1].replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
            return String.fromCharCode(parseInt(grp, 16));
          });
        } catch (e) {
          console.error("Failed to decode unicode title:", e.message);
        }
      }
    }

    // 最終的なタイトル決定
    let displayTitle = dehydratedTitle || (ogTitle.includes(' - ') ? ogTitle.split(' - ')[0].trim() : ogTitle);
    if (!displayTitle) {
      displayTitle = item.originalWorkTitle;
    }
    
    // 表示上のタイトルに毎週無料の注記を追加
    const finalTitle = `${displayTitle} (毎週無料枠)`;

    // タイトルIDを抽出して一意のIDを作る
    const idMatch = item.url.match(/title\/(.+)$/);
    const titleId = idMatch ? idMatch[1] : Math.random().toString(36).substring(7);
    const videoId = `abema-${titleId}`;

    return {
      id: videoId,
      title: finalTitle,
      channelId: "abema",
      channelName: "ABEMA",
      category: item.category || "アニメ",
      publishedAt: new Date().toISOString(),
      description: ogDescription,
      thumbnailUrl: ogImage,
      originalWorkTitle: item.originalWorkTitle,
      endDate: null,
      isManual: true,
      url: item.url
    };
  } catch (error) {
    console.error(`Error fetching ABEMA metadata for ${item.url}:`, error.message);
    const idMatch = item.url.match(/title\/(.+)$/);
    const titleId = idMatch ? idMatch[1] : Math.random().toString(36).substring(7);
    return {
      id: `abema-${titleId}`,
      title: `${item.originalWorkTitle} (毎週無料枠)`,
      channelId: "abema",
      channelName: "ABEMA",
      category: item.category || "アニメ",
      publishedAt: new Date().toISOString(),
      description: `${item.originalWorkTitle}のABEMA無料配信ページです。`,
      thumbnailUrl: "",
      originalWorkTitle: item.originalWorkTitle,
      endDate: null,
      isManual: true,
      url: item.url
    };
  }
}

// EPG自動収集用のチャンネルID
const ABEMA_TARGET_CHANNELS = new Set([
  'abema-anime', 'abema-anime-2', 'abema-anime-3',
  'special-plus-7', 'anime-special-2',
  'isekai-anime', 'isekai-anime-2', 'isekai-anime-3',
  'lovecomedy-anime', 'dailylife-anime', 'late-night-anime',
  'anime-live', 'anime-live2'
]);

// EPGの時刻形式 (20260612150000 +0000) を ISO形式 (2026-06-12T15:00:00.000Z) に変換する
function parseEPGTime(timeStr) {
  if (!timeStr) return new Date().toISOString();
  const match = timeStr.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s+([\+\-]\d{4})/);
  if (!match) return new Date().toISOString();
  const [_, year, month, day, hour, min, sec, tz] = match;
  return `${year}-${month}-${day}T${hour}:${min}:${sec}Z`;
}

// タイトルのクレンジング
function cleanProgramTitle(title) {
  let clean = title;
  clean = clean.replace(/【.*?】/g, '');
  clean = clean.replace(/\[.*?\]/g, '');
  clean = clean.replace(/\(.*?\)/g, '');
  clean = clean.replace(/\s*#\s*\d+.*$/, '');
  clean = clean.replace(/\s*第\s*\d+\s*[話期].*$/, '');
  clean = clean.replace(/\s*\d+\s*話.*$/, '');
  clean = clean.replace(/^『(.*?)』$/, '$1');
  clean = clean.replace(/^「(.*?)」$/, '$1');
  clean = clean.replace(/・見逃し放送.*/g, '');
  clean = clean.replace(/・見逃し.*/g, '');
  clean = clean.replace(/一挙.*/g, '');
  return clean.trim();
}

// EPG XMLからABEMAの無料アニメ番組情報を全自動収集する
async function fetchAbemaFromEPG(youtubeVideos) {
  const url = 'https://raw.githubusercontent.com/dbghelp/Abema-TV-EPG/refs/heads/main/abema.xml';
  console.log(`Fetching ABEMA EPG from ${url}...`);
  try {
    const response = await axios.get(url, { timeout: 15000 });
    const $ = cheerio.load(response.data, { xmlMode: true });
    
    const uniquePrograms = new Map();
    
    // YouTube動画から「原作名」と「画像URL」のマップを作成（名寄せ用）
    const youtubeTitleMap = new Map();
    for (const v of youtubeVideos) {
      if (v.originalWorkTitle && v.thumbnailUrl) {
        youtubeTitleMap.set(v.originalWorkTitle, v.thumbnailUrl);
      }
      const cleanYtTitle = cleanProgramTitle(v.title);
      if (cleanYtTitle && v.thumbnailUrl) {
        youtubeTitleMap.set(cleanYtTitle, v.thumbnailUrl);
      }
    }

    $('programme').each((i, el) => {
      const channel = $(el).attr('channel');
      if (!ABEMA_TARGET_CHANNELS.has(channel)) return;

      const rawTitle = $(el).find('title').text();
      const desc = $(el).find('desc').text() || '';
      const start = $(el).attr('start');
      const iconUrl = $(el).find('icon').attr('src') || '';
      
      const cleanTitle = cleanProgramTitle(rawTitle);
      
      // 無駄な特番や枠を除外
      if (cleanTitle.length <= 1 || 
          cleanTitle === 'アニメ' || 
          cleanTitle === '特別番組' || 
          cleanTitle.includes('ABEMAアニメ') ||
          cleanTitle.includes('アベマ') ||
          cleanTitle.includes('声優と夜あそび') ||
          cleanTitle.includes('宣伝') ||
          cleanTitle.includes('特番')) {
        return;
      }

      // 重複は最初に見つかったものを優先
      if (!uniquePrograms.has(cleanTitle)) {
        let matchedThumbnail = iconUrl;
        let originalWork = '';
        
        // 名寄せ（YouTubeサムネイルおよび原作タイトル）の探索
        let ytThumbnail = '';
        if (youtubeTitleMap.has(cleanTitle)) {
          ytThumbnail = youtubeTitleMap.get(cleanTitle);
          originalWork = cleanTitle;
        } else {
          for (const [key, thumb] of youtubeTitleMap.entries()) {
            if (cleanTitle.includes(key) || key.includes(cleanTitle)) {
              ytThumbnail = thumb;
              originalWork = key;
              break;
            }
          }
        }

        // サムネイル画像：EPG公式画像を最優先、なければYouTube名寄せ画像、それもなければプレースホルダー
        if (!matchedThumbnail) {
          matchedThumbnail = ytThumbnail || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=60';
        }

        const searchUrl = `https://abema.tv/search?q=${encodeURIComponent(cleanTitle)}`;
        const startIso = parseEPGTime(start);
        const safeId = Buffer.from(cleanTitle).toString('base64').replace(/=/g, '').substring(0, 12);
        
        uniquePrograms.set(cleanTitle, {
          id: `abema-auto-${safeId}`,
          title: `${cleanTitle} (ABEMA無料配信中)`,
          channelId: 'abema',
          channelName: 'ABEMA',
          category: 'アニメ',
          publishedAt: startIso,
          description: desc || `${cleanTitle}のABEMA無料配信情報です。`,
          thumbnailUrl: matchedThumbnail,
          originalWorkTitle: originalWork || cleanTitle,
          endDate: null,
          isManual: true,
          url: searchUrl
        });
      }
    });

    console.log(`Successfully extracted ${uniquePrograms.size} unique Anime programs from ABEMA EPG.`);
    return Array.from(uniquePrograms.values());
  } catch (error) {
    console.error('Failed to auto-import ABEMA from EPG:', error.message);
    return [];
  }
}

async function main() {
  let allVideos = [];
  
  for (const channel of channels) {
    const videos = await fetchChannelRss(channel);
    allVideos = allVideos.concat(videos);
    // YouTubeサーバー負荷軽減のため、1秒スリープを挟む
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const apiKey = process.env.YOUTUBE_API_KEY;
  let filteredVideos = [];
  
  if (apiKey) {
    console.log("YouTube API key detected. Filtering short videos using API...");
    filteredVideos = await filterShortVideosWithApi(allVideos, apiKey);
  } else {
    console.log("No YouTube API key detected. Filtering using title keywords...");
    filteredVideos = allVideos.filter(video => !isPvOrClip(video.title));
  }
  
  // ABEMAタイトルのロードとフェッチ (手動管理分)
  const abemaTitlesPath = path.join(__dirname, 'abema_titles.json');
  let abemaVideos = [];
  if (fs.existsSync(abemaTitlesPath)) {
    console.log("Loading ABEMA titles from abema_titles.json...");
    try {
      const abemaTitles = JSON.parse(fs.readFileSync(abemaTitlesPath, 'utf8'));
      for (const item of abemaTitles) {
        if (item.url) {
          const video = await fetchAbemaMetadata(item);
          abemaVideos.push(video);
          // 負荷軽減スリープ
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (e) {
      console.error("Error loading or processing ABEMA titles:", e.message);
    }
  }

  // EPGからの全自動無料アニメ収集
  const abemaEpgVideos = await fetchAbemaFromEPG(filteredVideos);

  // すべての動画をマージ (YouTube + 手動ABEMA + EPG自動ABEMA)
  const mergedVideos = filteredVideos.concat(abemaVideos).concat(abemaEpgVideos);
  
  // 日付順（新しい順）にソート
  mergedVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  
  // JSONファイルとして書き出し
  fs.writeFileSync(outputPath, JSON.stringify(mergedVideos, null, 2), 'utf8');
  console.log("Scraper execution complete.");
}

main();

