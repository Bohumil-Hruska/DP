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
        const interval = setInterval(fetchDevices, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="container py-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3">Seznam zařízení</h1>
                <Link to="/" className="btn btn-secondary">Zpět na Dashboard</Link>
            </div>

            {loading ? (
                <p>Načítání zařízení...</p>
            ) : devices.length === 0 ? (
                <p className="text-muted">Žádná zařízení nebyla nalezena.</p>
            ) : (
                <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4">
                    {devices.map((device) => (
                        <div className="col" key={device.id}>
                            <div className="card shadow h-100">
                                <div className="card-body d-flex flex-column justify-content-between">
                                    <div>
                                        <h5 className="card-title mb-2">{device.name}</h5>
                                        <h6 className="card-subtitle mb-3 text-muted">{device.type}</h6>
                                        <p className="mb-1"><strong>Hodnota:</strong> {device.value || '-'}</p>
                                        <p className="mb-1">
                                            <strong>Stav:</strong>{' '}
                                            <span className={`badge ${device.status === 'online' ? 'bg-success' : 'bg-secondary'}`}>
                        {device.status}
                      </span>
                                        </p>
                                        <p className="mb-0"><strong>Poslední aktivita:</strong> {device.lastSeen ? new Date(device.lastSeen).toLocaleString('cs-CZ') : '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ConnectedDevices;
