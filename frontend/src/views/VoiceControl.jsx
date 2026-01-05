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

    // ✅ jeden audio přehrávač pro celou komponentu
    const ttsAudioRef = useRef(null);

    // ✅ Autoplay unlock (udělá se při user gesture)
    const unlockAudio = async () => {
        try {
            const a = new Audio();
            a.muted = true;
            await a.play();
            a.pause();
        } catch {
            // některé prohlížeče to prostě ignorují – nevadí
        }
    };

    // ✅ hlavní TTS – zavolá backend /api/tts a přehraje WAV
    const speakHuman = async (text) => {
        const msg = (text || "").toString().trim();
        if (!msg) return;

        // stopni předchozí
        if (ttsAudioRef.current) {
            try { ttsAudioRef.current.pause(); } catch {}
            ttsAudioRef.current = null;
        }

        const resp = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: msg }),
        });

        if (!resp.ok) throw new Error("TTS failed");

        const blob = await resp.blob();
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

        await a.play();
    };

    const startRecording = async () => {
        if (listening) return;
        setListening(true);

        // ✅ odemkni audio hned na začátku (klik uživatele)
        await unlockAudio();

        try {
            wsRef.current = new WebSocket("wss://app.rb4home.eu/ws/"); // tvůj STT server
            wsRef.current.binaryType = "arraybuffer";

            wsRef.current.onmessage = (msg) => {
                const text = msg.data;
                if (!text) return;

                const now = Date.now();
                const last = lastCommandRef.current;

                if (text === last.text && (now - last.ts) < 1200) return;
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

            // ⚠️ Tohle ti dělá “monitoring” do repro (echo).
            // Pokud chceš, aby to NEHRÁLO mikrofon do repro, nech to odpojené:
            // processor.connect(audioContextRef.current.destination);
            // Místo toho:
            processor.connect(audioContextRef.current.destination); // můžeš zkusit zakomentovat

            processorRef.current = processor;

            showMessage("🎤 Nepřetržitý poslech spuštěn", false);
        } catch (err) {
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

            console.log("[VOICE] speaking (human):", message);
            await speakHuman(message);
        } catch (err) {
            console.error("[VOICE] execute error:", err);
            showMessage("Chyba při vykonávání příkazu.", true);

            // zkus říct chybu taky
            speakHuman("Nastala chyba při vykonávání příkazu.").catch(() => {});
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

            <button
                className="btn btn-outline-secondary ms-2"
                onClick={async () => {
                    const msg = "Test hlasové odezvy funguje.";
                    showMessage(msg, false);
                    await unlockAudio();
                    speakHuman(msg).catch(console.warn);
                }}
            >
                🔈 Test TTS
            </button>

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
