import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

const DEFAULT_CREDENTIALS = {
  username: 'admin',
  password: 'norskpuls',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('np_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  function login(username, password) {
    const creds = JSON.parse(localStorage.getItem('np_credentials') || JSON.stringify(DEFAULT_CREDENTIALS));
    if (username === creds.username && password === creds.password) {
      const u = { username };
      setUser(u);
      localStorage.setItem('np_user', JSON.stringify(u));
      return true;
    }
    return false;
  }

  function logout() {
    setUser(null);
    localStorage.removeItem('np_user');
  }

  function changeCredentials(newUsername, newPassword) {
    localStorage.setItem('np_credentials', JSON.stringify({ username: newUsername, password: newPassword }));
    const u = { username: newUsername };
    setUser(u);
    localStorage.setItem('np_user', JSON.stringify(u));
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, changeCredentials }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
