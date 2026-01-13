const express = require('express');
const axios = require('axios');
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

const {
    handleDeviceOn,
    handleDeviceOff
} = require('../services/deviceService');

router.post('/api/voice/execute', async (req, res) => {
    const { command } = req.body;

    if (String(command).trim().length < 2) {
        return res.json({ message: "Příkaz je příliš krátký." });
    }


    if (!command) {
        return res.status(400).json({
            message: 'Chybí hlasový příkaz.'
        });
    }

    // ✅ 1) nejdřív intent
    const intent = parseIntent(command);

    if (!intent) {
        return res.json({
            message: `Příkaz nerozpoznán: "${command}"`
        });
    }

    console.log('Voice intent:', intent);

    // ✅ 2) Spotify token vyžaduj jen pro Spotify příkazy
    const spotifyIntents = new Set([
        'play_track',
        'play_top_by_artist',
        'play_playlist',
        'volume',
        'pause',
        'resume',
        'next'
    ]);

    const token = req.cookies.spotify_access_token;

    if (spotifyIntents.has(intent.type) && !token) {
        return res.status(401).json({
            message: 'Spotify není přihlášeno.'
        });
    }

    // ✅ 3) switch
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

        case 'light_on': {
            const result = await handleDeviceOn(
                intent.deviceId,
                req.headers.authorization
            );

            if (result.success) {
                return res.json({ message: result.message });
            }

            return res.status(500).json({ message: result.message });
        }

        case 'light_off': {
            const result = await handleDeviceOff(
                intent.deviceId,
                req.headers.authorization
            );

            if (result.success) {
                return res.json({ message: result.message });
            }

            return res.status(500).json({ message: result.message });
        }

        case 'get_time': {
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');

            if (mm === '00') {
                return res.json({
                    message: `Je ${hh} hodin.`
                });
            }

            return res.json({
                message: `Je ${hh} hodin ${mm} minut.`
            });
        }

        case 'get_weather': {
            try {
                const { getCurrentWeather } = require('../services/weatherService');

                const lat = req.body?.lat;
                const lon = req.body?.lon;

                const weather = await getCurrentWeather(
                    lat && lon
                        ? { lat, lon }
                        : { city: process.env.HOME_CITY || 'Prague' }
                );

                const msg =
                    `Aktuálně v ${weather.city} je ${Math.round(weather.tempC)} stupňů` +
                    (weather.text ? ` a ${weather.text}.` : '.');

                return res.json({ message: msg });
            } catch (e) {
                console.error('Weather error:', e.message);
                return res.json({
                    message: 'Počasí se nepodařilo načíst.'
                });
            }
        }

        case 'create_note': {
            const { addNote } = require('../services/notesService');
            addNote(intent.text);

            return res.json({
                message: 'Poznámka uložena.'
            });
        }

        case 'list_notes': {
            const { listNotes } = require('../services/notesService');
            const notes = listNotes(3);

            if (notes.length === 0) {
                return res.json({
                    message: 'Nemáš žádné poznámky.'
                });
            }

            const text = notes
                .map((n, i) => `${i + 1}. ${n.text}`)
                .join(' ');

            return res.json({
                message: `Tvoje poslední poznámky: ${text}`
            });
        }

        default:
            return res.json({
                message: 'Příkaz nerozpoznán nebo není podporován.'
            });
    }
});

module.exports = router;
