import React, { useEffect, useState } from 'react';
import { FaLightbulb, FaTemperatureHigh, FaLock, FaWifi } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const [weather, setWeather] = useState(null);

    const handleLogout = () => {
        console.log('Uživatel odhlášen');
    };

    useEffect(() => {
        const fetchWeather = async (latitude, longitude) => {
            try {
                const apiKey = '8ce04aef8dc84cdd808170721252804'; // <-- SEM vlož svůj klíč z WeatherAPI
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
            <header className="mb-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="display-4">SmartHome Dashboard</h1>
                    <button onClick={handleLogout} className="btn btn-outline-danger">Odhlásit se</button>
                </div>
                <p className="text-muted">Přehled vaší chytré domácnosti</p>
            </header>

            <div className="row g-4">
                {/* Světla */}
                <div className="col-12 col-md-6 col-lg-3">
                    <div className="card text-center shadow-sm h-100">
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaLightbulb className="text-warning mb-3" size={50} />
                                <h5 className="card-title">Světla</h5>
                                <p className="card-text">5 zapnutých</p>
                            </div>
                            <button className="btn btn-warning mt-3">Vypnout všechna</button>
                        </div>
                    </div>
                </div>

                {/* Topení / Počasí */}
                <div className="col-12 col-md-6 col-lg-3">
                    <div className="card text-center shadow-sm h-100">
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaTemperatureHigh className="text-danger mb-3" size={50} />
                                <h5 className="card-title">Počasí</h5>
                                {weather ? (
                                    <>
                                        <p className="card-text">
                                            {weather.city}: {weather.temp}°C
                                        </p>
                                        <img
                                            src={`https:${weather.icon}`}
                                            alt={weather.description}
                                            style={{ width: "80px" }}
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

                {/* Alarm */}
                <div className="col-12 col-md-6 col-lg-3">
                    <div className="card text-center shadow-sm h-100">
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaLock className="text-success mb-3" size={50} />
                                <h5 className="card-title">Zabezpečení</h5>
                                <p className="card-text">Aktivní</p>
                            </div>
                            <button className="btn btn-success mt-3">Deaktivovat</button>
                        </div>
                    </div>
                </div>

                {/* Zařízení */}
                <div className="col-12 col-md-6 col-lg-3">
                    <div className="card text-center shadow-sm h-100">
                        <div className="card-body d-flex flex-column justify-content-between">
                            <div>
                                <FaWifi className="text-primary mb-3" size={50}/>
                                <h5 className="card-title">Zařízení</h5>
                                <p className="card-text">12 připojených</p>
                            </div>
                            <Link to="/devices" className="btn btn-primary mt-3">
                                Zobrazit seznam
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
