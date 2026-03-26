import React, { useState } from 'react';
import { useAuth } from './auth.jsx';

export default function AdminPanel({ sources, onSave, onClose }) {
  const { changeCredentials, user } = useAuth();
  const [localSources, setLocalSources] = useState(sources.map(s => ({ ...s })));
  const [newSource, setNewSource] = useState({ name: '', rssUrl: '', color: '#ffffff', enabled: true });
  const [tab, setTab] = useState('sources');
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [credMsg, setCredMsg] = useState('');

  function toggleSource(id) {
    setLocalSources(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  }

  function removeSource(id) {
    setLocalSources(prev => prev.filter(s => s.id !== id));
  }

  function addSource() {
    if (!newSource.name || !newSource.rssUrl) return;
    const id = newSource.name.toLowerCase().replace(/\s+/g, '-');
    setLocalSources(prev => [...prev, { ...newSource, id }]);
    setNewSource({ name: '', rssUrl: '', color: '#ffffff', enabled: true });
  }

  function handleSaveCreds() {
    if (!newUser || !newPass) return;
    changeCredentials(newUser, newPass);
    setCredMsg('Lagret!');
    setTimeout(() => setCredMsg(''), 2000);
  }

  const inputStyle = {
    background: '#1e1e2e', border: '1px solid #333', borderRadius: 6,
    color: '#fff', padding: '8px 10px', fontSize: 13, outline: 'none'
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{
        background: '#13131a', borderRadius: 16, width: 600, maxHeight: '85vh',
        border: '1px solid #2a2a3a', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #2a2a3a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 18 }}>⚙️ Admin-panel</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid #2a2a3a' }}>
          {['sources', 'credentials'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '12px 20px', background: 'none', border: 'none',
              color: tab === t ? '#fff' : '#666', fontSize: 14, cursor: 'pointer',
              borderBottom: tab === t ? '2px solid #d4202a' : '2px solid transparent'
            }}>
              {t === 'sources' ? '📰 Nyhetskilder' : '🔐 Brukerkonto'}
            </button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', padding: 24, flex: 1 }}>
          {tab === 'sources' && (
            <>
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ color: '#ccc', margin: '0 0 12px', fontSize: 14 }}>Legg til ny avis</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto auto', gap: 8, alignItems: 'center' }}>
                  <input placeholder="Navn" value={newSource.name} onChange={e => setNewSource(p => ({ ...p, name: e.target.value }))} style={inputStyle} />
                  <input placeholder="RSS-URL" value={newSource.rssUrl} onChange={e => setNewSource(p => ({ ...p, rssUrl: e.target.value }))} style={inputStyle} />
                  <input type="color" value={newSource.color} onChange={e => setNewSource(p => ({ ...p, color: e.target.value }))} style={{ ...inputStyle, width: 40, padding: 2 }} />
                  <button onClick={addSource} style={{ background: '#d4202a', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}>+ Legg til</button>
                </div>
              </div>

              <h3 style={{ color: '#ccc', margin: '0 0 12px', fontSize: 14 }}>Aktive kilder</h3>
              {localSources.map(s => (
                <div key={s.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                  background: '#1a1a24', borderRadius: 8, marginBottom: 8
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span style={{ color: '#fff', fontWeight: 600, width: 100, flexShrink: 0 }}>{s.name}</span>
                  <span style={{ color: '#666', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.rssUrl}</span>
                  <button onClick={() => toggleSource(s.id)} style={{
                    background: s.enabled ? '#1a4a1a' : '#333', color: s.enabled ? '#4caf50' : '#999',
                    border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12
                  }}>
                    {s.enabled ? 'PÅ' : 'AV'}
                  </button>
                  <button onClick={() => removeSource(s.id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16 }}>🗑</button>
                </div>
              ))}
            </>
          )}

          {tab === 'credentials' && (
            <div>
              <h3 style={{ color: '#ccc', margin: '0 0 16px', fontSize: 14 }}>Endre innlogging</h3>
              <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>Innlogget som: <strong style={{ color: '#fff' }}>{user?.username}</strong></p>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: '#999', fontSize: 13, display: 'block', marginBottom: 6 }}>Nytt brukernavn</label>
                <input value={newUser} onChange={e => setNewUser(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#999', fontSize: 13, display: 'block', marginBottom: 6 }}>Nytt passord</label>
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleSaveCreds} style={{ background: '#d4202a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14 }}>
                Lagre
              </button>
              {credMsg && <span style={{ color: '#4caf50', marginLeft: 12, fontSize: 14 }}>{credMsg}</span>}
            </div>
          )}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #2a2a3a', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ background: '#2a2a3a', color: '#ccc', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' }}>Avbryt</button>
          <button onClick={() => { onSave(localSources); onClose(); }} style={{ background: '#d4202a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 }}>
            Lagre endringer
          </button>
        </div>
      </div>
    </div>
  );
}
