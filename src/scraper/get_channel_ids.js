const axios = require('axios');

const handles = [
  '@GUNDAM',
  '@toeianime_MC',
  '@KADOKAWAanime',
  '@Aniplex',
  '@emotionlabelchannel',
  '@jumpch',
  '@TMSanimeJP',
  '@corocoro',
  '@avexpictures',
  '@nbcuniversalanimemusic'
];

async function getChannelId(handle) {
  try {
    const url = `https://www.youtube.com/${handle}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
      }
    });
    
    // HTMLから "channelId" または リンクに含まれる UC... を探す
    const match = response.data.match(/"channelId"\s*:\s*"([^"]+)"/) || response.data.match(/https:\/\/www.youtube.com\/channel\/(UC[a-zA-Z0-9_-]{22})/);
    if (match) {
      return match[1];
    }
    
    // meta情報から探す
    const metaMatch = response.data.match(/<meta itemprop="channelId" content="([^"]+)"/);
    if (metaMatch) {
      return metaMatch[1];
    }
    
    // もし他に見つからなければ browseId などを探す
    const browseMatch = response.data.match(/"browseId"\s*:\s*"(UC[a-zA-Z0-9_-]{22})"/);
    if (browseMatch) {
      return browseMatch[1];
    }
    
    return null;
  } catch (e) {
    console.error(`Error for ${handle}:`, e.message);
    return null;
  }
}

async function main() {
  console.log("Starting YouTube Channel ID resolution...");
  for (const handle of handles) {
    const id = await getChannelId(handle);
    console.log(`${handle}: ${id}`);
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log("Resolution finished.");
}

main();
