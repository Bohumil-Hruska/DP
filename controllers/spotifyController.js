// controllers/spotifyController.js
const querystring = require('querystring');
const fetch = require('node-fetch');

const login = (req, res) => {
    const scope = 'user-read-playback-state user-modify-playback-state';
    const params = querystring.stringify({
        response_type: 'code',
        client_id: process.env.SPOTIFY_CLIENT_ID,
        scope,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI
    });

    res.redirect('https://accounts.spotify.com/authorize?' + params);
};

const callback = async (req, res) => {
    const code = req.query.code;

    try {
        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from(
                    process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
                ).toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: querystring.stringify({
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.SPOTIFY_REDIRECT_URI
            })
        });

        const data = await response.json();

        if (data.access_token) {
            res.cookie('spotify_access_token', data.access_token, {
                httpOnly: true,
                secure: true,
                sameSite: 'Strict',
                maxAge: 3600 * 1000
            });
            res.redirect('/');
        } else {
            console.error("Token získání selhalo:", data);
            res.status(400).send('Chyba při přihlášení ke Spotify');
        }
    } catch (err) {
        console.error("Chyba ve /callback:", err);
        res.status(500).send('Chyba serveru při přihlašování ke Spotify');
    }
};

const status = (req, res) => {
    const token = req.cookies?.spotify_access_token;
    if (!token) return res.status(401).json({ loggedIn: false });
    res.json({ loggedIn: true });
};

exports.currentTrack = async (req, res) => {
    const token = req.cookies.spotify_access_token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (response.status === 204) return res.json(null);
    const data = await response.json();
    res.json(data);
};

exports.pause = async (req, res) => {
    const token = req.cookies.spotify_access_token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const response = await fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
    });

    res.sendStatus(response.ok ? 204 : 500);
};

exports.next = async (req, res) => {
    const token = req.cookies.spotify_access_token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const response = await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
    });

    res.sendStatus(response.ok ? 204 : 500);
};

exports.getVolume = async (req, res) => {
    const token = req.cookies.spotify_access_token;
    if (!token) return res.status(401).json({ error: 'Spotify není přihlášeno.' });

    try {
        const response = await fetch('https://api.spotify.com/v1/me/player', {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (!data || !data.device) return res.status(404).json({ error: 'Zařízení nebylo nalezeno.' });
        return res.json({ volume: data.device.volume_percent });
    } catch (err) {
        console.error('Chyba při načítání hlasitosti:', err);
        return res.status(500).json({ error: 'Chyba při získávání hlasitosti.' });
    }
};

exports.setVolume = async (req, res) => {
    const token = req.cookies.spotify_access_token;
    const { volume } = req.body;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const response = await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
    });

    res.sendStatus(response.ok ? 204 : 500);
};

exports.getDevices = async (req, res) => {
    const token = req.cookies.spotify_access_token;
    if (!token) return res.status(401).json({ error: 'Neautorizováno' });

    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    res.json(data);
};

exports.play = async (req, res) => {
    const token = req.cookies.spotify_access_token;
    const { deviceId, trackUri, contextUri } = req.body;

    if (!token || !deviceId || (!trackUri && !contextUri)) {
        return res.status(400).json({ error: 'Chybí potřebné parametry' });
    }

    const payload = contextUri
        ? { context_uri: contextUri }
        : { uris: [trackUri] };

    const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (response.ok) {
        res.json({ success: true });
    } else {
        const err = await response.json();
        console.error('Spotify play error:', err);
        res.status(500).json({ error: err });
    }
};

exports.search = async (req, res) => {
    const token = req.cookies.spotify_access_token;
    const query = req.query.q;

    if (!token || !query) return res.status(400).json({ error: 'Chybí token nebo dotaz' });

    const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,album,playlist&limit=5`,
        {
            headers: { Authorization: `Bearer ${token}` },
        }
    );

    const data = await response.json();
    const allItems = [
        ...(data.tracks?.items || []),
        ...(data.albums?.items || []),
        ...(data.playlists?.items || [])
    ];

    res.json(allItems);
};

module.exports = {
    login,
    callback,
    status
};
