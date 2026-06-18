const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export async function fetchYouTubeCategory(categoryName) {
  const res = await fetch(`${SERVER_URL}/api/youtube/category/${categoryName}`);
  if (!res.ok) throw new Error('Failed to fetch YouTube category');
  const data = await res.json();

  // Normalize YouTube's shape to match ContentCard's expected shape
  return data.map((video) => ({
    id: video.id,
    title: video.title,
    image: video.thumbnail,
    isUpload: false,
    watchPath: `/youtube/${video.id}`,
    creatorName: video.channelTitle,
  }));
}