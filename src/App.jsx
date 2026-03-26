import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AuthProvider, useAuth } from './auth.jsx';
import LoginPage from './LoginPage.jsx';
import AdminPanel from './AdminPanel.jsx';
import { useNews } from './useNews.js';
import { DEFAULT_SOURCES, INTERNATIONAL_SOURCES, CATEGORIES, WORLD_REGIONS, CATEGORY_EMOJIS } from './sources.js';
import { ThemeProvider, useTheme } from './ThemeContext.jsx';
import { StatsProvider, useStats, getReadingLevel } from './StatsContext.jsx';

// ─── WPM Toast ───────────────────────────────────────────────────────────────
function WpmToast({ result, onDone }) {
  const { theme: t } = useTheme();
  const level = getReadingLevel(result.wpm);
  useEffect(() => {
    const timer = setTimeout(onDone, 4000);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
      background: t.surface, border: `1px solid ${t.border}`,
      borderRadius: 16, padding: '14px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      display: 'flex', flexDirection: 'column', gap: 6, minWidth: 220,
      animation: 'slideIn 0.3s ease',
    }}>
      <div style={{ fontSize: 12, color: t.textMuted }}>Lesing fullført</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{level.icon}</span>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: level.color }}>
            {result.wpm > 0 ? `${result.wpm} ord/min` : `${result.seconds}s lest`}
          </div>
          <div style={{ fontSize: 12, color: t.textSec }}>{level.label} · Scrollet {Math.round(result.scrollDepth * 100)}%</div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat Bar ────────────────────────────────────────────────────────────────
function StatBar({ label, value, max, color, t }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: t.textSec, marginBottom: 3 }}>
        <span>{label}</span><span style={{ fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 5, background: t.surface3, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

// ─── Mini WPM Sparkline ──────────────────────────────────────────────────────
function WpmSparkline({ sessions, t }) {
  if (sessions.length < 2) return null;
  const max = Math.max(...sessions.map(s => s.wpm), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 28, marginTop: 6 }}>
      {sessions.map((s, i) => {
        const h = Math.max(4, Math.round((s.wpm / max) * 28));
        const level = getReadingLevel(s.wpm);
        return (
          <div key={i} title={`${s.wpm} ord/min`}
            style={{ flex: 1, height: h, background: level.color, borderRadius: 2, opacity: 0.7 + (i / sessions.length) * 0.3 }} />
        );
      })}
    </div>
  );
}

// ─── Stats Sidebar ───────────────────────────────────────────────────────────
function StatsSidebar({ t, avatar, onAvatarChange }) {
  const { stats, topCategories, topRegions, totalReadingMinutes, todayArticles, resetStats,
          averageWpm, recentWpm, recentSessions, wpmTrend, readingLevel } = useStats();

  const catMax = topCategories[0]?.[1] || 1;
  const regMax = topRegions[0]?.[1] || 1;
  const CAT_LABELS = { innenriks: 'Innenriks', utenriks: 'Utenriks', sport: 'Sport', okonomi: 'Økonomi', teknologi: 'Teknologi', helse: 'Helse', kultur: 'Kultur', klima: 'Klima', politikk: 'Politikk', krig: 'Krig' };
  const REG_LABELS = { europa: 'Europa', nord_amerika: 'N-Amerika', asia: 'Asia', midtosten: 'Midtøsten', africa: 'Afrika', latin_amerika: 'L-Amerika', global: 'Globalt' };
  const COLORS = ['#d4202a', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];
  const fileRef = useRef(null);

  function handleAvatarClick() { fileRef.current?.click(); }
  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { onAvatarChange(ev.target.result); };
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Profile card */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16, boxShadow: t.cardShadow, textAlign: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 10 }}>
          <div onClick={handleAvatarClick} style={{
            width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer',
            background: t.surface3, border: `3px solid ${t.accent}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative',
          }}>
            {avatar
              ? <img src={avatar} alt="Profilbilde" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 28 }}>👤</span>}
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', opacity: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, borderRadius: '50%',
              transition: 'opacity 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.opacity = 1}
              onMouseLeave={e => e.currentTarget.style.opacity = 0}>
              📷
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Vegard</div>
        <div style={{ fontSize: 11, color: t.textMuted, marginBottom: 10 }}>Norsk Puls leser</div>

        {/* Reading level badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: t.surface2, border: `1px solid ${readingLevel.color}`, borderRadius: 20, padding: '4px 10px' }}>
          <span>{readingLevel.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: readingLevel.color }}>{readingLevel.label}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
          {[
            { label: '🏆 Poeng', value: (stats.points || 0).toLocaleString('no') },
            { label: '🔥 Streak', value: `${stats.streak || 0} dager` },
            { label: '📰 I dag', value: `${todayArticles} art.` },
            { label: '⏱️ Lesetid', value: `${totalReadingMinutes} min` },
          ].map(item => (
            <div key={item.label} style={{ background: t.surface2, borderRadius: 8, padding: '7px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: t.text }}>{item.value}</div>
              <div style={{ fontSize: 10, color: t.textMuted }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reading speed */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16, boxShadow: t.cardShadow }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>Lesehastighet</div>
        {averageWpm === 0 ? (
          <div style={{ fontSize: 12, color: t.textMuted, textAlign: 'center', padding: '8px 0' }}>
            Les noen artikler for å se statistikk 📖
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 900, color: readingLevel.color }}>{recentWpm || averageWpm}</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>ord/min (snitt)</div>
              </div>
              {wpmTrend !== 0 && (
                <div style={{ fontSize: 13, fontWeight: 700, color: wpmTrend > 0 ? '#22c55e' : '#ef4444', textAlign: 'right' }}>
                  {wpmTrend > 0 ? '↑' : '↓'} {Math.abs(wpmTrend)}%
                  <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 400 }}>vs. forrige</div>
                </div>
              )}
            </div>
            <WpmSparkline sessions={recentSessions} t={t} />
            <div style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>
              {recentSessions.length} lesesesjoner registrert
            </div>

            {/* Level progress bar */}
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: t.textMuted, marginBottom: 3 }}>
                <span>{readingLevel.label}</span>
                <span>Neste nivå: {readingLevel.max} ord/min</span>
              </div>
              <div style={{ height: 5, background: t.surface3, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3, background: readingLevel.color,
                  width: `${Math.min(100, ((recentWpm - readingLevel.min) / (readingLevel.max - readingLevel.min)) * 100)}%`,
                  transition: 'width 0.5s',
                }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Top categories */}
      {topCategories.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16, boxShadow: t.cardShadow }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>Dine interesser</div>
          {topCategories.map(([cat, count], i) => (
            <StatBar key={cat} label={`${CATEGORY_EMOJIS[cat] || ''} ${CAT_LABELS[cat] || cat}`} value={count} max={catMax} color={COLORS[i % COLORS.length]} t={t} />
          ))}
        </div>
      )}

      {/* Top regions */}
      {topRegions.length > 0 && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 16, boxShadow: t.cardShadow }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' }}>Verdensregioner</div>
          {topRegions.map(([reg, count], i) => (
            <StatBar key={reg} label={REG_LABELS[reg] || reg} value={count} max={regMax} color={COLORS[i % COLORS.length]} t={t} />
          ))}
        </div>
      )}

      <button onClick={resetStats} style={{
        fontSize: 11, color: t.textMuted, background: 'none',
        border: `1px solid ${t.border}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
      }}>
        Nullstill statistikk
      </button>
    </div>
  );
}

// ─── Article Card ────────────────────────────────────────────────────────────
function ArticleCard({ article, size = 'small', onClick, t }) {
  const isHero = size === 'hero';
  const isMedium = size === 'medium';

  const timeAgo = (() => {
    const h = Math.floor((Date.now() - article.pubDate) / 3600000);
    if (h < 1) return 'Nå';
    if (h < 24) return `${h}t`;
    return `${Math.floor(h / 24)}d`;
  })();

  const meta = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: article.sourceColor }}>{article.source}</span>
      <span style={{ fontSize: 11, color: t.textMuted }}>·</span>
      <span style={{ fontSize: 11, color: t.textMuted }}>{timeAgo}</span>
      <span style={{ fontSize: 11, color: t.textMuted }}>·</span>
      <span style={{ fontSize: 11, color: t.textMuted }}>~{article.readingTime} min</span>
      {article.isPlus && !isHero && !isMedium && (
        <span style={{ background: '#d97706', color: '#fff', fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 3 }}>PLUSS</span>
      )}
      {article.isInternational && !isHero && !isMedium && (
        <span style={{ background: '#2563eb', color: '#fff', fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3 }}>WORLD</span>
      )}
    </div>
  );

  if (isHero || isMedium) {
    return (
      <div onClick={() => onClick(article)} style={{
        background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14,
        overflow: 'hidden', cursor: 'pointer', boxShadow: t.cardShadow,
        display: 'flex', flexDirection: 'column',
        height: isHero ? 340 : 290,
        transition: 'transform 0.15s, box-shadow 0.15s',
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.18)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = t.cardShadow; }}>
        {/* Image */}
        <div style={{ position: 'relative', height: isHero ? 190 : 150, overflow: 'hidden', flexShrink: 0 }}>
          <img src={article.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)' }} />
          {article.isPlus && (
            <div style={{ position: 'absolute', top: 10, right: 10, background: '#d97706', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>PLUSS</div>
          )}
          {article.isInternational && (
            <div style={{ position: 'absolute', top: 10, left: 10, background: '#2563eb', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>WORLD</div>
          )}
          <div style={{ position: 'absolute', bottom: 10, left: 12, background: article.sourceColor, color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>
            {article.source}
          </div>
        </div>
        {/* Text */}
        <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {meta}
          <div style={{ fontSize: isHero ? 17 : 15, fontWeight: 700, color: t.text, lineHeight: 1.3, flex: 1 }}>
            {article.title}
          </div>
          {article.description && (
            <div style={{ fontSize: 13, color: t.textSec, lineHeight: 1.45, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {article.description}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Small card with thumbnail
  return (
    <div onClick={() => onClick(article)} style={{
      background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12,
      overflow: 'hidden', cursor: 'pointer', boxShadow: t.cardShadow,
      display: 'flex', flexDirection: 'row', alignItems: 'stretch',
      transition: 'transform 0.12s, box-shadow 0.12s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.14)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = t.cardShadow; }}>
      {/* Thumbnail */}
      <div style={{ width: 90, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
        <img src={article.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
          background: article.sourceColor,
        }} />
      </div>
      {/* Text */}
      <div style={{ padding: '10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
        {meta}
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {article.title}
        </div>
      </div>
    </div>
  );
}

// ─── Fetch full article content via proxy ────────────────────────────────────
const PROXY_URL = import.meta.env.VITE_PROXY_URL;

async function fetchFullContent(link) {
  if (!link || link === '#' || !PROXY_URL) return null;
  try {
    const url = `${PROXY_URL}/?url=${encodeURIComponent(link)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(7000) });
    if (!res.ok) return null;
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove noise elements
    ['script','style','nav','header','footer','aside','figure','figcaption',
     'iframe','form','button','.ad','[class*="banner"]','[class*="promo"]',
     '[class*="related"]','[class*="recommended"]'].forEach(sel => {
      try { doc.querySelectorAll(sel).forEach(el => el.remove()); } catch {}
    });

    // Try to find the main article container
    const contentSelectors = [
      'article', '[class*="article-body"]', '[class*="article-content"]',
      '[class*="story-body"]', '[class*="post-content"]', '[class*="entry-content"]',
      '[itemprop="articleBody"]', 'main', '.content', '#content',
    ];
    let container = null;
    for (const sel of contentSelectors) {
      try {
        container = doc.querySelector(sel);
        if (container) break;
      } catch {}
    }
    if (!container) container = doc.body;

    // Extract paragraphs with real content
    const paragraphs = Array.from(container.querySelectorAll('p, h2, h3, blockquote'))
      .map(el => ({ tag: el.tagName.toLowerCase(), text: el.textContent.trim() }))
      .filter(({ text }) => text.length > 40);

    if (paragraphs.length < 2) return null;
    return paragraphs;
  } catch {
    return null;
  }
}

// ─── Article Panel ───────────────────────────────────────────────────────────
function ArticlePanel({ article, onClose, t }) {
  const { trackArticleClose } = useStats();
  const scrollRef = useRef(null);
  const maxScrollRef = useRef(0);
  const [fullContent, setFullContent] = useState(null);   // null = loading, [] = failed
  const [fetchStatus, setFetchStatus] = useState('loading'); // loading | ok | blocked | error

  const visibleWords = useMemo(() => {
    if (!article) return 0;
    const baseWords = (article.title + ' ' + (article.description || '')).split(/\s+/).length;
    const extraWords = fullContent ? fullContent.reduce((s, p) => s + p.text.split(/\s+/).length, 0) : 0;
    return baseWords + extraWords;
  }, [article, fullContent]);

  useEffect(() => {
    if (!article) return;
    setFullContent(null);
    setFetchStatus('loading');
    fetchFullContent(article.link).then(content => {
      if (content && content.length > 0) {
        setFullContent(content);
        setFetchStatus('ok');
      } else if (article.link === '#') {
        setFetchStatus('mock');
      } else {
        setFetchStatus('blocked');
        setFullContent([]);
      }
    });
  }, [article?.id]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
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
    loading: { icon: '⏳', text: 'Henter artikkelinnhold...', color: t.textMuted },
    ok:      { icon: '✅', text: 'Full artikkel lastet', color: '#22c55e' },
    blocked: { icon: '🔒', text: 'Avisen blokkerer direkte visning', color: '#f59e0b' },
    mock:    { icon: '📋', text: 'Eksempelartikkel (ingen proxy-URL)', color: t.textMuted },
    error:   { icon: '⚠️', text: 'Kunne ikke laste innhold', color: '#ef4444' },
  }[fetchStatus] || {};

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }}>
      <div onClick={handleClose} style={{ flex: 1, background: 'rgba(0,0,0,0.55)', cursor: 'pointer', backdropFilter: 'blur(2px)' }} />
      <div ref={scrollRef} onScroll={handleScroll} style={{
        width: '46%', minWidth: 380, maxWidth: 680,
        background: t.surface, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 40px rgba(0,0,0,0.3)',
      }}>
        {/* Panel header */}
        <div style={{ position: 'sticky', top: 0, background: t.surface, borderBottom: `1px solid ${t.border}`, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: article.sourceColor }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: article.sourceColor }}>{article.source}</span>
            <span style={{ fontSize: 12, color: t.textMuted }}>· ~{article.readingTime} min</span>
            <span style={{ fontSize: 11, color: statusInfo.color }} title={statusInfo.text}>{statusInfo.icon}</span>
          </div>
          <button onClick={handleClose} style={{
            background: t.surface2, border: 'none', color: t.textSec,
            width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Image */}
        <div style={{ position: 'relative' }}>
          <img src={article.image} alt="" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
          {article.isPlus && (
            <div style={{ position: 'absolute', top: 14, right: 14, background: '#d97706', color: '#fff', fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 5 }}>PLUSS</div>
          )}
          {article.isInternational && article.region && (
            <div style={{ position: 'absolute', bottom: 14, left: 14, background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 11, padding: '3px 9px', borderRadius: 5 }}>
              {WORLD_REGIONS.find(r => r.id === article.region)?.label || '🌐 Globalt'}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '24px 24px 16px' }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {CATEGORIES.find(c => c.id === article.category) && (
              <span style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color: t.textSec }}>
                {CATEGORY_EMOJIS[article.category]} {CATEGORIES.find(c => c.id === article.category)?.label}
              </span>
            )}
            <span style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color: t.textSec }}>
              ~{article.readingTime} min
            </span>
            <span style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, color: t.textMuted }}>
              {new Date(article.pubDate).toLocaleDateString('no', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <h2 style={{ color: t.text, fontSize: 22, lineHeight: 1.3, marginBottom: 16, fontWeight: 800 }}>
            {article.title}
          </h2>

          {/* Ingress / description — always shown */}
          <p style={{ color: t.text, fontSize: 16, lineHeight: 1.75, fontWeight: 500, marginBottom: 20, borderLeft: `3px solid ${article.sourceColor}`, paddingLeft: 14 }}>
            {article.description}
          </p>

          {/* Loading state */}
          {fetchStatus === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: t.textMuted, fontSize: 13, padding: '12px 0', marginBottom: 16 }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
              Henter resten av artikkelen...
            </div>
          )}

          {/* Full content paragraphs */}
          {fullContent && fullContent.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              {fullContent.map((p, i) => {
                if (p.tag === 'h2' || p.tag === 'h3') {
                  return <h3 key={i} style={{ color: t.text, fontSize: 17, fontWeight: 700, marginBottom: 10, marginTop: 24, lineHeight: 1.3 }}>{p.text}</h3>;
                }
                if (p.tag === 'blockquote') {
                  return <blockquote key={i} style={{ borderLeft: `3px solid ${t.border}`, paddingLeft: 14, color: t.textSec, fontStyle: 'italic', margin: '16px 0', fontSize: 15, lineHeight: 1.7 }}>{p.text}</blockquote>;
                }
                return <p key={i} style={{ color: t.textSec, fontSize: 15, lineHeight: 1.75, marginBottom: 16 }}>{p.text}</p>;
              })}
            </div>
          )}

          {/* Blocked / failed notice + link */}
          {(fetchStatus === 'blocked' || fetchStatus === 'error') && (
            <div style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: t.textSec, marginBottom: 4 }}>
                🔒 <strong>{article.source}</strong> tillater ikke visning av hele artikkelen her.
              </div>
              <div style={{ fontSize: 12, color: t.textMuted }}>
                Noen aviser krever at du besøker nettsiden direkte.
              </div>
            </div>
          )}

          <a href={article.link} target="_blank" rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: t.accent, color: '#fff', padding: '11px 22px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
            {fetchStatus === 'ok' ? 'Se original artikkel →' : 'Les hos ' + article.source + ' →'}
          </a>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 24px 32px', marginTop: 'auto' }}>
          <div style={{ borderTop: `1px solid ${t.border}`, paddingTop: 16 }}>
            <p style={{ color: t.textMuted, fontSize: 12, lineHeight: 1.5 }}>
              📊 Vi tracker lesetid og scrolldybde for å gi deg bedre anbefalinger.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── News Feed Grid ──────────────────────────────────────────────────────────
function NewsFeed({ articles, loading, t, onToast }) {
  const [selectedArticle, setSelectedArticle] = useState(null);
  const { trackArticleOpen } = useStats();

  function handleOpen(article) {
    trackArticleOpen(article);
    setSelectedArticle(article);
  }

  function handleClose(wpmResult) {
    setSelectedArticle(null);
    if (wpmResult && wpmResult.seconds >= 5) {
      onToast(wpmResult);
    }
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

  const hero = articles[0];
  const mediums = articles.slice(1, 3);
  const smalls = articles.slice(3);

  return (
    <>
      {selectedArticle && (
        <ArticlePanel article={selectedArticle} onClose={handleClose} t={t} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {hero && <ArticleCard article={hero} size="hero" onClick={handleOpen} t={t} />}
        {mediums.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {mediums.map(a => <ArticleCard key={a.id} article={a} size="medium" onClick={handleOpen} t={t} />)}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {smalls.map(a => <ArticleCard key={a.id} article={a} size="small" onClick={handleOpen} t={t} />)}
        </div>
      </div>
    </>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
function NewsApp() {
  const { user, logout } = useAuth();
  const { theme: t, isDark, toggleTheme } = useTheme();
  const { stats, categoryPrefs, regionPrefs } = useStats();

  const [activeTab, setActiveTab] = useState('news');
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeRegion, setActiveRegion] = useState('all');
  const [activeIntlSources, setActiveIntlSources] = useState([]);
  const [interests, setInterests] = useState(() => {
    const s = localStorage.getItem('np_interests');
    return s ? JSON.parse(s) : [];
  });
  const [sources, setSources] = useState(() => {
    const s = localStorage.getItem('np_sources');
    return s ? JSON.parse(s) : DEFAULT_SOURCES;
  });
  const [showAdmin, setShowAdmin] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [toastResult, setToastResult] = useState(null);
  const [avatar, setAvatar] = useState(() => localStorage.getItem('np_avatar') || '');

  const allSources = useMemo(() => [...sources, ...INTERNATIONAL_SOURCES], [sources]);
  const { articles, loading, lastUpdated, refresh } = useNews(allSources);

  const norskArticles = useMemo(() => articles.filter(a => !a.isInternational), [articles]);
  const intlArticles  = useMemo(() => articles.filter(a => a.isInternational), [articles]);

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

  function handleAvatarChange(dataUrl) {
    setAvatar(dataUrl);
    localStorage.setItem('np_avatar', dataUrl);
  }

  function showToast(result) {
    setToastResult(result);
  }

  // Trending
  const trending = useMemo(() => {
    const count = {};
    norskArticles.forEach(a => { count[a.category] = (count[a.category] || 0) + 1; });
    return Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([id, cnt]) => ({ id, count: cnt, label: CATEGORIES.find(c => c.id === id)?.label || id }));
  }, [norskArticles]);

  // Filtered + personalized Norwegian
  const filteredNorsk = useMemo(() => {
    let list = activeCategory ? norskArticles.filter(a => a.category === activeCategory) : norskArticles;
    if (Object.keys(categoryPrefs).length > 0) {
      list = [...list].sort((a, b) => {
        const tA = (Date.now() - a.pubDate) / 3600000;
        const tB = (Date.now() - b.pubDate) / 3600000;
        return ((categoryPrefs[b.category] || 0) * 30 - tB * 0.4) - ((categoryPrefs[a.category] || 0) * 30 - tA * 0.4);
      });
    }
    return list;
  }, [norskArticles, activeCategory, categoryPrefs]);

  // Filtered + personalized international
  const filteredIntl = useMemo(() => {
    let list = intlArticles;
    if (activeRegion !== 'all') list = list.filter(a => a.region === activeRegion);
    if (activeIntlSources.length > 0) list = list.filter(a => activeIntlSources.includes(a.sourceId));
    if (Object.keys(regionPrefs).length > 0) {
      list = [...list].sort((a, b) => {
        const tA = (Date.now() - a.pubDate) / 3600000;
        const tB = (Date.now() - b.pubDate) / 3600000;
        return ((regionPrefs[b.region] || 0) * 30 - tB * 0.4) - ((regionPrefs[a.region] || 0) * 30 - tA * 0.4);
      });
    }
    return list;
  }, [intlArticles, activeRegion, activeIntlSources, regionPrefs]);

  const myArticles = useMemo(() => (
    interests.length === 0 ? [] : filteredNorsk.filter(a => interests.includes(a.category))
  ), [filteredNorsk, interests]);

  if (!user) return <LoginPage />;

  const tabs = [
    { id: 'news',      label: '🇳🇴 Norske nyheter' },
    { id: 'world',     label: '🌍 Verden' },
    { id: 'interests', label: '⭐ Mine interesser', badge: interests.length },
  ];

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: 'system-ui, -apple-system, sans-serif', color: t.text, transition: 'background 0.3s' }}>
      <style>{`@keyframes slideIn { from { transform: translateY(16px); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>

      {showAdmin && <AdminPanel sources={sources} onSave={saveSources} onClose={() => setShowAdmin(false)} />}
      {toastResult && <WpmToast result={toastResult} onDone={() => setToastResult(null)} />}

      {/* ── Header ── */}
      <header style={{ background: t.headerBg, borderBottom: `1px solid ${t.border}`, position: 'sticky', top: 0, zIndex: 100, boxShadow: isDark ? 'none' : '0 1px 8px rgba(0,0,0,0.07)' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 56, gap: 14 }}>

          {/* Logo */}
          <div style={{ fontSize: 17, fontWeight: 900, color: t.text, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span style={{ color: t.accent }}>●</span> NORSK PULS
          </div>

          {/* Tabs */}
          <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                background: activeTab === tab.id ? t.surface2 : 'transparent',
                border: activeTab === tab.id ? `1px solid ${t.border}` : '1px solid transparent',
                color: activeTab === tab.id ? t.text : t.textSec,
                fontWeight: activeTab === tab.id ? 700 : 400,
                fontSize: 13, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
              }}>
                {tab.label}
                {tab.badge > 0 && (
                  <span style={{ background: t.accent, color: '#fff', borderRadius: 10, padding: '0px 5px', fontSize: 10 }}>{tab.badge}</span>
                )}
              </button>
            ))}
          </nav>

          {/* Right controls */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <div style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 20, padding: '4px 10px', fontSize: 12, fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: 4 }}>
              🏆 {(stats.points || 0).toLocaleString('no')}
            </div>
            {lastUpdated && (
              <span style={{ color: t.textMuted, fontSize: 11 }}>
                {lastUpdated.toLocaleTimeString('no', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {[
              { icon: '↺', action: refresh, title: 'Oppdater' },
              { icon: isDark ? '☀️' : '🌙', action: toggleTheme, title: 'Bytt tema' },
            ].map(btn => (
              <button key={btn.icon} onClick={btn.action} title={btn.title} style={{
                background: t.surface2, border: `1px solid ${t.border}`, color: t.textSec,
                borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{btn.icon}</button>
            ))}
            <button onClick={() => setShowStats(s => !s)} title="Statistikk" style={{
              background: showStats ? t.accent : t.surface2,
              border: `1px solid ${showStats ? t.accent : t.border}`,
              color: showStats ? '#fff' : t.textSec,
              borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>📊</button>
            <button onClick={() => setShowAdmin(true)} style={{ background: t.surface2, border: `1px solid ${t.border}`, color: t.textSec, borderRadius: 8, padding: '0 10px', height: 32, cursor: 'pointer', fontSize: 13 }}>Admin</button>

            {/* Avatar in header */}
            <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${t.accent}`, cursor: 'pointer', flexShrink: 0, background: t.surface3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => setShowStats(true)}>
              {avatar
                ? <img src={avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontSize: 14 }}>👤</span>}
            </div>

            <button onClick={logout} style={{ background: 'none', border: `1px solid ${t.border}`, color: t.textMuted, borderRadius: 8, padding: '0 10px', height: 32, cursor: 'pointer', fontSize: 13 }}>Logg ut</button>
          </div>
        </div>
      </header>

      {/* ── Trending bar ── */}
      {activeTab === 'news' && trending.length > 0 && (
        <div style={{ background: t.surface, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ maxWidth: 1300, margin: '0 auto', padding: '8px 20px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: t.accent, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>🔥 TRENDING</span>
            {trending.map(({ id, label, count }) => (
              <button key={id} onClick={() => setActiveCategory(activeCategory === id ? null : id)} style={{
                background: activeCategory === id ? t.accent : t.surface2,
                border: `1px solid ${activeCategory === id ? t.accent : t.border}`,
                color: activeCategory === id ? '#fff' : t.textSec,
                borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontSize: 12,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {CATEGORY_EMOJIS[id]} {label} <span style={{ fontSize: 10, opacity: 0.7 }}>{count}</span>
              </button>
            ))}
            {activeCategory && (
              <button onClick={() => setActiveCategory(null)} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 12 }}>× Fjern</button>
            )}
          </div>
        </div>
      )}

      {/* ── World filters ── */}
      {activeTab === 'world' && (
        <div style={{ background: t.surface, borderBottom: `1px solid ${t.border}` }}>
          <div style={{ maxWidth: 1300, margin: '0 auto', padding: '10px 20px' }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', minWidth: 52 }}>Region:</span>
              {WORLD_REGIONS.map(r => (
                <button key={r.id} onClick={() => setActiveRegion(r.id)} style={{
                  background: activeRegion === r.id ? '#2563eb' : t.surface2,
                  border: `1px solid ${activeRegion === r.id ? '#2563eb' : t.border}`,
                  color: activeRegion === r.id ? '#fff' : t.textSec,
                  borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontSize: 12,
                }}>{r.label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', minWidth: 52 }}>Avis:</span>
              {INTERNATIONAL_SOURCES.map(src => (
                <button key={src.id}
                  onClick={() => setActiveIntlSources(prev => prev.includes(src.id) ? prev.filter(s => s !== src.id) : [...prev, src.id])}
                  style={{
                    background: activeIntlSources.includes(src.id) ? src.color : t.surface2,
                    border: `1px solid ${activeIntlSources.includes(src.id) ? src.color : t.border}`,
                    color: activeIntlSources.includes(src.id) ? '#fff' : t.textSec,
                    borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontSize: 12,
                  }}>{src.name}</button>
              ))}
              {activeIntlSources.length > 0 && (
                <button onClick={() => setActiveIntlSources([])} style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer', fontSize: 12 }}>× Alle</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <main style={{ maxWidth: 1300, margin: '0 auto', padding: '20px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {showStats && <StatsSidebar t={t} avatar={avatar} onAvatarChange={handleAvatarChange} />}

        <div style={{ flex: 1, minWidth: 0 }}>
          {activeTab === 'news' && <NewsFeed articles={filteredNorsk} loading={loading} t={t} onToast={showToast} />}

          {activeTab === 'world' && (
            <>
              <div style={{ fontSize: 13, color: t.textSec, marginBottom: 14 }}>
                {filteredIntl.length} internasjonale nyheter
                {activeRegion !== 'all' && ` · ${WORLD_REGIONS.find(r => r.id === activeRegion)?.label}`}
              </div>
              <NewsFeed articles={filteredIntl} loading={loading} t={t} onToast={showToast} />
            </>
          )}

          {activeTab === 'interests' && (
            <div>
              <h2 style={{ color: t.text, fontSize: 18, marginBottom: 8 }}>Mine interesser</h2>
              <p style={{ color: t.textSec, fontSize: 13, marginBottom: 14 }}>Velg kategorier du vil følge:</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => toggleInterest(cat.id)} style={{
                    background: interests.includes(cat.id) ? t.accent : t.surface2,
                    border: `1px solid ${interests.includes(cat.id) ? t.accent : t.border}`,
                    color: interests.includes(cat.id) ? '#fff' : t.textSec,
                    borderRadius: 20, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
                    fontWeight: interests.includes(cat.id) ? 700 : 400,
                  }}>
                    {CATEGORY_EMOJIS[cat.id]} {cat.label}
                  </button>
                ))}
              </div>
              {interests.length === 0
                ? <div style={{ textAlign: 'center', padding: 40, color: t.textSec }}>Velg minst én kategori ovenfor for å se nyheter her.</div>
                : <NewsFeed articles={myArticles} loading={loading} t={t} onToast={showToast} />
              }
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────
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
