import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AuthProvider, useAuth } from './auth.jsx';
import LoginPage from './LoginPage.jsx';
import AdminPanel from './AdminPanel.jsx';
import { useNews } from './useNews.js';
import { DEFAULT_SOURCES, INTERNATIONAL_SOURCES, CATEGORIES, WORLD_REGIONS, CATEGORY_EMOJIS } from './sources.js';
import { ThemeProvider, useTheme } from './ThemeContext.jsx';
import { StatsProvider, useStats, getReadingLevel } from './StatsContext.jsx';

// ─── Mobile hook ─────────────────────────────────────────────────────────────
function useMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

// ─── Global CSS ──────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  @keyframes slideIn { from { transform: translateY(16px); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
  @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  .card-hover { transition: transform 0.18s ease, box-shadow 0.18s ease; }
  .card-hover:hover { transform: translateY(-3px); }
  .card-hero:hover  { transform: translateY(-2px); }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
  @media (max-width: 767px) {
    .card-hover:hover { transform: none; }
  }
`;

// ─── WPM Toast ───────────────────────────────────────────────────────────────
function WpmToast({ result, onDone }) {
  const { theme: t } = useTheme();
  const level = getReadingLevel(result.wpm);
  useEffect(() => { const tm = setTimeout(onDone, 4000); return () => clearTimeout(tm); }, [onDone]);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 3000,
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: 16, padding: '14px 18px', boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
      display: 'flex', flexDirection: 'column', gap: 5, minWidth: 210,
      animation: 'slideIn 0.3s ease',
    }}>
      <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Lesing fullført</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 26 }}>{level.icon}</span>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: level.color }}>
            {result.wpm > 0 ? `${result.wpm} ord/min` : `${result.seconds}s`}
          </div>
          <div style={{ fontSize: 11, color: t.textSec }}>{level.label} · {Math.round(result.scrollDepth * 100)}% lest</div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Bar ────────────────────────────────────────────────────────────────
function StatBar({ label, value, max, color, t }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: t.textSec, marginBottom: 3 }}>
        <span>{label}</span><span style={{ fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 4, background: t.surface3, borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

// ─── WPM Sparkline ───────────────────────────────────────────────────────────
function WpmSparkline({ sessions, t }) {
  if (sessions.length < 2) return null;
  const max = Math.max(...sessions.map(s => s.wpm), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28, marginTop: 6 }}>
      {sessions.map((s, i) => {
        const h = Math.max(4, Math.round((s.wpm / max) * 28));
        const level = getReadingLevel(s.wpm);
        return <div key={i} title={`${s.wpm} ord/min`} style={{ flex: 1, height: h, background: level.color, borderRadius: 2, opacity: 0.65 + (i / sessions.length) * 0.35 }} />;
      })}
    </div>
  );
}

// ─── Premium Newspapers Config ───────────────────────────────────────────────
const PREMIUM_NEWSPAPERS = [
  { id: 'aftenposten', name: 'Aftenposten', color: '#004b87', domain: 'aftenposten.no' },
  { id: 'vg', name: 'VG+', color: '#e8001c', domain: 'vg.no' },
  { id: 'bt', name: 'Bergens Tidende', color: '#003366', domain: 'bt.no' },
  { id: 'aftenbladet', name: 'Stavanger Aft.', color: '#0d3b66', domain: 'aftenbladet.no' },
  { id: 'adressa', name: 'Adresseavisen', color: '#1a5276', domain: 'adressa.no' },
  { id: 'e24', name: 'E24+', color: '#0066cc', domain: 'e24.no' },
  { id: 'tu', name: 'Teknisk Ukeblad', color: '#e74c3c', domain: 'tu.no' },
];

function usePremiumSubs() {
  const [subs, setSubs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('np_premium_subs') || '[]'); } catch { return []; }
  });
  function saveSubs(next) { setSubs(next); localStorage.setItem('np_premium_subs', JSON.stringify(next)); }
  function addSub(newspaperId, email, password) {
    const next = [...subs.filter(s => s.newspaperId !== newspaperId), { newspaperId, email, password, addedAt: Date.now() }];
    saveSubs(next);
  }
  function removeSub(newspaperId) { saveSubs(subs.filter(s => s.newspaperId !== newspaperId)); }
  function hasSub(newspaperId) { return subs.some(s => s.newspaperId === newspaperId); }
  return { subs, addSub, removeSub, hasSub };
}

// ─── Premium Subscriptions Panel ────────────────────────────────────────────
function PremiumPanel({ t, mobile, onClose }) {
  const { subs, addSub, removeSub } = usePremiumSubs();
  const [adding, setAdding] = useState(null); // newspaperId being added
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  function handleSave() {
    if (!adding || !email.trim()) return;
    addSub(adding, email.trim(), password);
    setAdding(null); setEmail(''); setPassword(''); setShowPassword(false);
  }

  const activeSubs = subs.map(s => ({ ...s, paper: PREMIUM_NEWSPAPERS.find(p => p.id === s.newspaperId) })).filter(s => s.paper);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600, display: 'flex', flexDirection: 'column',
      background: 'rgba(0,0,0,0.5)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        marginTop: 'auto', background: t.bg, borderRadius: '20px 20px 0 0',
        padding: '20px 20px 40px', maxHeight: '90vh', overflowY: 'auto',
        animation: 'slideUp 0.3s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>Premium Abonnement</div>
            <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>Legg til dine avisabonnement for tilgang til pluss-innhold</div>
          </div>
          <button onClick={onClose} style={{ background: t.surface2, border: 'none', color: t.textSec, borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        {/* Active subscriptions */}
        {activeSubs.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Aktive abonnement</div>
            {activeSubs.map(s => (
              <div key={s.newspaperId} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, marginBottom: 8,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.paper.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{s.paper.name}</div>
                  <div style={{ fontSize: 12, color: t.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#22c55e', background: '#22c55e18', padding: '2px 8px', borderRadius: 10 }}>Aktiv</span>
                  <button onClick={() => removeSub(s.newspaperId)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 16, padding: 4 }} title="Fjern">×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        {adding && (
          <div style={{ background: t.surface, border: `1px solid ${t.accent}40`, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 12 }}>
              Logg inn — {PREMIUM_NEWSPAPERS.find(p => p.id === adding)?.name}
            </div>
            <input
              type="email" placeholder="E-post" value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${t.border}`, background: t.surface2, color: t.text, fontSize: 14, marginBottom: 8, outline: 'none' }}
            />
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input
                type={showPassword ? 'text' : 'password'} placeholder="Passord" value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', paddingRight: 44, borderRadius: 8, border: `1px solid ${t.border}`, background: t.surface2, color: t.text, fontSize: 14, outline: 'none' }}
              />
              <button onClick={() => setShowPassword(!showPassword)} style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 13,
              }}>{showPassword ? 'Skjul' : 'Vis'}</button>
            </div>
            <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 12, lineHeight: 1.4 }}>
              Innloggingen lagres kun lokalt på din enhet. Vi sender aldri dine opplysninger til tredjepart.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSave} style={{
                flex: 1, background: t.accent, color: '#fff', border: 'none', borderRadius: 8,
                padding: '10px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer',
              }}>Lagre</button>
              <button onClick={() => { setAdding(null); setEmail(''); setPassword(''); }} style={{
                background: t.surface2, color: t.textSec, border: `1px solid ${t.border}`, borderRadius: 8,
                padding: '10px 16px', fontSize: 14, cursor: 'pointer',
              }}>Avbryt</button>
            </div>
          </div>
        )}

        {/* Available newspapers to add */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            {activeSubs.length > 0 ? 'Legg til flere' : 'Velg avis'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {PREMIUM_NEWSPAPERS.filter(p => !subs.some(s => s.newspaperId === p.id)).map(paper => (
              <button key={paper.id} onClick={() => { setAdding(paper.id); setEmail(''); setPassword(''); }} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: adding === paper.id ? `${paper.color}10` : t.surface,
                border: `1px solid ${adding === paper.id ? paper.color + '40' : t.border}`,
                borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: paper.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>{paper.name.charAt(0)}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>{paper.name}</div>
                  <div style={{ fontSize: 11, color: t.textMuted }}>{paper.domain}</div>
                </div>
                <span style={{ fontSize: 20, color: t.textMuted }}>+</span>
              </button>
            ))}
          </div>
        </div>

        {/* Info box */}
        <div style={{ marginTop: 20, padding: '12px 14px', background: t.surface2, borderRadius: 10, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 12, color: t.textSec, lineHeight: 1.5 }}>
            <strong style={{ color: t.text }}>Slik fungerer det:</strong> Når du legger til et abonnement, vil Norsk Puls forsøke å hente fullt innhold fra pluss-artikler med din innlogging. Artiklene du har tilgang til vises med et åpent lås-ikon.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stats Sidebar ───────────────────────────────────────────────────────────
function StatsSidebar({ t, avatar, onAvatarChange, onClose, mobile }) {
  const { stats, topCategories, topRegions, totalReadingMinutes, todayArticles,
          resetStats, averageWpm, recentWpm, recentSessions, wpmTrend, readingLevel } = useStats();
  const { subs: premiumSubs } = usePremiumSubs();
  const [showPremium, setShowPremium] = useState(false);
  const catMax = topCategories[0]?.[1] || 1;
  const regMax = topRegions[0]?.[1] || 1;
  const CAT_LABELS = { innenriks:'Innenriks', utenriks:'Utenriks', sport:'Sport', okonomi:'Økonomi', teknologi:'Teknologi', helse:'Helse', kultur:'Kultur', klima:'Klima', politikk:'Politikk', krig:'Krig' };
  const REG_LABELS = { europa:'Europa', nord_amerika:'N-Amerika', asia:'Asia', midtosten:'Midtøsten', africa:'Afrika', latin_amerika:'L-Amerika', global:'Globalt' };
  const COLORS = ['#d4202a','#3b82f6','#22c55e','#f59e0b','#8b5cf6'];
  const fileRef = useRef(null);

  const sidebarStyle = mobile ? {
    position: 'fixed', inset: 0, zIndex: 500, display: 'flex', flexDirection: 'column',
    background: 'rgba(0,0,0,0.5)',
  } : {};

  const panelStyle = mobile ? {
    marginTop: 'auto', background: t.bg, borderRadius: '20px 20px 0 0',
    padding: '20px 20px 40px', maxHeight: '85vh', overflowY: 'auto',
    animation: 'slideUp 0.3s ease',
  } : {
    width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14,
  };

  const content = (
    <div style={panelStyle}>
      {mobile && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: t.text }}>Din profil</div>
          <button onClick={onClose} style={{ background: t.surface2, border: 'none', color: t.textSec, borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>
      )}

      {/* Profile card */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16, boxShadow: t.cardShadow, textAlign: 'center', marginBottom: mobile ? 12 : 0 }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 10 }}>
          <div onClick={() => fileRef.current?.click()} style={{
            width: 70, height: 70, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer',
            background: t.surface3, border: `3px solid ${t.accent}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          }}>
            {avatar
              ? <img src={avatar} alt="Profilbilde" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 26 }}>👤</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={e => {
            const f = e.target.files[0]; if (!f) return;
            const r = new FileReader(); r.onload = ev => onAvatarChange(ev.target.result); r.readAsDataURL(f);
          }} style={{ display: 'none' }} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Vegard</div>
        <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 10 }}>Norsk Puls leser</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: t.surface2, border: `1px solid ${readingLevel.color}`, borderRadius: 20, padding: '4px 10px', marginBottom: 12 }}>
          <span>{readingLevel.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: readingLevel.color }}>{readingLevel.label}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
          {[
            { label: '🏆 Poeng', value: (stats.points || 0).toLocaleString('no') },
            { label: '🔥 Streak', value: `${stats.streak || 0} d` },
            { label: '📰 I dag', value: `${todayArticles}` },
            { label: '⏱️ Tid', value: `${totalReadingMinutes} min` },
          ].map(item => (
            <div key={item.label} style={{ background: t.surface2, borderRadius: 8, padding: '7px 6px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: t.text }}>{item.value}</div>
              <div style={{ fontSize: 10, color: t.textMuted }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reading speed */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16, boxShadow: t.cardShadow, marginBottom: mobile ? 12 : 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>Lesehastighet</div>
        {averageWpm === 0 ? (
          <div style={{ fontSize: 12, color: t.textMuted, textAlign: 'center', padding: '8px 0' }}>Les noen artikler for å se statistikk 📖</div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 900, color: readingLevel.color }}>{recentWpm || averageWpm}</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>ord/min</div>
              </div>
              {wpmTrend !== 0 && (
                <div style={{ fontSize: 13, fontWeight: 700, color: wpmTrend > 0 ? '#22c55e' : '#ef4444', textAlign: 'right' }}>
                  {wpmTrend > 0 ? '↑' : '↓'} {Math.abs(wpmTrend)}%
                  <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 400 }}>vs. forrige</div>
                </div>
              )}
            </div>
            <WpmSparkline sessions={recentSessions} t={t} />
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.textMuted, marginBottom: 3 }}>
                <span>{readingLevel.label}</span><span>Maks: {readingLevel.max} o/m</span>
              </div>
              <div style={{ height: 4, background: t.surface3, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, background: readingLevel.color, width: `${Math.min(100, ((recentWpm - readingLevel.min) / (readingLevel.max - readingLevel.min)) * 100)}%`, transition: 'width 0.5s' }} />
              </div>
            </div>
          </>
        )}
      </div>

      {topCategories.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16, boxShadow: t.cardShadow, marginBottom: mobile ? 12 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>Dine interesser</div>
          {topCategories.map(([cat, count], i) => (
            <StatBar key={cat} label={`${CATEGORY_EMOJIS[cat] || ''} ${CAT_LABELS[cat] || cat}`} value={count} max={catMax} color={COLORS[i % COLORS.length]} t={t} />
          ))}
        </div>
      )}

      {topRegions.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16, boxShadow: t.cardShadow, marginBottom: mobile ? 12 : 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>Verdensregioner</div>
          {topRegions.map(([reg, count], i) => (
            <StatBar key={reg} label={REG_LABELS[reg] || reg} value={count} max={regMax} color={COLORS[i % COLORS.length]} t={t} />
          ))}
        </div>
      )}

      {/* Premium subscriptions */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16, boxShadow: t.cardShadow, marginBottom: mobile ? 12 : 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>Premium Abonnement</div>
        {premiumSubs.length > 0 ? (
          <div style={{ marginBottom: 10 }}>
            {premiumSubs.map(s => {
              const paper = PREMIUM_NEWSPAPERS.find(p => p.id === s.newspaperId);
              if (!paper) return null;
              return (
                <div key={s.newspaperId} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: paper.color }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: t.text, flex: 1 }}>{paper.name}</span>
                  <span style={{ fontSize: 10, color: '#22c55e', fontWeight: 600 }}>Aktiv</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 10 }}>Ingen abonnement lagt til ennå</div>
        )}
        <button onClick={() => setShowPremium(true)} style={{
          width: '100%', background: t.accent, color: '#fff', border: 'none', borderRadius: 8,
          padding: '8px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
        }}>
          {premiumSubs.length > 0 ? 'Administrer abonnement' : 'Legg til abonnement'}
        </button>
      </div>

      <button onClick={resetStats} style={{ fontSize: 11, color: t.textMuted, background: 'none', border: `1px solid ${t.border}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', width: '100%' }}>
        Nullstill statistikk
      </button>

      {showPremium && <PremiumPanel t={t} mobile={mobile} onClose={() => setShowPremium(false)} />}
    </div>
  );

  if (mobile) {
    return (
      <div style={sidebarStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        {content}
      </div>
    );
  }

  return content;
}

// ─── Fetch full content ───────────────────────────────────────────────────────
const PROXY_URL = import.meta.env.VITE_PROXY_URL;
async function fetchFullContent(link) {
  if (!link || link === '#' || !PROXY_URL) return null;
  try {
    const url = `${PROXY_URL}/?url=${encodeURIComponent(link)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    // Remove noise elements
    ['script','style','nav','header','footer','aside','figure','figcaption','iframe','form','button','svg',
     '.ad','[class*="banner"]','[class*="promo"]','[class*="related"]','[class*="comment"]',
     '[class*="share"]','[class*="social"]','[class*="newsletter"]','[class*="cookie"]',
     '[role="navigation"]','[role="complementary"]'].forEach(sel => {
      try { doc.querySelectorAll(sel).forEach(el => el.remove()); } catch {}
    });
    // Try increasingly broad selectors for article content
    const selectors = [
      '[itemprop="articleBody"]', '[class*="article-body"]', '[class*="article-content"]',
      '[class*="story-body"]', '[class*="post-content"]', '[class*="body-text"]',
      '[class*="article__body"]', '[class*="content-body"]',
      'article', '.article', 'main', '[role="main"]'
    ];
    let container = null;
    for (const sel of selectors) { try { container = doc.querySelector(sel); if (container) break; } catch {} }
    if (!container) container = doc.body;
    // Extract text elements including lists
    const paragraphs = Array.from(container.querySelectorAll('p, h2, h3, h4, blockquote, li'))
      .map(el => ({ tag: el.tagName.toLowerCase(), text: el.textContent.trim() }))
      .filter(({ text }) => text.length > 20 && !text.match(/^(les også|share|del|cookie|annonse)/i));
    if (paragraphs.length < 1) return null;
    return paragraphs;
  } catch { return null; }
}

// ─── Article Panel ───────────────────────────────────────────────────────────
function ArticlePanel({ article, onClose, t, mobile }) {
  const { trackArticleClose } = useStats();
  const scrollRef = useRef(null);
  const maxScrollRef = useRef(0);
  const [fullContent, setFullContent] = useState(null);
  const [fetchStatus, setFetchStatus] = useState('loading');

  // Swipe-to-dismiss state (mobile only) — horizontal swipe
  const [swipeX, setSwipeX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0, decided: false });

  function handleTouchStart(e) {
    if (!mobile) return;
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, decided: false };
  }
  function handleTouchMove(e) {
    if (!mobile) return;
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = e.touches[0].clientY - touchStartRef.current.y;
    // Decide direction on first significant move
    if (!touchStartRef.current.decided) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; // too small
      touchStartRef.current.decided = true;
      // If vertical movement dominates, let the browser scroll normally
      if (Math.abs(dy) > Math.abs(dx)) return;
    }
    // Only track horizontal swipes
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      setSwiping(true);
      setSwipeX(dx);
    }
  }
  function handleTouchEnd() {
    if (!mobile || !swiping) return;
    if (Math.abs(swipeX) > 100) {
      handleClose(); // Dismiss on sufficient swipe in either direction
    } else {
      setSwipeX(0);
    }
    setSwiping(false);
  }

  const visibleWords = useMemo(() => {
    if (!article) return 0;
    const base = (article.title + ' ' + (article.description || '')).split(/\s+/).length;
    const extra = fullContent ? fullContent.reduce((s, p) => s + p.text.split(/\s+/).length, 0) : 0;
    return base + extra;
  }, [article, fullContent]);

  useEffect(() => {
    if (!article) return;
    setFullContent(null); setFetchStatus('loading');
    setSwipeX(0); setSwiping(false);
    fetchFullContent(article.link).then(content => {
      if (content?.length > 0) { setFullContent(content); setFetchStatus('ok'); }
      else if (article.link === '#') { setFetchStatus('mock'); }
      else { setFetchStatus('blocked'); setFullContent([]); }
    });
  }, [article?.id]);

  function handleScroll() {
    const el = scrollRef.current; if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) { maxScrollRef.current = 1; return; }
    const pct = el.scrollTop / scrollable;
    if (pct > maxScrollRef.current) maxScrollRef.current = pct;
  }

  function handleClose() {
    const result = trackArticleClose(maxScrollRef.current, visibleWords);
    onClose(result);
  }

  if (!article) return null;

  const statusInfo = {
    loading: { icon: '⏳', color: t.textMuted },
    ok:      { icon: '✅', color: '#22c55e' },
    blocked: { icon: '🔒', color: '#f59e0b' },
    mock:    { icon: '📋', color: t.textMuted },
    error:   { icon: '⚠️', color: '#ef4444' },
  }[fetchStatus] || {};

  const panelWidth = mobile ? '100%' : '46%';
  const panelMaxWidth = mobile ? '100%' : 680;
  const swipeOpacity = mobile ? Math.max(0.2, 1 - Math.abs(swipeX) / 250) : 1;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: mobile ? 'column' : 'row' }}>
      {!mobile && (
        <div onClick={handleClose} style={{ flex: 1, background: 'rgba(0,0,0,0.6)', cursor: 'pointer', backdropFilter: 'blur(3px)', animation: 'fadeIn 0.2s ease' }} />
      )}
      <div ref={scrollRef} onScroll={handleScroll}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        style={{
        width: panelWidth, minWidth: mobile ? 'unset' : 360, maxWidth: panelMaxWidth,
        background: t.surface, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        boxShadow: mobile ? 'none' : '-6px 0 50px rgba(0,0,0,0.35)',
        animation: (!swiping && swipeX === 0) ? (mobile ? 'slideUp 0.3s ease' : 'slideIn 0.25s ease') : 'none',
        flex: mobile ? 1 : 'none',
        transform: mobile && swipeX !== 0 ? `translateX(${swipeX}px) rotate(${swipeX * 0.03}deg)` : 'none',
        opacity: swipeOpacity,
        transition: swiping ? 'none' : 'transform 0.25s ease, opacity 0.25s ease',
      }}>
        {/* Header */}
        {/* Mobile swipe handle */}
        {mobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 0' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: t.border }} />
          </div>
        )}
        <div style={{ position: 'sticky', top: 0, background: t.surface, borderBottom: `1px solid ${t.border}`, padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: article.sourceColor }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: article.sourceColor }}>{article.source}</span>
            <span style={{ fontSize: 12, color: t.textMuted }}>· ~{article.readingTime} min</span>
            <span style={{ fontSize: 13 }} title={fetchStatus}>{statusInfo.icon}</span>
          </div>
          <button onClick={handleClose} style={{ background: t.surface2, border: 'none', color: t.text, width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Hero image */}
        <div style={{ position: 'relative' }}>
          <img src={article.image} alt="" style={{ width: '100%', height: mobile ? 200 : 240, objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
          {article.isPlus && <div style={{ position: 'absolute', top: 12, right: 12, background: '#d97706', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 5 }}>PLUSS</div>}
        </div>

        {/* Content */}
        <div style={{ padding: mobile ? '18px 16px 16px' : '24px 24px 16px' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {CATEGORIES.find(c => c.id === article.category) && (
              <span style={{ background: t.accent + '20', border: `1px solid ${t.accent}40`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color: t.accent, fontWeight: 600 }}>
                {CATEGORY_EMOJIS[article.category]} {CATEGORIES.find(c => c.id === article.category)?.label}
              </span>
            )}
            <span style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color: t.textSec }}>~{article.readingTime} min</span>
            <span style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color: t.textMuted }}>
              {new Date(article.pubDate).toLocaleDateString('no', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <h2 style={{ color: t.text, fontSize: mobile ? 20 : 23, lineHeight: 1.3, marginBottom: 14, fontWeight: 800, margin: '0 0 14px' }}>{article.title}</h2>

          <p style={{ color: t.text, fontSize: 15, lineHeight: 1.75, fontWeight: 500, marginBottom: 20, borderLeft: `3px solid ${article.sourceColor}`, paddingLeft: 14 }}>
            {article.description}
          </p>

          {fetchStatus === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: t.textMuted, fontSize: 13, padding: '12px 0', marginBottom: 16 }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Henter innhold...
            </div>
          )}

          {fullContent?.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              {fullContent.map((p, i) => {
                if (p.tag === 'h2' || p.tag === 'h3') return <h3 key={i} style={{ color: t.text, fontSize: 17, fontWeight: 700, margin: '22px 0 10px', lineHeight: 1.3 }}>{p.text}</h3>;
                if (p.tag === 'blockquote') return <blockquote key={i} style={{ borderLeft: `3px solid ${t.border}`, paddingLeft: 14, color: t.textSec, fontStyle: 'italic', margin: '14px 0', fontSize: 15, lineHeight: 1.7 }}>{p.text}</blockquote>;
                return <p key={i} style={{ color: t.textSec, fontSize: 15, lineHeight: 1.8, marginBottom: 14 }}>{p.text}</p>;
              })}
            </div>
          )}

          {(fetchStatus === 'blocked' || fetchStatus === 'error') && (
            <div style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: t.textSec, marginBottom: 4 }}>🔒 <strong>{article.source}</strong> viser ikke hele artikkelen her.</div>
              <div style={{ fontSize: 12, color: t.textMuted }}>Besøk nettsiden direkte for å lese videre.</div>
            </div>
          )}

          <a href={article.link} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: t.accent, color: '#fff',
            padding: '12px 24px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14,
          }}>
            {fetchStatus === 'ok' ? 'Se original artikkel →' : `Les hos ${article.source} →`}
          </a>
        </div>

        <div style={{ padding: '0 24px 40px', marginTop: 'auto' }}>
          <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 14 }}>
            <p style={{ color: t.textMuted, fontSize: 12 }}>📊 Lesetid og scrolldybde registreres for bedre anbefalinger.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Popularity badge ─────────────────────────────────────────────────────────
function formatPopularity(n) {
  if (!n || n < 1) return null;
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

// ─── Article Card ─────────────────────────────────────────────────────────────
function ArticleCard({ article, size = 'small', onClick, t, mobile }) {
  const isHero   = size === 'hero';
  const isMedium = size === 'medium';
  const isSmall  = size === 'small';

  const timeAgo = (() => {
    const h = Math.floor((Date.now() - article.pubDate) / 3600000);
    if (h < 1) return 'Nå';
    if (h < 24) return `${h}t siden`;
    return `${Math.floor(h / 24)}d siden`;
  })();

  const catLabel = CATEGORIES.find(c => c.id === article.category)?.label || '';

  // ── HERO ──────────────────────────────────────────────────────────────────
  if (isHero) {
    if (mobile) {
      // Mobile hero: clean editorial style — image on top, text below (Aftenposten-inspired)
      return (
        <div onClick={() => onClick(article)} style={{ cursor: 'pointer', background: t.surface, overflow: 'hidden' }}>
          <div style={{ position: 'relative' }}>
            <img src={article.image} alt="" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} loading="lazy" />
            {article.isPlus && <div style={{ position: 'absolute', top: 12, right: 12, background: '#d97706', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 3, letterSpacing: 0.5 }}>PLUSS</div>}
          </div>
          <div style={{ padding: '14px 16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.accent, textTransform: 'uppercase', letterSpacing: 0.5 }}>{catLabel}</span>
              <span style={{ fontSize: 11, color: t.textMuted }}>{timeAgo}</span>
            </div>
            <h2 style={{ color: t.text, fontSize: 22, fontWeight: 800, lineHeight: 1.25, margin: '0 0 8px' }}>{article.title}</h2>
            {article.description && (
              <p style={{ color: t.textSec, fontSize: 14, lineHeight: 1.5, margin: '0 0 10px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{article.description}</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: article.sourceColor }}>{article.source}</span>
              <span style={{ fontSize: 11, color: t.textMuted }}>~{article.readingTime} min</span>
              {article.popularity > 0 && <span style={{ fontSize: 11, color: t.textMuted }}>{formatPopularity(article.popularity)} lesere</span>}
            </div>
          </div>
        </div>
      );
    }
    // Desktop hero
    return (
      <div onClick={() => onClick(article)} className="card-hover" style={{
        position: 'relative', borderRadius: 18, overflow: 'hidden', cursor: 'pointer',
        height: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.22)', background: '#111',
      }}>
        <img src={article.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.85 }} loading="lazy" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)' }} />
        <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 6 }}>
          <span style={{ background: t.accent, color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{catLabel || 'Nyheter'}</span>
          {article.isPlus && <span style={{ background: '#d97706', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 4 }}>PLUSS</span>}
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 24px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ background: article.sourceColor, color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>{article.source}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{timeAgo}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>~{article.readingTime} min</span>
          </div>
          <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 800, lineHeight: 1.25, margin: 0, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{article.title}</h2>
          {article.description && (
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.5, margin: '8px 0 0', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{article.description}</p>
          )}
        </div>
      </div>
    );
  }

  // ── MEDIUM ────────────────────────────────────────────────────────────────
  if (isMedium) {
    if (mobile) {
      // Mobile medium: horizontal card — text left, thumbnail right (BBC-inspired)
      return (
        <div onClick={() => onClick(article)} style={{
          background: t.surface, cursor: 'pointer',
          display: 'flex', flexDirection: 'row', alignItems: 'stretch',
          borderBottom: `1px solid ${t.border}`, padding: '14px 16px', gap: 14,
        }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: t.accent, textTransform: 'uppercase', letterSpacing: 0.3 }}>{catLabel}</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: t.text, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{article.title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: article.sourceColor }}>{article.source}</span>
              <span style={{ fontSize: 11, color: t.textMuted }}>{timeAgo}</span>
            </div>
          </div>
          <div style={{ width: 100, height: 100, flexShrink: 0, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
            <img src={article.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
            {article.isPlus && <div style={{ position: 'absolute', top: 4, right: 4, background: '#d97706', color: '#fff', fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 2 }}>PLUSS</div>}
          </div>
        </div>
      );
    }
    // Desktop medium
    return (
      <div onClick={() => onClick(article)} className="card-hover" style={{
        background: t.surface, borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        boxShadow: t.cardShadow, display: 'flex', flexDirection: 'column',
        border: `1px solid ${t.border}`,
      }}>
        <div style={{ position: 'relative', height: 160, overflow: 'hidden', flexShrink: 0 }}>
          <img src={article.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }} loading="lazy" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <span style={{ background: article.sourceColor, color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 3 }}>{article.source}</span>
          </div>
          {article.isPlus && <div style={{ position: 'absolute', top: 10, right: 10, background: '#d97706', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 3 }}>PLUSS</div>}
          <div style={{ position: 'absolute', bottom: 8, left: 10, color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{timeAgo} · ~{article.readingTime} min</div>
        </div>
        <div style={{ padding: '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ background: t.surface2, color: t.textMuted, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 3, alignSelf: 'flex-start', textTransform: 'uppercase', letterSpacing: 0.4 }}>{catLabel}</span>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text, lineHeight: 1.3, flex: 1 }}>{article.title}</div>
          {article.description && (
            <div style={{ fontSize: 12, color: t.textSec, lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{article.description}</div>
          )}
        </div>
      </div>
    );
  }

  // ── SMALL ─────────────────────────────────────────────────────────────────
  if (mobile) {
    // Mobile small: clean text-only list item with divider (Aftenposten-inspired)
    return (
      <div onClick={() => onClick(article)} style={{
        cursor: 'pointer', padding: '14px 16px',
        borderBottom: `1px solid ${t.border}`, background: t.surface,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: article.sourceColor }}>{article.source}</span>
          <span style={{ fontSize: 11, color: t.textMuted }}>{timeAgo}</span>
          {article.isPlus && <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706' }}>PLUSS</span>}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.text, lineHeight: 1.35, marginBottom: 4 }}>{article.title}</div>
        {article.description && (
          <div style={{ fontSize: 13, color: t.textSec, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{article.description}</div>
        )}
      </div>
    );
  }
  // Desktop small
  return (
    <div onClick={() => onClick(article)} className="card-hover" style={{
      background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12,
      overflow: 'hidden', cursor: 'pointer', boxShadow: t.cardShadow,
      display: 'flex', flexDirection: 'row', alignItems: 'stretch',
    }}>
      <div style={{ width: 3, background: article.sourceColor, flexShrink: 0 }} />
      <div style={{ width: 88, height: 80, flexShrink: 0, overflow: 'hidden' }}>
        <img src={article.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
      </div>
      <div style={{ padding: '9px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: article.sourceColor }}>{article.source}</span>
          <span style={{ fontSize: 10, color: t.textMuted }}>{timeAgo}</span>
          <span style={{ fontSize: 10, color: t.textMuted }}>~{article.readingTime} min</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{article.title}</div>
        {article.description && (
          <div style={{ fontSize: 11, color: t.textSec, lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>{article.description}</div>
        )}
      </div>
    </div>
  );
}

// ─── News Feed ────────────────────────────────────────────────────────────────
function NewsFeed({ articles, loading, t, onToast, mobile }) {
  const [selectedArticle, setSelectedArticle] = useState(null);
  const { trackArticleOpen } = useStats();

  function handleOpen(article) {
    trackArticleOpen(article);
    setSelectedArticle(article);
  }

  function handleClose(wpmResult) {
    setSelectedArticle(null);
    if (wpmResult?.seconds >= 5) onToast(wpmResult);
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 80, color: t.textSec }}>
      <div style={{ fontSize: 36, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⏳</div>
      <div>Henter nyheter...</div>
    </div>
  );

  if (articles.length === 0) return (
    <div style={{ textAlign: 'center', padding: 80, color: t.textSec }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
      <div>Ingen nyheter funnet</div>
    </div>
  );

  const hero    = articles[0];
  const mediums = articles.slice(1, mobile ? 4 : 4);
  const allSmalls = articles.slice(mobile ? 4 : 4);

  // On mobile: split smalls into chunks with image-cards inserted every ~6 articles
  const CHUNK_SIZE = 6;
  const mobileChunks = [];
  if (mobile && allSmalls.length > 0) {
    let idx = 0;
    while (idx < allSmalls.length) {
      const chunk = allSmalls.slice(idx, idx + CHUNK_SIZE);
      mobileChunks.push(chunk);
      idx += CHUNK_SIZE;
    }
  }

  return (
    <>
      {selectedArticle && <ArticlePanel article={selectedArticle} onClose={handleClose} t={t} mobile={mobile} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: mobile ? 0 : 16 }}>
        {/* Hero */}
        {hero && <ArticleCard article={hero} size="hero" onClick={handleOpen} t={t} mobile={mobile} />}

        {/* Divider on mobile after hero */}
        {mobile && <div style={{ height: 8, background: t.bg }} />}

        {/* Medium cards — single column on mobile, grid on desktop */}
        {mediums.length > 0 && (
          mobile ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {mediums.map(a => <ArticleCard key={a.id} article={a} size="medium" onClick={handleOpen} t={t} mobile={mobile} />)}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${mediums.length}, 1fr)`, gap: 14 }}>
              {mediums.map(a => <ArticleCard key={a.id} article={a} size="medium" onClick={handleOpen} t={t} mobile={mobile} />)}
            </div>
          )
        )}

        {/* Mobile: alternating text-list chunks with image-card breaks */}
        {mobile && mobileChunks.length > 0 && mobileChunks.map((chunk, ci) => (
          <React.Fragment key={`chunk-${ci}`}>
            {/* Section header */}
            <div style={{ padding: ci === 0 ? '16px 16px 8px' : '8px 16px 8px', background: t.bg }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {ci === 0 ? 'Flere saker' : 'Mer å lese'}
              </div>
            </div>

            {/* Text-only small cards */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {chunk.map(a => <ArticleCard key={a.id} article={a} size="small" onClick={handleOpen} t={t} mobile={mobile} />)}
            </div>

            {/* Image-card break after each chunk (except the last) */}
            {ci < mobileChunks.length - 1 && (() => {
              // Use the first article from the NEXT chunk as the featured image card
              const nextChunk = mobileChunks[ci + 1];
              if (!nextChunk || nextChunk.length === 0) return null;
              const featured = nextChunk[0];
              return (
                <>
                  <div style={{ height: 8, background: t.bg }} />
                  <div onClick={() => handleOpen(featured)} style={{ cursor: 'pointer', background: t.surface, overflow: 'hidden' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={featured.image} alt="" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} loading="lazy" />
                      {featured.isPlus && <div style={{ position: 'absolute', top: 10, right: 10, background: '#d97706', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 3 }}>PLUSS</div>}
                    </div>
                    <div style={{ padding: '12px 16px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: t.accent, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {CATEGORIES.find(c => c.id === featured.category)?.label || ''}
                        </span>
                        <span style={{ fontSize: 11, color: t.textMuted }}>
                          {(() => { const h = Math.floor((Date.now() - featured.pubDate) / 3600000); return h < 1 ? 'Nå' : h < 24 ? `${h}t siden` : `${Math.floor(h / 24)}d siden`; })()}
                        </span>
                      </div>
                      <div style={{ fontSize: 19, fontWeight: 800, color: t.text, lineHeight: 1.25, marginBottom: 6 }}>{featured.title}</div>
                      {featured.description && (
                        <div style={{ fontSize: 13, color: t.textSec, lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{featured.description}</div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: featured.sourceColor }}>{featured.source}</span>
                        <span style={{ fontSize: 11, color: t.textMuted }}>~{featured.readingTime} min</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ height: 8, background: t.bg }} />
                </>
              );
            })()}
          </React.Fragment>
        ))}

        {/* Desktop: all small cards in grid */}
        {!mobile && allSmalls.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {allSmalls.map(a => <ArticleCard key={a.id} article={a} size="small" onClick={handleOpen} t={t} mobile={mobile} />)}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
function NewsApp() {
  const { user, logout } = useAuth();
  const { theme: t, isDark, toggleTheme } = useTheme();
  const { stats, categoryPrefs, regionPrefs } = useStats();
  const mobile = useMobile();

  const [activeTab, setActiveTab]               = useState('news');
  const [activeCategory, setActiveCategory]     = useState(null);
  const [activeRegion, setActiveRegion]         = useState('all');
  const [activeIntlSources, setActiveIntlSources] = useState([]);
  const [interests, setInterests]               = useState(() => { try { return JSON.parse(localStorage.getItem('np_interests') || '[]'); } catch { return []; } });
  const [sources, setSources]                   = useState(() => { try { return JSON.parse(localStorage.getItem('np_sources') || 'null') || DEFAULT_SOURCES; } catch { return DEFAULT_SOURCES; } });
  const [showAdmin, setShowAdmin]               = useState(false);
  const [showStats, setShowStats]               = useState(false);
  const [toastResult, setToastResult]           = useState(null);
  const [avatar, setAvatar]                     = useState(() => localStorage.getItem('np_avatar') || '');
  const [mobileMenuOpen, setMobileMenuOpen]     = useState(false);

  const allSources = useMemo(() => [...sources, ...INTERNATIONAL_SOURCES], [sources]);
  const { articles, loading, lastUpdated, refresh } = useNews(allSources);

  const norskArticles = useMemo(() => articles.filter(a => !a.isInternational), [articles]);
  const intlArticles  = useMemo(() => articles.filter(a => a.isInternational), [articles]);

  function saveSources(s) { setSources(s); localStorage.setItem('np_sources', JSON.stringify(s)); }
  function toggleInterest(id) {
    setInterests(prev => { const u = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]; localStorage.setItem('np_interests', JSON.stringify(u)); return u; });
  }
  function handleAvatarChange(url) { setAvatar(url); localStorage.setItem('np_avatar', url); }

  const trending = useMemo(() => {
    const count = {};
    norskArticles.forEach(a => { count[a.category] = (count[a.category] || 0) + 1; });
    return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id, cnt]) => ({ id, count: cnt, label: CATEGORIES.find(c => c.id === id)?.label || id }));
  }, [norskArticles]);

  const filteredNorsk = useMemo(() => {
    let list = activeCategory ? norskArticles.filter(a => a.category === activeCategory) : norskArticles;
    if (Object.keys(categoryPrefs).length > 0) {
      list = [...list].sort((a, b) => {
        const tA = (Date.now() - a.pubDate) / 3600000, tB = (Date.now() - b.pubDate) / 3600000;
        return ((categoryPrefs[b.category] || 0) * 30 - tB * 0.4) - ((categoryPrefs[a.category] || 0) * 30 - tA * 0.4);
      });
    }
    return list;
  }, [norskArticles, activeCategory, categoryPrefs]);

  const filteredIntl = useMemo(() => {
    let list = intlArticles;
    if (activeRegion !== 'all') list = list.filter(a => a.region === activeRegion);
    if (activeIntlSources.length > 0) list = list.filter(a => activeIntlSources.includes(a.sourceId));
    if (Object.keys(regionPrefs).length > 0) {
      list = [...list].sort((a, b) => {
        const tA = (Date.now() - a.pubDate) / 3600000, tB = (Date.now() - b.pubDate) / 3600000;
        return ((regionPrefs[b.region] || 0) * 30 - tB * 0.4) - ((regionPrefs[a.region] || 0) * 30 - tA * 0.4);
      });
    }
    return list;
  }, [intlArticles, activeRegion, activeIntlSources, regionPrefs]);

  const myArticles = useMemo(() => interests.length === 0 ? [] : filteredNorsk.filter(a => interests.includes(a.category)), [filteredNorsk, interests]);

  if (!user) return <LoginPage />;

  const tabs = [
    { id: 'news',      label: '🇳🇴 Norsk' },
    { id: 'world',     label: '🌍 Verden' },
    { id: 'interests', label: '⭐ Interesser', badge: interests.length },
  ];

  const chipStyle = (active, color = t.accent) => ({
    background: active ? color : t.surface2,
    border: `1px solid ${active ? color : t.border}`,
    color: active ? '#fff' : t.textSec,
    borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
    fontSize: 12, fontWeight: active ? 700 : 400, whiteSpace: 'nowrap',
  });

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: 'system-ui, -apple-system, sans-serif', color: t.text, transition: 'background 0.3s' }}>
      <style>{GLOBAL_CSS}</style>

      {showAdmin && <AdminPanel sources={sources} onSave={saveSources} onClose={() => setShowAdmin(false)} />}
      {toastResult && <WpmToast result={toastResult} onDone={() => setToastResult(null)} />}
      {showStats && <StatsSidebar t={t} avatar={avatar} onAvatarChange={handleAvatarChange} onClose={() => setShowStats(false)} mobile={mobile} />}

      {/* ── Header ── */}
      <header style={{ background: t.headerBg, borderBottom: `1px solid ${t.border}`, position: 'sticky', top: 0, zIndex: 200, boxShadow: isDark ? 'none' : '0 1px 4px rgba(0,0,0,0.05)' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: mobile ? '0 16px' : '0 20px', display: 'flex', alignItems: 'center', height: mobile ? 48 : 56, gap: mobile ? 8 : 14 }}>

          {/* Logo */}
          <div style={{ fontSize: mobile ? 16 : 17, fontWeight: 900, color: t.text, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, letterSpacing: mobile ? 0.5 : 0 }}>
            <span style={{ color: t.accent, fontSize: mobile ? 8 : 10 }}>●</span>{mobile ? 'Norsk Puls' : 'NORSK PULS'}
          </div>

          {/* Tabs — hidden on mobile (use bottom nav) */}
          {!mobile && (
            <nav style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  background: activeTab === tab.id ? t.surface2 : 'transparent',
                  border: activeTab === tab.id ? `1px solid ${t.border}` : '1px solid transparent',
                  color: activeTab === tab.id ? t.text : t.textSec,
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  fontSize: 13, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap',
                }}>
                  {tab.label}
                  {tab.badge > 0 && <span style={{ background: t.accent, color: '#fff', borderRadius: 10, padding: '0 5px', fontSize: 10 }}>{tab.badge}</span>}
                </button>
              ))}
            </nav>
          )}
          {mobile && <div style={{ flex: 1 }} />}

          {/* Right controls */}
          <div style={{ display: 'flex', gap: mobile ? 4 : 6, alignItems: 'center', flexShrink: 0 }}>
            {!mobile && (
              <div style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: '#d97706' }}>
                {(stats.points || 0).toLocaleString('no')} p
              </div>
            )}
            <button onClick={toggleTheme} title="Bytt tema" style={{ background: 'transparent', border: 'none', color: t.textSec, borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isDark ? '☀️' : '🌙'}
            </button>
            <button onClick={refresh} title="Oppdater" style={{ background: 'transparent', border: 'none', color: t.textSec, borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↺</button>
            {!mobile && (
              <button onClick={() => setShowAdmin(true)} style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textSec, borderRadius: 8, padding: '0 10px', height: 32, cursor: 'pointer', fontSize: 13 }}>Admin</button>
            )}
            {!mobile && (
              <div onClick={() => setShowStats(s => !s)} title="Profil & statistikk" style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${t.accent}`, cursor: 'pointer', flexShrink: 0, background: t.surface3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16 }}>👤</span>}
              </div>
            )}
            {!mobile && (
              <button onClick={logout} style={{ background: 'none', border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: '0 10px', height: 32, cursor: 'pointer', fontSize: 13 }}>Logg ut</button>
            )}
          </div>
        </div>
      </header>

      {/* ── Trending bar ── */}
      {activeTab === 'news' && trending.length > 0 && (
        <div style={{ background: t.surface, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ maxWidth: 1300, margin: '0 auto', padding: mobile ? '6px 16px' : '8px 16px', display: 'flex', gap: mobile ? 6 : 8, alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none' }}>
            <span style={{ color: t.textMuted, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tema</span>
            {trending.map(({ id, label, count }) => (
              <button key={id} onClick={() => setActiveCategory(activeCategory === id ? null : id)} style={chipStyle(activeCategory === id)}>
                {label}
              </button>
            ))}
            {activeCategory && (
              <button onClick={() => setActiveCategory(null)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}>× Fjern</button>
            )}
          </div>
        </div>
      )}

      {/* ── World filters ── */}
      {activeTab === 'world' && (
        <div style={{ background: t.surface, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ maxWidth: 1300, margin: '0 auto', padding: '10px 16px' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, whiteSpace: 'nowrap' }}>Region:</span>
              {WORLD_REGIONS.map(r => (
                <button key={r.id} onClick={() => setActiveRegion(r.id)} style={chipStyle(activeRegion === r.id, '#2563eb')}>{r.label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', overflowX: 'auto', scrollbarWidth: 'none' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, whiteSpace: 'nowrap' }}>Avis:</span>
              {INTERNATIONAL_SOURCES.map(src => (
                <button key={src.id} onClick={() => setActiveIntlSources(prev => prev.includes(src.id) ? prev.filter(s => s !== src.id) : [...prev, src.id])} style={chipStyle(activeIntlSources.includes(src.id), src.color)}>{src.name}</button>
              ))}
              {activeIntlSources.length > 0 && <button onClick={() => setActiveIntlSources([])} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 12 }}>× Alle</button>}
            </div>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <main style={{ maxWidth: 1300, margin: '0 auto', padding: mobile ? '0 0 80px' : '20px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Desktop sidebar */}
        {!mobile && !showStats && false /* disabled – use avatar button instead */ }
        {!mobile && (
          <StatsSidebar t={t} avatar={avatar} onAvatarChange={handleAvatarChange} onClose={() => {}} mobile={false} />
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          {activeTab === 'news' && <NewsFeed articles={filteredNorsk} loading={loading} t={t} onToast={setToastResult} mobile={mobile} />}

          {activeTab === 'world' && (
            <>
              <div style={{ fontSize: 13, color: t.textSec, marginBottom: 14 }}>
                {filteredIntl.length} internasjonale nyheter{activeRegion !== 'all' && ` · ${WORLD_REGIONS.find(r => r.id === activeRegion)?.label}`}
              </div>
              <NewsFeed articles={filteredIntl} loading={loading} t={t} onToast={setToastResult} mobile={mobile} />
            </>
          )}

          {activeTab === 'interests' && (
            <div>
              <h2 style={{ color: t.text, fontSize: 18, margin: '0 0 8px', fontWeight: 800 }}>Mine interesser</h2>
              <p style={{ color: t.textSec, fontSize: 13, margin: '0 0 14px' }}>Velg kategorier du vil følge:</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => toggleInterest(cat.id)} style={{
                    background: interests.includes(cat.id) ? t.accent : t.surface2,
                    border: `1px solid ${interests.includes(cat.id) ? t.accent : t.border}`,
                    color: interests.includes(cat.id) ? '#fff' : t.textSec,
                    borderRadius: 20, padding: '7px 16px', cursor: 'pointer', fontSize: 13,
                    fontWeight: interests.includes(cat.id) ? 700 : 400,
                  }}>
                    {CATEGORY_EMOJIS[cat.id]} {cat.label}
                  </button>
                ))}
              </div>
              {interests.length === 0
                ? <div style={{ textAlign: 'center', padding: 40, color: t.textSec }}>Velg minst én kategori for å se nyheter her.</div>
                : <NewsFeed articles={myArticles} loading={loading} t={t} onToast={setToastResult} mobile={mobile} />
              }
            </div>
          )}
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      {mobile && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 300,
          background: t.headerBg, borderTop: `1px solid ${t.border}`,
          display: 'flex', alignItems: 'center',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxShadow: '0 -1px 8px rgba(0,0,0,0.06)',
        }}>
          {[
            { id: 'news', icon: '📰', label: 'Norsk' },
            { id: 'world', icon: '🌍', label: 'Verden' },
            { id: 'interests', icon: '⭐', label: 'Interesser' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
              flex: 1, background: 'none', border: 'none', cursor: 'pointer',
              padding: '8px 6px 6px',
              color: activeTab === tab.id ? t.accent : t.textMuted,
              fontSize: 11, fontWeight: activeTab === tab.id ? 700 : 400,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <span style={{ fontSize: 18, opacity: activeTab === tab.id ? 1 : 0.6 }}>{tab.icon}</span>
              <span style={{ fontSize: 10 }}>{tab.label}</span>
            </button>
          ))}
          <button onClick={() => setShowStats(true)} style={{
            flex: 1, background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 6px 6px', color: t.textMuted,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${showStats ? t.accent : t.border}`, background: t.surface3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {avatar ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 11 }}>👤</span>}
            </div>
            <span style={{ fontSize: 10 }}>Profil</span>
          </button>
        </nav>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <StatsProvider>
          <NewsApp />
        </StatsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
