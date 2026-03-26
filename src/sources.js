// =============================================
// NORSK PULS - Nyhetskilder
// =============================================
// lang: 'no' = norsk, lang: 'en' = internasjonal
// =============================================

export const DEFAULT_SOURCES = [
  // ── Norske kilder ──────────────────────────
  {
    id: 'nrk',
    name: 'NRK',
    rssUrl: 'https://www.nrk.no/toppsaker.rss',
    color: '#d4202a',
    lang: 'no',
    enabled: true,
  },
  {
    id: 'vg',
    name: 'VG',
    rssUrl: 'https://www.vg.no/rss/feed/?categories=1068&limit=20',
    color: '#e8001c',
    lang: 'no',
    enabled: true,
  },
  {
    id: 'aftenposten',
    name: 'Aftenposten',
    rssUrl: 'https://www.aftenposten.no/rss',
    color: '#004b87',
    lang: 'no',
    enabled: true,
  },
  {
    id: 'tv2',
    name: 'TV 2',
    rssUrl: 'https://www.tv2.no/rss/nyheter',
    color: '#ff6600',
    lang: 'no',
    enabled: true,
  },
  {
    id: 'e24',
    name: 'E24',
    rssUrl: 'https://e24.no/rss',
    color: '#0066cc',
    lang: 'no',
    enabled: true,
  },
  {
    id: 'dn',
    name: 'DN',
    rssUrl: 'https://services.dn.no/api/feed/rss/',
    color: '#8B1A1A',
    lang: 'no',
    enabled: true,
  },
  {
    id: 'nettavisen',
    name: 'Nettavisen',
    rssUrl: 'https://www.nettavisen.no/rss',
    color: '#0097d6',
    lang: 'no',
    enabled: true,
  },
  {
    id: 'dagsavisen',
    name: 'Dagsavisen',
    rssUrl: 'https://www.dagsavisen.no/rss/',
    color: '#c0392b',
    lang: 'no',
    enabled: true,
  },

  // ── Internasjonale kilder (engelsk) ────────
  {
    id: 'bbc',
    name: 'BBC World',
    rssUrl: 'http://feeds.bbci.co.uk/news/world/rss.xml',
    color: '#bb1919',
    lang: 'en',
    region: 'Global',
    enabled: true,
  },
  {
    id: 'aljazeera',
    name: 'Al Jazeera',
    rssUrl: 'https://www.aljazeera.com/xml/rss/all.xml',
    color: '#e8871e',
    lang: 'en',
    region: 'Midtøsten / Afrika',
    enabled: true,
  },
  {
    id: 'guardian',
    name: 'The Guardian',
    rssUrl: 'https://www.theguardian.com/world/rss',
    color: '#052962',
    lang: 'en',
    region: 'Global',
    enabled: true,
  },
  {
    id: 'reuters',
    name: 'Reuters',
    rssUrl: 'https://feeds.reuters.com/reuters/worldNews',
    color: '#ff7700',
    lang: 'en',
    region: 'Global',
    enabled: true,
  },
  {
    id: 'dw',
    name: 'Deutsche Welle',
    rssUrl: 'https://rss.dw.com/xml/rss-en-world',
    color: '#0068b5',
    lang: 'en',
    region: 'Europa / Global',
    enabled: true,
  },
  {
    id: 'abc_au',
    name: 'ABC Australia',
    rssUrl: 'https://www.abc.net.au/news/feed/51120/rss.xml',
    color: '#00a650',
    lang: 'en',
    region: 'Oseania / Asia',
    enabled: true,
  },
  {
    id: 'toi',
    name: 'Times of India',
    rssUrl: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
    color: '#e63a11',
    lang: 'en',
    region: 'Sør-Asia',
    enabled: true,
  },
  {
    id: 'allafrica',
    name: 'AllAfrica',
    rssUrl: 'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf',
    color: '#006400',
    lang: 'en',
    region: 'Afrika',
    enabled: true,
  },
  {
    id: 'mee',
    name: 'Middle East Eye',
    rssUrl: 'https://www.middleeasteye.net/rss',
    color: '#1a8c4e',
    lang: 'en',
    region: 'Midtøsten',
    enabled: true,
  },
  {
    id: 'mercopress',
    name: 'Mercopress',
    rssUrl: 'https://en.mercopress.com/rss/news',
    color: '#2e7d32',
    lang: 'en',
    region: 'Sør-Amerika',
    enabled: true,
  },
];

export const CATEGORIES = [
  { id: 'innenriks', label: 'Innenriks', keywords: ['norge', 'norsk', 'regjering', 'storting', 'oslo', 'kommunen', 'politiet', 'statsminister'] },
  { id: 'utenriks', label: 'Utenriks', keywords: ['usa', 'europa', 'kina', 'russland', 'ukraine', 'nato', 'eu', 'verden', 'internasjonal'] },
  { id: 'sport', label: 'Sport', keywords: ['fotball', 'ski', 'ol', 'vm', 'nhl', 'premier league', 'eliteserien', 'idrett', 'sport', 'løp', 'svømming'] },
  { id: 'okonomi', label: 'Økonomi', keywords: ['aksjer', 'økonomi', 'marked', 'rente', 'inflasjon', 'oljeprisen', 'krone', 'bnp', 'arbeidsmarked', 'economy', 'market', 'trade', 'gdp', 'inflation', 'stocks'] },
  { id: 'teknologi', label: 'Teknologi', keywords: ['ai', 'teknologi', 'apple', 'google', 'microsoft', 'tesla', 'electric', 'robot', 'software', 'app', 'technology', 'cyber', 'digital', 'internet'] },
  { id: 'helse', label: 'Helse', keywords: ['helse', 'sykehus', 'kreft', 'medisin', 'forskning', 'pandemi', 'covid', 'mental', 'psykisk', 'trening', 'health', 'hospital', 'disease', 'vaccine', 'cancer'] },
  { id: 'kultur', label: 'Kultur', keywords: ['kultur', 'film', 'musikk', 'teater', 'kunst', 'bok', 'strømming', 'netflix', 'kino', 'festival', 'culture', 'music', 'art', 'book', 'movie'] },
  { id: 'klima', label: 'Klima', keywords: ['klima', 'miljø', 'co2', 'utslipp', 'grønn', 'fossil', 'temperatur', 'oversvømmelse', 'ekstremvær', 'climate', 'environment', 'carbon', 'flood', 'wildfire'] },
];

// Hjelpefunksjoner for å filtrere på språk
export const getNorwegianSources = (sources) => sources.filter(s => !s.lang || s.lang === 'no');
export const getInternationalSources = (sources) => sources.filter(s => s.lang === 'en');
