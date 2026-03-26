import React, { useState } from 'react';
import { useAuth } from './auth.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (login(username, password)) {
      setError('');
    } else {
      setError('Feil brukernavn eller passord');
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{
        background: '#13131a', borderRadius: 16, padding: 40, width: 340,
        border: '1px solid #2a2a3a', boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📰</div>
          <h1 style={{ color: '#fff', margin: 0, fontSize: 24, fontWeight: 700 }}>Norsk Puls</h1>
          <p style={{ color: '#666', margin: '8px 0 0', fontSize: 14 }}>Logg inn for å fortsette</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#999', fontSize: 13, display: 'block', marginBottom: 6 }}>Brukernavn</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', background: '#1e1e2e',
                border: '1px solid #333', borderRadius: 8, color: '#fff',
                fontSize: 15, outline: 'none', boxSizing: 'border-box'
              }}
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ color: '#999', fontSize: 13, display: 'block', marginBottom: 6 }}>Passord</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', background: '#1e1e2e',
                border: '1px solid #333', borderRadius: 8, color: '#fff',
                fontSize: 15, outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
          {error && (
            <div style={{ color: '#ff4444', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
              {error}
            </div>
          )}
          <button type="submit" style={{
            width: '100%', padding: '12px', background: 'linear-gradient(135deg, #d4202a, #ff4444)',
            color: '#fff', border: 'none', borderRadius: 8, fontSize: 15,
            fontWeight: 600, cursor: 'pointer'
          }}>
            Logg inn
          </button>
        </form>
      </div>
    </div>
  );
}
