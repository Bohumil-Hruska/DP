import React from 'react';

const AlertMessage = ({ message, isError }) => {
    if (!message) return null;  // Pokud není zpráva, nic nezobrazíme

    return (
        <div className={`alert ${isError ? 'alert-danger' : 'alert-success'} alert-dismissible fade show`} role="alert">
            {message}
        </div>
    );
};

export default AlertMessage;
