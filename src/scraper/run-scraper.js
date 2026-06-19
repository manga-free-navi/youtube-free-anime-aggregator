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

async function main() {
  let allVideos = [];
  
  for (const channel of channels) {
    const videos = await fetchChannelRss(channel);
    allVideos = allVideos.concat(videos);
    // YouTubeサーバー負荷軽減のため、1秒スリープを挟む
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // 日付順（新しい順）にソート
  allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  
  // JSONファイルとして書き出し
  fs.writeFileSync(outputPath, JSON.stringify(allVideos, null, 2), 'utf8');
  console.log(`Scraper execution complete. Saved ${allVideos.length} videos to ${outputPath}.`);
}

main();
