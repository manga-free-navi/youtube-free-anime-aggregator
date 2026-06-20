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
  
  // 日付順（新しい順）にソート
  filteredVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  
  // JSONファイルとして書き出し
  fs.writeFileSync(outputPath, JSON.stringify(filteredVideos, null, 2), 'utf8');
  console.log(`Scraper execution complete. Saved ${filteredVideos.length} videos to ${outputPath}.`);
}

main();

