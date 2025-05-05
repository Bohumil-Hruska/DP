import React from 'react';

const SpotifyEmbed = ({ uri }) => {
    if (!uri) return null;

    const type = uri.split(':')[1];
    const id = uri.split(':')[2];
    const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;

    return (
        <iframe
            src={embedUrl}
            width="100%"
            height="80"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title="Spotify Embed"
        ></iframe>
    );
};

export default SpotifyEmbed;
