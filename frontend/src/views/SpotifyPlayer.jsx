import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SpotifyPlayer = () => {
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [trackUri, setTrackUri] = useState('');
    const [token, setToken] = useState('');

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const t = urlParams.get('token');
        if (t) setToken(t);
    }, []);

    const fetchDevices = async () => {
        const res = await axios.get('https://api.spotify.com/v1/me/player/devices', {
            headers: { Authorization: `Bearer ${token}` }
        });
        setDevices(res.data.devices);
    };

    const play = async () => {
        await axios.post('/api/spotify/play', {
            accessToken: token,
            deviceId: selectedDevice,
            trackUri
        });
    };

    return (
        <div className="container py-4">
            <h2 className="mb-3">Spotify Přehrávač</h2>

            <div className="mb-3">
                <button className="btn btn-outline-primary" onClick={fetchDevices}>Načíst zařízení</button>
            </div>

            <div className="mb-3">
                <select className="form-select" onChange={(e) => setSelectedDevice(e.target.value)}>
                    <option>Vyber zařízení</option>
                    {devices.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>

            <div className="mb-3">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Zadej Spotify URI skladby (např. spotify:track:7ouMYWpwJ422jRcDASZB7P)"
                    value={trackUri}
                    onChange={(e) => setTrackUri(e.target.value)}
                />
            </div>

            <button className="btn btn-success" onClick={play}>Přehrát</button>
        </div>
    );
};

export default SpotifyPlayer;
