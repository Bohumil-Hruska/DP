// SpotifyCallback.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SpotifyCallback = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get('code');
        if (!code) return navigate('/');

        axios.get(`/callback?code=${code}`)
            .then(() => {
                alert('Spotify byl úspěšně propojen!');
                navigate('/');
            })
            .catch(err => {
                console.error('Chyba při spojení se Spotify:', err);
                navigate('/');
            });
    }, [navigate]);

    return <p>Připojuji Spotify...</p>;
};

export default SpotifyCallback;
