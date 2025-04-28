import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import DeviceControl from './DeviceControl'; // Importujeme komponentu DeviceControl
import { FaPowerOff, FaArrowLeft } from 'react-icons/fa'; // Pro ikony

const Dashboard = ({ handleLogout, onCardClick }) => {
    const [connectedDevices, setConnectedDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState(null); // Uložíme vybrané zařízení

    // Funkce pro načtení seznamu připojených zařízení
    const fetchConnectedDevices = async () => {
        try {
            const response = await fetch('/api/devices');
            const data = await response.json();
            setConnectedDevices(data.devices);

            // Vypis seznamu zařízení do konzole
            console.log('Seznam připojených zařízení:', data.devices);
        } catch (error) {
            console.error('Chyba při načítání připojených zařízení:', error);
        }
    };

    // Automatičtě zavoláme fetchConnectedDevices při načtení komponenty
    useEffect(() => {
        fetchConnectedDevices();
    }, []); // Prázdné pole znamená, že efekt se spustí pouze při prvním renderování

    // Funkce pro přechod na kartu ovládání zařízení
    const handleControlClick = (deviceId) => {
        setSelectedDevice(deviceId); // Uložíme vybrané zařízení
        onCardClick('deviceControl', deviceId); // Předáme název zařízení do karty
    };

    return (
        <div className="container mt-5">
            <h2 className="text-center text-primary mb-4">Ovládání inteligentní domácnosti</h2>

            {/* Karty pro úvodní obrazovku */}
            <div className="row justify-content-center">
                <div className="col-md-3">
                    <div className="card text-center mb-4 border-primary" style={{ backgroundColor: '#e0f7fa', borderRadius: '15px' }}>
                        <div className="card-body">
                            <h5 className="card-title">Ovládání zařízení</h5>
                            <p className="card-text">Ovládejte všechna zařízení ve vaší domácnosti.</p>
                            <button className="btn btn-primary w-100 py-2 rounded-pill shadow-sm" onClick={() => onCardClick('deviceControl')}>Otevřít</button>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-center mb-4 border-success" style={{ backgroundColor: '#e8f5e9', borderRadius: '15px' }}>
                        <div className="card-body">
                            <h5 className="card-title">Tvorba scén</h5>
                            <p className="card-text">Vytvořte vlastní scény pro automatizaci.</p>
                            <button className="btn btn-success w-100 py-2 rounded-pill shadow-sm" onClick={() => onCardClick('sceneCreation')}>Otevřít</button>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-center mb-4 border-warning" style={{ backgroundColor: '#fff3e0', borderRadius: '15px' }}>
                        <div className="card-body">
                            <h5 className="card-title">Nastavení</h5>
                            <p className="card-text">Upravte nastavení vaší aplikace.</p>
                            <button className="btn btn-warning w-100 py-2 rounded-pill shadow-sm" onClick={() => onCardClick('settings')}>Otevřít</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Zobrazit seznam připojených zařízení */}
            <div className="mt-4">
                <h4 className="text-center">Seznam připojených zařízení:</h4>
                {connectedDevices.length > 0 ? (
                    <ul className="list-group">
                        {connectedDevices.map((device, index) => (
                            <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                                {device}
                                <button
                                    className="btn btn-secondary btn-sm rounded-pill"
                                    onClick={() => handleControlClick(device)}>
                                    Ovládat
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-center text-muted">Žádná připojená zařízení.</p>
                )}
            </div>

            {/* Pokud je zařízení vybráno, zobrazíme kartu pro ovládání */}
            {selectedDevice && (
                <DeviceControl
                    deviceId={selectedDevice} // Předáváme vybrané zařízení
                    setDeviceId={setSelectedDevice}
                    turnOnDevice={() => console.log(`Zapínám zařízení ${selectedDevice}`)}
                    turnOffDevice={() => console.log(`Vypínám zařízení ${selectedDevice}`)}
                    handleBack={() => setSelectedDevice(null)} // Zpět tlačítko pro návrat
                />
            )}

            {/* Tlačítko pro odhlášení */}
            <div className="text-center mt-4">
                <button className="btn btn-danger w-100 py-2 rounded-pill shadow-sm" onClick={handleLogout}>
                    <FaPowerOff className="me-2" /> Odhlásit se
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
