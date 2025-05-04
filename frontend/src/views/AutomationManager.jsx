import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

const AutomationManager = () => {
    const [automations, setAutomations] = useState([]);
    const [deviceId, setDeviceId] = useState('');
    const [action, setAction] = useState('on');
    const [time, setTime] = useState('');
    const [repeatDaily, setRepeatDaily] = useState(true);
    const [devices, setDevices] = useState([]);


    const fetchAutomations = async () => {
        try {
            const response = await axios.get('/api/automations');
            setAutomations(response.data);
        } catch (error) {
            console.error('Chyba při načítání automatizací:', error);
        }
    };

    useEffect(() => {
        fetchAutomations();
        axios.get('/api/devices').then(res => {
            setDevices(res.data);
        }).catch(err => {
            console.error('Chyba při načítání zařízení:', err);
        });
    }, []);


    const handleAddAutomation = async () => {
        try {
            await axios.post('/api/automations/add', {
                deviceId,
                action,
                time,
                repeat: repeatDaily
            });
            setDeviceId('');
            setTime('');
            setAction('on');
            setRepeatDaily(true);
            fetchAutomations();
        } catch (error) {
            console.error('Chyba při přidávání automatizace:', error);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`/api/automations/${id}`);
            fetchAutomations();
        } catch (error) {
            console.error('Chyba při mazání automatizace:', error);
        }
    };

    return (
        <div className="container py-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Plánovač automatizace</h2>
                <Link to="/" className="btn btn-secondary">Zpět na Dashboard</Link>
            </div>

            <div className="mb-4">
                <label className="form-label">Nová automatizace</label>
                <div className="row g-2">
                    <div className="col-md-3">
                        <select
                            className="form-select"
                            value={deviceId}
                            onChange={(e) => setDeviceId(e.target.value)}
                        >
                            <option value="">Vyber zařízení</option>
                            {devices.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {d.name} ({d.id})
                                </option>
                            ))}
                        </select>

                    </div>
                    <div className="col-md-2">
                        <select className="form-select" value={action} onChange={(e) => setAction(e.target.value)}>
                            <option value="on">Zapnout</option>
                            <option value="off">Vypnout</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <input
                            type="time"
                            className="form-control"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                        />
                    </div>
                    <div className="col-md-2">
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                checked={repeatDaily}
                                onChange={() => setRepeatDaily(!repeatDaily)}
                            />
                            <label className="form-check-label">Opakovat denně</label>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <button className="btn btn-primary w-100" onClick={handleAddAutomation}>Přidat</button>
                    </div>
                </div>
            </div>

            <h5>Naplánované akce</h5>
            <ul className="list-group">
                {automations.length === 0 ? (
                    <li className="list-group-item text-muted">Žádné automatizace</li>
                ) : (
                    automations.map(auto => (
                        <li key={auto.id} className="list-group-item d-flex justify-content-between align-items-center">
              <span>
                Zařízení <strong>{auto.deviceId}</strong> → <strong>{auto.action}</strong> v {auto.time} ({auto.repeat ? 'denně' : 'jednorázově'})
              </span>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(auto.id)}>Smazat</button>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};

export default AutomationManager;
