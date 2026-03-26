import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './auth.jsx';
import LoginPage from './LoginPage.jsx';
import AdminPanel from './AdminPanel.jsx';
import { useNews } from './useNews.js';
import { DEFAULT_SOURCES, CATEGORIES, getNorwegianSources, getInternationalSources } from './sources.js';

// ── Reading history utilities ──────────────────────────────────────────────────

const HISTORY_KEY = 'np_history';
const MAX_HISTORY = 400;

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}
function saveHistory(h) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, MAX_HISTORY)));
}
function recordRead(article, seconds) {
  if (!article || seconds < 3) return;
  const h = loadHistory();
  h.unshift({
    articleId: article.id,
    category: article.category,
    source: article.source,
    sourceId: article.sourceId,
    title: article.title,
    link: article.link,
    image: article.image,
    timestamp: Date.now(),
    readTimeSeconds: Math.round(seconds),
  });
  saveHistory(h.filter((e, i, a) => a.findIndex(x => x.articleId === e.articleId) === i));
}

function computeStats(history) {
  const totalRead = history.length;
  if (!totalRead) return {
    topCategories: [], topSources: [], totalRead: 0,
    avgReadTime: 0, score: 0, level: 'Nybegynner', weekCount: 0, streak: 0,
    nextLevel: 'Leser', nextScore: 50,
  };
  const catCounts = {};
  history.forEach(e => { catCounts[e.category] = (catCounts[e.category] || 0) + 1; });
  const topCategories = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([id, count]) => ({
      id, count,
      label: CATEGORIES.find(c => c.id === id)?.label || id,
      pct: Math.round((count / totalRead) * 100),
    }));
  const srcCounts = {};
  history.forEach(e => { srcCounts[e.source] = (srcCounts[e.source] || 0) + 1; });
  const topSources = Object.entries(srcCounts).sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([name, count]) => ({ name, count }));
  const times = history.map(e => e.readTimeSeconds).filter(t => t >= 5 && t < 600);
  const avgReadTime = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const longReads = history.filter(e => e.readTimeSeconds > 60).length;
  const uniqueCats = new Set(history.map(e => e.category)).size;
  const uniqueSrcs = new Set(history.map(e => e.sourceId)).size;
  const score = totalRead * 5 + longReads * 10 + uniqueCats * 20 + uniqueSrcs * 10;

  const LEVELS = [
    { name: 'Nybegynner', min: 0, next: 50 },
    { name: 'Leser', min: 50, next: 200 },
    { name: 'Nyhetsjeger', min: 200, next: 500 },
    { name: 'Redaktør', min: 500, next: 1000 },
    { name: 'Sjefredaktør', min: 1000, next: Infinity },
  ];
  const lvlObj = LEVELS.slice().reverse().find(l => score >= l.min) || LEVELS[0];
  const nextLvl = LEVELS[LEVELS.indexOf(lvlObj) + 1];
  const levelPct = nextLvl ? Math.min(100, Math.round(((score - lvlObj.min) / (nextLvl.min - lvlObj.min)) * 100)) : 100;

  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const weekCount = history.filter(e => e.timestamp > weekAgo).length;
  const days = new Set(history.map(e => new Date(e.timestamp).toDateString()));
  const streak = days.size;

  return { topCategories, topSources, totalRead, avgReadTime, score, level: lvlObj.name,
    nextLevel: nextLvl?.name || null, levelPct, weekCount, streak };
}

// ── Category background gradients ─────────────────────────────────────────────

const CATEGORY_BG = {
  innenriks: 'radial-gradient(ellipse at 15% 50%, rgba(40,60,180,0.18) 0%, transparent 60%)',
  utenriks:  'radial-gradient(ellipse at 85% 30%, rgba(15,80,160,0.16) 0%, transparent 60%)',
  sport:     'radial-gradient(ellipse at 50% 80%, rgba(20,150,60,0.16) 0%, transparent 60%)',
  okonomi:   'radial-gradient(ellipse at 78% 15%, rgba(160,100,10,0.15) 0%, transparent 60%)',
  teknologi: 'radial-gradient(ellipse at 25% 25%, rgba(90,40,200,0.18) 0%, transparent 60%)',
  helse:     'radial-gradient(ellipse at 60% 65%, rgba(10,140,140,0.15) 0%, transparent 60%)',
  kultur:    'radial-gradient(ellipse at 40% 15%, rgba(180,20,100,0.15) 0%, transparent 60%)',
  klima:     'radial-gradient(ellipse at 15% 75%, rgba(20,140,30,0.17) 0%, transparent 60%)',
};

// ── Regioner for internasjonal filtrering ─────────────────────────────────────

export const INTL_REGIONS = [
  {
    id: 'asia', label: 'Asia', icon: '🌏',
    keywords: ['china', 'japan', 'korea', 'india', 'taiwan', 'indonesia', 'pakistan',
               'vietnam', 'thailand', 'singapore', 'bangladesh', 'myanmar', 'cambodia',
               'hong kong', 'beijing', 'tokyo', 'seoul', 'delhi', 'manila', 'jakarta',
               'malaysia', 'philippines', 'mongolia', 'tibet', 'xinjiang', 'kashmir'],
    sourceRegions: ['sør-asia', 'oseania / asia', 'asia'],
  },
  {
    id: 'mideast', label: 'Midtøsten', icon: '🕌',
    keywords: ['israel', 'palestine', 'iran', 'iraq', 'syria', 'saudi', 'turkey',
               'jordan', 'lebanon', 'yemen', 'qatar', 'dubai', 'uae', 'bahrain',
               'kuwait', 'oman', 'gaza', 'west bank', 'tehran', 'damascus', 'baghdad',
               'hezbollah', 'hamas', 'houthi', 'netanyahu', 'ramallah'],
    sourceRegions: ['midtøsten', 'midtøsten / afrika'],
  },
  {
    id: 'africa', label: 'Afrika', icon: '🌍',
    keywords: ['africa', 'nigeria', 'kenya', 'ethiopia', 'ghana', 'tanzania',
               'south africa', 'egypt', 'morocco', 'algeria', 'sudan', 'congo',
               'senegal', 'cameroon', 'zimbabwe', 'uganda', 'rwanda', 'nairobi',
               'cairo', 'lagos', 'dakar', 'mali', 'niger', 'somalia', 'eritrea'],
    sourceRegions: ['afrika', 'midtøsten / afrika'],
  },
  {
    id: 'north_america', label: 'Nord-Amerika', icon: '🌎',
    keywords: ['usa', 'united states', 'america', 'canada', 'mexico', 'washington',
               'white house', 'congress', 'senate', 'trump', 'biden', 'harris',
               'ottawa', 'toronto', 'new york', 'california', 'texas', 'florida',
               'pentagon', 'wall street', 'federal reserve', 'cia', 'fbi'],
    sourceRegions: ['nord-amerika'],
  },
  {
    id: 'south_america', label: 'Sør-Amerika', icon: '🌎',
    keywords: ['brazil', 'argentina', 'chile', 'colombia', 'peru', 'venezuela',
               'bolivia', 'uruguay', 'paraguay', 'ecuador', 'brasilia', 'buenos aires',
               'bogota', 'lima', 'santiago', 'caracas', 'amazon', 'lula', 'milei',
               'falkland', 'mercosur', 'guyana', 'suriname'],
    sourceRegions: ['sør-amerika'],
  },
  {
    id: 'europe', label: 'Europa', icon: '🇪🇺',
    keywords: ['europe', 'european', 'germany', 'france', 'spain', 'italy', 'poland',
               'ukraine', 'russia', 'britain', 'england', 'berlin', 'paris', 'rome',
               'madrid', 'brussels', 'london', 'nato', 'eu', 'merkel', 'macron',
               'scholz', 'zelensky', 'putin', 'kremlin', 'moscow', 'kyiv', 'brexit'],
    sourceRegions: ['europa', 'europa / global'],
  },
  {
    id: 'oceania', label: 'Oseania', icon: '🦘',
    keywords: ['australia', 'new zealand', 'pacific', 'papua', 'fiji', 'sydney',
               'melbourne', 'canberra', 'auckland', 'wellington', 'pacific island',
               'tonga', 'samoa', 'vanuatu', 'solomon', 'micronesia'],
    sourceRegions: ['oseania', 'oseania / asia'],
  },
];

// Bestem hvilken(e) regioner en artikkel tilhører
function detectArticleRegions(article) {
  const text = (article.title + ' ' + (article.description || '')).toLowerCase();
  const srcRegion = (article.sourceRegion || '').toLowerCase();

  const matched = INTL_REGIONS.filter(r => {
    // Sjekk kilde-region
    if (r.sourceRegions.some(sr => srcRegion.includes(sr))) return true;
    // Sjekk innholdsnøkkelord
    return r.keywords.some(kw => text.includes(kw));
  });
  return matched.map(r => r.id);
}

// ── Avatar helpers ─────────────────────────────────────────────────────────────

const AVATAR_KEY = 'np_avatar';
function loadAvatar() { return localStorage.getItem(AVATAR_KEY) || null; }
function saveAvatar(dataUrl) { localStorage.setItem(AVATAR_KEY, dataUrl); }

// Komponent: viser profilbilde eller initial-bokstav, med klikk for opplasting
function AvatarCircle({ initial, lvlColor, size = 48, onAvatarChange }) {
  const [avatar, setAvatar] = useState(() => loadAvatar());
  const [hovered, setHovered] = useState(false);
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target.result;
      saveAvatar(dataUrl);
      setAvatar(dataUrl);
      onAvatarChange?.();
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      style={{ position: 'relative', width: size, height: size, flexShrink: 0, cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
      title="Klikk for å endre profilbilde"
    >
      {/* Sirkelen */}
      <div style={{
        width: size, height: size, borderRadius: '50%', overflow: 'hidden',
        border: `${size > 50 ? 3 : 2}px solid ${lvlColor}`,
        background: `linear-gradient(135deg, ${lvlColor}, #1a1a2e)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.42, fontWeight: 800,
      }}>
        {avatar
          ? <img src={avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : initial}
      </div>
      {/* Rediger-overlay */}
      {hovered && (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: size > 50 ? 18 : 13,
        }}>
          📷
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(s) {
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ── Main app ───────────────────────────────────────────────────────────────────

function NewsApp() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('news');
  const [activeCategory, setActiveCategory] = useState(null);
  const [interests, setInterests] = useState(() => {
    const saved = localStorage.getItem('np_interests');
    return saved ? JSON.parse(saved) : [];
  });
  const [sources, setSources] = useState(() => {
    const saved = localStorage.getItem('np_sources');
    if (!saved) return DEFAULT_SOURCES;
    const parsed = JSON.parse(saved);
    const URL_FIXES = {
      'tv2': 'https://www.tv2.no/rss/nyheter',
      'dn':  'https://services.dn.no/api/feed/rss/',
    };
    let changed = false;
    let updated = parsed
      .filter(s => s.id !== 'dagbladet')
      .map(s => {
        if (URL_FIXES[s.id] && s.rssUrl !== URL_FIXES[s.id]) {
          changed = true;
          return { ...s, rssUrl: URL_FIXES[s.id] };
        }
        return s;
      });
    if (parsed.find(s => s.id === 'dagbladet')) changed = true;
    if (!updated.find(s => s.id === 'nettavisen')) {
      updated.push({ id: 'nettavisen', name: 'Nettavisen', rssUrl: 'https://www.nettavisen.no/rss', color: '#0097d6', enabled: true });
      changed = true;
    }
    if (!updated.find(s => s.id === 'dagsavisen')) {
      updated.push({ id: 'dagsavisen', name: 'Dagsavisen', rssUrl: 'https://www.dagsavisen.no/rss/', color: '#c0392b', lang: 'no', enabled: true });
      changed = true;
    }
    // Legg til internasjonale kilder hvis de mangler
    const intlToAdd = [
      { id: 'bbc',       name: 'BBC World',       rssUrl: 'http://feeds.bbci.co.uk/news/world/rss.xml',                      color: '#bb1919', lang: 'en', region: 'Global',            enabled: true },
      { id: 'aljazeera', name: 'Al Jazeera',       rssUrl: 'https://www.aljazeera.com/xml/rss/all.xml',                       color: '#e8871e', lang: 'en', region: 'Midtøsten / Afrika', enabled: true },
      { id: 'guardian',  name: 'The Guardian',     rssUrl: 'https://www.theguardian.com/world/rss',                           color: '#052962', lang: 'en', region: 'Global',            enabled: true },
      { id: 'reuters',   name: 'Reuters',          rssUrl: 'https://feeds.reuters.com/reuters/worldNews',                     color: '#ff7700', lang: 'en', region: 'Global',            enabled: true },
      { id: 'dw',        name: 'Deutsche Welle',   rssUrl: 'https://rss.dw.com/xml/rss-en-world',                             color: '#0068b5', lang: 'en', region: 'Europa / Global',   enabled: true },
      { id: 'abc_au',    name: 'ABC Australia',    rssUrl: 'https://www.abc.net.au/news/feed/51120/rss.xml',                   color: '#00a650', lang: 'en', region: 'Oseania / Asia',    enabled: true },
      { id: 'toi',       name: 'Times of India',   rssUrl: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',      color: '#e63a11', lang: 'en', region: 'Sør-Asia',          enabled: true },
      { id: 'allafrica', name: 'AllAfrica',        rssUrl: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf',  color: '#006400', lang: 'en', region: 'Afrika',            enabled: true },
      { id: 'mee',       name: 'Middle East Eye',  rssUrl: 'https://www.middleeasteye.net/rss',                               color: '#1a8c4e', lang: 'en', region: 'Midtøsten',        enabled: true },
      { id: 'mercopress',name: 'Mercopress',       rssUrl: 'https://en.mercopress.com/rss/news',                              color: '#2e7d32', lang: 'en', region: 'Sør-Amerika',       enabled: true },
    ];
    for (const src of intlToAdd) {
      if (!updated.find(s => s.id === src.id)) { updated.push(src); changed = true; }
    }
    // Sørg for at eksisterende norske kilder har lang-feltet
    updated = updated.map(s => {
      if (!s.lang) { changed = true; return { ...s, lang: 'no' }; }
      return s;
    });
    if (changed) localStorage.setItem('np_sources', JSON.stringify(updated));
    return updated;
  });
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [activeRegion, setActiveRegion] = useState(null); // for internasjonal fane
  const [history, setHistory] = useState(() => loadHistory());

  const { articles, loading, lastUpdated, refresh } = useNews(sources);

  function saveSources(newSources) {
    setSources(newSources);
    localStorage.setItem('np_sources', JSON.stringify(newSources));
  }
  function toggleInterest(id) {
    setInterests(prev => {
      const updated = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      localStorage.setItem('np_interests', JSON.stringify(updated));
      return updated;
    });
  }
  function handleRead(article, seconds) {
    recordRead(article, seconds);
    setHistory(loadHistory());
  }

  const stats = computeStats(history);

  // Splitt artikler etter språk
  const norwegianArticles = articles.filter(a => !a.sourceLang || a.sourceLang === 'no');
  const intlArticles      = articles.filter(a => a.sourceLang === 'en');

  // Category counts for trending bar (basert på aktiv tab)
  const activeArticles = activeTab === 'international' ? intlArticles : norwegianArticles;
  const categoryCount = {};
  activeArticles.forEach(a => { categoryCount[a.category] = (categoryCount[a.category] || 0) + 1; });
  const topTrendingCat = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0];
  const bgGradient = CATEGORY_BG[topTrendingCat] || '';

  const trending = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([id, count]) => ({ id, count, label: CATEGORIES.find(c => c.id === id)?.label || id }));

  // Filtrer norske artikler
  let filtered = norwegianArticles;
  if (activeCategory) filtered = filtered.filter(a => a.category === activeCategory);
  const myArticles = interests.length > 0 ? filtered.filter(a => interests.includes(a.category)) : [];

  // Filtrer internasjonale artikler (kategori + region)
  let filteredIntl = intlArticles;
  if (activeCategory) filteredIntl = filteredIntl.filter(a => a.category === activeCategory);
  if (activeRegion) {
    filteredIntl = filteredIntl.filter(a => detectArticleRegions(a).includes(activeRegion));
  }

  // Tell artikler per region for å vise badges
  const regionCounts = INTL_REGIONS.reduce((acc, r) => {
    acc[r.id] = intlArticles.filter(a => detectArticleRegions(a).includes(r.id)).length;
    return acc;
  }, {});

  // Recommendations: prefer user's top read categories, then interests
  const recCats = stats.topCategories.length > 0
    ? stats.topCategories.slice(0, 3).map(c => c.id)
    : interests.length > 0 ? interests.slice(0, 3) : null;
  const recommendations = recCats
    ? norwegianArticles.filter(a => recCats.includes(a.category)).slice(0, 9)
    : norwegianArticles.filter((_, i) => i % 3 === 0).slice(0, 9);

  if (!user) return <LoginPage />;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      backgroundImage: bgGradient,
      backgroundAttachment: 'fixed',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: '#fff',
      transition: 'background-image 2s ease',
    }}>
      {/* Header */}
      <header style={{ background: 'rgba(13,13,18,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #1e1e2e', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 56, gap: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#d4202a' }}>●</span> NORSK PULS
          </div>
          <nav style={{ display: 'flex', gap: 4, flex: 1 }}>
            {[
              { id: 'news',          label: 'Nyheter' },
              { id: 'international', label: '🌍 Internasjonalt' },
              { id: 'interests',     label: 'Mine interesser' },
            ].map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setActiveCategory(null); setActiveRegion(null); }} style={{
                background: activeTab === tab.id ? '#1e1e2e' : 'transparent',
                border: 'none', color: activeTab === tab.id ? '#fff' : '#666',
                fontWeight: activeTab === tab.id ? 700 : 400, fontSize: 14, padding: '6px 14px',
                borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                {tab.label}
                {tab.id === 'interests' && interests.length > 0 && (
                  <span style={{ marginLeft: 6, background: '#d4202a', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{interests.length}</span>
                )}
                {tab.id === 'international' && intlArticles.length > 0 && (
                  <span style={{ marginLeft: 6, background: '#1a3a5c', color: '#7bc8ff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>{intlArticles.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {lastUpdated && (
              <span style={{ color: '#444', fontSize: 12 }}>
                Oppdatert {lastUpdated.toLocaleTimeString('no', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button onClick={refresh} style={{ background: '#1e1e2e', border: '1px solid #333', color: '#ccc', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 13 }}>↺</button>
            <button onClick={() => setShowAdmin(true)} style={{ background: '#1e1e2e', border: '1px solid #333', color: '#ccc', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 13 }}>Admin</button>
            <button onClick={logout} style={{ background: 'none', border: '1px solid #333', color: '#666', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 13 }}>Logg ut</button>
          </div>
        </div>
      </header>

      {/* Trending bar */}
      {(activeTab === 'news' || activeTab === 'international') && trending.length > 0 && (
        <div style={{ background: 'rgba(10,10,16,0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #1a1a2a' }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '10px 20px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ color: '#d4202a', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>🔥 TRENDING</span>
            {trending.map(({ id, label, count }) => (
              <button key={id} onClick={() => setActiveCategory(activeCategory === id ? null : id)} style={{
                background: activeCategory === id ? '#d4202a' : '#1a1a24',
                color: activeCategory === id ? '#fff' : '#ccc',
                border: 'none', borderRadius: 20, padding: '4px 12px', cursor: 'pointer',
                fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
              }}>
                {label} <span style={{ opacity: 0.7 }}>({count})</span>
              </button>
            ))}
            {activeCategory && (
              <button onClick={() => setActiveCategory(null)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: 12 }}>✕ Fjern filter</button>
            )}
          </div>
        </div>
      )}

      {/* 3-column layout */}
      <div style={{
        maxWidth: 1440, margin: '0 auto', padding: '20px',
        display: 'grid',
        gridTemplateColumns: '220px 1fr 290px',
        gap: '20px',
        alignItems: 'start',
      }}>

        {/* ── Left: Profile sidebar ── */}
        <ProfileSidebar
          user={user}
          stats={stats}
          history={history}
          onOpenProfile={() => setShowProfile(true)}
        />

        {/* ── Center: Main content ── */}
        <main>
          {activeTab === 'news' && (
            <>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
                  Henter nyheter...
                </div>
              ) : (
                <>
                  {interests.length > 0 && myArticles.length > 0 && (
                    <section style={{ marginBottom: 40 }}>
                      <h2 style={{ color: '#d4202a', fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>⭐ MINE NYHETER</h2>
                      <ArticleGrid articles={myArticles.slice(0, 6)} onSelect={setSelectedArticle} />
                    </section>
                  )}
                  <section>
                    <h2 style={{ color: '#ccc', fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>
                      {activeCategory ? `KATEGORI: ${CATEGORIES.find(c => c.id === activeCategory)?.label?.toUpperCase()}` : 'SISTE NYTT'}
                    </h2>
                    <ArticleGrid articles={filtered} onSelect={setSelectedArticle} />
                  </section>
                </>
              )}
            </>
          )}

          {activeTab === 'international' && (
            <>
              {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#666' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🌍</div>
                  Henter internasjonale nyheter...
                </div>
              ) : (
                <>
                  {/* ── Regionfilter ── */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: '#555', fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>FILTRER ETTER VERDENSDEL</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {/* "Vis alle"-knapp */}
                      <button
                        onClick={() => setActiveRegion(null)}
                        style={{
                          background: !activeRegion ? '#1a3a5c' : '#13131a',
                          border: `1px solid ${!activeRegion ? '#3a7bc8' : '#2a2a3a'}`,
                          color: !activeRegion ? '#7bc8ff' : '#666',
                          borderRadius: 20, padding: '6px 14px', cursor: 'pointer',
                          fontSize: 13, fontWeight: !activeRegion ? 700 : 400,
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}
                      >
                        🌐 Alle
                        <span style={{ fontSize: 11, opacity: 0.7 }}>({intlArticles.length})</span>
                      </button>

                      {INTL_REGIONS.map(r => {
                        const count = regionCounts[r.id] || 0;
                        if (!count) return null;
                        const isActive = activeRegion === r.id;
                        return (
                          <button
                            key={r.id}
                            onClick={() => setActiveRegion(isActive ? null : r.id)}
                            style={{
                              background: isActive ? '#1a3a5c' : '#13131a',
                              border: `1px solid ${isActive ? '#3a7bc8' : '#2a2a3a'}`,
                              color: isActive ? '#7bc8ff' : '#aaa',
                              borderRadius: 20, padding: '6px 14px', cursor: 'pointer',
                              fontSize: 13, fontWeight: isActive ? 700 : 400,
                              display: 'flex', alignItems: 'center', gap: 5,
                              transition: 'all 0.15s',
                            }}
                          >
                            {r.icon} {r.label}
                            <span style={{ fontSize: 11, opacity: 0.7 }}>({count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Kildeinfo-rad */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                    {getInternationalSources(sources).filter(s => s.enabled).map(s => {
                      const count = (activeRegion
                        ? filteredIntl
                        : intlArticles
                      ).filter(a => a.sourceId === s.id).length;
                      if (!count) return null;
                      return (
                        <div key={s.id} style={{
                          background: '#0d0d14', border: `1px solid ${s.color}33`,
                          borderRadius: 16, padding: '3px 10px', fontSize: 11,
                          display: 'flex', alignItems: 'center', gap: 5, color: '#666',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                          {s.name}
                          <span style={{ color: '#444' }}>({count})</span>
                        </div>
                      );
                    })}
                  </div>

                  <section>
                    <h2 style={{ color: '#7bc8ff', fontSize: 14, fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>
                      {activeRegion
                        ? `${INTL_REGIONS.find(r => r.id === activeRegion)?.icon} ${INTL_REGIONS.find(r => r.id === activeRegion)?.label?.toUpperCase()}`
                        : activeCategory
                          ? `KATEGORI: ${CATEGORIES.find(c => c.id === activeCategory)?.label?.toUpperCase()}`
                          : 'INTERNASJONALE NYHETER'}
                      {filteredIntl.length > 0 && (
                        <span style={{ color: '#555', fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                          {filteredIntl.length} artikler · duplikater fjernet
                        </span>
                      )}
                    </h2>
                    {filteredIntl.length === 0 ? (
                      <div style={{ color: '#555', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
                        Ingen artikler funnet for dette området akkurat nå.
                      </div>
                    ) : (
                      <ArticleGrid articles={filteredIntl} onSelect={setSelectedArticle} />
                    )}
                  </section>
                </>
              )}
            </>
          )}

          {activeTab === 'interests' && (
            <div>
              <h2 style={{ color: '#fff', fontSize: 18, marginBottom: 8 }}>Mine interesser</h2>
              <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>Velg kategorier du vil følge — de vises øverst i nyhetsstrømmen.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 40 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => toggleInterest(cat.id)} style={{
                    background: interests.includes(cat.id) ? '#1a3a1a' : '#13131a',
                    border: `2px solid ${interests.includes(cat.id) ? '#4caf50' : '#2a2a3a'}`,
                    borderRadius: 12, padding: '16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>
                      {['🇳🇴','🌍','⚽','💹','💻','🏥','🎭','🌱'][CATEGORIES.indexOf(cat)]}
                    </div>
                    <div style={{ color: interests.includes(cat.id) ? '#4caf50' : '#fff', fontWeight: 600, fontSize: 14 }}>{cat.label}</div>
                    {interests.includes(cat.id) && <div style={{ color: '#4caf50', fontSize: 11, marginTop: 4 }}>✓ Valgt</div>}
                  </button>
                ))}
              </div>
              <h2 style={{ color: '#fff', fontSize: 18, marginBottom: 8 }}>Nyhetskilder</h2>
              <p style={{ color: '#666', marginBottom: 16, fontSize: 14 }}>Skru av/på enkeltkilder her.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
                {sources.map(s => (
                  <div key={s.id} style={{ background: '#13131a', border: `1px solid ${s.enabled ? '#2a2a3a' : '#1a1a1a'}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.enabled ? s.color : '#333' }} />
                    <span style={{ color: s.enabled ? '#fff' : '#555', fontWeight: 600, flex: 1 }}>{s.name}</span>
                    <button onClick={() => {
                      const updated = sources.map(src => src.id === s.id ? { ...src, enabled: !src.enabled } : src);
                      saveSources(updated);
                    }} style={{
                      background: s.enabled ? '#1a3a1a' : '#2a2a2a', color: s.enabled ? '#4caf50' : '#666',
                      border: 'none', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 11,
                    }}>
                      {s.enabled ? 'PÅ' : 'AV'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* ── Right: Recommendations ── */}
        <RecommendationsPanel
          articles={recommendations}
          stats={stats}
          onSelect={setSelectedArticle}
          loading={loading}
        />
      </div>

      {showAdmin && <AdminPanel sources={sources} onSave={saveSources} onClose={() => setShowAdmin(false)} />}
      {selectedArticle && <ArticlePanel article={selectedArticle} onClose={() => setSelectedArticle(null)} onRead={handleRead} />}
      {showProfile && <ProfileModal user={user} stats={stats} history={history} onClose={() => setShowProfile(false)} />}
    </div>
  );
}

// ── Profile sidebar (left) ─────────────────────────────────────────────────────

const LEVEL_COLORS = {
  'Nybegynner':   '#6b7280',
  'Leser':        '#3b82f6',
  'Nyhetsjeger':  '#8b5cf6',
  'Redaktør':     '#f59e0b',
  'Sjefredaktør': '#ef4444',
};
const CAT_ICONS = { innenriks:'🇳🇴', utenriks:'🌍', sport:'⚽', okonomi:'💹', teknologi:'💻', helse:'🏥', kultur:'🎭', klima:'🌱' };

function ProfileSidebar({ user, stats, history, onOpenProfile }) {
  const initial = (user?.username || user?.email || 'U')[0].toUpperCase();
  const lvlColor = LEVEL_COLORS[stats.level] || '#6b7280';
  const todayCount = history.filter(e => new Date(e.timestamp).toDateString() === new Date().toDateString()).length;

  return (
    <div style={{ position: 'sticky', top: 80 }}>
      {/* Profile card */}
      <div
        onClick={onOpenProfile}
        style={{
          background: '#13131a', border: '1px solid #1e1e2e', borderRadius: 16,
          padding: '20px', cursor: 'pointer', transition: 'border-color 0.2s',
          marginBottom: 12,
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#333'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#1e1e2e'}
      >
        {/* Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <AvatarCircle initial={initial} lvlColor={lvlColor} size={48} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>
              {user?.username || user?.email?.split('@')[0] || 'Leser'}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: lvlColor,
              background: `${lvlColor}22`, borderRadius: 8, padding: '2px 8px', display: 'inline-block', marginTop: 2,
            }}>
              {stats.level}
            </div>
          </div>
        </div>

        {/* Level progress */}
        {stats.nextLevel && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#666', marginBottom: 4 }}>
              <span>Mot {stats.nextLevel}</span>
              <span>{stats.levelPct}%</span>
            </div>
            <div style={{ background: '#1e1e2e', borderRadius: 4, height: 5, overflow: 'hidden' }}>
              <div style={{ width: `${stats.levelPct}%`, height: '100%', background: `linear-gradient(90deg, ${lvlColor}, ${lvlColor}aa)`, borderRadius: 4, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        )}

        {/* Mini stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Artikler', value: stats.totalRead },
            { label: 'I dag', value: todayCount },
            { label: 'Snitt lesetid', value: stats.avgReadTime ? formatTime(stats.avgReadTime) : '–' },
            { label: 'Denne uken', value: stats.weekCount },
          ].map(s => (
            <div key={s.label} style={{ background: '#0d0d14', borderRadius: 8, padding: '8px 10px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Top categories */}
        {stats.topCategories.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>FAVORITTSJANGERE</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {stats.topCategories.slice(0, 3).map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13 }}>{CAT_ICONS[c.id] || '📰'}</span>
                  <div style={{ flex: 1, background: '#0d0d14', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${c.pct}%`, height: '100%', background: '#d4202a44', borderRadius: 4 }} />
                  </div>
                  <span style={{ fontSize: 11, color: '#666', width: 30, textAlign: 'right' }}>{c.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.totalRead === 0 && (
          <p style={{ color: '#555', fontSize: 12, textAlign: 'center', margin: 0 }}>
            Les artikler for å bygge din leserprofil
          </p>
        )}

        <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: '#d4202a' }}>
          Se full statistikk →
        </div>
      </div>

      {/* Score display */}
      <div style={{ background: '#13131a', border: '1px solid #1e1e2e', borderRadius: 12, padding: '12px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>LESERSCORE</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: lvlColor, lineHeight: 1 }}>{stats.score}</div>
        <div style={{ fontSize: 11, color: '#444', marginTop: 4 }}>poeng</div>
      </div>
    </div>
  );
}

// ── Recommendations panel (right) ─────────────────────────────────────────────

function RecommendationsPanel({ articles, stats, onSelect, loading }) {
  if (loading) return (
    <div style={{ position: 'sticky', top: 80 }}>
      <div style={{ background: '#13131a', border: '1px solid #1e1e2e', borderRadius: 16, padding: 20 }}>
        <div style={{ color: '#555', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>Henter forslag...</div>
      </div>
    </div>
  );

  const hasHistory = stats.topCategories.length > 0;
  const subtitle = hasHistory
    ? `Basert på din interesse for ${stats.topCategories[0]?.label}`
    : 'Populære artikler akkurat nå';

  return (
    <div style={{ position: 'sticky', top: 80 }}>
      <div style={{ background: '#13131a', border: '1px solid #1e1e2e', borderRadius: 16, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #1a1a2a' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
            ✨ Dagens forslag
          </div>
          <div style={{ fontSize: 11, color: '#555' }}>{subtitle}</div>
        </div>

        {/* Articles */}
        <div style={{ padding: '8px 0' }}>
          {articles.length === 0 && (
            <p style={{ color: '#555', fontSize: 13, textAlign: 'center', padding: '20px 16px' }}>
              Ingen forslag ennå. Les noen artikler for personlige anbefalinger.
            </p>
          )}
          {articles.map((a, i) => (
            <RecommendationCard key={a.id} article={a} onSelect={onSelect} index={i} />
          ))}
        </div>
      </div>

      {/* Kategori-fordeling mini */}
      {hasHistory && (
        <div style={{ background: '#13131a', border: '1px solid #1e1e2e', borderRadius: 12, padding: '14px 16px', marginTop: 12 }}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 10 }}>DINE KATEGORIER</div>
          {stats.topCategories.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <span style={{ fontSize: 14, width: 18 }}>{CAT_ICONS[c.id] || '📰'}</span>
              <span style={{ fontSize: 12, color: '#ccc', flex: 1 }}>{c.label}</span>
              <div style={{ width: 60, background: '#0d0d14', borderRadius: 4, height: 5 }}>
                <div style={{ width: `${c.pct}%`, height: '100%', background: '#d4202a', borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 11, color: '#555', width: 24, textAlign: 'right' }}>{c.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ article: a, onSelect, index }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onSelect(a)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', gap: 10, padding: '10px 14px', cursor: 'pointer',
        background: hovered ? '#1a1a24' : 'transparent',
        borderBottom: index < 8 ? '1px solid #12121a' : 'none',
        transition: 'background 0.15s',
      }}
    >
      {/* Thumbnail */}
      <div style={{ width: 60, height: 50, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#1a1a24' }}>
        <img src={a.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 5, marginBottom: 3, alignItems: 'center' }}>
          <SourceBadge source={a.source} color={a.sourceColor} />
          {a.readerCount && <PopularityBadge score={a.trendScore} count={a.readerCount} />}
        </div>
        <p style={{
          color: '#ccc', fontSize: 12, fontWeight: 600, margin: 0, lineHeight: 1.3,
          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {a.title}
        </p>
        <TimeStamp date={a.pubDate} />
      </div>
    </div>
  );
}

// ── Article grid ──────────────────────────────────────────────────────────────

function ArticleGrid({ articles, onSelect }) {
  if (articles.length === 0) return <div style={{ color: '#555', padding: 40, textAlign: 'center' }}>Ingen artikler å vise.</div>;
  const hero = articles[0];
  const medium = articles.slice(1, 5);
  const small = articles.slice(5);
  return (
    <>
      {/* Hero */}
      <div onClick={() => onSelect(hero)} style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden', marginBottom: 16,
        height: 400, cursor: 'pointer', background: '#1a1a24',
      }}>
        <img src={hero.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} onError={e => e.target.style.display = 'none'} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 40%, transparent)' }} />
        {hero.readerCount && (
          <div style={{ position: 'absolute', top: 14, right: 14 }}>
            <PopularityBadge score={hero.trendScore} count={hero.readerCount} large />
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, padding: 24 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <SourceBadge source={hero.source} color={hero.sourceColor} />
            {hero.isPlus && <PlusBadge />}
          </div>
          <h2 style={{ color: '#fff', fontSize: 26, fontWeight: 700, margin: '0 0 8px', lineHeight: 1.3 }}>{hero.title}</h2>
          <p style={{ color: '#aaa', fontSize: 14, margin: '0 0 6px' }}>{hero.description}</p>
          <TimeStamp date={hero.pubDate} />
        </div>
      </div>

      {/* Medium cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
        {medium.map(a => <ArticleCard key={a.id} article={a} onSelect={onSelect} size="medium" />)}
      </div>

      {/* Small cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {small.map(a => <ArticleCard key={a.id} article={a} onSelect={onSelect} size="small" />)}
      </div>
    </>
  );
}

function ArticleCard({ article: a, onSelect, size }) {
  const imgHeight = size === 'medium' ? 140 : 100;
  const showDesc = size === 'medium' && a.description && a.description.length > 20;
  return (
    <div onClick={() => onSelect(a)} style={{
      borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
      background: '#13131a', border: '1px solid #1e1e2e',
      transition: 'transform 0.2s, border-color 0.2s',
      display: 'flex', flexDirection: 'column',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#333'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.borderColor = '#1e1e2e'; }}
    >
      <div style={{ position: 'relative', height: imgHeight, flexShrink: 0, background: '#1a1a24' }}>
        <img src={a.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} onError={e => e.target.style.display = 'none'} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,13,20,0.85) 0%, transparent 55%)' }} />
        {a.readerCount && (
          <div style={{ position: 'absolute', top: 8, right: 8 }}>
            <PopularityBadge score={a.trendScore} count={a.readerCount} />
          </div>
        )}
      </div>
      <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <SourceBadge source={a.source} color={a.sourceColor} />
          {a.isPlus && <PlusBadge />}
        </div>
        <p style={{ color: '#fff', fontSize: size === 'medium' ? 14 : 13, fontWeight: 600, margin: 0, lineHeight: 1.35 }}>
          {a.title.length > 80 ? a.title.slice(0, 77) + '...' : a.title}
        </p>
        {showDesc && (
          <p style={{
            color: '#777', fontSize: 12, margin: 0, lineHeight: 1.45,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {a.description}
          </p>
        )}
        <TimeStamp date={a.pubDate} />
      </div>
    </div>
  );
}

// ── Article panel ─────────────────────────────────────────────────────────────

function ArticlePanel({ article, onClose, onRead }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const openedAt = useRef(Date.now());
  const PROXY_URL = import.meta.env.VITE_PROXY_URL;

  // Track read time on unmount
  useEffect(() => {
    return () => {
      const seconds = (Date.now() - openedAt.current) / 1000;
      onRead?.(article, seconds);
    };
  }, []);

  useEffect(() => {
    if (!article.link || article.link === '#' || !PROXY_URL) {
      setLoading(false); setError(true); return;
    }
    setLoading(true); setError(false);
    fetch(`${PROXY_URL}/?url=${encodeURIComponent(article.link)}`)
      .then(r => r.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        ['script','style','nav','header','footer','aside','.ad','.ads',
         '.advertisement','[class*="cookie"]','[class*="paywall"]',
         '[class*="subscribe"]','[id*="cookie"]','[id*="paywall"]',
         'figure > figcaption'].forEach(sel => {
          doc.querySelectorAll(sel).forEach(el => el.remove());
        });
        const selectors = [
          // TV2
          '.articlebody', '[class*="articlebody"]', '.bodytext',
          // NRK
          '[class*="article-body"]', '[class*="lp_articlebody"]',
          // Generiske
          '[class*="articleBody"]', '[class*="article__body"]',
          '[class*="story-body"]', '[class*="content-body"]',
          '[itemprop="articleBody"]', 'article',
          '.entry-content', '#article-content',
          // Siste utvei
          'main',
        ];
        let mainEl = null;
        for (const sel of selectors) {
          const candidate = doc.querySelector(sel);
          if (candidate && candidate.textContent.trim().length > 200) {
            mainEl = candidate;
            break;
          }
        }
        // Hent p/h2/h3/blockquote, men filtrer ut navigasjons-tekst og kortklipp
        const text = mainEl
          ? Array.from(mainEl.querySelectorAll('p, h2, h3, blockquote'))
              .map(el => ({ tag: el.tagName.toLowerCase(), text: el.textContent.trim() }))
              .filter(el => el.text.length > 25 && el.text.length < 2000)
          : [];
        setContent(text.length > 0 ? text : null);
        setLoading(false);
      })
      .catch(() => { setLoading(false); setError(true); });
  }, [article.link]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex' }} onClick={onClose}>
      <div style={{ width: 700, marginLeft: 'auto', height: '100vh', background: '#13131a', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #2a2a3a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <a href={article.link} target="_blank" rel="noreferrer" style={{ background: '#d4202a', color: '#fff', textDecoration: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600 }}>
            Les på {article.source} ↗
          </a>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#999', fontSize: 22, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <SourceBadge source={article.source} color={article.sourceColor} />
              {article.isPlus && <PlusBadge />}
            </div>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.3 }}>{article.title}</h1>
            {article.readerCount && (
              <div style={{ marginBottom: 12 }}>
                <PopularityBadge score={article.trendScore} count={article.readerCount} large />
              </div>
            )}
            {article.description && (
              <p style={{ color: '#aaa', fontSize: 15, margin: '0 0 16px', lineHeight: 1.6, borderLeft: '3px solid #d4202a', paddingLeft: 14 }}>
                {article.description}
              </p>
            )}
            {article.image && (
              <img src={article.image} alt="" style={{ width: '100%', borderRadius: 10, marginBottom: 8, maxHeight: 300, objectFit: 'cover' }} />
            )}
            <TimeStamp date={article.pubDate} />
          </div>
          <div style={{ borderTop: '1px solid #2a2a3a', paddingTop: 24 }}>
            {loading && (
              <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                <div style={{ fontSize: 28, marginBottom: 10 }}>📡</div>
                Henter artikkel...
              </div>
            )}
            {!loading && content && content.map((el, i) => {
              if (el.tag === 'h2' || el.tag === 'h3')
                return <h3 key={i} style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: '24px 0 8px' }}>{el.text}</h3>;
              if (el.tag === 'blockquote')
                return <blockquote key={i} style={{ color: '#aaa', borderLeft: '3px solid #d4202a', paddingLeft: 16, margin: '16px 0', fontStyle: 'italic' }}>{el.text}</blockquote>;
              return <p key={i} style={{ color: '#ccc', fontSize: 15, lineHeight: 1.8, margin: '0 0 16px' }}>{el.text}</p>;
            })}
            {!loading && (error || !content) && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 42, marginBottom: 16 }}>🔒</div>
                <h3 style={{ color: '#fff', marginBottom: 8 }}>Artikkelen er ikke tilgjengelig her</h3>
                <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
                  {article.isPlus ? 'Dette er en plusartikkel — du må lese den på avisens nettside.' : 'Innholdet kunne ikke hentes. Åpne artikkelen direkte.'}
                </p>
                <a href={article.link} target="_blank" rel="noreferrer" style={{ background: '#d4202a', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 14, fontWeight: 600 }}>
                  Les på {article.source} ↗
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profile modal ─────────────────────────────────────────────────────────────

function ProfileModal({ user, stats, history, onClose }) {
  const lvlColor = LEVEL_COLORS[stats.level] || '#6b7280';
  const initial = (user?.username || user?.email || 'U')[0].toUpperCase();
  const recent = history.slice(0, 10);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ width: 600, maxHeight: '88vh', background: '#13131a', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #2a2a3a' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ background: `linear-gradient(135deg, #1a1a2e, ${lvlColor}22)`, padding: '24px 28px', borderBottom: '1px solid #2a2a3a', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <AvatarCircle initial={initial} lvlColor={lvlColor} size={64} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>
                  {user?.username || user?.email?.split('@')[0] || 'Leser'}
                </div>
                <div style={{ fontSize: 13, color: lvlColor, fontWeight: 600, marginTop: 2 }}>{stats.level}</div>
                <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{stats.totalRead} artikler lest totalt</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', fontSize: 22, cursor: 'pointer' }}>✕</button>
          </div>

          {/* Level bar */}
          {stats.nextLevel && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 6 }}>
                <span>Score: <strong style={{ color: lvlColor }}>{stats.score}</strong></span>
                <span>Neste nivå: {stats.nextLevel} ({stats.levelPct}%)</span>
              </div>
              <div style={{ background: '#1e1e2e', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{ width: `${stats.levelPct}%`, height: '100%', background: `linear-gradient(90deg, ${lvlColor}, ${lvlColor}88)`, borderRadius: 6, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

          {/* Quick stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 24 }}>
            {[
              { label: 'Totalt lest', value: stats.totalRead, icon: '📚' },
              { label: 'Denne uken', value: stats.weekCount, icon: '📅' },
              { label: 'Snitt lesetid', value: stats.avgReadTime ? formatTime(stats.avgReadTime) : '–', icon: '⏱' },
              { label: 'Lesedager', value: stats.streak, icon: '🔥' },
            ].map(s => (
              <div key={s.label} style={{ background: '#0d0d14', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#555' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Category breakdown */}
          {stats.topCategories.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📊 Leservaner per kategori</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.topCategories.map(c => (
                  <div key={c.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: '#ccc', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{CAT_ICONS[c.id] || '📰'}</span> {c.label}
                      </span>
                      <span style={{ fontSize: 12, color: '#666' }}>{c.count} artikler ({c.pct}%)</span>
                    </div>
                    <div style={{ background: '#1e1e2e', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${c.pct}%`, height: '100%', background: 'linear-gradient(90deg, #d4202a, #ff6b35)', borderRadius: 6 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top sources */}
          {stats.topSources.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📰 Favorittkildene dine</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {stats.topSources.map((s, i) => (
                  <div key={s.name} style={{
                    background: i === 0 ? '#d4202a22' : '#1a1a24',
                    border: `1px solid ${i === 0 ? '#d4202a55' : '#2a2a3a'}`,
                    borderRadius: 10, padding: '10px 16px', textAlign: 'center',
                  }}>
                    <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{s.count} artikler</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent reads */}
          {recent.length > 0 && (
            <div>
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 14 }}>🕐 Nylig lest</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recent.map(e => (
                  <div key={e.articleId} style={{ display: 'flex', gap: 10, background: '#0d0d14', borderRadius: 10, padding: '10px 12px', alignItems: 'center' }}>
                    <div style={{ width: 40, height: 36, borderRadius: 6, overflow: 'hidden', background: '#1a1a24', flexShrink: 0 }}>
                      {e.image && <img src={e.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={ev => ev.target.style.display='none'} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        color: '#ccc', fontSize: 12, fontWeight: 600, margin: 0, lineHeight: 1.3,
                        overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                      }}>{e.title}</p>
                      <span style={{ fontSize: 11, color: '#555' }}>
                        {e.source} · {e.readTimeSeconds > 5 ? formatTime(e.readTimeSeconds) + ' lest' : 'åpnet'}
                        {' · '}{new Date(e.timestamp).toLocaleDateString('no', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, background: '#1a1a24', borderRadius: 6, padding: '2px 7px', color: '#666', flexShrink: 0 }}>
                      {CAT_ICONS[e.category] || '📰'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.totalRead === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#555' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📖</div>
              <p style={{ fontSize: 14 }}>Du har ikke lest noen artikler ennå.<br />Start å lese for å bygge din leserprofil!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small components ───────────────────────────────────────────────────────────

function SourceBadge({ source, color }) {
  return (
    <span style={{ background: color, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
      {source}
    </span>
  );
}

function PlusBadge() {
  return (
    <span style={{ background: '#c9a227', color: '#000', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4, marginLeft: 4 }}>
      PLUSS
    </span>
  );
}

function PopularityBadge({ score, count, large }) {
  if (!count) return null;
  const formatted = count >= 1000 ? (count / 1000).toFixed(1).replace('.', ',') + 'k' : count;
  const hot = score >= 65;
  const icon = hot ? '🔥' : '👁';
  const bg = hot ? 'rgba(255,80,20,0.82)' : 'rgba(30,30,46,0.82)';
  const textColor = hot ? '#fff' : '#aaa';
  const sz = large ? 13 : 11;
  return (
    <span style={{
      background: bg, color: textColor, fontSize: sz, fontWeight: 700,
      padding: large ? '4px 10px' : '3px 7px', borderRadius: 20,
      display: 'inline-flex', alignItems: 'center', gap: 4,
      backdropFilter: 'blur(4px)', whiteSpace: 'nowrap',
      border: hot ? '1px solid rgba(255,100,30,0.5)' : '1px solid rgba(255,255,255,0.08)',
    }}>
      {icon} {formatted}
    </span>
  );
}

function TimeStamp({ date }) {
  if (!date) return null;
  const diff = Math.floor((Date.now() - date) / 60000);
  const label = diff < 1 ? 'Nå' : diff < 60 ? `${diff}m` : diff < 1440 ? `${Math.floor(diff / 60)}t` : `${Math.floor(diff / 1440)}d`;
  return <span style={{ color: '#555', fontSize: 11, marginTop: 4, display: 'block' }}>{label} siden</span>;
}

export default function App() {
  return (
    <AuthProvider>
      <NewsApp />
    </AuthProvider>
  );
}
