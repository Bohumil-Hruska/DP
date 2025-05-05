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
            await handlePlayTrack(intent.query, token, res);
            break;

        case 'play_top_by_artist':
            await handlePlayTopTrack(intent.artist, token, res);
            break;

        case 'play_playlist':
            await handlePlayPlaylist(intent.name, token, res);
            break;

        case 'volume':
            await handleVolumeChange(intent.value, token, res);
            break;

        case 'pause':
            await handlePause(token, res);
            break;

        case 'resume':
            await handleResume(token, res);
            break;

        case 'next':
            await handleNext(token, res);
            break;

        default:
            return res.json({ message: 'Příkaz nerozpoznán nebo není podporován.' });
    }

// 🔊 Odešli hlasovou odpověď (pokud byl příkaz úspěšný)
    if (intent.tts) {
        return res.json({ message: intent.tts });
    } else {
        return res.json({ message: 'Příkaz proveden.' });
    }

});

module.exports = router;
