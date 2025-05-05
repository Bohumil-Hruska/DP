import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SpotifyPlayer = () => {
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [trackUri, setTrackUri] = useState('');
    const [currentTrack, setCurrentTrack] = useState(null);
    const [volume, setVolume] = useState(50);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchDevices();
        fetchCurrentTrack();
        const interval = setInterval(fetchCurrentTrack, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchDevices = async () => {
        try {
            const res = await axios.get('/api/spotify/devices', { withCredentials: true });
            setDevices(res.data.devices || []);
        } catch {
            setError('Nepodařilo se načíst zařízení.');
        }
    };

    const fetchCurrentTrack = async () => {
        try {
            const res = await axios.get('/api/spotify/current', { withCredentials: true });
            setCurrentTrack(res.data);
        } catch {
            setCurrentTrack(null);
        }
    };

    const play = async () => {
        try {
            await axios.post('/api/spotify/play', {
                deviceId: selectedDevice,
                trackUri,
            }, { withCredentials: true });
            setSuccess('Skladba byla spuštěna!');
            fetchCurrentTrack();
        } catch {
            setError('Nepodařilo se spustit skladbu.');
        }
    };

    const pause = async () => {
        await axios.post('/api/spotify/pause', {}, { withCredentials: true });
        fetchCurrentTrack();
    };

    const next = async () => {
        await axios.post('/api/spotify/next', {}, { withCredentials: true });
        fetchCurrentTrack();
    };

    const changeVolume = async (e) => {
        const newVolume = e.target.value;
        setVolume(newVolume);
        await axios.post('/api/spotify/volume', { volume: newVolume }, { withCredentials: true });
    };

    return (
        <div className="container py-4">
            <h2 className="mb-3">Spotify přehrávač</h2>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {/* Výběr zařízení a skladby */}
            <div className="mb-3">
                <label className="form-label">Zařízení</label>
                <select className="form-select" onChange={(e) => setSelectedDevice(e.target.value)}>
                    <option value="">-- Vyber zařízení --</option>
                    {devices.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>

            <div className="mb-3">
                <label className="form-label">Spotify URI skladby</label>
                <input
                    type="text"
                    className="form-control"
                    placeholder="např. spotify:track:7ouMYWpwJ422jRcDASZB7P"
                    value={trackUri}
                    onChange={(e) => setTrackUri(e.target.value)}
                />
            </div>

            <button className="btn btn-success mb-4" onClick={play}>▶ Přehrát</button>

            {/* Aktuálně přehrávaná skladba */}
            {currentTrack && currentTrack.item ? (
                <div className="card p-4">
                    <h4>Právě hraje:</h4>
                    <p><strong>{currentTrack.item.name}</strong> – {currentTrack.item.artists.map(a => a.name).join(', ')}</p>
                    <img src={currentTrack.item.album.images[0].url} alt="cover" width="200" />
                    <div className="mt-3">
                        <button className="btn btn-warning me-2" onClick={pause}>⏸ Pauza</button>
                        <button className="btn btn-info" onClick={next}>⏭ Další</button>
                    </div>
                    <div className="mt-3">
                        <label>Hlasitost: {volume}%</label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={volume}
                            onChange={changeVolume}
                            className="form-range"
                        />
                    </div>
                </div>
            ) : (
                <p className="text-muted">Momentálně nic nehraje.</p>
            )}
        </div>
    );
};

export default SpotifyPlayer;
