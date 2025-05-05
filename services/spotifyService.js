const fetch = require('node-fetch');

// Získá aktivní zařízení
async function getActiveDeviceId(token) {
    const res = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    const device = data.devices?.[0];
    return device?.id || null;
}

// ▶ Přehraj konkrétní skladbu
async function handlePlayTrack(query, token, res) {
    try {
        const search = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await search.json();
        const track = data.tracks?.items?.[0];

        if (!track) return res.json({ message: `Skladba "${query}" nebyla nalezena.` });

        const recRes = await fetch(`https://api.spotify.com/v1/recommendations?seed_tracks=${track.id}&limit=20`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const recData = await recRes.json();

        const uris = [track.uri, ...recData.tracks.map(t => t.uri)];
        if (!uris || uris.length === 0) return res.status(404).json({ message: 'Nebyly nalezeny žádné podobné skladby.' });

        const deviceId = await getActiveDeviceId(token);
        if (!deviceId) return res.status(400).json({ message: 'Chybí aktivní zařízení.' });

        // ▶ Spusť přehrávání jako playlist
        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uris })
        });

        return res.json({ message: `▶ Spuštěno rádio na základě skladby: ${track.name} od ${track.artists.map(a => a.name).join(', ')}` });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Chyba při přehrávání rádia.' });
    }
}


// ▶ Přehraj top skladbu interpreta
async function handlePlayTopTrack(artistName, token, res) {
    try {
        const artistRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const artistData = await artistRes.json();
        const artist = artistData.artists?.items?.[0];

        if (!artist) return res.json({ message: `Umělec "${artistName}" nebyl nalezen.` });

        const topRes = await fetch(`https://api.spotify.com/v1/artists/${artist.id}/top-tracks?market=CZ`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const topData = await topRes.json();
        const track = topData.tracks?.[0];

        if (!track) return res.json({ message: `Top skladba pro ${artist.name} nebyla nalezena.` });

        const deviceId = await getActiveDeviceId(token);
        if (!deviceId) return res.status(400).json({ message: 'Chybí aktivní zařízení.' });

        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uris: [track.uri] })
        });

        return res.json({ message: `▶ Přehrávám: ${track.name} od ${artist.name}` });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Chyba při přehrávání.' });
    }
}

// 🔊 Změna hlasitosti
async function handleVolumeChange(value, token, res) {
    if (typeof value !== 'number' || value < 0 || value > 100) {
        return res.status(400).json({ message: 'Hodnota hlasitosti musí být mezi 0–100.' });
    }

    const deviceId = await getActiveDeviceId(token);
    if (!deviceId) return res.status(400).json({ message: 'Chybí aktivní zařízení.' });

    try {
        await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${value}&device_id=${deviceId}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` }
        });

        return res.json({ message: `🔊 Hlasitost nastavena na ${value}%` });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Chyba při nastavování hlasitosti.' });
    }
}

// ⏸ Pauza
async function handlePause(token, res) {
    try {
        await fetch('https://api.spotify.com/v1/me/player/pause', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.json({ message: '⏸ Přehrávání pozastaveno.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Chyba při pozastavení.' });
    }
}

// ▶ Pokračuj
async function handleResume(token, res) {
    try {
        await fetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.json({ message: '▶ Pokračuji v přehrávání.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Chyba při obnovení.' });
    }
}

// ⏭ Další skladba
async function handleNext(token, res) {
    try {
        await fetch('https://api.spotify.com/v1/me/player/next', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.json({ message: '⏭ Přeskočeno na další skladbu.' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Chyba při přeskakování.' });
    }
}

// 📻 Playlist podle jména
async function handlePlayPlaylist(name, token, res) {
    try {
        const search = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=playlist&limit=1`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await search.json();
        const playlist = data.playlists?.items?.[0];

        if (!playlist) {
            return res.json({ message: `Playlist "${name}" nebyl nalezen.` });
        }

        const deviceId = await getActiveDeviceId(token);
        if (!deviceId) return res.status(400).json({ message: 'Chybí aktivní zařízení.' });

        await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ context_uri: playlist.uri })
        });

        return res.json({ message: `▶ Přehrávám playlist: ${playlist.name}` });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Chyba při přehrávání playlistu.' });
    }
}

module.exports = {
    handlePlayTrack,
    handlePlayTopTrack,
    handlePlayPlaylist,
    handleVolumeChange,
    handlePause,
    handleResume,
    handleNext,
    getActiveDeviceId
};
