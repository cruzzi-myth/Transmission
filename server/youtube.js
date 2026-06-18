import express from 'express';

const router = express.Router();
const cache = new Map();
const CACHE_DURATION = 1000 * 60 * 60 * 3; // 3 hours

async function fetchYouTube(params) {
  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('key', process.env.YOUTUBE_API_KEY);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('maxResults', '12');
  url.searchParams.set('type', 'video');

  const res = await fetch(url);
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`YouTube API error: ${res.status} ${errBody}`);
  }
  const data = await res.json();

  return data.items.map(item => ({
    id: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    embedUrl: `https://www.youtube.com/embed/${item.id.videoId}`,
  }));
}

router.get('/category/:name', async (req, res) => {
  const { name } = req.params;
  const cacheKey = `category-${name}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return res.json(cached.data);
  }

  const queryMap = {
    music: { q: 'official music video', videoCategoryId: '10' },
    trending: { q: 'trending', order: 'viewCount' },
  };

  const params = queryMap[name] || { q: name };

  try {
    const data = await fetchYouTube(params);
    cache.set(cacheKey, { data, timestamp: Date.now() });
    res.json(data);
  } catch (err) {
    console.error('YouTube fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch YouTube content' });
  }
});

export default router;