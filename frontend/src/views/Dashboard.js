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
        <div className="container py-5">
            <header className="d-flex flex-column flex-md-row justify-content-between align-items-center mb-5">
                <h1 className="display-4 text-center text-md-start mb-3 mb-md-0">SmartHome Dashboard</h1>
                <button onClick={handleLogoutClick} className="btn btn-outline-danger">Odhlásit se</button>
            </header>

            <p className="text-muted mb-4 text-center text-md-start">Přehled vaší chytré domácnosti</p>

            <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4">
                {/* RoomManager */}
                <div className="col">
                    <div className="card text-center shadow h-100">
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaHome className="text-warning mb-3" size={50}/>
                                <h5 className="card-title">Místnosti</h5>
                                <p className="card-text">Kontrola, správa, řízení</p>
                            </div>
                            <Link to="/rooms" className="btn btn-primary mt-3">
                                Zobrazit seznam
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Počasí */}
                <div className="col">
                    <div className="card text-center shadow h-100">
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaTemperatureHigh className="text-danger mb-3" size={50}/>
                                <h5 className="card-title">Počasí</h5>
                                {weather ? (
                                    <>
                                        <p className="card-text">{weather.city}: {weather.temp}°C</p>
                                        <img
                                            src={`https:${weather.icon}`}
                                            alt={weather.description}
                                            style={{width: "80px"}}
                                            className="my-2"
                                        />
                                        <p className="card-text text-muted">{weather.description}</p>
                                    </>
                                ) : (
                                    <p className="text-muted">Načítání počasí...</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Automatizace */}
                <div className="col">
                    <div className="card text-center shadow h-100">
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaClock className="text-success mb-3" size={50}/>
                                <h5 className="card-title">Automatizace</h5>
                                <p className="card-text">Naplánuj časované akce</p>
                            </div>
                            <Link to="/automation" className="btn btn-primary mt-3">Plánovat</Link>
                        </div>
                    </div>
                </div>

                {/* Zařízení */}
                <div className="col">
                    <div className="card text-center shadow h-100">
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaWifi className="text-primary mb-3" size={50}/>
                                <h5 className="card-title">Zařízení</h5>
                                <p className="card-text">{devices.length} připojených</p>
                            </div>
                            <Link to="/devices" className="btn btn-primary mt-3">
                                Zobrazit seznam
                            </Link>
                            <Link to="/bluetooth" className="btn btn-info mt-3">
                                Bluetooth zařízení
                            </Link>
                        </div>
                    </div>
                </div>

                    <div className="col">
                        <div className="card text-center shadow h-100">
                            <div className="card-body d-flex flex-column justify-content-between">
                                <div>
                                    <FaWifi className="text-primary mb-3" size={50}/>
                                    <h5 className="card-title">Služby</h5>
                                    <p className="card-text">Spotify, YouTube, ...</p>
                                </div>
                                <Link to="/spotify-player" className="btn btn-success">
                                    Spotify přehrávač
                                </Link>
                            </div>
                        </div>
                    </div>

                <div className="col">
                    <div className="card text-center shadow h-100">
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaPlusSquare className="text-primary mb-3" size={50}/>
                                <h5 className="card-title">Nové zařízení</h5>
                                <p className="card-text">Zaregistruj MQTT zařízení</p>
                            </div>
                            <Link to="/add-device" className="btn btn-success mt-3">Zaregistrovat</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
