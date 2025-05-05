import React, { useState } from 'react';
import axios from 'axios';
import {Link} from "react-router-dom";

const VoiceControl = ({ showMessage }) => {
    const [recording, setRecording] = useState(false);
    const [commandText, setCommandText] = useState('');
    const [recognized, setRecognized] = useState('');

    const startRecording = async () => {
        setRecording(true);
        setRecognized('');

        try {
            // ⚠️ Vždy ztiš na pevnou hodnotu 5
            await axios.post('/api/spotify/volume', { volume: 5 }, { withCredentials: true });

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const chunks = [];

            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                stream.getTracks().forEach(track => track.stop());

                try {
                    await sendAudioToPython(blob);
                } catch (err) {
                    showMessage('Chyba při odeslání audia.', true);
                } finally {
                    // ✅ Vždy nastav zpět na 50
                    await axios.post('/api/spotify/volume', { volume: 50 }, { withCredentials: true });
                }
            };

            mediaRecorder.start();

            // Ukončit po 4 sekundách
            setTimeout(() => {
                mediaRecorder.stop();
                setRecording(false);
            }, 4000);

        } catch (e) {
            showMessage('Nelze získat mikrofon: ' + e.message, true);
            setRecording(false);
        }
    };


    const sendAudioToPython = async (blob) => {
        const formData = new FormData();
        formData.append('audio', blob, 'recording.wav');

        try {
            const res = await axios.post('/voice-api/recognize', formData);
            if (res.data.text) {
                setRecognized(res.data.text);
                sendCommandToNode(res.data.text);
            } else {
                showMessage(res.data.error || 'Hlas nerozpoznán.', true);
            }
        } catch (err) {
            showMessage('Chyba při odeslání do Python serveru.', true);
        }
    };

    const sendCommandToNode = async (text) => {
        try {
            const res = await axios.post('/api/voice/execute', { command: text }, { withCredentials: true });
            showMessage(res.data.message || 'Příkaz zpracován.', false);
        } catch (err) {
            showMessage('Chyba při vykonávání příkazu.', true);
        }
    };

    return (
        <div className="container py-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">Hlasové ovládání</h2>
                <Link to="/" className="btn btn-secondary">Zpět na Dashboard</Link>
            </div>

            <button className="btn btn-primary mb-3" onClick={startRecording} disabled={recording}>
                {recording ? '🎤 Nahrávám...' : '🎙️ Spustit nahrávání'}
            </button>

            {recognized && (
                <div className="alert alert-info">
                    Rozpoznaný příkaz: <strong>{recognized}</strong>
                </div>
            )}
        </div>
    );
};

export default VoiceControl;
