// routes/spotify.js
const express = require('express');
const router = express.Router();
const spotifyController = require('../controllers/spotifyController');
const authenticate = require('../middleware/authenticate');

router.get('/spotify/login', spotifyController.login);
router.get('/callback', spotifyController.callback);
router.get('/spotify/status', spotifyController.status);
router.get('/spotify/current', authenticate, spotifyController.currentTrack);
router.post('/spotify/pause', authenticate, spotifyController.pause);
router.post('/spotify/next', authenticate, spotifyController.next);
router.get('/spotify/volume', authenticate, spotifyController.getVolume);
router.post('/spotify/volume', authenticate, spotifyController.setVolume);
router.get('/spotify/devices', authenticate, spotifyController.getDevices);
router.post('/spotify/play', authenticate, spotifyController.play);
router.get('/spotify/search', authenticate, spotifyController.search);

module.exports = router;
