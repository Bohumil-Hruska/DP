// services/deviceService.js
const fetch = require('node-fetch'); // pokud používáš fetch v Node


const axios = require('axios');

async function handleDeviceOn(deviceId, token) {
    try {
        await axios.post(
            'http://localhost:3000/api/device/on',
            { deviceId },
            { headers: { Authorization: token } }
        );
        return { success: true, message: `Zařízení ${deviceId} zapnuto.` };
    } catch (err) {
        console.error('Chyba při zapnutí zařízení:', err.response?.status, err.response?.data || err.message);
        return { success: false, message: 'Nepodařilo se zapnout zařízení.' };
    }
}

async function handleDeviceOff(deviceId, token) {
    try {
        await axios.post(
            'http://localhost:3000/api/device/off',
            { deviceId },
            { headers: { Authorization: token } }
        );
        return { success: true, message: `Zařízení ${deviceId} vypnuto.` };
    } catch (err) {
        console.error('Chyba při vypnutí zařízení:', err.response?.status, err.response?.data || err.message);
        return { success: false, message: 'Nepodařilo se vypnout zařízení.' };
    }
}

module.exports = { handleDeviceOn, handleDeviceOff };
