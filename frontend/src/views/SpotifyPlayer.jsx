import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {Link} from "react-router-dom";
import { FaPlay, FaPause, FaForward, FaVolumeUp } from 'react-icons/fa';


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
        const delayDebounce = setTimeout(() => {
            if (searchQuery.trim()) {
                searchTracks();
            }
        }, 500); // čeká 500 ms po posledním psaní

        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    useEffect(() => {
        fetchDevices();
        fetchCurrentTrack();
        const interval = setInterval(fetchCurrentTrack, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchDevices = async () => {
        try {
            const res = await axios.get('/api/spotify/devices', { withCredentials: true });
            const availableDevices = res.data.devices || [];
            setDevices(availableDevices);

            const savedId = localStorage.getItem('spotifyDeviceId');
            const found = availableDevices.find(d => d.id === savedId);

            if (found) {
                setSelectedDevice(savedId);
            } else if (availableDevices.length > 0) {
                setSelectedDevice(availableDevices[0].id); // fallback první dostupné
            }

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
            if (trackUri && !contextUri) {
                // 🧠 Posíláme příkaz místo přímého přehrání
                const command = `zahraj ${currentTrack?.item?.name} od ${currentTrack?.item?.artists.map(a => a.name).join(', ')}`;
                await axios.post('/api/voice/execute', { command }, { withCredentials: true });
            } else {
                // 🎧 Přehraj album nebo playlist
                await axios.post('/api/spotify/play', {
                    deviceId: selectedDevice,
                    trackUri: null,
                    contextUri
                }, { withCredentials: true });
            }

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
            <Link to="/" className="btn btn-secondary">Zpět na Dashboard</Link>
            {/* Výběr zařízení */}
            <div className="mb-3">
                <label className="form-label">Zařízení</label>
                <select
                    className="form-select"
                    value={selectedDevice}
                    onChange={(e) => {
                        setSelectedDevice(e.target.value);
                        localStorage.setItem('spotifyDeviceId', e.target.value);
                    }}
                ><option value="">-- Vyber zařízení --</option>
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
                            onClick={async () => {
                                try {
                                    if (isTrack) {
                                        setTrackUri(item.uri);
                                        setContextUri('');
                                        await axios.post('/api/spotify/play', {
                                            deviceId: selectedDevice,
                                            trackUri: item.uri
                                        }, { withCredentials: true });
                                    } else {
                                        setContextUri(item.uri);
                                        setTrackUri('');
                                        await axios.post('/api/spotify/play', {
                                            deviceId: selectedDevice,
                                            contextUri: item.uri
                                        }, { withCredentials: true });
                                    }

                                    fetchCurrentTrack();

                                    setSearchQuery('');
                                    setSearchResults([]);
                                } catch {
                                    showMessage('Nepodařilo se přehrát položku.', true);
                                }
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



            {/* Právě přehráváno */}
            {currentTrack && currentTrack.item ? (
                <div className="card p-4">
                    <h4 className="mb-3">Právě hraje:</h4>
                    <div className="d-flex align-items-center">
                        <img
                            src={currentTrack.item.album.images[0].url}
                            alt="cover"
                            width="100"
                            height="100"
                            className="me-3 rounded shadow"
                        />
                        <div>
                            <h5 className="mb-1">{currentTrack.item.name}</h5>
                            <p className="text-muted mb-0">
                                {currentTrack.item.artists.map(a => a.name).join(', ')}
                            </p>
                        </div>
                    </div>

                    <div
                        className="mt-4 d-flex flex-wrap align-items-center justify-content-between bg-dark text-white p-3 rounded">
                        <div className="btn-group" role="group">
                            {currentTrack.is_playing ? (
                                <button className="btn btn-outline-light" onClick={pause}>
                                    <FaPause/> Pauza
                                </button>
                            ) : (
                                <button className="btn btn-success" onClick={play}>
                                    <FaPlay/> Přehrát
                                </button>
                            )}
                            <button className="btn btn-outline-light" onClick={next}>
                                <FaForward/> Další
                            </button>
                        </div>

                        <div className="d-flex align-items-center mt-3 mt-md-0">
                            <FaVolumeUp className="me-2"/>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={volume}
                                onChange={changeVolume}
                                className="form-range"
                                style={{width: '150px'}}
                            />
                            <span className="ms-2">{volume}%</span>
                        </div>
                    </div>
                </div>

            ) : (
                <p className="text-muted">Momentálně nic nehraje.</p>
            )}
        </div>
    );
};

export default SpotifyPlayer;
