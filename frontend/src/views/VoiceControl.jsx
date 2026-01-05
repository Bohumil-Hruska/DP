import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const VoiceControl = ({ showMessage }) => {
    const [listening, setListening] = useState(false);
    const [recognized, setRecognized] = useState("");

    const wsRef = useRef(null);
    const audioContextRef = useRef(null);
    const processorRef = useRef(null);
    const streamRef = useRef(null);
    const lastCommandRef = useRef({ text: "", ts: 0 });

    // TTS
    const ttsAudioRef = useRef(null);
    const audioUnlockAttemptedRef = useRef(false);

    // 🔒 nikdy neblokuj startRecording – žádné await
    const tryUnlockAudio = () => {
        if (audioUnlockAttemptedRef.current) return;
        audioUnlockAttemptedRef.current = true;

        try {
            const a = new Audio();
            a.muted = true;

            const p = a.play();
            // když promise existuje, tak jen chyť error, ale nečekej
            if (p && typeof p.then === "function") {
                p.then(() => {
                    try { a.pause(); } catch {}
                }).catch(() => {});
            }
        } catch {
            // ignore
        }
    };

    // “lidský hlas” přes /api/tts (Piper)
    const speak = async (text) => {
        const msg = (text || "").toString().trim();
        if (!msg) return;

        // stop předchozí
        if (ttsAudioRef.current) {
            try { ttsAudioRef.current.pause(); } catch {}
            ttsAudioRef.current = null;
        }

        try {
            const r = await fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: msg }),
            });

            if (!r.ok) {
                console.warn("[VOICE] /api/tts failed:", r.status);
                return;
            }

            const blob = await r.blob();
            const url = URL.createObjectURL(blob);

            const a = new Audio(url);
            a.volume = 1.0;
            ttsAudioRef.current = a;

            a.onended = () => {
                URL.revokeObjectURL(url);
                if (ttsAudioRef.current === a) ttsAudioRef.current = null;
            };
            a.onerror = () => {
                URL.revokeObjectURL(url);
                if (ttsAudioRef.current === a) ttsAudioRef.current = null;
            };

            // play může být blokovaný – ale to nesmí shodit vykonání příkazu
            a.play().catch((e) => console.warn("[VOICE] audio.play blocked:", e));
        } catch (e) {
            console.warn("[VOICE] speak() failed:", e);
        }
    };

    const startRecording = async () => {
        if (listening) return;
        setListening(true);

        // ✅ neblokující unlock (jen pokus)
        tryUnlockAudio();

        try {
            wsRef.current = new WebSocket("wss://app.rb4home.eu/ws/");
            wsRef.current.binaryType = "arraybuffer";

            wsRef.current.onopen = () => console.log("[STT] WS open");
            wsRef.current.onerror = (e) => console.warn("[STT] WS error", e);
            wsRef.current.onclose = () => console.warn("[STT] WS closed");

            wsRef.current.onmessage = (msg) => {
                const text = msg.data;
                if (!text) return;

                const now = Date.now();
                const last = lastCommandRef.current;

                // pokud stejné jako minule a do 1200 ms, ignoruj
                if (text === last.text && now - last.ts < 1200) return;

                lastCommandRef.current = { text, ts: now };

                setRecognized(text);
                showMessage("Rozpoznán příkaz: " + text, false);
                sendCommandToNode(text);
            };

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000,
            });

            const source = audioContextRef.current.createMediaStreamSource(stream);
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (e) => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                    const input = e.inputBuffer.getChannelData(0);
                    const int16 = floatTo16BitPCM(input);
                    wsRef.current.send(int16);
                }
            };

            source.connect(processor);

            // pokud máš echo, zkus odkomentovat další řádek a nechat processor "viset" bez destination
            processor.connect(audioContextRef.current.destination);

            processorRef.current = processor;

            showMessage("🎤 Nepřetržitý poslech spuštěn", false);
        } catch (err) {
            console.error("[STT] startRecording error:", err);
            showMessage("Chyba: " + err.message, true);
            setListening(false);
        }
    };

    const stopRecording = () => {
        setListening(false);

        if (processorRef.current) processorRef.current.disconnect();
        if (audioContextRef.current) audioContextRef.current.close();

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
        }
        if (wsRef.current) wsRef.current.close();

        // stop TTS
        if (ttsAudioRef.current) {
            try { ttsAudioRef.current.pause(); } catch {}
            ttsAudioRef.current = null;
        }

        showMessage("⏹️ Poslech zastaven", false);
    };

    const sendCommandToNode = async (text) => {
        try {
            console.log("[VOICE] sending command:", text);

            const res = await axios.post(
                "/api/voice/execute",
                { command: text },
                { withCredentials: true }
            );

            console.log("[VOICE] backend response:", res.data);

            const message = res.data.message || "Příkaz zpracován.";
            showMessage(message, false);

            console.log("[VOICE] speaking:", message);
            // ✅ unlock jen pokus, nesmí blokovat
            tryUnlockAudio();
            speak(message);
        } catch (err) {
            console.error("[VOICE] execute error:", err);
            showMessage("Chyba při vykonávání příkazu.", true);

            tryUnlockAudio();
            speak("Nastala chyba při vykonávání příkazu.");
        }
    };

    const floatTo16BitPCM = (float32Array) => {
        const buffer = new ArrayBuffer(float32Array.length * 2);
        const view = new DataView(buffer);
        let offset = 0;
        for (let i = 0; i < float32Array.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, float32Array[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        }
        return buffer;
    };

    useEffect(() => {
        return () => stopRecording();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="container py-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">Hlasové ovládání</h2>
                <Link to="/" className="btn btn-secondary">
                    Zpět na Dashboard
                </Link>
            </div>

            {!listening ? (
                <button className="btn btn-primary" onClick={startRecording}>
                    🎙️ Spustit nepřetržitý poslech
                </button>
            ) : (
                <button className="btn btn-danger" onClick={stopRecording}>
                    ⏹️ Zastavit poslech
                </button>
            )}

            {recognized && (
                <div className="alert alert-info mt-3">
                    Rozpoznaný příkaz: <strong>{recognized}</strong>
                </div>
            )}
        </div>
    );
};

export default VoiceControl;
