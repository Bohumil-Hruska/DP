import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from 'axios';

const VoiceControl = ({ showMessage }) => {
    const [listening, setListening] = useState(false);
    const [recognized, setRecognized] = useState("");
    const wsRef = useRef(null);
    const audioContextRef = useRef(null);
    const processorRef = useRef(null);
    const streamRef = useRef(null);
    const lastCommandRef = useRef({ text: "", ts: 0 });

    const ttsAudioRef = useRef(null);

    const unlockAudio = async () => {
        try {
            const a = new Audio();
            a.muted = true;
            await a.play();
            a.pause();
        } catch {}
    };

    const speakHuman = async (text) => {
        const msg = (text || "").toString().trim();
        if (!msg) return;

        // stop předchozí audio, ať se to nepřekrývá
        if (ttsAudioRef.current) {
            try { ttsAudioRef.current.pause(); } catch {}
            ttsAudioRef.current = null;
        }

        const r = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: msg }),
        });

        if (!r.ok) throw new Error("TTS failed: " + r.status);

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

        await a.play();
    };



    const startRecording = async () => {
        if (listening) return;
        setListening(true);
        await unlockAudio();


        try {
            wsRef.current = new WebSocket("wss://app.rb4home.eu/ws/"); // tvůj Python server
            wsRef.current.binaryType = "arraybuffer";

            wsRef.current.onmessage = (msg) => {
                const text = msg.data;
                if (!text) return;

                const now = Date.now();
                const last = lastCommandRef.current;

                // ✅ pokud stejné jako minule a do 1200 ms, ignoruj
                if (text === last.text && (now - last.ts) < 1200) return;

                lastCommandRef.current = { text, ts: now };

                setRecognized(text);
                showMessage("Rozpoznán příkaz: " + text, false);
                sendCommandToNode(text);
            };


            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: 16000, // Google STT funguje dobře na 16 kHz
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
            processor.connect(audioContextRef.current.destination);
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

            const res = await axios.post('/api/voice/execute', { command: text }, { withCredentials: true });
            console.log("[VOICE] backend response:", res.data);

            const message = res.data.message || 'Příkaz zpracován.';
            showMessage(message, false);

            console.log("[VOICE] speaking:", message);
            speakHuman(message).catch((e) => console.warn("[VOICE] TTS failed:", e));




        } catch (err) {
            console.error("[VOICE] execute error:", err);
            showMessage('Chyba při vykonávání příkazu.', true);
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
