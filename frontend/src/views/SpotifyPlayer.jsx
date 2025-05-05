import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SpotifyPlayer = () => {
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [trackUri, setTrackUri] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchDevices();
    }, []);

    const fetchDevices = async () => {
        try {
            const res = await axios.get('/api/spotify/devices', { withCredentials: true });
            setDevices(res.data.devices || []);
        } catch (err) {
            setError('Nepodařilo se načíst zařízení. Přihlaste se ke Spotify.');
        }
    };

    const play = async () => {
        try {
            await axios.post('/api/spotify/play', {
                deviceId: selectedDevice,
                trackUri,
            }, { withCredentials: true });
            setSuccess('Skladba byla spuštěna!');
        } catch (err) {
            setError('Nepodařilo se spustit skladbu.');
        }
    };

    return (
        <div className="container py-4">
            <h2 className="mb-3">Spotify přehrávač</h2>

            {error && <div className="alert alert-danger">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

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

            <button className="btn btn-success" onClick={play}>▶ Přehrát</button>
        </div>
    );
};

export default SpotifyPlayer;
