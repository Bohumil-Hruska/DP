require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mqtt = require('mqtt');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const querystring = require('querystring');
const fetch = require('node-fetch');
const cookieParser = require('cookie-parser');



const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;


const USERS_FILE = path.join(__dirname, 'users.json');
const loadUsers = () => fs.existsSync(USERS_FILE) ? JSON.parse(fs.readFileSync(USERS_FILE)) : [];
const saveUsers = () => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

let users = loadUsers();


function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    try {
        const user = jwt.verify(token, SECRET);
        req.user = user;
        next();
    } catch (err) {
        res.sendStatus(403);
    }
}

const { execSync } = require('child_process');


const app = express();
app.use(cookieParser());
const PORT = 3000;


const ROOMS_FILE = path.join(__dirname, 'rooms.json');

const loadRooms = () => {
    if (fs.existsSync(ROOMS_FILE)) {
        return JSON.parse(fs.readFileSync(ROOMS_FILE));
    }
    return [];
};

const saveRooms = () => {
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(rooms, null, 2));
};


let rooms = loadRooms();


// MQTT připojení
const options = {
    host: '127.0.1.1',
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

        // Získání hodnoty výstupu ze struktury např. { "switch:0": { output: true } }
        const outputRaw = payload["switch:0"]?.output ?? payload.output;

        // Interpretace jako zapnuto/vypnuto
        const value = outputRaw === true ? 'zapnuto' :
            outputRaw === false ? 'vypnuto' :
                payload.value || payload.state || payload.status || '-';

        connectedDevices[deviceId] = {
            id: deviceId,
            name: payload.name || deviceId,
            type: payload.type || 'unknown',
            value,
            status: 'online',
            lastSeen: new Date().toISOString()
        };

    } catch (err) {
        // Pokud není JSON nebo chybí data
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
            connectedDevices[deviceId].lastSeen = new Date().toISOString();
            connectedDevices[deviceId].status = 'online';
        }
    }
});

app.get('/api/spotify/login', (req, res) => {
    const scope = 'user-read-playback-state user-modify-playback-state';
    const params = querystring.stringify({
        response_type: 'code',
        client_id: process.env.SPOTIFY_CLIENT_ID,
        scope,
        redirect_uri: process.env.SPOTIFY_REDIRECT_URI
    });

    res.redirect('https://accounts.spotify.com/authorize?' + params);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code;
    const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + Buffer.from(
                process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
            ).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: querystring.stringify({
            grant_type: 'authorization_code',
            code,
            redirect_uri: process.env.SPOTIFY_REDIRECT_URI
        })
    });

    const data = await response.json();
    if (data.access_token) {
        res.cookie('spotify_access_token', data.access_token, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 3600 * 1000
        });
        res.redirect('/spotify-player');
    } else {
        res.status(400).send('Chyba při přihlášení ke Spotify');
    }
});

app.get('/api/spotify/status', (req, res) => {
    const token = req.cookies?.spotify_access_token;
    if (!token) {
        return res.status(401).json({ loggedIn: false });
    }
    res.json({ loggedIn: true });
});

app.get('/api/spotify/devices', async (req, res) => {
    const token = req.cookies.spotify_access_token;
    if (!token) return res.status(401).json({ error: 'Neautorizováno' });

    const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    res.json(data);
});

app.post('/api/spotify/play', async (req, res) => {
    const token = req.cookies.spotify_access_token;
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const { deviceId, trackUri } = req.body;

    const playResponse = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            uris: [trackUri],
        }),
    });

    if (playResponse.ok) {
        res.json({ success: true });
    } else {
        const err = await playResponse.json();
        console.error('Spotify play error:', err);
        res.status(500).json({ error: err });
    }
});





app.get('/api/bluetooth-devices', authenticate, (req, res) => {
    try {
        const result = execSync("bluetoothctl devices Connected").toString();
        const devices = result
            .split('\n')
            .filter(line => line.trim() !== '')
            .map(line => {
                const [, mac, ...nameParts] = line.split(' ');
                return {
                    mac,
                    name: nameParts.join(' ')
                };
            });

        res.json(devices);
    } catch (err) {
        console.error('Chyba při získávání BT zařízení:', err);
        res.status(500).json({ error: 'Chyba při získávání Bluetooth zařízení' });
    }
});

// API endpoint pro zařízení
app.get('/api/devices', (req, res) => {
    res.json(Object.values(connectedDevices));
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Vrátí všechny místnosti
app.get('/api/rooms', authenticate, (req, res) => {
    res.json(rooms);
});

// Přidá novou místnost
app.post('/api/rooms/add', authenticate, (req, res) => {
    const { name } = req.body;
    const newRoom = { id: Date.now().toString(), name, devices: [] };
    rooms.push(newRoom);
    saveRooms();
    res.status(201).json(newRoom);
});

// Přidá zařízení do konkrétní místnosti
app.post('/api/rooms/:id/devices/add',authenticate, (req, res) => {
    const { id, name, type } = req.body;
    const room = rooms.find(r => r.id === req.params.id);
    if (!room) return res.status(404).json({ message: 'Místnost nenalezena' });

    const deviceFromMQTT = connectedDevices[id];

    const newDevice = {
        id,
        name,
        type,
        status: deviceFromMQTT?.status || 'offline',
        value: deviceFromMQTT?.value || '-',
        lastSeen: deviceFromMQTT?.lastSeen || null
    };

    room.devices.push(newDevice);
    saveRooms();
    res.status(201).json(newDevice);
});


// Smaže místnost podle ID
app.delete('/api/rooms/:id', authenticate, (req, res) => {
    const roomIndex = rooms.findIndex(r => r.id === req.params.id);
    if (roomIndex === -1) {
        return res.status(404).json({ message: 'Místnost nenalezena' });
    }

    const deleted = rooms.splice(roomIndex, 1);
    saveRooms();
    res.json({ success: true, deleted });
});

// Smaže zařízení z místnosti
app.delete('/api/rooms/:roomId/devices/:deviceId', authenticate, (req, res) => {
    const room = rooms.find(r => r.id === req.params.roomId);
    if (!room) return res.status(404).json({ message: 'Místnost nenalezena' });

    const deviceIndex = room.devices.findIndex(d => d.id === req.params.deviceId);
    if (deviceIndex === -1) {
        return res.status(404).json({ message: 'Zařízení nenalezeno' });
    }

    const deletedDevice = room.devices.splice(deviceIndex, 1);
    res.json({ success: true, deleted: deletedDevice });
});

app.post('/api/rooms/move-device', authenticate, (req, res) => {
    const { deviceId, fromRoomId, toRoomId } = req.body;

    const from = rooms.find(r => r.id === fromRoomId);
    const to = rooms.find(r => r.id === toRoomId);
    if (!from || !to) return res.status(404).json({ message: 'Místnost nenalezena' });

    const device = from.devices.find(d => d.id === deviceId);
    if (!device) return res.status(404).json({ message: 'Zařízení nenalezeno' });

    from.devices = from.devices.filter(d => d.id !== deviceId);
    to.devices.push(device);
    saveRooms();
    res.json({ success: true });
});

app.get('/api/unregistered-devices',authenticate, (req, res) => {
    const registeredIds = rooms.flatMap(r => r.devices?.map(d => d.id) || []);
    const unregistered = Object.values(connectedDevices).filter(d => !registeredIds.includes(d.id));
    res.json(unregistered);
});

app.get('/me', authenticate, (req, res) => {
    res.json({ user: req.user });
});




app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
        return res.status(400).json({ message: 'Uživatel již existuje.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, password: hashedPassword });
    saveUsers();
    res.status(201).json({ success: true, message: 'Uživatel úspěšně registrován!' });
});


app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: 'Nesprávné přihlašovací údaje' });
    }
});



app.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Uživatel byl úspěšně odhlášen!' });
});

// Ovládání zařízení (publikování na MQTT)
app.post('/api/device/on',authenticate, (req, res) => {
    const { deviceId } = req.body;
    client.publish(`${deviceId}/command/switch:0`, 'on', { qos: 1 });
    res.send(`Device ${deviceId} turned ON`);
});

app.post('/api/device/off',authenticate, (req, res) => {
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

app.get('/api/automations',authenticate, (req, res) => {
    res.json(automations);
});

app.post('/api/automations/add',authenticate, (req, res) => {
    const { deviceId, action, time, repeat } = req.body;
    const newAuto = {
        id: Date.now().toString(),
        deviceId,
        action,
        time,
        repeat
    };
    automations.push(newAuto);
    saveAutomations();
    scheduleAutomation(newAuto);
    res.status(201).json(newAuto);
});

app.delete('/api/automations/:id',authenticate, (req, res) => {
    const id = req.params.id;
    automations = automations.filter(a => a.id !== id);
    saveAutomations();

    const job = scheduledJobs.find(j => j.id === id);
    if (job) {
        job.job.stop();
        scheduledJobs = scheduledJobs.filter(j => j.id !== id);
    }

    res.json({ success: true });
});


const cron = require('node-cron');
const AUTOMATIONS_FILE = path.join(__dirname, 'automations.json');

const loadAutomations = () => {
    if (fs.existsSync(AUTOMATIONS_FILE)) {
        return JSON.parse(fs.readFileSync(AUTOMATIONS_FILE));
    }
    return [];
};

let automations = loadAutomations();

const saveAutomations = () => {
    fs.writeFileSync(AUTOMATIONS_FILE, JSON.stringify(automations, null, 2));
};

// Udržujeme naplánované cron úlohy
let scheduledJobs = [];

const scheduleAutomation = (auto) => {
    const [hour, minute] = auto.time.split(':');
    const cronTime = `${minute} ${hour} * * *`;

    const job = cron.schedule(cronTime, () => {
        console.log(`Automatizace: zařízení ${auto.deviceId} → ${auto.action}`);
        client.publish(`${auto.deviceId}/command/switch:0`, auto.action, { qos: 1 });

        if (!auto.repeat) {
            // Jednorázová - zruš a odeber
            job.stop();
            automations = automations.filter(a => a.id !== auto.id);
            saveAutomations();
        }
    });

    scheduledJobs.push({ id: auto.id, job });
};

automations.forEach(scheduleAutomation);

