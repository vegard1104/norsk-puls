import React, { useState } from 'react';
import { useAuth } from './auth.jsx';

const REGIONS = [
  { id: 'global',        label: 'Global'       },
  { id: 'asia',          label: 'Asia'          },
  { id: 'mideast',       label: 'Midtøsten'     },
  { id: 'africa',        label: 'Afrika'        },
  { id: 'north_america', label: 'Nord-Amerika'  },
  { id: 'south_america', label: 'Sør-Amerika'   },
  { id: 'europe',        label: 'Europa'        },
  { id: 'oceania',       label: 'Oseania'       },
];

const REGION_ICONS = {
  global: '🌐', asia: '🌏', mideast: '🕌', africa: '🌍',
  north_america: '🌎', south_america: '🌎', europe: '🇪🇺', oceania: '🦘',
};

export default function AdminPanel({ sources, onSave, onClose }) {
  const { changeCredentials, user } = useAuth();
  const [localSources, setLocalSources] = useState(sources.map(s => ({ ...s })));

  // Hoved-tab: 'sources' | 'credentials'
  const [tab, setTab] = useState('sources');
  // Kilde-tab: 'norwegian' | 'international'
  const [srcTab, setSrcTab] = useState('norwegian');

  // Norsk kilde-skjema
  const [newNo, setNewNo] = useState({ name: '', rssUrl: '', color: '#ff6600', enabled: true });
  // Internasjonal kilde-skjema
  const [newEn, setNewEn] = useState({ name: '', rssUrl: '', color: '#0068b5', region: 'global', enabled: true });

  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [credMsg, setCredMsg] = useState('');

  function toggleSource(id) {
    setLocalSources(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  }
  function removeSource(id) {
    setLocalSources(prev => prev.filter(s => s.id !== id));
  }
  function addNorwegian() {
    if (!newNo.name || !newNo.rssUrl) return;
    const id = newNo.name.toLowerCase().replace(/\s+/g, '-');
    setLocalSources(prev => [...prev, { ...newNo, id, lang: 'no' }]);
    setNewNo({ name: '', rssUrl: '', color: '#ff6600', enabled: true });
  }
  function addInternational() {
    if (!newEn.name || !newEn.rssUrl) return;
    const id = newEn.name.toLowerCase().replace(/\s+/g, '-');
    const regionLabel = REGIONS.find(r => r.id === newEn.region)?.label || newEn.region;
    setLocalSources(prev => [...prev, { ...newEn, id, lang: 'en', region: regionLabel }]);
    setNewEn({ name: '', rssUrl: '', color: '#0068b5', region: 'global', enabled: true });
  }
  function handleSaveCreds() {
    if (!newUser || !newPass) return;
    changeCredentials(newUser, newPass);
    setCredMsg('Lagret!');
    setTimeout(() => setCredMsg(''), 2000);
  }

  const norSources = localSources.filter(s => !s.lang || s.lang === 'no');
  const intlSources = localSources.filter(s => s.lang === 'en');

  const inp = {
    background: '#1e1e2e', border: '1px solid #333', borderRadius: 6,
    color: '#fff', padding: '8px 10px', fontSize: 13, outline: 'none',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#13131a', borderRadius: 16, width: 640, maxHeight: '88vh', border: '1px solid #2a2a3a', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #2a2a3a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ color: '#fff', margin: 0, fontSize: 18 }}>⚙️ Admin-panel</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Hoved-tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #2a2a3a' }}>
          {[
            { id: 'sources',     label: '📰 Nyhetskilder' },
            { id: 'credentials', label: '🔐 Brukerkonto'  },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '12px 20px', background: 'none', border: 'none',
              color: tab === t.id ? '#fff' : '#666', fontSize: 14, cursor: 'pointer',
              borderBottom: tab === t.id ? '2px solid #d4202a' : '2px solid transparent',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', padding: 24, flex: 1 }}>

          {/* ── Nyhetskilder ── */}
          {tab === 'sources' && (
            <>
              {/* Kilde-sub-tabs */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#0d0d14', borderRadius: 10, padding: 4 }}>
                {[
                  { id: 'norwegian',     label: '🇳🇴 Norske nyheter',          count: norSources.length  },
                  { id: 'international', label: '🌍 Internasjonale nyheter', count: intlSources.length },
                ].map(t => (
                  <button key={t.id} onClick={() => setSrcTab(t.id)} style={{
                    flex: 1, padding: '8px 14px', border: 'none', borderRadius: 8, cursor: 'pointer',
                    background: srcTab === t.id ? '#1e1e2e' : 'transparent',
                    color: srcTab === t.id ? '#fff' : '#666',
                    fontSize: 13, fontWeight: srcTab === t.id ? 700 : 400,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    {t.label}
                    <span style={{ background: srcTab === t.id ? '#d4202a' : '#2a2a3a', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* ── Norske kildetr ── */}
              {srcTab === 'norwegian' && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ color: '#ccc', margin: '0 0 12px', fontSize: 14 }}>Legg til norsk kilde</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto auto', gap: 8 }}>
                      <input placeholder="Navn" value={newNo.name} onChange={e => setNewNo(p => ({ ...p, name: e.target.value }))} style={inp} />
                      <input placeholder="RSS-URL" value={newNo.rssUrl} onChange={e => setNewNo(p => ({ ...p, rssUrl: e.target.value }))} style={inp} />
                      <input type="color" value={newNo.color} onChange={e => setNewNo(p => ({ ...p, color: e.target.value }))} style={{ ...inp, width: 40, padding: 2 }} />
                      <button onClick={addNorwegian} style={{ background: '#d4202a', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
                        + Legg til
                      </button>
                    </div>
                  </div>

                  <h3 style={{ color: '#ccc', margin: '0 0 12px', fontSize: 14 }}>Norske aviser ({norSources.length})</h3>
                  {norSources.map(s => (
                    <SourceRow key={s.id} source={s} onToggle={toggleSource} onRemove={removeSource} />
                  ))}
                </>
              )}

              {/* ── Internasjonale kilder ── */}
              {srcTab === 'international' && (
                <>
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ color: '#ccc', margin: '0 0 12px', fontSize: 14 }}>Legg til internasjonal kilde</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 8 }}>
                      <input placeholder="Navn" value={newEn.name} onChange={e => setNewEn(p => ({ ...p, name: e.target.value }))} style={inp} />
                      <input placeholder="RSS-URL" value={newEn.rssUrl} onChange={e => setNewEn(p => ({ ...p, rssUrl: e.target.value }))} style={inp} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 8 }}>
                      <select
                        value={newEn.region}
                        onChange={e => setNewEn(p => ({ ...p, region: e.target.value }))}
                        style={{ ...inp, appearance: 'none', cursor: 'pointer' }}
                      >
                        {REGIONS.map(r => (
                          <option key={r.id} value={r.id}>{REGION_ICONS[r.id]} {r.label}</option>
                        ))}
                      </select>
                      <input placeholder="Språk (en)" value="en" readOnly style={{ ...inp, color: '#555', cursor: 'not-allowed' }} />
                      <input type="color" value={newEn.color} onChange={e => setNewEn(p => ({ ...p, color: e.target.value }))} style={{ ...inp, width: 40, padding: 2 }} />
                      <button onClick={addInternational} style={{ background: '#0068b5', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
                        + Legg til
                      </button>
                    </div>
                  </div>

                  <h3 style={{ color: '#ccc', margin: '0 0 12px', fontSize: 14 }}>Internasjonale aviser ({intlSources.length})</h3>

                  {/* Grupper etter region */}
                  {REGIONS.map(region => {
                    const inRegion = intlSources.filter(s => {
                      const srcRegion = (s.region || '').toLowerCase();
                      const rId = region.id;
                      if (rId === 'global') return srcRegion.includes('global') || !srcRegion;
                      return srcRegion.includes(region.label.toLowerCase()) ||
                             srcRegion.includes(rId.replace('_', ' '));
                    });
                    if (!inRegion.length) return null;
                    return (
                      <div key={region.id} style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, color: '#555', fontWeight: 700, letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>{REGION_ICONS[region.id]}</span>
                          <span>{region.label.toUpperCase()}</span>
                        </div>
                        {inRegion.map(s => (
                          <SourceRow key={s.id} source={s} onToggle={toggleSource} onRemove={removeSource} showRegion={false} />
                        ))}
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* ── Brukerkonto ── */}
          {tab === 'credentials' && (
            <div>
              <h3 style={{ color: '#ccc', margin: '0 0 16px', fontSize: 14 }}>Endre innlogging</h3>
              <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>Innlogget som: <strong style={{ color: '#fff' }}>{user?.username}</strong></p>
              <div style={{ marginBottom: 12 }}>
                <label style={{ color: '#999', fontSize: 13, display: 'block', marginBottom: 6 }}>Nytt brukernavn</label>
                <input value={newUser} onChange={e => setNewUser(e.target.value)} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#999', fontSize: 13, display: 'block', marginBottom: 6 }}>Nytt passord</label>
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <button onClick={handleSaveCreds} style={{ background: '#d4202a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14 }}>
                Lagre
              </button>
              {credMsg && <span style={{ color: '#4caf50', marginLeft: 12, fontSize: 14 }}>{credMsg}</span>}
            </div>
          )}
        </div>

        {/* Footer */}
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

function SourceRow({ source: s, onToggle, onRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#1a1a24', borderRadius: 8, marginBottom: 6 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{s.name}</span>
          {s.region && (
            <span style={{ color: '#555', fontSize: 11, background: '#111', borderRadius: 6, padding: '1px 6px' }}>
              {s.region}
            </span>
          )}
        </div>
        <div style={{ color: '#555', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{s.rssUrl}</div>
      </div>
      <button onClick={() => onToggle(s.id)} style={{
        background: s.enabled ? '#1a4a1a' : '#2a2a2a', color: s.enabled ? '#4caf50' : '#666',
        border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, flexShrink: 0,
      }}>
        {s.enabled ? 'PÅ' : 'AV'}
      </button>
      <button onClick={() => onRemove(s.id)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>🗑</button>
    </div>
  );
}
