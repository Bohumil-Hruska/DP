import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SpotifyEmbed from './SpotifyEmbed';

const SpotifyPlayer = ({ showMessage }) => {
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [trackUri, setTrackUri] = useState('');
    const [contextUri, setContextUri] = useState('');
    const [currentTrack, setCurrentTrack] = useState(null);
    const [volume, setVolume] = useState(50);

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
            showMessage('Nepodařilo se načíst zařízení.', true);
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
            showMessage('Nepodařilo se vyhledat skladby.', true);
        }
    };

    const play = async () => {
        try {
            await axios.post('/api/spotify/play', {
                deviceId: selectedDevice,
                trackUri: contextUri ? null : trackUri,
                contextUri: contextUri || null,
            }, { withCredentials: true });
            showMessage('Přehrávání spuštěno!', false);
            fetchCurrentTrack();
        } catch {
            showMessage('Nepodařilo se spustit přehrávání.', true);
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

            {/* Vyhledávání */}
            <div className="mb-3">
                <label className="form-label">Vyhledat skladbu / album / playlist</label>
                <div className="input-group">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Např. Queen, Bohemian Rhapsody"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button className="btn btn-outline-secondary" onClick={searchTracks}>🔍 Hledat</button>
                </div>
            </div>

            {/* Výsledky hledání */}
            {searchResults
                .filter(item => item && item.type) // ← ochrana proti null
                .map(item => {
                    const isTrack = item.type === 'track';
                    const image = isTrack
                        ? item.album?.images?.[2]?.url
                        : item.images?.[2]?.url;

                    const displayName = isTrack
                        ? item.name
                        : `${item.name} (${item.type})`;

                    const secondaryText = isTrack
                        ? item.artists?.map(a => a.name).join(', ')
                        : item.owner?.display_name || '';

                    return (
                        <button
                            key={item.id}
                            className="list-group-item list-group-item-action d-flex align-items-center"
                            onClick={() => {
                                if (isTrack) {
                                    setTrackUri(item.uri);
                                    setContextUri('');
                                } else {
                                    setContextUri(item.uri);
                                    setTrackUri('');
                                }
                                showMessage(`Vybráno: ${displayName}`, false);
                            }}
                        >
                            {image && (
                                <img src={image} alt="" width="40" className="me-3" />
                            )}
                            <div>
                                <strong>{displayName}</strong><br />
                                <small>{secondaryText}</small>
                            </div>
                        </button>
                    );
                })}


            {/* Tlačítko přehrát */}
            {(trackUri || contextUri) && (
                <>
                    <button className="btn btn-success mb-3" onClick={play}>▶ Přehrát</button>
                    <SpotifyEmbed uri={trackUri || contextUri} />
                </>
            )}

            {/* Právě přehráváno */}
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
