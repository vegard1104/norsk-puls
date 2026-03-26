// =============================================
// NORSK PULS - Nyhetskilder
// =============================================

export const DEFAULT_SOURCES = [
  { id: 'nrk', name: 'NRK', rssUrl: 'https://www.nrk.no/toppsaker.rss', color: '#d4202a', enabled: true, isInternational: false },
  { id: 'vg', name: 'VG', rssUrl: 'https://www.vg.no/rss/feed/?categories=1068&limit=20', color: '#e8001c', enabled: true, isInternational: false },
  { id: 'dagbladet', name: 'Dagbladet', rssUrl: 'https://www.dagbladet.no/xml/rss2.xml', color: '#e63329', enabled: true, isInternational: false },
  { id: 'aftenposten', name: 'Aftenposten', rssUrl: 'https://www.aftenposten.no/rss', color: '#004b87', enabled: true, isInternational: false },
  { id: 'tv2', name: 'TV 2', rssUrl: 'https://www.tv2.no/rss', color: '#ff6600', enabled: true, isInternational: false },
  { id: 'e24', name: 'E24', rssUrl: 'https://e24.no/rss', color: '#0066cc', enabled: true, isInternational: false },
  { id: 'dn', name: 'DN', rssUrl: 'https://www.dn.no/rssFeeder/rss2.xml', color: '#8B1A1A', enabled: true, isInternational: false },
];

export const INTERNATIONAL_SOURCES = [
  { id: 'bbc', name: 'BBC World', rssUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml', color: '#bb1919', enabled: true, isInternational: true },
  { id: 'guardian', name: 'The Guardian', rssUrl: 'https://www.theguardian.com/world/rss', color: '#005689', enabled: true, isInternational: true },
  { id: 'aljazeera', name: 'Al Jazeera', rssUrl: 'https://www.aljazeera.com/xml/rss/all.xml', color: '#c8a951', enabled: true, isInternational: true },
  { id: 'france24', name: 'France 24', rssUrl: 'https://www.france24.com/en/rss', color: '#e8002d', enabled: true, isInternational: true },
  { id: 'apnews', name: 'AP News', rssUrl: 'https://feeds.apnews.com/apnews/topnews', color: '#cc0000', enabled: true, isInternational: true },
  { id: 'dw', name: 'DW News', rssUrl: 'https://rss.dw.com/rdf/rss-en-world', color: '#006baf', enabled: true, isInternational: true },
];

export const CATEGORIES = [
  { id: 'innenriks', label: 'Innenriks', keywords: ['norge', 'norsk', 'regjering', 'storting', 'oslo', 'kommunen', 'politiet', 'statsminister', 'norwegian', 'norway'] },
  { id: 'utenriks', label: 'Utenriks', keywords: ['usa', 'europa', 'kina', 'russland', 'ukraine', 'nato', 'eu', 'verden', 'internasjonal'] },
  { id: 'sport', label: 'Sport', keywords: ['fotball', 'ski', 'ol', 'vm', 'nhl', 'premier league', 'eliteserien', 'idrett', 'sport', 'løp', 'svømming', 'football', 'soccer', 'tennis', 'basketball', 'olympic'] },
  { id: 'okonomi', label: 'Økonomi', keywords: ['aksjer', 'økonomi', 'marked', 'rente', 'inflasjon', 'oljeprisen', 'krone', 'bnp', 'arbeidsmarked', 'economy', 'market', 'stock', 'inflation', 'trade', 'gdp'] },
  { id: 'teknologi', label: 'Teknologi', keywords: ['ai', 'teknologi', 'apple', 'google', 'microsoft', 'tesla', 'robot', 'software', 'app', 'technology', 'cyber', 'digital', 'openai', 'startup'] },
  { id: 'helse', label: 'Helse', keywords: ['helse', 'sykehus', 'kreft', 'medisin', 'forskning', 'pandemi', 'covid', 'mental', 'psykisk', 'health', 'hospital', 'cancer', 'vaccine', 'medical'] },
  { id: 'kultur', label: 'Kultur', keywords: ['kultur', 'film', 'musikk', 'teater', 'kunst', 'bok', 'strømming', 'netflix', 'kino', 'festival', 'music', 'movie', 'art', 'culture', 'entertainment'] },
  { id: 'klima', label: 'Klima', keywords: ['klima', 'miljø', 'co2', 'utslipp', 'grønn', 'fossil', 'temperatur', 'oversvømmelse', 'climate', 'environment', 'carbon', 'emissions', 'flood', 'wildfire'] },
  { id: 'politikk', label: 'Politikk', keywords: ['election', 'president', 'prime minister', 'parliament', 'congress', 'senate', 'government', 'minister', 'policy', 'vote', 'valg', 'regjering'] },
  { id: 'krig', label: 'Krig & Konflikt', keywords: ['war', 'conflict', 'attack', 'military', 'troops', 'killed', 'missile', 'bomb', 'krig', 'konflikt', 'angrep', 'soldater', 'fighter', 'airstrike'] },
];

export const WORLD_REGIONS = [
  { id: 'all', label: 'Alle regioner' },
  { id: 'europa', label: '🇪🇺 Europa', keywords: ['europe', 'european', 'france', 'germany', 'uk', 'britain', 'spain', 'italy', 'poland', 'ukraine', 'nato', 'brussels', 'paris', 'berlin', 'london', 'rome', 'eu '] },
  { id: 'nord_amerika', label: '🇺🇸 Nord-Amerika', keywords: ['usa', 'america', 'american', 'canada', 'washington', 'new york', 'trump', 'congress', 'white house', 'pentagon', 'united states', 'mexico', 'california'] },
  { id: 'asia', label: '🌏 Asia', keywords: ['china', 'chinese', 'japan', 'india', 'korea', 'taiwan', 'beijing', 'tokyo', 'new delhi', 'singapore', 'indonesia', 'pakistan', 'hong kong', 'philippines', 'vietnam', 'thailand'] },
  { id: 'midtosten', label: '🕌 Midtøsten', keywords: ['israel', 'israeli', 'palestine', 'palestinian', 'iran', 'iraq', 'saudi', 'arabia', 'gaza', 'middle east', 'lebanon', 'syria', 'yemen', 'hamas', 'tel aviv', 'jerusalem', 'tehran', 'dubai'] },
  { id: 'africa', label: '🌍 Afrika', keywords: ['africa', 'african', 'nigeria', 'kenya', 'ethiopia', 'south africa', 'sudan', 'sahel', 'congo', 'ghana', 'tanzania', 'somalia', 'mali', 'nairobi', 'lagos'] },
  { id: 'latin_amerika', label: '🌎 Latin-Amerika', keywords: ['brazil', 'mexican', 'argentina', 'colombia', 'venezuela', 'latin america', 'south america', 'chile', 'peru', 'cuba', 'bolivia', 'ecuador', 'buenos aires', 'rio'] },
  { id: 'global', label: '🌐 Globalt', keywords: ['global', 'worldwide', 'international', 'united nations', 'imf', 'world bank', 'g7', 'g20', 'world health'] },
];

export const CATEGORY_EMOJIS = {
  innenriks: '🇳🇴',
  utenriks: '🌍',
  sport: '⚽',
  okonomi: '📈',
  teknologi: '💻',
  helse: '🏥',
  kultur: '🎭',
  klima: '🌱',
  politikk: '🏛️',
  krig: '⚔️',
};
