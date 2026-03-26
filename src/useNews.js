import { useState, useEffect, useCallback } from 'react';
import { CATEGORIES } from './sources.js';

const PROXY_URL = import.meta.env.VITE_PROXY_URL;

const UNSPLASH_IMAGES = {
  innenriks: ['https://images.unsplash.com/photo-1529260830199-42c24126f198?w=800', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800'],
  utenriks: ['https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800', 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800'],
  sport: ['https://images.unsplash.com/photo-1541252260730-0412e8e2108e?w=800', 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800'],
  okonomi: ['https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800', 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800'],
  teknologi: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800', 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800'],
  helse: ['https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800', 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=800'],
  kultur: ['https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800'],
  klima: ['https://images.unsplash.com/photo-1569163139394-de4e4f43e4e3?w=800', 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800'],
  default: ['https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800', 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800'],
};

function detectCategory(title, description) {
  const text = (title + ' ' + (description || '')).toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some(kw => text.includes(kw))) {
      return cat.id;
    }
  }
  return 'innenriks';
}

function getImageForCategory(category, index) {
  const imgs = UNSPLASH_IMAGES[category] || UNSPLASH_IMAGES.default;
  return imgs[index % imgs.length];
}

function extractImageFromItem(item) {
  // 1. Iterer alle elementer — fanger media:content, media:thumbnail uansett namespace-prefix
  const allEls = Array.from(item.getElementsByTagName('*'));
  for (const el of allEls) {
    const localName = (el.localName || el.nodeName).split(':').pop().toLowerCase();
    if (localName === 'content' || localName === 'thumbnail') {
      const url = el.getAttribute('url');
      if (url && url.match(/https?:\/\/.+\.(jpg|jpeg|png|webp|gif)/i)) return url;
      // Noen bruker bare url-attributt uten filendelse
      if (url && url.startsWith('http') && (el.getAttribute('medium') === 'image' || el.getAttribute('type')?.includes('image'))) return url;
    }
  }

  // 2. enclosure (NRK, TV2 m.fl.)
  const enclosure = item.querySelector('enclosure');
  if (enclosure) {
    const url = enclosure.getAttribute('url');
    const type = enclosure.getAttribute('type') || '';
    if (url && (type.includes('image') || url.match(/\.(jpg|jpeg|png|webp)/i))) return url;
  }

  // 3. Bilde inne i <description> som HTML/CDATA
  const desc = item.querySelector('description')?.textContent || '';
  const imgMatch = desc.match(/src=["']([^"']*(?:jpg|jpeg|png|webp|gif)[^"']*)/i);
  if (imgMatch?.[1]?.startsWith('http')) return imgMatch[1];

  // 4. og:image eller lignende i description
  const metaMatch = desc.match(/property=["']og:image["'][^>]+content=["']([^"']+)/i)
    || desc.match(/content=["']([^"']+)["'][^>]+property=["']og:image/i);
  if (metaMatch?.[1]) return metaMatch[1];

  return null;
}

// Henter og:image fra selve artikkelsiden via proxy
async function fetchArticleImage(link) {
  if (!link || link === '#' || !PROXY_URL) return null;
  try {
    const res = await fetch(`${PROXY_URL}/?url=${encodeURIComponent(link)}`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const html = await res.text();
    // Prøv og:image først (mest pålitelig)
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image/i);
    if (ogMatch?.[1]?.startsWith('http')) return ogMatch[1];
    // Prøv twitter:image
    const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)/i);
    if (twMatch?.[1]?.startsWith('http')) return twMatch[1];
  } catch {
    return null;
  }
  return null;
}

function isPlus(title, description) {
  const text = (title + ' ' + (description || '')).toLowerCase();
  return text.includes('+') || text.includes('pluss') || text.includes('premium') || text.includes('abonnent');
}

async function fetchFeed(source) {
  if (!PROXY_URL) {
    return getMockArticles(source);
  }
  try {
    const url = `${PROXY_URL}/?url=${encodeURIComponent(source.rssUrl)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed');
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'text/xml');
    const items = Array.from(xml.querySelectorAll('item'));
    const parsed = items.slice(0, 10).map((item, idx) => {
      const title = item.querySelector('title')?.textContent || '';
      const description = item.querySelector('description')?.textContent?.replace(/<[^>]+>/g, '') || '';

      // Link: prøv <link>, deretter <guid isPermaLink="true">, deretter <guid>
      let link = item.querySelector('link')?.textContent?.trim() || '';
      if (!link || !link.startsWith('http')) {
        const guid = item.querySelector('guid');
        const guidText = guid?.textContent?.trim() || '';
        if (guidText.startsWith('http')) link = guidText;
      }

      const pubDate = item.querySelector('pubDate')?.textContent || '';
      const category = detectCategory(title, description);
      const rssImage = extractImageFromItem(item);
      return {
        id: `${source.id}-${idx}-${Date.now()}`,
        title,
        description: description.slice(0, 200),
        link,
        source: source.name,
        sourceId: source.id,
        sourceColor: source.color,
        pubDate: pubDate ? new Date(pubDate) : new Date(),
        category,
        image: rssImage || null, // null = hent fra artikkelside
        isPlus: isPlus(title, description),
        feedPosition: idx, // brukes til popularitetsberegning
        sourceLang: source.lang || 'no',
        sourceRegion: source.region || null,
      };
    });

    // For artikler uten RSS-bilde: hent og:image fra selve artikkelen (maks 5 samtidige)
    const withImages = await Promise.all(parsed.map(async (article, idx) => {
      if (article.image) return article;
      const img = await fetchArticleImage(article.link);
      return { ...article, image: img || getImageForCategory(article.category, idx) };
    }));

    return withImages;
  } catch (e) {
    return getMockArticles(source);
  }
}

function getMockArticles(source) {
  const mockTitles = {
    nrk: ['Regjeringen presenterer ny klimapakke', 'Norsk økonomi vokser mer enn ventet', 'Snøkaos på Østlandet', 'Ny forskning: Nordmenn sover for lite', 'Stortinget vedtar ny helsereform'],
    vg: ['Haaland scoret hattrick igjen', 'Voldsom prisvekst på strøm denne måneden', 'Ekspert advarer mot ny bølge', 'Kongeparet på statsbesøk i Berlin', 'Nye regler for el-sparkesykler'],
    dagbladet: ['Skandale i toppidretten', 'Kjendis åpner opp om psykisk helse', 'Slik spiser du deg rik', 'Boligprisene stuper i Oslo', 'Politiet advarer mot ny svindel'],
    aftenposten: ['Klimaforhandlingene brøt sammen', 'Oslo kommune øker skatten', 'Universitetet varsler kutt', 'Norsk AI-selskap børsnotert', 'Debatten om innvandring tilspisses'],
    tv2: ['Dramatisk redningsaksjon i fjorden', 'Ny norsk serie toppper Netflix', 'Fotball-Norge i sjokk', 'Temperaturen slår alle rekorder', 'Minister trekker seg'],
    e24: ['Oslo Børs opp 2 prosent', 'Equinor varsler nytt funn', 'Oljeprisen faller kraftig', 'Norsk krone svekkes mot euro', 'Sentralbanken holder renten uendret'],
    dn: ['Milliardærene ble rikere i fjor', 'Ny tech-gigant slår seg ned i Oslo', 'Sjømat-eksporten rekordhøy', 'Fondsforvalter anbefaler gull', 'Skatte-sjokk for norske aksjonærer'],
  };

  const titles = mockTitles[source.id] || mockTitles.nrk;
  return titles.map((title, idx) => {
    const category = detectCategory(title, '');
    return {
      id: `${source.id}-mock-${idx}`,
      title,
      description: 'Dette er en eksempelartikkel fra ' + source.name + '. Ekte nyheter hentes via Cloudflare Worker proxy.',
      link: '#',
      source: source.name,
      sourceId: source.id,
      sourceColor: source.color,
      pubDate: new Date(Date.now() - idx * 3600000),
      category,
      image: getImageForCategory(category, idx),
      isPlus: idx % 4 === 0,
      feedPosition: idx,
    };
  });
}

// Beregner popularitetsscore basert på krysskildetrend + aktualitet
function computePopularityScores(articles) {
  return articles.map(article => {
    // Hent meningsfulle ord fra tittelen (>4 bokstaver)
    const words = article.title.toLowerCase().split(/\W+/).filter(w => w.length > 4);

    // Tell artikler fra ANDRE kilder som deler 2+ nøkkelord i tittelen
    const crossSourceMatches = articles.filter(other =>
      other.sourceId !== article.sourceId &&
      words.filter(w => other.title.toLowerCase().includes(w)).length >= 2
    ).length;

    // Aktualitetsbonus: jo ferskere, jo høyere poeng (0–30)
    const ageMin = (Date.now() - new Date(article.pubDate)) / 60000;
    const recency = ageMin < 30 ? 30 : ageMin < 120 ? 22 : ageMin < 360 ? 12 : ageMin < 720 ? 5 : 0;

    // Krysskilde-bonus: trending-saker dekkes av mange aviser (0–50)
    const crossBonus = Math.min(50, crossSourceMatches * 15);

    // Posisjon i feed: toppsaker er fremhevet av redaksjonen (0–15)
    const posBonus = article.feedPosition !== undefined ? Math.max(0, 15 - article.feedPosition * 2) : 0;

    // Litt tilfeldig variasjon (0–10)
    const noise = Math.floor(Math.random() * 10);

    const score = Math.min(100, recency + crossBonus + posBonus + noise);

    // Konverter score til simulert lesertall (800 – 48 000)
    const readers = Math.round(800 + (score / 100) * 47200 + Math.random() * 1000);

    return { ...article, trendScore: score, readerCount: readers };
  });
}

// Fjerner duplikater: beholder kun én artikkel per nyhetssak på tvers av kilder.
// To artikler regnes som duplikater hvis de deler 3+ meningsfulle ord i tittelen,
// eller overlap utgjør >50% av den korteste tittelen.
// Av duplikatene beholdes den med høyest trendScore.
function deduplicateArticles(articles) {
  const kept = [];
  for (const article of articles) {
    const words = new Set(
      article.title.toLowerCase().split(/\W+/).filter(w => w.length > 4)
    );
    if (words.size === 0) { kept.push(article); continue; }

    const dupIdx = kept.findIndex(other => {
      if (other.sourceId === article.sourceId) return false;
      // Ulike språk (no vs en): ikke dedupler mellom dem
      if ((other.sourceLang || 'no') !== (article.sourceLang || 'no')) return false;
      const otherWords = new Set(
        other.title.toLowerCase().split(/\W+/).filter(w => w.length > 4)
      );
      const overlap = [...words].filter(w => otherWords.has(w)).length;
      const minLen = Math.min(words.size, otherWords.size);
      return overlap >= 3 || (minLen > 0 && overlap / minLen >= 0.55);
    });

    if (dupIdx >= 0) {
      // Behold den med høyest popularitetsscore
      if ((article.trendScore || 0) > (kept[dupIdx].trendScore || 0)) {
        kept[dupIdx] = article;
      }
      // else: forkast denne, behold eksisterende
    } else {
      kept.push(article);
    }
  }
  return kept;
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
    // Beregn popularitet på tvers av alle kilder
    const withScores = computePopularityScores(all);
    // Fjern duplikat-saker (innen samme språkgruppe)
    const deduplicated = deduplicateArticles(withScores);
    setArticles(deduplicated);
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
