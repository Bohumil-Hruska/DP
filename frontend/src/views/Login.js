import React from 'react';

const Login = ({ username, setUsername, password, setPassword, handleLogin }) => {
    const handleSubmit = (e) => {
        e.preventDefault(); // Zabráníme výchozímu chování formuláře
        handleLogin(); // Zavoláme funkci pro přihlášení
    };

    return (
        <form onSubmit={handleSubmit}> {/* Přidáme formulář */}
            <h2>Přihlášení</h2>
            <input
                type="text"
                className="form-control mb-2"
                placeholder="Uživatelské jméno"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
            />
            <input
                type="password"
                className="form-control mb-2"
                placeholder="Heslo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            <button type="submit" className="btn btn-primary w-100 mb-2"> {/* Změníme typ tlačítka na submit */}
                Přihlásit se
            </button>
        </form>
    );
};

export default Login;
