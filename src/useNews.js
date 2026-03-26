import { useState, useEffect, useCallback } from 'react';
import { CATEGORIES, WORLD_REGIONS } from './sources.js';

const PROXY_URL = import.meta.env.VITE_PROXY_URL;

// SVG gradient fallbacks per category (used when RSS has no image)
const CATEGORY_GRADIENTS = {
  innenriks: ['#d4202a', '#8b1a1a'],
  utenriks: ['#1e3a5f', '#3b82f6'],
  sport: ['#16a34a', '#22c55e'],
  okonomi: ['#b45309', '#f59e0b'],
  teknologi: ['#7c3aed', '#8b5cf6'],
  helse: ['#dc2626', '#f87171'],
  kultur: ['#9333ea', '#c084fc'],
  klima: ['#047857', '#34d399'],
  politikk: ['#1e40af', '#60a5fa'],
  krig: ['#78350f', '#a16207'],
  default: ['#374151', '#6b7280'],
};

const CATEGORY_ICONS = {
  innenriks: '🇳🇴', utenriks: '🌍', sport: '⚽', okonomi: '📈',
  teknologi: '💻', helse: '🏥', kultur: '🎭', klima: '🌱',
  politikk: '🏛️', krig: '⚔️', default: '📰',
};

function detectCategory(title, description) {
  const text = (title + ' ' + (description || '')).toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some(kw => text.includes(kw))) return cat.id;
  }
  return 'innenriks';
}

function detectRegion(title, description) {
  const text = (title + ' ' + (description || '')).toLowerCase();
  for (const region of WORLD_REGIONS) {
    if (region.id === 'all') continue;
    if (region.keywords && region.keywords.some(kw => text.includes(kw))) return region.id;
  }
  return 'global';
}

function estimateReadingTime(title, description) {
  const wordCount = (title + ' ' + (description || '')).split(/\s+/).length;
  return Math.max(1, Math.round((wordCount * 5) / 200));
}

function getPlaceholderSvg(category) {
  const [c1, c2] = CATEGORY_GRADIENTS[category] || CATEGORY_GRADIENTS.default;
  const icon = CATEGORY_ICONS[category] || CATEGORY_ICONS.default;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
    <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${c1}"/><stop offset="100%" style="stop-color:${c2}"/>
    </linearGradient></defs>
    <rect width="800" height="450" fill="url(#g)"/>
    <text x="400" y="225" text-anchor="middle" dominant-baseline="central" font-size="80">${icon}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function getImageForCategory(category) {
  return getPlaceholderSvg(category);
}

function isPlus(title, description) {
  const text = (title + ' ' + (description || '')).toLowerCase();
  return text.includes('+') || text.includes('pluss') || text.includes('premium') || text.includes('abonnent');
}

function extractImage(item) {
  // Try media:content (NRK, Guardian)
  const mediaContent = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'content');
  if (mediaContent.length) {
    const url = mediaContent[0].getAttribute('url');
    if (url && url.match(/\.(jpg|jpeg|png|gif|webp)/i)) return url;
  }
  // Try media:thumbnail (BBC, France24)
  const mediaThumbnail = item.getElementsByTagNameNS('http://search.yahoo.com/mrss/', 'thumbnail');
  if (mediaThumbnail.length) {
    const url = mediaThumbnail[0].getAttribute('url');
    if (url) return url;
  }
  // Try enclosure (VG, Aftenposten, E24)
  const enclosure = item.querySelector('enclosure');
  if (enclosure) {
    const url = enclosure.getAttribute('url');
    const type = (enclosure.getAttribute('type') || '').toLowerCase();
    // Accept image/* and also img/* (VG/E24 use non-standard img/jpg)
    if (url && (type.startsWith('image/') || type.startsWith('img/') || url.match(/\.(jpg|jpeg|png|gif|webp)/i) || url.includes('/images/'))) return url;
  }
  // Try image in description HTML
  const descHtml = item.querySelector('description')?.textContent || '';
  const imgMatch = descHtml.match(/<img[^>]+src=["']([^"']+)/);
  if (imgMatch) return imgMatch[1];
  return null;
}

async function fetchFeed(source) {
  if (!PROXY_URL) return getMockArticles(source);
  try {
    const url = `${PROXY_URL}/?url=${encodeURIComponent(source.rssUrl)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed');
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    const items = Array.from(xml.querySelectorAll('item'));
    return items.slice(0, 15).map((item, idx) => {
      const title = item.querySelector('title')?.textContent || '';
      const rawDesc = item.querySelector('description')?.textContent || '';
      const description = rawDesc.replace(/<[^>]+>/g, '').trim();
      const link = item.querySelector('link')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      const category = detectCategory(title, description);
      const region = source.isInternational ? detectRegion(title, description) : null;
      const rssImage = extractImage(item);
      return {
        id: `${source.id}-${idx}-${Date.now()}`,
        title, description: description.slice(0, 500), link,
        source: source.name, sourceId: source.id, sourceColor: source.color,
        isInternational: source.isInternational || false,
        pubDate: pubDate ? new Date(pubDate) : new Date(),
        category, region,
        image: rssImage || getImageForCategory(category, idx),
        isPlus: isPlus(title, description),
        trendScore: Math.floor(Math.random() * 100),
        readingTime: estimateReadingTime(title, description),
      };
    });
  } catch (e) {
    return getMockArticles(source);
  }
}

function getMockArticles(source) {
  const mockData = {
    nrk: [
      { title: 'Regjeringen presenterer ny klimapakke', desc: 'Statsministeren la frem ambisiøse mål for norsk klimapolitikk i Stortinget i dag.' },
      { title: 'Norsk økonomi vokser mer enn ventet', desc: 'SSB melder om sterk vekst i BNP for tredje kvartal, drevet av olje og havbruk.' },
      { title: 'Snøkaos på Østlandet etter kraftig snøfall', desc: 'Trafikkorker og kansellerte fly etter at 30 cm snø falt over natten.' },
      { title: 'Ny forskning: Nordmenn sover for lite', desc: 'FHI-studie viser at én av tre nordmenn sover under syv timer per natt.' },
      { title: 'Stortinget vedtar ny helsereform', desc: 'Med 89 mot 80 stemmer ble den omstridte helsereformen vedtatt sent i natt.' },
    ],
    vg: [
      { title: 'Haaland scoret hattrick igjen', desc: 'Manchester City-stjernen sto for tre mål og to assist i storseieren.' },
      { title: 'Voldsom prisvekst på strøm denne måneden', desc: 'Strømprisene er nå de høyeste siden vinteren 2022.' },
      { title: 'Kongeparet på statsbesøk i Berlin', desc: 'Kong Harald og Dronning Sonja ble tatt imot av den tyske presidenten.' },
      { title: 'Nye regler for el-sparkesykler i Oslo', desc: 'Fra 1. april kreves hjelm og aldersgrense heves til 18 år.' },
      { title: 'Norsk tennisstjerne til Grand Slam-finale', desc: 'Casper Ruud er klar for semifinale.' },
    ],
    aftenposten: [
      { title: 'Oslo kommune øker skatten neste år', desc: 'Bystyret vedtok budsjett med skatteøkning for å dekke underskudd.' },
      { title: 'Norsk AI-selskap børsnotert på Nasdaq', desc: 'Oslo-baserte selskap debuterte med en markedsverdi på 12 milliarder.' },
      { title: 'Klimaforhandlingene i Genève brøt sammen', desc: 'Manglende enighet om utslippsmål stanset forhandlingene etter fem dager.' },
      { title: 'Universitetet Oslo varsler 400 kutt', desc: 'Budsjettkutt tvinger UiO til å si opp over 400 ansatte innen 2026.' },
      { title: 'Ny rapport: Oslo er Europas dyreste by', desc: 'Oslo klatrer til toppen av europeisk levekostnadsindeks.' },
    ],
    e24: [
      { title: 'Oslo Børs opp 2 prosent etter rentebeslutning', desc: 'Norges Bank holdt renten uendret, noe markedet reagerte positivt på.' },
      { title: 'Equinor varsler nytt funn i Barentshavet', desc: 'Funn anslås til 150 millioner fat oljeekvivalenter.' },
      { title: 'Oljeprisen faller kraftig på lavere etterspørsel', desc: 'Brent-olje handles nå under 70 dollar fatet.' },
      { title: 'Norsk krone svekkes mot euro', desc: 'Kronekursen er nå på det svakeste mot euro siden 2020.' },
      { title: 'Sjømat-eksporten rekordhøy i første kvartal', desc: 'Norge eksporterte sjømat for 40 milliarder i årets tre første måneder.' },
    ],
    bbc: [
      { title: 'Ukraine launches major counteroffensive in Donbas', desc: 'Ukrainian forces push back Russian troops in the eastern region, gaining 30km of territory.' },
      { title: 'UK economy shrinks unexpectedly in Q1', desc: 'GDP fell 0.3% in the first quarter, raising recession fears among economists.' },
      { title: 'China-Taiwan tensions escalate over navy drills', desc: 'Beijing conducts largest military exercises near Taiwan in a decade.' },
      { title: 'Israel-Gaza ceasefire talks resume in Cairo', desc: 'Mediators from Egypt and Qatar push for a six-week pause in fighting in Gaza.' },
      { title: 'Climate summit: 40 nations pledge net zero by 2040', desc: 'A coalition of wealthy nations signed a historic climate agreement in Geneva.' },
    ],
    guardian: [
      { title: 'Amazon deforestation hits five-year high', desc: 'Data shows 12,000 square kilometres of Brazilian rainforest cleared in 2025.' },
      { title: 'France faces political crisis after snap election', desc: 'No party won a majority in the French parliament, leaving the country without a clear government.' },
      { title: 'WHO declares mpox emergency in Central Africa', desc: 'New variant spreading rapidly across DRC and neighbouring African countries.' },
      { title: 'Tech giants face EU AI regulation deadline', desc: 'Companies including Google and Meta must comply with new AI Act requirements by June.' },
      { title: 'India set to become world largest economy by 2030', desc: 'IMF projections put India ahead of the US and China by end of decade.' },
    ],
    aljazeera: [
      { title: 'Sudan peace talks collapse in Jeddah', desc: 'Fighting resumes in Khartoum after mediation efforts between RSF and army fail.' },
      { title: 'Iran nuclear talks: New proposals on the table in Vienna', desc: 'European mediators present fresh framework to Tehran amid rising tensions.' },
      { title: 'Bangladesh floods displace millions in historic disaster', desc: 'Monsoon flooding at worst level in 20 years, UN humanitarian agencies warn.' },
      { title: 'Saudi Arabia opens up to Western tourists', desc: 'New visa rules take effect as Kingdom targets 150 million tourists by 2030.' },
      { title: 'Yemen: Houthi attacks on Red Sea shipping resume', desc: 'Shipping costs spike as Houthi rebels in Yemen target commercial vessels.' },
    ],
    france24: [
      { title: 'France faces snap election after EU parliament shock', desc: 'President Macron calls for new legislative elections after heavy losses to far-right in European vote.' },
      { title: 'Sahel crisis deepens as French forces withdraw from Mali', desc: 'Thousands of civilians flee as jihadist groups expand control in northern Mali.' },
      { title: 'US-China trade war escalates with new tariff rounds', desc: 'Washington announces 25% tariffs on Chinese electric vehicles, Beijing threatens retaliation.' },
      { title: 'Israel war crimes probe: ICC issues arrest warrants', desc: 'The International Criminal Court issues historic warrants over Gaza offensive.' },
      { title: 'French farmers blockade Paris over EU agricultural policy', desc: 'Tractors surround capital as agricultural crisis grips Europe.' },
    ],
  };

  const articles = mockData[source.id] || mockData.nrk;
  return articles.map((item, idx) => {
    const category = detectCategory(item.title, item.desc);
    const region = source.isInternational ? detectRegion(item.title, item.desc) : null;
    return {
      id: `${source.id}-mock-${idx}`,
      title: item.title,
      description: item.desc,
      link: '#',
      source: source.name,
      sourceId: source.id,
      sourceColor: source.color,
      isInternational: source.isInternational || false,
      pubDate: new Date(Date.now() - idx * 3600000),
      category, region,
      image: getImageForCategory(category, idx),
      isPlus: idx % 5 === 0,
      trendScore: Math.floor(Math.random() * 100),
      readingTime: estimateReadingTime(item.title, item.desc),
    };
  });
}

export function useNews(sources) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const enabledSources = sources.filter(s => s.enabled);
    const results = await Promise.allSettled(enabledSources.map(fetchFeed));
    const all = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);
    all.sort((a, b) => b.pubDate - a.pubDate);
    setArticles(all);
    setLastUpdated(new Date());
    setLoading(false);
  }, [sources]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { articles, loading, lastUpdated, refresh: fetchAll };
}
