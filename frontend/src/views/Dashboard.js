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
            <header className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5">
                <h1 className="display-4 text-center text-md-start mb-3 mb-md-0">SmartHome Dashboard</h1>
                <button onClick={handleLogoutClick} className="btn btn-danger">Odhlásit se</button>
            </header>

            <p className="text-muted mb-4 text-center text-md-start">Přehled vaší chytré domácnosti</p>

            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-3">
                {/* Počasí */}
                <div className="col">
                    <div className="card bg-dark text-white text-center shadow-sm rounded-4 h-100">
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaTemperatureHigh className="text-info mb-3" size={40} />
                                <h5 className="card-title">Počasí</h5>
                                {weather ? (
                                    <>
                                        <p className="card-text">{weather.city}: {weather.temp}°C</p>
                                        <img src={`https:${weather.icon}`} alt={weather.description} style={{ width: "80px" }} className="my-2" />
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
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaWifi className="text-info mb-3" size={40} />
                                <h5 className="card-title">Zařízení</h5>
                                <p className="card-text">{devices.length} připojených</p>
                            </div>
                            <div className="d-flex justify-content-center gap-2 flex-wrap">
                                <Link to="/devices" className="btn btn-info">Zobrazit seznam</Link>
                                <Link to="/bluetooth" className="btn btn-outline-info">Bluetooth</Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Místnosti */}
                <div className="col">
                    <div className="card bg-dark text-white text-center shadow-sm rounded-4 h-100">
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaHome className="text-info mb-3" size={40} />
                                <h5 className="card-title">Místnosti</h5>
                                <p className="card-text">Kontrola, správa, řízení</p>
                            </div>
                            <Link to="/rooms" className="btn btn-info">Zobrazit</Link>
                        </div>
                    </div>
                </div>

                {/* Automatizace */}
                <div className="col">
                    <div className="card bg-dark text-white text-center shadow-sm rounded-4 h-100">
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaClock className="text-info mb-3" size={40} />
                                <h5 className="card-title">Automatizace</h5>
                                <p className="card-text">Naplánuj časované akce</p>
                            </div>
                            <Link to="/automation" className="btn btn-info">Plánovat</Link>
                        </div>
                    </div>
                </div>

                {/* Služby - Spotify */}
                <div className="col">
                    <div className="card bg-dark text-white text-center shadow-sm rounded-4 h-100">
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaWifi className="text-info mb-3" size={40} />
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
                    <div className="card bg-dark text-white text-center shadow-sm rounded-4 h-100">
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaPlusSquare className="text-info mb-3" size={40} />
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
