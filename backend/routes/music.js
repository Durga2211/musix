const router = require('express').Router();
const { search, stream } = require('../controllers/musicController');
router.get('/search', search);
router.get('/stream/:videoId', stream);
module.exports = router;