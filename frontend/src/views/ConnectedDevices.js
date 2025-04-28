import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const ConnectedDevices = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const response = await axios.get('/api/devices');
                setDevices(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Chyba při načítání zařízení:', error);
            }
        };

        fetchDevices();
        const interval = setInterval(fetchDevices, 30000); // obnovit každých 30s

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <div className="container py-5"><p>Načítání zařízení...</p></div>;
    }

    return (
        <div className="container py-5">
            {/* Tlačítko zpět */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1>Seznam zařízení</h1>
                <Link to="/" className="btn btn-secondary">
                    Zpět na Dashboard
                </Link>
            </div>

            <table className="table table-striped table-bordered">
                <thead className="table-dark">
                <tr>
                    <th>Název</th>
                    <th>Typ</th>
                    <th>Hodnota</th>
                    <th>Stav</th>
                    <th>Poslední komunikace</th>
                </tr>
                </thead>
                <tbody>
                {Array.isArray(devices) && devices.length > 0 ? (
                    devices.map((device) => (
                        <tr key={device.id}>
                            <td>{device.name}</td>
                            <td>{device.type}</td>
                            <td>{device.value}</td>
                            <td>
          <span className={`badge ${device.status === 'online' ? 'bg-success' : 'bg-secondary'}`}>
            {device.status}
          </span>
                            </td>
                            <td>{new Date(device.lastSeen).toLocaleString('cs-CZ')}</td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan="5" className="text-center">Žádná zařízení nenalezena.</td>
                    </tr>
                )}
                </tbody>
            </table>
        </div>
    );
};

export default ConnectedDevices;
