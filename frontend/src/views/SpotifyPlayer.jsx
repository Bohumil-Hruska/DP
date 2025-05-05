import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SpotifyPlayerFull = ( {showMessage}) => {
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
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

    const searchTracks = async () => {
        if (!searchQuery.trim()) return;
        try {
            const res = await axios.get(`/api/spotify/search?q=${encodeURIComponent(searchQuery)}`, { withCredentials: true });
            setSearchResults(res.data);
        } catch {
            setError('Nepodařilo se vyhledat skladby.');
        }
    };

    const play = async () => {
        try {
            await axios.post('/api/spotify/play', {
                deviceId: selectedDevice,
                trackUri,
            }, { withCredentials: true });
            showMessage('Skladba byla spuštěna!', false);
            fetchCurrentTrack();
        } catch {
            showMessage('Nepodařilo se spustit skladbu.', true);
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

            {/* Výběr zařízení */}
            <div className="mb-3">
                <label className="form-label">Zařízení</label>
                <select className="form-select" onChange={(e) => setSelectedDevice(e.target.value)}>
                    <option value="">-- Vyber zařízení --</option>
                    {devices.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>

            {/* Vyhledávání skladeb */}
            <div className="mb-3">
                <label className="form-label">Vyhledat skladbu</label>
                <div className="input-group">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Např. Imagine Dragons - Believer"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button className="btn btn-outline-secondary" onClick={searchTracks}>🔍 Hledat</button>
                </div>
            </div>

            {searchResults.length > 0 && (
                <div className="list-group mb-4">
                    {searchResults.map(track => (
                        <button
                            key={track.id}
                            className="list-group-item list-group-item-action d-flex align-items-center"
                            onClick={() => {
                                setTrackUri(track.uri);
                                setSuccess(`Vybrána skladba: ${track.name}`);
                            }}
                        >
                            <img src={track.album.images[2]?.url} alt="" width="40" className="me-3" />
                            <div>
                                <strong>{track.name}</strong><br />
                                <small>{track.artists.map(a => a.name).join(', ')}</small>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Přehrát tlačítko */}
            {trackUri && (
                <button className="btn btn-success mb-4" onClick={play}>▶ Přehrát vybranou skladbu</button>
            )}

            {/* Aktuální přehrávání */}
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

export default SpotifyPlayerFull;
