// utils/intentParser.js
const rooms = require("../rooms.json");

function normalize(str) {
    return String(str || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

// rozdělení na tokeny (tolerantní k diakritice a oddělovačům)
function tokenize(text) {
    return normalize(text)
        .split(/[^a-z0-9]+/i)
        .filter(Boolean);
}

// tolerantní porovnání místnosti (pády/koncovky)
function matchRoomName(text, roomAliasOrName) {
    const tokens = tokenize(text);
    const alias = normalize(roomAliasOrName);

    // 1) přímý match tokenu
    if (tokens.includes(alias)) return true;

    // 2) tolerantní: prefix match (pokoj -> pokojicku / pokojicek)
    return tokens.some((t) => t.startsWith(alias) || alias.startsWith(t));
}

function cleanupAndRewrite(rawText) {
    // vyhoď vycpávky, které často překáží
    let t = normalize(rawText)
        .replace(/\b(prosim|prosím|hele|ok|diky|diky moc|dik|ahoj|cau|čau)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // sjednocení synonym (aby parser byl jednodušší)
    t = t
        .replace(
            /\b(rozsvit|rozsviť|rozsvitte|zapnout|zapni|zapnete|spust|spustit)\b/g,
            " zapni "
        )
        .replace(/\b(zhasni|zhasnete|vypnout|vypni|vypnete)\b/g, " vypni ")
        .replace(/\b(ztlum|ztis|ztisit|ztiš)\b/g, " ztis ")
        .replace(/\b(zesil|nahlas|pridej|přidej)\b/g, " zesil ")
        .replace(/\s+/g, " ")
        .trim();

    return t;
}

function findMatchedRoom(text) {
    for (const room of rooms) {
        const candidates = [room.name, ...(room.aliases || [])];
        if (candidates.some((alias) => matchRoomName(text, alias))) return room;
    }
    return null;
}

function findLightDeviceInRoom(room, text) {
    if (!room?.devices?.length) return null;

    const t = normalize(text);

    // 1) když uživatel řekne konkrétní typ (lampička/lampa/led/…)
    const wantsLamp = /\b(lampa|lampicka|lampička)\b/.test(t);
    const wantsLed = /\b(led|pasek|pasek)\b/.test(t);

    const byName = (rx) =>
        room.devices.find((d) => rx.test(normalize(d.name || "")));

    // prioritní výběr podle slov v příkazu
    if (wantsLamp) {
        return (
            byName(/\b(lampa|lampicka|lampička)\b/) ||
            room.devices.find((d) => d.type === "light")
        );
    }

    if (wantsLed) {
        return (
            byName(/\b(led|pasek|pásek)\b/) ||
            room.devices.find((d) => d.type === "light")
        );
    }

    // 2) obecně světlo
    return (
        byName(/\bsvetlo\b|\bsvetla\b|\blight\b/) ||
        room.devices.find((d) => d.type === "light")
    );
}

function parseIntent(command) {
    const t = cleanupAndRewrite(command);

    if (!t) return null;

    // 🕒 Čas
    if (
        /\b(kolik je hodin|kolik je cas|jakej je cas|jaky je cas|jaky je čas|jaky je čas|rekni mi cas|rekni mi čas|cas prosim|cas)\b/.test(
            t
        )
    ) {
        return { type: "get_time" };
    }

    // ☁️ Počasí (aktuální)
    if (
        /\b(pocasi|jake je pocasi|jaky je pocasi|jaké je počasí|bude prset|prsi|prší)\b/.test(
            t
        )
    ) {
        return { type: "get_weather" };
    }

    // 📝 Vytvoř poznámku
    const noteMatch = t.match(
        /^(?:vytvor|vytvorit|zapis|zapsat|poznamenej|poznamenejte|uloz|ulozit)\s+(?:poznamku|poznamka)?\s*(.+)$/i
    );

    if (noteMatch && noteMatch[1]) {
        return {
            type: "create_note",
            text: noteMatch[1].trim()
        };
    }

    // 📒 Vypsat poznámky
    if (
        /\b(ukaz|uka[zž]|vypsat|vypis|zobraz|co mam v poznamkach|poznamky)\b/.test(
            t
        )
    ) {
        return { type: "list_notes" };
    }

    // --------------------------
    // 💡 SVĚTLA (dej před Spotify, ať "pusť světlo..." nepadá do play_track)
    // --------------------------
    let action = null;
    if (/\b(vypni|zhasni)\b/.test(t)) action = "off";
    else if (/\b(zapni|rozsvit)\b/.test(t)) action = "on";

    const mentionsLightWords = /\b(svetlo|svetla|lampa|lampicka|lampička|led)\b/.test(
        t
    );

    // default: "svetlo v kuchyni" -> on
    if (!action && mentionsLightWords) action = "on";

    // umožni i "v kuchyni zhasni" (akce + místnost, i bez slova světlo)
    if (action) {
        const matchedRoom = findMatchedRoom(t);
        if (matchedRoom) {
            const device = findLightDeviceInRoom(matchedRoom, t);
            if (device) {
                return {
                    type: action === "on" ? "light_on" : "light_off",
                    deviceId: device.id,
                    room: matchedRoom.name,
                };
            }
            // když je místnost match, ale device nenalezeno, pořád vrať intent místnosti
            // (backend může časem řešit "všechna světla v místnosti")
            return {
                type: action === "on" ? "light_on" : "light_off",
                deviceId: null,
                room: matchedRoom.name,
            };
        }
    }

    // --------------------------
    // 🎵 SPOTIFY
    // --------------------------

    // 👨‍🎤 Přehraj něco od interpreta — musí být před track
    const playArtist = t.match(
        /\b(zahraj|pust|pusť|hraj|prehraj|přehraj).*(?:neco)?\s+(?:od|od kapely|zpevaka|zpeváka)\s+(.+)$/i
    );
    if (playArtist && playArtist[2]) {
        return { type: "play_top_by_artist", artist: playArtist[2].trim() };
    }

    // 📻 Playlist (před track)
    const playPlaylist = t.match(
        /\b(pust|pusť|zahraj|prehraj|přehraj|hraj).*(playlist|seznam)\s+(.+)$/i
    );
    if (playPlaylist && playPlaylist[3]) {
        return { type: "play_playlist", name: playPlaylist[3].trim() };
    }

    // 🔊 Hlasitost číselně
    const volumeExplicit = t.match(/(?:hlasitost|volume)\s*(\d{1,3})/i);
    if (volumeExplicit) {
        let v = parseInt(volumeExplicit[1], 10);
        if (Number.isFinite(v)) {
            v = Math.max(0, Math.min(100, v));
            return { type: "volume", value: v };
        }
    }

    // 🔊 Ztiš / zesil bez čísel
    if (/\bztis\b/.test(t)) return { type: "volume", value: 10 };
    if (/\bzesil\b/.test(t)) return { type: "volume", value: 90 };

    // ⏸ Pauza
    if (/\b(pauza|zastav)\b/.test(t)) return { type: "pause" };

    // ▶ Obnov
    if (/\b(pokracuj|pokračuj|obnov)\b/.test(t)) return { type: "resume" };

    // ⏭ Další
    if (/\b(dalsi|další|nasledujici|následující)\b/.test(t)) return { type: "next" };

    // 🎧 Přehraj konkrétní skladbu (poslední, chamtivé)
    const playTrack = t.match(/\b(zahraj|pust|pusť|prehraj|přehraj|hraj)\s+(.+)$/i);
    if (playTrack && playTrack[2]) {
        const q = playTrack[2].trim();

        // guard: pokud to vypadá jako světla, neskákej do Spotify
        if (/\b(svetlo|svetla|lampa|lampicka|lampička|led|vypni|zhasni|zapni|rozsvit)\b/.test(q)) {
            return null;
        }

        return { type: "play_track", query: q };
    }

    return null;
}

module.exports = { parseIntent };
