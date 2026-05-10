const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
async function searchYouTube(query) {
  const cmd = `yt-dlp "ytsearch5:${query}" --dump-json --flat-playlist --no-warnings`;
  const { stdout } = await execAsync(cmd);
  return stdout.trim().split('\n')
    .filter(Boolean)
    .map(line => {
      const data = JSON.parse(line);
      return {
        videoId: data.id,
        title: data.title,
        artist: data.uploader || data.channel,
        duration: data.duration,
        thumbnail: data.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${data.id}/hqdefault.jpg`
      };
    });
}
async function getAudioUrl(videoId) {
  const cmd = `yt-dlp -f bestaudio -g --no-warnings "https://www.youtube.com/watch?v=${videoId}"`;
  const { stdout } = await execAsync(cmd);
  return stdout.trim(); 
}

module.exports = { searchYouTube, getAudioUrl };