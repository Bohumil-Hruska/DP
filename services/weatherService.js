// services/weatherService.js
const axios = require('axios');

async function getCurrentWeather({ lat, lon, city }) {
    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) throw new Error('WEATHER_API_KEY není nastavený v .env');

    const q = city ? city : `${lat},${lon}`;
    const url = `https://api.weatherapi.com/v1/current.json`;

    const { data } = await axios.get(url, {
        params: { key: apiKey, q, lang: 'cs' },
        timeout: 8000
    });

    return {
        city: data.location?.name,
        region: data.location?.region,
        country: data.location?.country,
        tempC: data.current?.temp_c,
        feelsLikeC: data.current?.feelslike_c,
        text: data.current?.condition?.text,
        windKph: data.current?.wind_kph,
        humidity: data.current?.humidity
    };
}

module.exports = { getCurrentWeather };
