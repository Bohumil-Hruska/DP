const fetch = require('node-fetch');
const querystring = require('querystring');

module.exports = async function ensureSpotifyToken(req, res, next) {
    let token = req.cookies.spotify_access_token;
    const refreshToken = req.cookies.spotify_refresh_token;

    if (!token && refreshToken) {
        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(
                        process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET
                    ).toString('base64'),
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: querystring.stringify({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                })
            });

            const data = await response.json();

            if (data.access_token) {
                // Obnovený token nastavíme do cookie
                res.cookie('spotify_access_token', data.access_token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'Strict',
                    maxAge: 3600 * 1000
                });

                req.cookies.spotify_access_token = data.access_token;
                token = data.access_token;
            }
        } catch (err) {
            console.error('Chyba při obnově tokenu:', err);
        }
    }

    next();
};
