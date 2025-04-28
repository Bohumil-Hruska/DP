const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mqtt = require('mqtt');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = 3001;

// MQTT připojení
const options = {
    host: '127.0.0.1',
    port: 1883,
    protocol: 'mqtt',
};
const client = mqtt.connect(options);

// MQTT zařízení
const connectedDevices = {}; // Použijeme objekt místo Setu!

client.on('connect', function () {
    console.log('Connected to MQTT broker');
    client.subscribe('#', { qos: 1 });
});

client.on('error', function (error) {
    console.error('Error connecting to MQTT broker:', error);
});

client.on('message', function (topic, message) {
    console.log('Received message:', topic, message.toString());

    const deviceId = topic.split('/')[0];

    try {
        const payload = JSON.parse(message.toString());

        connectedDevices[deviceId] = {
            id: deviceId,
            name: payload.name || deviceId,
            type: payload.type || 'unknown', // Pokud zařízení pošle typ, uložíme ho
            value: payload.value || '-',     // Volitelné pole (např. teplota, stav)
            status: 'online',
            lastSeen: new Date().toISOString()
        };

    } catch (err) {
        // Pokud není JSON, stejně zařízení evidujeme
        if (!connectedDevices[deviceId]) {
            connectedDevices[deviceId] = {
                id: deviceId,
                name: deviceId,
                type: 'unknown',
                value: '-',
                status: 'online',
                lastSeen: new Date().toISOString()
            };
        } else {
            // jen aktualizujeme lastSeen pokud už existuje
            connectedDevices[deviceId].lastSeen = new Date().toISOString();
            connectedDevices[deviceId].status = 'online';
        }
    }
});

// API endpoint pro zařízení
app.get('/api/devices', (req, res) => {
    res.json(Object.values(connectedDevices));
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Uživatelská správa
const users = [];

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
        return res.status(400).json({ message: 'Uživatel již existuje.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword });
    res.status(201).json({ success: true, message: 'Uživatel úspěšně registrován!' });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(user => user.username === username);
    if (user && await bcrypt.compare(password, user.password)) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Nesprávné uživatelské jméno nebo heslo.' });
    }
});

app.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Uživatel byl úspěšně odhlášen!' });
});

// Ovládání zařízení (publikování na MQTT)
app.post('/api/device/on', (req, res) => {
    const { deviceId } = req.body;
    client.publish(`${deviceId}/command/switch:0`, 'on', { qos: 1 });
    res.send(`Device ${deviceId} turned ON`);
});

app.post('/api/device/off', (req, res) => {
    const { deviceId } = req.body;
    client.publish(`${deviceId}/command/switch:0`, 'off', { qos: 1 });
    res.send(`Device ${deviceId} turned OFF`);
});

// Frontend build
app.use(express.static(path.join(__dirname, '../testnum1/frontend/build')));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../testnum1/frontend/build', 'index.html'));
});

// Start serveru
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server běží na http://localhost:${PORT}`);
});
