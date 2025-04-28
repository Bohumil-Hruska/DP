import axios from 'axios';

const BASE_URL = process.env.REACT_APP_BASE_URL;

export const turnOnDevice = async (deviceId) => {
    console.log(`Zapínám zařízení s ID: ${deviceId}`);
    return await axios.post('/api/device/on', { deviceId });
};

export const turnOffDevice = async (deviceId) => {
    console.log(`Vypínám zařízení s ID: ${deviceId}`);
    return await axios.post('/api/device/off', { deviceId });
};

export const registerUser = async (username, password) => {
    return await axios.post('/register', { username, password });
};

export const loginUser = async (username, password) => {
    return await axios.post('/login', { username, password });
};

export const logoutUser = async () => {
    return await axios.post('/logout');
};
