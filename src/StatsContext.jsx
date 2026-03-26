import { createContext, useContext, useState, useRef, useCallback } from 'react';

const StatsContext = createContext();

const DEFAULT_STATS = {
  points: 0,
  totalArticlesRead: 0,
  totalReadingSeconds: 0,
  streak: 0,
  lastReadDate: null,
  categoryClicks: {},
  regionClicks: {},
  sourceClicks: {},
  dailyArticles: {},
  pointsLog: [],
  readingSessions: [], // { date, title, wpm, wordsRead, timeSeconds, scrollDepth }
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getReadingLevel(wpm) {
  if (!wpm || wpm < 80)  return { label: 'Nybegynner', icon: '🐢', color: '#888', min: 0,   max: 150 };
  if (wpm < 150)          return { label: 'Leser',      icon: '📖', color: '#3b82f6', min: 80,  max: 150 };
  if (wpm < 250)          return { label: 'Rask',       icon: '📰', color: '#22c55e', min: 150, max: 250 };
  if (wpm < 400)          return { label: 'Dyktig',     icon: '⚡', color: '#f59e0b', min: 250, max: 400 };
  return                         { label: 'Speedleser', icon: '🚀', color: '#d4202a', min: 400, max: 600 };
}

export { getReadingLevel };

export function StatsProvider({ children }) {
  const [stats, setStats] = useState(() => {
    try {
      const saved = localStorage.getItem('np_stats');
      return saved ? { ...DEFAULT_STATS, ...JSON.parse(saved) } : DEFAULT_STATS;
    } catch { return DEFAULT_STATS; }
  });

  const activeArticleRef = useRef(null);
  const startTimeRef = useRef(null);

  const save = useCallback((updated) => {
    setStats(updated);
    localStorage.setItem('np_stats', JSON.stringify(updated));
  }, []);

  const addPoints = useCallback((amount, reason, currentStats) => {
    const log = [...(currentStats.pointsLog || []),
      { date: new Date().toISOString(), reason, amount }
    ].slice(-100);
    return { ...currentStats, points: (currentStats.points || 0) + amount, pointsLog: log };
  }, []);

  const trackArticleOpen = useCallback((article) => {
    activeArticleRef.current = article;
    startTimeRef.current = Date.now();

    setStats(prev => {
      let updated = { ...prev };

      // Category
      const catClicks = { ...prev.categoryClicks };
      catClicks[article.category] = (catClicks[article.category] || 0) + 1;
      updated.categoryClicks = catClicks;

      // Region
      if (article.region) {
        const regClicks = { ...prev.regionClicks };
        regClicks[article.region] = (regClicks[article.region] || 0) + 1;
        updated.regionClicks = regClicks;
      }

      // Source
      const srcClicks = { ...prev.sourceClicks };
      srcClicks[article.sourceId] = (srcClicks[article.sourceId] || 0) + 1;
      updated.sourceClicks = srcClicks;

      // Daily count
      const today = todayKey();
      const daily = { ...prev.dailyArticles };
      daily[today] = (daily[today] || 0) + 1;
      updated.dailyArticles = daily;
      updated.totalArticlesRead = (prev.totalArticlesRead || 0) + 1;

      // Streak
      const last = prev.lastReadDate;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = yesterday.toISOString().slice(0, 10);
      if (last !== today) {
        updated.streak = (last === yKey) ? (prev.streak || 0) + 1 : 1;
        updated.lastReadDate = today;
      }

      // Points for opening
      let pts = 5;
      if (article.isInternational) pts += 3;
      updated = addPoints(pts, `Åpnet artikkel`, updated);

      localStorage.setItem('np_stats', JSON.stringify(updated));
      return updated;
    });
  }, [addPoints]);

  // Returns WPM result for toast, or null if too brief
  const trackArticleClose = useCallback((scrollDepth = 0, visibleWords = 0) => {
    if (!startTimeRef.current) return null;
    const seconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const article = activeArticleRef.current;
    startTimeRef.current = null;
    activeArticleRef.current = null;

    if (seconds < 4) return null;

    // Words actually encountered based on scroll
    const wordsRead = Math.round(visibleWords * Math.min(1, scrollDepth + 0.15));
    const rawWpm = wordsRead > 5 && seconds > 0
      ? Math.round((wordsRead / seconds) * 60) : 0;
    const wpm = rawWpm > 0 ? Math.max(30, Math.min(900, rawWpm)) : 0;

    const session = {
      date: new Date().toISOString(),
      title: article?.title?.slice(0, 60) || '',
      wpm,
      wordsRead,
      timeSeconds: seconds,
      scrollDepth: Math.round(scrollDepth * 100) / 100,
    };

    setStats(prev => {
      const sessions = [...(prev.readingSessions || []), session].slice(-200);
      let updated = {
        ...prev,
        totalReadingSeconds: (prev.totalReadingSeconds || 0) + seconds,
        readingSessions: sessions,
      };

      // Points for reading time
      let pts = 0, reason = '';
      if (seconds >= 120) { pts = 20; reason = '2+ min lest'; }
      else if (seconds >= 60) { pts = 15; reason = '1+ min lest'; }
      else if (seconds >= 30) { pts = 10; reason = '30+ sek lest'; }
      else if (seconds >= 10) { pts = 5;  reason = '10+ sek lest'; }

      // Bonus for reading thoroughly
      if (scrollDepth >= 0.85) { pts += 8; reason += ' + fullført'; }
      else if (scrollDepth >= 0.5) { pts += 3; reason += ' + halvlest'; }

      // Speed reading bonus
      if (wpm >= 400) { pts += 10; reason += ' ⚡ hurtigleser!'; }
      else if (wpm >= 250) { pts += 5; reason += ' 📖 rask leser'; }

      if (pts > 0) updated = addPoints(pts, reason, updated);

      localStorage.setItem('np_stats', JSON.stringify(updated));
      return updated;
    });

    return seconds >= 4 ? { wpm, seconds, wordsRead, scrollDepth } : null;
  }, [addPoints]);

  const resetStats = useCallback(() => { save(DEFAULT_STATS); }, [save]);

  // ── Computed values ─────────────────────────────────────────────────────
  const topCategories = Object.entries(stats.categoryClicks || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 5);

  const topRegions = Object.entries(stats.regionClicks || {})
    .sort((a, b) => b[1] - a[1]).slice(0, 5);

  const todayArticles = stats.dailyArticles?.[todayKey()] || 0;
  const totalReadingMinutes = Math.floor((stats.totalReadingSeconds || 0) / 60);

  // WPM stats
  const allSessions = (stats.readingSessions || []).filter(s => s.wpm > 0);
  const averageWpm = allSessions.length > 0
    ? Math.round(allSessions.reduce((s, r) => s + r.wpm, 0) / allSessions.length) : 0;

  const recentSessions = allSessions.slice(-10);
  const recentWpm = recentSessions.length > 0
    ? Math.round(recentSessions.reduce((s, r) => s + r.wpm, 0) / recentSessions.length) : 0;

  // Trend: compare last 5 vs previous 5
  const wpmTrend = (() => {
    if (allSessions.length < 6) return 0;
    const last5 = allSessions.slice(-5).reduce((s, r) => s + r.wpm, 0) / 5;
    const prev5 = allSessions.slice(-10, -5).reduce((s, r) => s + r.wpm, 0) / Math.min(5, allSessions.length - 5);
    return prev5 > 0 ? Math.round(((last5 - prev5) / prev5) * 100) : 0;
  })();

  const readingLevel = getReadingLevel(recentWpm || averageWpm);

  // Personal preferences for personalization
  const categoryPrefs = (() => {
    const total = Object.values(stats.categoryClicks || {}).reduce((a, b) => a + b, 0) || 1;
    const p = {};
    Object.entries(stats.categoryClicks || {}).forEach(([k, v]) => { p[k] = v / total; });
    return p;
  })();

  const regionPrefs = (() => {
    const total = Object.values(stats.regionClicks || {}).reduce((a, b) => a + b, 0) || 1;
    const p = {};
    Object.entries(stats.regionClicks || {}).forEach(([k, v]) => { p[k] = v / total; });
    return p;
  })();

  return (
    <StatsContext.Provider value={{
      stats, topCategories, topRegions, todayArticles, totalReadingMinutes,
      categoryPrefs, regionPrefs,
      averageWpm, recentWpm, recentSessions, wpmTrend, readingLevel,
      trackArticleOpen, trackArticleClose, resetStats,
    }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  return useContext(StatsContext);
}
