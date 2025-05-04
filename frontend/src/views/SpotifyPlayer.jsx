import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SpotifyPlayer = () => {
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [trackUri, setTrackUri] = useState('');
    const [token, setToken] = useState('');

    useEffect(() => {
        const t = localStorage.getItem('spotifyToken');
        if (t) setToken(t);
    }, []);


    const fetchDevices = async () => {
        if (!token) {
            alert('Token není k dispozici. Přihlaste se znovu.');
            return;
        }

        try {
            const res = await axios.get('https://api.spotify.com/v1/me/player/devices', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDevices(res.data.devices);
        } catch (error) {
            console.error('Chyba při načítání zařízení:', error);
            alert('Chyba při načítání zařízení. Zkuste se znovu přihlásit ke Spotify.');
        }
    };


    const play = async () => {
        try {
            await axios.post('/api/spotify/play', {
                accessToken: token,
                deviceId: selectedDevice,
                trackUri
            });
        } catch (error) {
            console.error('Chyba při přehrávání:', error);
            alert('Nepodařilo se spustit přehrávání.');
        }
    };

    return (
        <div className="container py-4">
            <h2 className="mb-3">Spotify Přehrávač</h2>

            <div className="mb-3">
                <button className="btn btn-outline-primary" onClick={fetchDevices}>Načíst zařízení</button>
            </div>

            <div className="mb-3">
                <select className="form-select" value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}>
                    <option value="">Vyber zařízení</option>
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
