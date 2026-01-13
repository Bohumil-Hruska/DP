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

    // --- anti-echo / anti-tts-loop ---
    const ttsPlayingRef = useRef(false);
    const sttCooldownUntilRef = useRef(0);

// --- simple client VAD ---
    const vadRef = useRef({
        speaking: false,
        speechFrames: 0,
        silenceFrames: 0,
        minSpeechFrames: 3,  // kolik bloků musí být řeč, než začneme posílat audio
        silenceLimit: 8      // kolik bloků ticha = EOS (8*4096/16k ~ 2s)
    });


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
                    try {
                        a.pause();
                    } catch {}
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
            try {
                ttsAudioRef.current.pause();
            } catch {}
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

            ttsPlayingRef.current = true;

// krátký cooldown aby se STT nechytil na začátek/ocásek TTS
            sttCooldownUntilRef.current = Date.now() + 700; // 0.7s doladíš (500–1200ms)

            a.onended = () => {
                ttsPlayingRef.current = false;
                URL.revokeObjectURL(url);
                if (ttsAudioRef.current === a) ttsAudioRef.current = null;

                // malý cooldown i po dohrání (dozvuk v místnosti)
                sttCooldownUntilRef.current = Date.now() + 500;
            };

            a.onerror = () => {
                ttsPlayingRef.current = false;
                URL.revokeObjectURL(url);
                if (ttsAudioRef.current === a) ttsAudioRef.current = null;

                sttCooldownUntilRef.current = Date.now() + 500;
            };


            a.onerror = () => {
                URL.revokeObjectURL(url);
                if (ttsAudioRef.current === a) ttsAudioRef.current = null;
            };

            // play může být blokovaný – ale to nesmí shodit vykonání příkazu
            a.play().catch((e) =>
                console.warn("[VOICE] audio.play blocked:", e)
            );
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
                const now = Date.now();

                // pokud právě doběhlo TTS, ignoruj rozpoznávání
                if (now < sttCooldownUntilRef.current) return;

                let payload = msg.data;
                if (!payload) return;

                // očekáváme JSON {type:"final", text:"..."} – ale fallback na plain text
                let text = "";
                let type = "final";

                if (typeof payload === "string") {
                    try {
                        const obj = JSON.parse(payload);
                        if (obj && obj.text) {
                            text = String(obj.text);
                            type = obj.type || "final";
                        } else {
                            text = payload;
                        }
                    } catch {
                        text = payload;
                    }
                } else {
                    // když by přišlo něco jiného, ignoruj
                    return;
                }

                text = (text || "").trim();
                if (!text) return;

                // vykonávej jen FINAL (partial ignoruj)
                if (type !== "final") return;

                const last = lastCommandRef.current;
                if (text === last.text && now - last.ts < 1500) return; // lehce prodloužíme
                lastCommandRef.current = { text, ts: now };

                setRecognized(text);
                showMessage("Rozpoznán příkaz: " + text, false);
                sendCommandToNode(text);
            };


            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });

            streamRef.current = stream;

            audioContextRef.current = new (window.AudioContext ||
                window.webkitAudioContext)({
                sampleRate: 16000,
            });

            const source =
                audioContextRef.current.createMediaStreamSource(stream);

            const processor =
                audioContextRef.current.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = (e) => {
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

                const input = e.inputBuffer.getChannelData(0);

                // RMS (energie)
                let sum = 0;
                for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
                const rms = Math.sqrt(sum / input.length);

                // --- BARGE-IN: když hraje TTS a uživatel začne mluvit, stopni TTS ---
                // práh doladíš podle mikrofonu (0.01–0.05)
                if (ttsPlayingRef.current && rms > 0.02) {
                    if (ttsAudioRef.current) {
                        try { ttsAudioRef.current.pause(); } catch {}
                        ttsAudioRef.current = null;
                    }
                    ttsPlayingRef.current = false;

                    // během barge-inu nech malý cooldown (ať se nechytneme na dozvuk TTS)
                    sttCooldownUntilRef.current = Date.now() + 200;
                }

                // --- jednoduchý VAD (posílej jen když je řeč) ---
                const st = vadRef.current;
                const isSpeech = rms > 0.012; // doladíš (0.008–0.02)

                if (isSpeech) {
                    st.speechFrames++;
                    st.silenceFrames = 0;
                    st.speaking = true;
                } else if (st.speaking) {
                    st.silenceFrames++;

                    if (st.silenceFrames >= st.silenceLimit) {
                        // konec řeči -> EOS marker pro STT server
                        try {
                            wsRef.current.send(JSON.stringify({ type: "eos" }));
                        } catch {}

                        st.speaking = false;
                        st.speechFrames = 0;
                        st.silenceFrames = 0;
                        return;
                    }
                }

                // neposílej během cooldownu po TTS
                if (Date.now() < sttCooldownUntilRef.current) return;

                // audio posílej až po minSpeechFrames, aby to nespustilo na náhodný zvuk
                if (st.speaking && st.speechFrames >= st.minSpeechFrames) {
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
            try {
                ttsAudioRef.current.pause();
            } catch {}
            ttsAudioRef.current = null;
        }

        vadRef.current = {
            speaking: false,
            speechFrames: 0,
            silenceFrames: 0,
            minSpeechFrames: 3,
            silenceLimit: 8
        };
        ttsPlayingRef.current = false;
        sttCooldownUntilRef.current = 0;


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
            view.setInt16(
                offset,
                s < 0 ? s * 0x8000 : s * 0x7fff,
                true
            );
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
