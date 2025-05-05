import React, { useEffect, useState } from 'react';
import {FaTemperatureHigh, FaWifi, FaHome, FaClock, FaPlusSquare} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useNavigate } from 'react-router-dom';



const Dashboard = ({handleLogout}) => {
    const [weather, setWeather] = useState(null);

    const navigate = useNavigate();

    const [devices, setDevices] = useState([]);

    const [spotifyLoggedIn, setSpotifyLoggedIn] = useState(false);

    const [currentTrack, setCurrentTrack] = useState(null);

    useEffect(() => {
        const fetchTrack = async () => {
            try {
                const res = await axios.get('/api/spotify/current', { withCredentials: true });
                setCurrentTrack(res.data);
            } catch {
                setCurrentTrack(null);
            }
        };

        fetchTrack();
        const interval = setInterval(fetchTrack, 10000); // refresh každých 10s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                await axios.get('/api/spotify/refresh', { withCredentials: true });
                console.log('Spotify token obnoven');
            } catch (err) {
                console.warn('Nepodařilo se obnovit token');
            }
        }, 50 * 60 * 1000); // každých 50 minut

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        axios.get('/api/spotify/status', { withCredentials: true })
            .then(res => setSpotifyLoggedIn(res.data.loggedIn))
            .catch(() => setSpotifyLoggedIn(false));
    }, []);

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const response = await axios.get('/api/devices');
                setDevices(response.data);
            } catch (error) {
                console.error('Chyba při načítání zařízení:', error);
            }
        };

        fetchDevices();
    }, []);


    const handleLogoutClick = () => {
        handleLogout();
        navigate('/');
    };

    useEffect(() => {
        const fetchWeather = async (latitude, longitude) => {
            try {
                const apiKey = '8ce04aef8dc84cdd808170721252804';
                const response = await axios.get(
                    `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${latitude},${longitude}&lang=cs`
                );
                setWeather({
                    temp: response.data.current.temp_c,
                    city: response.data.location.name,
                    icon: response.data.current.condition.icon,
                    description: response.data.current.condition.text
                });
            } catch (error) {
                console.error('Chyba při načítání počasí:', error);
            }
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    fetchWeather(latitude, longitude);
                },
                (error) => {
                    console.error('Chyba při získávání polohy:', error);
                }
            );
        } else {
            console.error('Geolokace není podporována tímto prohlížečem.');
        }
    }, []);

    return (
        <div className="container py-5 text-white">
            <header className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
                <div className="d-flex align-items-center gap-2">
                    <h1 className="h4 mb-0">Smart Home Control</h1>

                    {/* Ikona pouze na mobilu */}
                    <button
                        onClick={handleLogoutClick}
                        className="btn btn-sm btn-outline-light d-inline d-md-none"
                        title="Odhlásit se"
                        style={{lineHeight: '1'}}
                    >
                        🔓
                    </button>
                </div>

                {/* Tlačítko na větších displejích */}
                <button
                    onClick={handleLogoutClick}
                    className="btn btn-info d-none d-md-inline"
                >
                    Odhlásit se
                </button>
            </header>


            {/* Info panel / mezisekce */}
            <div className="mb-4">
                <div className="alert alert-info text-center rounded-3 shadow-sm mb-3">
                    👋 Vítejte zpět! Systém běží stabilně.
                    <span className="ms-3">
      Zařízení: {devices.length} • Spotify: {currentTrack?.item && (
                        <p className="text-muted small">
                            🎵 {currentTrack.item.name} – {currentTrack.item.artists.map(a => a.name).join(', ')}
                        </p>
                    )}
    </span>
                </div>

                <div className="text-center text-muted fs-5">
                    📅 {new Date().toLocaleDateString('cs-CZ', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                })}{' '}
                    – 🕒 {new Date().toLocaleTimeString('cs-CZ')}
                </div>
            </div>


            <p className="text-muted mb-4 text-center text-md-start">Přehled vaší chytré domácnosti</p>

            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4 align-items-stretch">
                {/* Počasí */}
                <div className="col">
                    <div className="card bg-dark text-white text-center shadow-sm rounded-4 h-100">
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaTemperatureHigh className="text-info mb-3" size={40}/>
                                <h5 className="card-title">Počasí</h5>
                                {weather ? (
                                    <>
                                        <p className="card-text">{weather.city}: {weather.temp}°C</p>
                                        <img src={`https:${weather.icon}`} alt={weather.description}
                                             style={{width: "80px"}} className="my-2"/>
                                        <p className="card-text text-info">{weather.description}</p>
                                    </>
                                ) : (
                                    <p className="text-info">Načítání počasí...</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Zařízení */}
                <div className="col">
                    <div className="card bg-dark text-white text-center shadow-sm rounded-4 h-100">
                        <div className="card-body d-flex flex-column justify-content-between" style={{ minHeight: '230px' }}>
                            <div>
                                <FaWifi className="text-info mb-3" size={40}/>
                                <h5 className="card-title">Zařízení</h5>
                                <p className="card-text">{devices.length} připojených</p>
                            </div>
                            <div className="d-flex justify-content-center gap-2 flex-wrap">
                                <Link to="/devices" className="btn btn-info">Zobrazit seznam</Link>
                                <Link to="/bluetooth" className="btn btn-info">Bluetooth</Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Místnosti */}
                <div className="col">
                    <div className="card bg-dark text-white text-center shadow-sm rounded-4 h-100" style={{ minHeight: '230px' }}>
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaHome className="text-info mb-3" size={40}/>
                                <h5 className="card-title">Místnosti</h5>
                                <p className="card-text">Kontrola, správa, řízení</p>
                            </div>
                            <Link to="/rooms" className="btn btn-info">Zobrazit</Link>
                        </div>
                    </div>
                </div>

                {/* Automatizace */}
                <div className="col">
                    <div className="card bg-dark text-white text-center shadow-sm rounded-4 h-100" style={{ minHeight: '230px' }}>
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaClock className="text-info mb-3" size={40}/>
                                <h5 className="card-title">Automatizace</h5>
                                <p className="card-text">Naplánuj časované akce</p>
                            </div>
                            <Link to="/automation" className="btn btn-info">Plánovat</Link>
                        </div>
                    </div>
                </div>

                {/* Služby - Spotify */}
                <div className="col">
                    <div className="card bg-dark text-white text-center shadow-sm rounded-4 h-100" style={{ minHeight: '230px' }}>
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaWifi className="text-info mb-3" size={40}/>
                                <h5 className="card-title">Služby</h5>
                                <p className="card-text">Spotify, YouTube, ...</p>
                            </div>
                            {spotifyLoggedIn ? (
                                <>
                                    <p>Spotify je připojeno ✅</p>
                                    <Link to="/spotify-player" className="btn btn-info">
                                        Přehrávač
                                    </Link>
                                </>
                            ) : (
                                <a href="/api/spotify/login" className="btn btn-info">Připojit Spotify</a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Nové zařízení */}
                <div className="col">
                    <div className="card bg-dark text-white text-center shadow-sm rounded-4 h-100" style={{ minHeight: '230px' }}>
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaPlusSquare className="text-info mb-3" size={40}/>
                                <h5 className="card-title">Nové zařízení</h5>
                                <p className="card-text">Zaregistruj MQTT zařízení</p>
                            </div>
                            <Link to="/add-device" className="btn btn-info">Zaregistrovat</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

};

export default Dashboard;
