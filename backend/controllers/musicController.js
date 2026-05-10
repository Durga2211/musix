const { searchYouTube, getAudioUrl } = require('../services/ytdlp');
exports.search = async (req, res) => {
  try {
    const results = await searchYouTube(req.query.q);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.stream = async (req, res) => {
  try {
    const audioUrl = await getAudioUrl(req.params.videoId);
    res.json({ audioUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};