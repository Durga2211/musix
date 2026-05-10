const Song = require('../models/Song');
exports.addSong = async (req, res) => {
  try {
    const song = await Song.findOneAndUpdate(
      { videoId: req.body.videoId },
      req.body,
      { upsert: true, new: true }
    );
    res.json(song);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getLibrary = async (req, res) => {
  const songs = await Song.find().sort({ addedAt: -1 });
  res.json(songs);
};
exports.deleteSong = async (req, res) => {
  await Song.findOneAndDelete({ videoId: req.params.videoId });
  res.json({ success: true });
};