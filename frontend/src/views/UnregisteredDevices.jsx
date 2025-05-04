import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

const UnregisteredDevices = () => {
    const [devices, setDevices] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [customName, setCustomName] = useState('');
    const [selectedDeviceId, setSelectedDeviceId] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [deviceRes, roomRes] = await Promise.all([
                axios.get('/api/unregistered-devices'),
                axios.get('/api/rooms')
            ]);
            setDevices(deviceRes.data);
            setRooms(roomRes.data);
        } catch (err) {
            console.error('Chyba při načítání:', err);
        }
    };

    const handleRegister = async () => {
        if (!selectedDeviceId || !selectedRoom || !customName) {
            alert('Vyplň všechna pole.');
            return;
        }

        const device = devices.find((d) => d.id === selectedDeviceId);
        const room = rooms.find(r => r.id === selectedRoom);
        if (!device || !room) return;

        if (!room.devices) room.devices = [];


        if (room.devices.some(dev => dev.id === device.id)) {
            alert('Zařízení už je v této místnosti zaregistrováno.');
            return;
        }

        try {
            await axios.post(`/api/rooms/${selectedRoom}/devices/add`, {
                id: device.id,
                name: customName,
                type: device.type
            });
            setSelectedDeviceId('');
            setCustomName('');
            fetchData();
        } catch (err) {
            console.error('Chyba při registraci zařízení:', err);
        }
    };

    return (
        <div className="container py-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Neregistrovaná zařízení (MQTT)</h2>
                <Link to="/" className="btn btn-secondary">Zpět na Dashboard</Link>
            </div>

            <div className="mb-4 row g-2">
                <div className="col-md-3">
                    <select
                        className="form-select"
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                    >
                        <option value="">Vyber zařízení</option>
                        {devices.map((d) => (
                            <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
                        ))}
                    </select>
                </div>
                <div className="col-md-3">
                    <select
                        className="form-select"
                        value={selectedRoom}
                        onChange={(e) => setSelectedRoom(e.target.value)}
                    >
                        <option value="">Vyber místnost</option>
                        {rooms.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </select>
                </div>
                <div className="col-md-4">
                    <input
                        className="form-control"
                        placeholder="Přátelský název"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                    />
                </div>
                <div className="col-md-2">
                    <button className="btn btn-primary w-100" onClick={handleRegister}>Zaregistrovat</button>
                </div>
            </div>

            <h5>Aktuálně neregistrováno:</h5>
            {devices.length === 0 ? (
                <p className="text-muted">Žádná nová zařízení k registraci.</p>
            ) : (
                <ul className="list-group">
                    {devices.map((d) => (
                        <li key={d.id} className="list-group-item">
                            <strong>{d.name}</strong> ({d.id}) — typ: {d.type || 'neznámý'}
                            <br /><small className="text-muted">Téma MQTT: {d.id}/command/switch:0</small>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default UnregisteredDevices;
