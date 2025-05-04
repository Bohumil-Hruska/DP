import { useEffect } from 'react';
import mqtt from 'mqtt';

const MqttListener = ({ onMessage }) => {
    useEffect(() => {
        const client = mqtt.connect('ws://localhost:9001'); // přizpůsob adresu

        client.on('connect', () => {
            console.log('MQTT připojeno přes websocket');
            client.subscribe('#');
        });

        client.on('message', (topic, message) => {
            const msg = message.toString();
            try {
                const parsed = JSON.parse(msg);
                onMessage(topic, parsed); // předáme zpět do aplikace
            } catch {
                onMessage(topic, msg);
            }
        });

        return () => {
            client.end();
        };
    }, [onMessage]);

    return null;
};

export default MqttListener;
