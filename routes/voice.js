const express = require('express');
const router = express.Router();
const { parseIntent } = require('../utils/intentParser');
const {
    handlePlayTrack,
    handlePlayTopTrack,
    handlePlayPlaylist,
    handleVolumeChange,
    handlePause,
    handleResume,
    handleNext
} = require('../services/spotifyService');

router.post('/api/voice/execute', async (req, res) => {
    const { command } = req.body;

    if (!command) {
        return res.status(400).json({ message: 'Chybí hlasový příkaz.' });
    }

    const token = req.cookies.spotify_access_token;
    if (!token) return res.status(401).json({ message: 'Spotify není přihlášeno.' });

    const intent = parseIntent(command);
    if (!intent) {
        return res.json({ message: `Příkaz nerozpoznán: "${command}"` });
    }

    switch (intent.type) {
        case 'play_track':
            return await handlePlayTrack(intent.query, token, res);

        case 'play_top_by_artist':
            return await handlePlayTopTrack(intent.artist, token, res);

        case 'play_playlist':
            return await handlePlayPlaylist(intent.name, token, res);

        case 'volume':
            return await handleVolumeChange(intent.value, token, res);

        case 'pause':
            return await handlePause(token, res);

        case 'resume':
            return await handleResume(token, res);

        case 'next':
            return await handleNext(token, res);

        default:
            return res.json({ message: 'Příkaz nerozpoznán nebo není podporován.' });
    }
});

module.exports = router;
