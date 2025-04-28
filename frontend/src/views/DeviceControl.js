import React from 'react';
import { FaPowerOff, FaArrowLeft } from 'react-icons/fa';

const DeviceControl = ({ deviceId, setDeviceId, turnOnDevice, turnOffDevice, handleBack }) => {
    return (
        <div className="container my-5">
            <h2 className="text-center text-primary mb-4">Ovládání zařízení</h2>
            <div className="input-group mb-3">
                <input
                    type="text"
                    className="form-control rounded-pill"
                    placeholder="Zadejte ID zařízení"
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                />
            </div>
            <div className="d-flex flex-column">
                <button
                    className="btn btn-success mb-3 py-3 rounded-pill shadow-sm"
                    onClick={turnOnDevice}
                >
                    <FaPowerOff className="me-2" /> Zapnout
                </button>
                <button
                    className="btn btn-danger mb-3 py-3 rounded-pill shadow-sm"
                    onClick={turnOffDevice}
                >
                    <FaPowerOff className="me-2" /> Vypnout
                </button>
                <button
                    className="btn btn-secondary py-3 rounded-pill shadow-sm"
                    onClick={handleBack}
                >
                    <FaArrowLeft className="me-2" /> Zpět
                </button>
            </div>
        </div>
    );
};

export default DeviceControl;
