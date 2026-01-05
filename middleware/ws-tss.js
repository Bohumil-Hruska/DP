// /middleware/ws-tts.js
const { WebSocketServer } = require("ws");

// Použij vestavěný fetch v Node 18+ (doporučeno).
// Pokud nemáš Node 18+, doinstaluj 'undici' a dej: const { fetch } = require('undici');

function attachTtsWs(server) {
    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (req, socket, head) => {
        if (req.url === "/ws/tts") {
            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit("connection", ws, req);
            });
        } else {
            socket.destroy();
        }
    });

    wss.on("connection", (ws) => {
        ws.on("message", async (raw) => {
            let msg;
            try { msg = JSON.parse(raw.toString()); } catch { return; }
            if (msg?.type !== "speak" || !msg.text) return;

            const voiceId  = msg.voiceId  || "12CHcREbuPdJY02VY7zT";   // nebo z tvého configu
            const modelId  = msg.modelId  || "eleven_multilingual_v2";
            const apiKey   = "fbd613ec0efc64464397ed7f37598ed54a3ec790a84fa2d58ed9b39f6f4bdc27";                    // nezatahuj do FE
            const accept   = "audio/mpeg";

            try {
                const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                    method: "POST",
                    headers: {
                        "xi-api-key": apiKey,
                        "Content-Type": "application/json",
                        "Accept": accept
                    },
                    body: JSON.stringify({
                        model_id: modelId,
                        text: msg.text,
                        output_format: "mp3_44100_128",
                        voice_settings: { stability: 0.45, similarity_boost: 0.8 }
                    })
                });

                if (!r.ok || !r.body) {
                    ws.send(JSON.stringify({ type: "error", error: await r.text() }));
                    return;
                }

                for await (const chunk of r.body) {
                    if (ws.readyState !== 1) break;
                    ws.send(chunk, { binary: true });
                }
                if (ws.readyState === 1) ws.send(JSON.stringify({ type: "end" }));
            } catch (e) {
                if (ws.readyState === 1) ws.send(JSON.stringify({ type: "error", error: String(e) }));
            }
        });
    });
}

module.exports = { attachTtsWs };
