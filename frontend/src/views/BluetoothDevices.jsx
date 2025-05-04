import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const BluetoothDevices = () => {
    const [devices, setDevices] = useState([]);

    useEffect(() => {
        axios.get('/api/bluetooth-devices')
            .then(res => setDevices(res.data))
            .catch(err => console.error('Chyba při načítání BT zařízení:', err));
    }, []);

    return (
        <div className="container py-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Bluetooth zařízení</h2>
                <Link to="/" className="btn btn-secondary">Zpět na Dashboard</Link>
            </div>

            {devices.length === 0 ? (
                <p className="text-muted">Žádná zařízení nejsou připojena.</p>
            ) : (
                <ul className="list-group">
                    {devices.map((d, i) => (
                        <li key={i} className="list-group-item">
                            {d.name} <small className="text-muted">({d.mac})</small>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default BluetoothDevices;
