const mongoose = require('mongoose');
const SongSchema = new mongoose.Schema({
  videoId:   { type: String, required: true, unique: true },
  title:     { type: String, required: true },
  artist:    String,
  thumbnail: String,
  duration:  Number,
  addedAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Song', SongSchema);