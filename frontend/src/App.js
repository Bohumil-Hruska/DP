import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import React, { useState } from 'react';
import Dashboard from './views/Dashboard';
import ConnectedDevices from './views/ConnectedDevices';
import DeviceControl from './views/DeviceControl';
import Login from './views/Login';
import Register from './views/Register';
import AutomationManager from './views/AutomationManager';
import AlertMessage from './views/AlertMessage';
import UnregisteredDevices from './views/UnregisteredDevices';
import RoomManager from './views/RoomManager';
import BluetoothDevices from './views/BluetoothDevices';
import { turnOnDevice, turnOffDevice, registerUser, loginUser, logoutUser } from './api';
import SpotifyPlayer from "./views/SpotifyPlayer";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');

  const showMessage = (msg, error) => {
    setMessage(msg);
    setIsError(error);
    setTimeout(() => setMessage(''), 2000);
  };

  const handleLogin = async () => {
    try {
      await loginUser(username, password);
      setIsLoggedIn(true);
      showMessage('Úspěšně přihlášeno!', false);
    } catch (error) {
      showMessage('Nesprávné uživatelské jméno nebo heslo.', true);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setIsLoggedIn(false);
      showMessage('Úspěšně odhlášeno!', false);
    } catch (error) {
      showMessage('Chyba při odhlašování: ' + (error.response?.data?.message || error.message), true);
    }
  };

  return (
      <Router>
        <div className="min-vh-100 bg-dark d-flex justify-content-center">
          <div className="container py-5">
            <div className="card mx-auto" style={{ maxWidth: isLoggedIn ? '100%' : '400px' }}>
              <div className="card-body">
                <h1 className="text-center">Smart Home Control</h1>
                <AlertMessage message={message} isError={isError} />

                <Routes>
                  {!isLoggedIn ? (
                      <>
                        <Route path="/" element={
                          <>
                            <Login
                                username={username}
                                setUsername={setUsername}
                                password={password}
                                setPassword={setPassword}
                                handleLogin={handleLogin}
                            />
                            <Register
                                registerUsername={registerUsername}
                                setRegisterUsername={setRegisterUsername}
                                registerPassword={registerPassword}
                                setRegisterPassword={setRegisterPassword}
                                handleRegister={async () => {
                                  try {
                                    const response = await registerUser(registerUsername, registerPassword);
                                    showMessage(response.data.message, false);
                                    setUsername(registerUsername);
                                    setPassword(registerPassword);
                                  } catch (error) {
                                    showMessage('Chyba při registraci: ' + (error.response?.data?.message || error.message), true);
                                  }
                                }}
                            />
                          </>
                        } />
                        <Route path="*" element={<Navigate to="/" />} />
                      </>
                  ) : (
                      <>
                        <Route path="/" element={<Dashboard handleLogout={handleLogout} />} />
                        <Route path="/devices" element={<ConnectedDevices />} />
                        <Route path="/devicecontrol" element={<DeviceControl turnOnDevice={turnOnDevice} turnOffDevice={turnOffDevice} />} />
                        <Route path="/rooms" element={<RoomManager />} />
                        <Route path="/automation" element={<AutomationManager />} />
                        <Route path="/add-device" element={<UnregisteredDevices />} />
                        <Route path="/bluetooth" element={<BluetoothDevices />} />
                        <Route path="/spotify-player" element={<SpotifyPlayer showMessage={showMessage} />} />
                        <Route path="*" element={<Navigate to="/" />} />
                      </>
                  )}
                </Routes>

              </div>
            </div>
          </div>
        </div>
      </Router>
  );
}

export default App;
