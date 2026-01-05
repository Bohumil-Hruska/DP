const rooms = require('../rooms.json');

function normalize(str) {
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

// Porovnání místnosti včetně koncovek
function escapeRegex(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Porovnání místnosti tolerantní k pádům (pokojíček/pokojíčku/…)
function matchRoomName(text, roomName) {
    const t = normalize(text);

    const base = normalize(roomName);         // pokojicek
    const stems = [];

    // vytvoř pár "kmenů" (odřízni konce) – min délka 4
    for (let cut = 0; cut <= 3; cut++) {
        const stem = base.slice(0, Math.max(0, base.length - cut));
        if (stem.length >= 4) stems.push(stem);
    }

    // zkus matchnout jakýkoli kmen jako začátek slova
    return stems.some(stem => {
        const pattern = new RegExp(`\\b${escapeRegex(stem)}[a-z]*\\b`, "i");
        return pattern.test(t);
    });
}



function parseIntent(command) {
    const text = normalize(command.trim());

    // 🕒 Čas
    if (/\b(kolik je hodin|kolik je cas|jakej je cas|jaký je čas|jaky je cas|čas prosím|cas prosim|řekni mi čas|rekni mi cas)\b/.test(text)) {
        return { type: 'get_time' };
    }

// ☁️ Počasí (aktuální)
    if (/\b(pocasi|počasí|jake je pocasi|jaké je počasí|jaky je pocasi|bude prset|bude pršet|prsi|prší)\b/.test(text)) {
        return { type: 'get_weather' };
    }


    // 🕒 Kolik je hodin
    if (/\b(kolik je hodin|kolik je cas|jakej je cas|jaký je čas|cas prosim|řekni mi čas|rekni mi cas)\b/.test(text)) {
        return { type: 'get_time' };
    }

// 📝 Vytvoř poznámku
    const noteMatch = text.match(/\b(vytvor|vytvoř|zapis|zapiš|poznamenej|poznamenejte|uloz|ulož)\b.*\b(poznamku|poznámku|poznamka|poznámka)?\b\s*:?\s*(.+)$/i);
    if (noteMatch && noteMatch[3]) {
        return { type: 'create_note', text: noteMatch[3].trim() };
    }

// 📒 Vypsat poznámky
    if (/\b(ukaž|ukaz|vypsat|vypis|zobraz|co mam v poznamkach|co mám v poznámkách|poznamky|poznámky)\b/.test(text)) {
        return { type: 'list_notes' };
    }

// ☁️ Počasí (zatím jen rozpoznání)
    if (/\b(pocasi|počasí|jake bude pocasi|jaké bude počasí|prsi|pršet|bude prset|bude pršet)\b/.test(text)) {
        return { type: 'get_weather' };
    }


    // 👨‍🎤 Přehraj něco od interpreta — musí být první!
    const playArtist = text.match(/\b(zahraj|pusť|hraj|přehraj).*(?:něco)?\s+(?:od|od kapely|zpěváka)\s+(.+)/i);
    if (playArtist) {
        return { type: 'play_top_by_artist', artist: playArtist[2] };
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
    if (text.includes('ztlum') || text.includes('ztis')) {
        return { type: 'volume', value: 10 };
    }
    if (text.includes('nahlas') || text.includes('zesil')) {
        return { type: 'volume', value: 90 };
    }

    // ⏸ Pauza
    if (/\b(pauza|zastav)\b/.test(text)) {
        return { type: 'pause' };
    }

    // ▶ Obnov
    if (/\b(pokračuj|obnov|spust)\b/.test(text)) {
        return { type: 'resume' };
    }

    // ⏭ Další skladba
    if (/\b(dalsi|nasledujici)\b/.test(text)) {
        return { type: 'next' };
    }

    // 💡 Světla (zapnutí / vypnutí podle místnosti)
    let action = null;
    if (/(zhasni|vypni)/.test(text)) {
        action = 'off';
    } else if (/(rozsvit|rozsviť|zapni|pust)/.test(text)) {
        action = 'on';
    }

    // Pokud nemáme akci, vracíme null
    if (!action) return null;

    // Hledáme místnost
    let matchedRoom = null;
    for (const room of rooms) {
        const candidates = [room.name, ...(room.aliases || [])];
        if (candidates.some(alias => matchRoomName(text, alias))) {
            matchedRoom = room;
            break;
        }
    }

    // Pokud místnost nenajdeme, vracíme null
    if (!matchedRoom) return null;

    // Najdeme zařízení
    let device = null;

    // 1. Pokud text obsahuje "svetlo|svetla"
    if (/svetlo|svetla/.test(text)) {
        device = matchedRoom.devices.find(d =>
            normalize(d.name).includes('svetlo')
        );
    }

    // 2. Pokud "svetlo" v textu není → fallback: vezmeme první zařízení typu světlo
    if (!device) {
        device = matchedRoom.devices.find(d =>
            normalize(d.name).includes('svetlo') || d.type === 'light'
        );
    }

    if (device) {
        return {
            type: action === 'on' ? 'light_on' : 'light_off',
            deviceId: device.id,
            room: matchedRoom.name
        };
    }

    return null;
}

module.exports = { parseIntent };
