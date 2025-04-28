import React from 'react';

const Register = ({ registerUsername, setRegisterUsername, registerPassword, setRegisterPassword, handleRegister }) => {
    const handleSubmit = (e) => {
        e.preventDefault(); // Zabráníme výchozímu chování formuláře
        handleRegister(); // Zavoláme funkci pro registraci
    };

    return (
        <form onSubmit={handleSubmit}> {/* Přidáme formulář */}
            <h2 className="mt-4">Registrace</h2>
            <input
                type="text"
                className="form-control mb-2"
                placeholder="Uživatelské jméno pro registraci"
                value={registerUsername}
                onChange={(e) => setRegisterUsername(e.target.value)}
                required
            />
            <input
                type="password"
                className="form-control mb-2"
                placeholder="Heslo pro registraci"
                value={registerPassword}
                onChange={(e) => setRegisterPassword(e.target.value)}
                required
            />
            <button type="submit" className="btn btn-success w-100"> {/* Změníme typ tlačítka na submit */}
                Registrovat
            </button>
        </form>
    );
};

export default Register;
