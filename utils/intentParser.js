function parseIntent(command) {
    const text = command.toLowerCase().trim();

    // 👨‍🎤 Přehraj něco od interpreta — musí být první!
    const playArtist = text.match(/\b(zahraj|pusť|hraj|přehraj).*(?:něco)?\s+(?:od|od kapely|zpěváka)\s+(.+)/i);
    if (playArtist) {
        return { type: 'play_top_by_artist', artist: playArtist[2]};
    }

    // 🎧 Přehraj konkrétní skladbu
    const playTrack = text.match(/\b(zahraj|pusť|přehraj|hraj)\s+(.+)/i);
    if (playTrack) {
        return { type: 'play_track', query: playTrack[2] };
    }

    // 📻 Playlist
    const playPlaylist = text.match(/\b(pusť|zahraj|přehraj).*(playlist|seznam)\s+(.*)/i);
    if (playPlaylist) {
        return { type: 'play_playlist', name: playPlaylist[3] };
    }

    // 🔊 Hlasitost číselně
    const volumeExplicit = text.match(/(?:hlasitost|volume)\s*(\d{1,3})/i);
    if (volumeExplicit) {
        return { type: 'volume', value: parseInt(volumeExplicit[1]) };
    }

    // 🔊 Ztlum / zesil bez čísel
    if (text.includes('ztlum') || text.includes('ztiš')) {
        return { type: 'volume', value: 10 };
    }
    if (text.includes('nahlas') || text.includes('zesil')) {
        return { type: 'volume', value: 90 };
    }

    // ⏸ Pauza
    if (/\b(pauza|zastav)\b/i.test(text)) {
        return { type: 'pause' };
    }

    // ▶ Obnov
    if (/\b(pokračuj|obnov|spusť)\b/i.test(text)) {
        return { type: 'resume' };
    }

    // ⏭ Další skladba
    if (/\b(další|následující)\b/.test(text)) {
        return { type: 'next' };
    }

    return null;
}

module.exports = { parseIntent };
