import { useEffect, useRef, useCallback } from "react";

const WS_OPEN = 1;
const WS_CLOSING = 2;
const WS_CLOSED = 3;

export function useTtsStreamer(wsUrl = "wss://app.rb4home.eu/ws/tts") {
    const wsRef = useRef(null);
    const connectPromiseRef = useRef(null);

    const mediaSourceRef = useRef(null);
    const sourceBufferRef = useRef(null);
    const queueRef = useRef([]);
    const audioRef = useRef(null);

    const currentSessionRef = useRef(null); // chrání před starými chunky

    // --- Pomocná: otevři (nebo znovu otevři) WS a vrať promise, která se resolve-ne po "open"
    const ensureWsOpen = useCallback(() => {
        const ws = wsRef.current;
        if (ws && ws.readyState === WS_OPEN) {
            return Promise.resolve(ws);
        }
        if (connectPromiseRef.current) return connectPromiseRef.current;

        connectPromiseRef.current = new Promise((resolve, reject) => {
            try {
                const socket = new WebSocket(wsUrl);
                socket.binaryType = "arraybuffer";
                wsRef.current = socket;

                socket.onopen = () => {
                    connectPromiseRef.current = null;
                    resolve(socket);
                };
                socket.onerror = (e) => {
                    connectPromiseRef.current = null;
                    reject(e);
                };
                socket.onclose = () => {
                    // nic – reconnect se řeší až při dalším ensureWsOpen()
                };

                socket.onmessage = async (evt) => {
                    // Textové zprávy (end/error)
                    if (typeof evt.data === "string") {
                        try {
                            const msg = JSON.parse(evt.data);
                            if (msg.type === "end") {
                                if (mediaSourceRef.current?.readyState === "open") {
                                    try { mediaSourceRef.current.endOfStream(); } catch {}
                                }
                            } else if (msg.type === "error") {
                                console.error("TTS WS error:", msg.error);
                                if (mediaSourceRef.current?.readyState === "open") {
                                    try { mediaSourceRef.current.endOfStream(); } catch {}
                                }
                            }
                        } catch {}
                        return;
                    }

                    // Binární audio chunk
                    // Binární audio chunk
                    const sessionId = currentSessionRef.current;
                    if (!sessionId) return; // žádná aktivní session

// ✅ evt.data je často už ArrayBuffer (binaryType="arraybuffer")
                    const ab =
                        evt.data instanceof ArrayBuffer
                            ? evt.data
                            : await evt.data.arrayBuffer();

                    const buf = new Uint8Array(ab);
                    const sb = sourceBufferRef.current;


                    if (!mediaSourceRef.current || mediaSourceRef.current.readyState === "closed") return;

                    if (sb && !sb.updating && queueRef.current.length === 0) {
                        try { sb.appendBuffer(buf); } catch {}
                    } else {
                        queueRef.current.push(buf);
                    }

                    // pokus o autoplay (musí být po uživ. gestu – viz startRecord)
                    try { await audioRef.current?.play(); } catch {}
                };
            } catch (e) {
                connectPromiseRef.current = null;
                reject(e);
            }
        });

        return connectPromiseRef.current;
    }, [wsUrl]);

    // --- Inicializace Audio + MediaSource pouze jednou
    useEffect(() => {
        const mediaSource = new MediaSource();
        mediaSourceRef.current = mediaSource;

        const audio = new Audio();
        audio.preload = "auto";
        audioRef.current = audio;
        audio.src = URL.createObjectURL(mediaSource);

        mediaSource.addEventListener("sourceopen", () => {
            const sb = mediaSource.addSourceBuffer("audio/mpeg");
            sourceBufferRef.current = sb;
            sb.addEventListener("updateend", () => {
                if (queueRef.current.length > 0 && !sb.updating) {
                    const next = queueRef.current.shift();
                    try { sb.appendBuffer(next); } catch {}
                }
            });
        });

        return () => {
            try { audio.pause(); } catch {}
            if (mediaSource.readyState === "open") {
                try { mediaSource.endOfStream(); } catch {}
            }
            URL.revokeObjectURL(audio.src);
            sourceBufferRef.current = null;
            mediaSourceRef.current = null;

            try { wsRef.current?.close(); } catch {}
            wsRef.current = null;
        };
    }, []);

    // --- Pro nový stream vždy „resetni“ MediaSource a session
    const resetMediaSource = () => {
        // zruš starý MediaSource a vytvoř nový
        const oldMS = mediaSourceRef.current;
        if (oldMS && oldMS.readyState === "open") {
            try { oldMS.endOfStream(); } catch {}
        }

        const ms = new MediaSource();
        mediaSourceRef.current = ms;
        queueRef.current = [];

        const audio = audioRef.current;
        URL.revokeObjectURL(audio.src);
        audio.src = URL.createObjectURL(ms);

        ms.addEventListener("sourceopen", () => {
            const sb = ms.addSourceBuffer("audio/mpeg");
            sourceBufferRef.current = sb;
            sb.addEventListener("updateend", () => {
                if (queueRef.current.length > 0 && !sb.updating) {
                    const next = queueRef.current.shift();
                    try { sb.appendBuffer(next); } catch {}
                }
            });
        });
    };

    // --- Veřejná API: speak
    const speak = useCallback(async (text, opts = {}) => {
        // 1) Otevři (nebo otevři znovu) WS – když je CLOSED/CLOSING, udělej fresh connection
        const ws = await ensureWsOpen();

        // 2) Nový stream => nová session + reset MS
        const sessionId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
        currentSessionRef.current = sessionId;
        resetMediaSource();

        // 3) Pošli požadavek – ale jen když je socket OPEN
        if (!ws || ws.readyState !== WS_OPEN) {
            console.warn("WS not open, dropping speak()");
            return;
        }
        try {
            ws.send(JSON.stringify({
                type: "speak",
                text,
                voiceId: opts.voiceId,
                modelId: opts.modelId,
                outputFormat: opts.outputFormat
            }));
        } catch (e) {
            console.error("ws.send failed:", e);
        }
    }, [ensureWsOpen]);

    const getAudioEl = () => audioRef.current;

    return { speak, getAudioEl };
}
