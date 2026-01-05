const express = require("express");

const router = express.Router();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;
const ELEVENLABS_MODEL_ID = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";

const MAX_CHARS = 300;

router.post("/api/tts", async (req, res) => {
    try {
        if (!ELEVENLABS_API_KEY) return res.status(500).json({ error: "Missing ELEVENLABS_API_KEY" });
        if (!ELEVENLABS_VOICE_ID) return res.status(500).json({ error: "Missing ELEVENLABS_VOICE_ID" });

        let text = (req.body?.text ?? "").toString().trim();
        if (!text) return res.status(400).json({ error: "Missing text" });
        text = text.replace(/\s+/g, " ").slice(0, MAX_CHARS);

        // Convert text to speech endpoint: /v1/text-to-speech/{voice_id} :contentReference[oaicite:3]{index=3}
        const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(ELEVENLABS_VOICE_ID)}`;

        const r = await fetch(url, {
            method: "POST",
            headers: {
                "xi-api-key": ELEVENLABS_API_KEY,               // auth :contentReference[oaicite:4]{index=4}
                "Content-Type": "application/json",
                "Accept": "audio/mpeg",
            },
            body: JSON.stringify({
                text,
                model_id: ELEVENLABS_MODEL_ID,                 // e.g. eleven_multilingual_v2 :contentReference[oaicite:5]{index=5}
                voice_settings: {
                    stability: 0.45,
                    similarity_boost: 0.8,
                    style: 0.35,
                    use_speaker_boost: true
                }
            }),
        });

        if (!r.ok) {
            const errText = await r.text().catch(() => "");
            console.error("[TTS] ElevenLabs error:", r.status, errText);
            return res.status(502).json({ error: "ElevenLabs TTS failed", status: r.status });
        }

        const arrayBuffer = await r.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);

        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Cache-Control", "no-store");
        return res.send(buf);
    } catch (e) {
        console.error("[TTS] error:", e);
        return res.status(500).json({ error: "TTS failed" });
    }
});

module.exports = router;
