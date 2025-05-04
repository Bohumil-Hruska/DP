import axios from 'axios';

// Pokud používáš BASE_URL, nastav ho jen jednou


// Přidej interceptor – každý požadavek bude mít token, pokud existuje
axios.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// API funkce
export const turnOnDevice = async (deviceId) => {
    console.log(`Zapínám zařízení s ID: ${deviceId}`);
    return await axios.post(`/api/device/on`, { deviceId });
};

export const turnOffDevice = async (deviceId) => {
    console.log(`Vypínám zařízení s ID: ${deviceId}`);
    return await axios.post(`/api/device/off`, { deviceId });
};

export const registerUser = async (username, password) => {
    return await axios.post(`/register`, { username, password });
};

export const loginUser = async (username, password) => {
    const response = await axios.post(`/login`, { username, password });
    localStorage.setItem('token', response.data.token);
    return response;
};

export const logoutUser = async () => {
    localStorage.removeItem('token'); // smaž token
    return await axios.post(`/logout`);
};
