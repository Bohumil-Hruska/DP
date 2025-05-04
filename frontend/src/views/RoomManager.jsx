import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { FaHome, FaTrash, FaInfoCircle } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';

const RoomManager = () => {
    const [rooms, setRooms] = useState([]);
    const [roomName, setRoomName] = useState('');
    const [mqttDevices, setMqttDevices] = useState([]);
    const [selectedRoomId, setSelectedRoomId] = useState('');
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [deviceCustomName, setDeviceCustomName] = useState('');
    const [expandedDeviceId, setExpandedDeviceId] = useState(null);
    const [moveTargets, setMoveTargets] = useState({});

    const fetchRooms = async () => {
        try {
            const response = await axios.get('/api/rooms');
            setRooms(response.data);
        } catch (error) {
            console.error('Chyba při načítání místností:', error);
        }
    };

    const fetchMqttDevices = async () => {
        try {
            const res = await axios.get('/api/devices');
            setMqttDevices(res.data);
        } catch (err) {
            console.error('Chyba při načítání MQTT zařízení:', err);
        }
    };

    useEffect(() => {
        fetchRooms();
        fetchMqttDevices();
    }, []);

    const handleAddRoom = async () => {
        try {
            await axios.post('/api/rooms/add', { name: roomName });
            setRoomName('');
            fetchRooms();
        } catch (error) {
            console.error('Chyba při přidávání místnosti:', error);
        }
    };

    const handleAddDevice = async () => {
        if (!selectedRoomId || !selectedDeviceId || !deviceCustomName) return;
        const mqttDevice = mqttDevices.find((d) => d.id === selectedDeviceId);
        if (!mqttDevice) return;

        const room = rooms.find(r => r.id === selectedRoomId);
        if (!room.devices) room.devices = [];
        if (room.devices.some(dev => dev.id === mqttDevice.id)) {
            alert('Zařízení už je v této místnosti zaregistrováno.');
            return;
        }

        try {
            await axios.post(`/api/rooms/${selectedRoomId}/devices/add`, {
                id: mqttDevice.id,
                name: deviceCustomName,
                type: mqttDevice.type
            });
            setDeviceCustomName('');
            setSelectedDeviceId('');
            fetchRooms();
        } catch (error) {
            console.error('Chyba při přidávání zařízení:', error);
        }
    };

    const handleDeleteRoom = async (roomId) => {
        try {
            await axios.delete(`/api/rooms/${roomId}`);
            fetchRooms();
        } catch (error) {
            console.error('Chyba při mazání místnosti:', error);
        }
    };

    const handleDeleteDevice = async (roomId, deviceId) => {
        try {
            await axios.delete(`/api/rooms/${roomId}/devices/${deviceId}`);
            fetchRooms();
        } catch (error) {
            console.error('Chyba při mazání zařízení:', error);
        }
    };

    const handleTurnOn = async (deviceId) => {
        try {
            await axios.post('/api/device/on', { deviceId });
        } catch (error) {
            console.error('Chyba při zapnutí zařízení:', error);
        }
    };

    const handleTurnOff = async (deviceId) => {
        try {
            await axios.post('/api/device/off', { deviceId });
        } catch (error) {
            console.error('Chyba při vypnutí zařízení:', error);
        }
    };

    const handleMoveDevice = async (fromRoomId, deviceId, toRoomId) => {
        try {
            await axios.post('/api/rooms/move-device', {
                deviceId,
                fromRoomId,
                toRoomId
            });
            fetchRooms();
            setMoveTargets(prev => ({ ...prev, [deviceId]: '' }));
        } catch (err) {
            console.error('Chyba při přesunu zařízení:', err);
        }
    };

    return (
        <div className="container py-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0">
                    <FaHome className="me-2 text-primary" /> Správa místností
                </h2>
                <Link to="/" className="btn btn-secondary">Zpět na Dashboard</Link>
            </div>

            <div className="mb-4">
                <label className="form-label">Nová místnost</label>
                <div className="input-group">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Název místnosti"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                    />
                    <button className="btn btn-primary" onClick={handleAddRoom}>
                        Přidat
                    </button>
                </div>
            </div>

            <div className="mb-4">
                <label className="form-label">Přidat zařízení do místnosti</label>
                <div className="row g-2">
                    <div className="col-md-3">
                        <select
                            className="form-select"
                            value={selectedRoomId}
                            onChange={(e) => setSelectedRoomId(e.target.value)}
                        >
                            <option value="">Vyber místnost</option>
                            {rooms.map((room) => (
                                <option key={room.id} value={room.id}>{room.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <select
                            className="form-select"
                            value={selectedDeviceId}
                            onChange={(e) => setSelectedDeviceId(e.target.value)}
                        >
                            <option value="">Vyber zařízení z MQTT</option>
                            {mqttDevices.map((d) => (
                                <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
                            ))}
                        </select>
                    </div>
                    <div className="col-md-4">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Přátelský název zařízení"
                            value={deviceCustomName}
                            onChange={(e) => setDeviceCustomName(e.target.value)}
                        />
                    </div>
                    <div className="col-md-2">
                        <button className="btn btn-success w-100" onClick={handleAddDevice}>Přidat</button>
                    </div>
                </div>
            </div>

            {rooms.map((room) => (
                <div key={room.id} className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <h5>{room.name}</h5>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteRoom(room.id)}>
                            <FaTrash className="me-1" /> Smazat místnost
                        </button>
                    </div>
                    {!room.devices || room.devices.length === 0 ? (
                        <p className="text-muted">Žádná zařízení.</p>
                    ) : (
                        <ul className="list-group">
                            {room.devices.map((device) => (
                                <li key={device.id} className="list-group-item">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong>{device.name}</strong> <span className="text-muted">({device.type})</span>
                                            <button
                                                className="btn btn-link btn-sm ms-2"
                                                onClick={() => setExpandedDeviceId(expandedDeviceId === device.id ? null : device.id)}
                                            >
                                                <FaInfoCircle />
                                            </button>
                                            {expandedDeviceId === device.id && (
                                                <div className="mt-2 small text-muted">
                                                    Stav: {device.status || '-'} <br />
                                                    Hodnota: {device.value || '-'} <br />
                                                    Poslední aktivita: {device.lastSeen ? new Date(device.lastSeen).toLocaleString('cs-CZ') : '-'}
                                                </div>
                                            )}
                                        </div>
                                        <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center gap-2 mt-2 mt-md-0">
                                            <button className="btn btn-sm btn-outline-success me-2"
                                                    onClick={() => handleTurnOn(device.id)}>Zapnout
                                            </button>
                                            <button className="btn btn-sm btn-outline-secondary me-2"
                                                    onClick={() => handleTurnOff(device.id)}>Vypnout
                                            </button>
                                            <select
                                                className="form-select form-select-sm me-2"
                                                value={moveTargets[device.id] || ''}
                                                onChange={(e) => setMoveTargets(prev => ({
                                                    ...prev,
                                                    [device.id]: e.target.value
                                                }))}
                                            >
                                                <option value="">Přesunout do...</option>
                                                {rooms.filter(r => r.id !== room.id).map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                            <button
                                                className="btn btn-sm btn-outline-primary me-2"
                                                onClick={() => handleMoveDevice(room.id, device.id, moveTargets[device.id])}
                                                disabled={!moveTargets[device.id]}
                                            >
                                                Přesunout
                                            </button>
                                            <button className="btn btn-sm btn-outline-danger"
                                                    onClick={() => handleDeleteDevice(room.id, device.id)}>
                                                <FaTrash/>
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ))}
        </div>
    );
};

export default RoomManager;
