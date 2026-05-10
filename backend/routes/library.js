const router = require('express').Router();
const { addSong, getLibrary, deleteSong } = require('../controllers/libraryController');
router.get('/', getLibrary);
router.post('/', addSong);
router.delete('/:videoId', deleteSong);
module.exports = router;