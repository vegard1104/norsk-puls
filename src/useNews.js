import { useState, useEffect, useCallback } from 'react';
import { CATEGORIES, WORLD_REGIONS } from './sources.js';

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
  politikk: ['https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800', 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800'],
  krig: ['https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=800'],
  default: ['https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800', 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800'],
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

function getImageForCategory(category, index) {
  const imgs = UNSPLASH_IMAGES[category] || UNSPLASH_IMAGES.default;
  return imgs[index % imgs.length];
}

function isPlus(title, description) {
  const text = (title + ' ' + (description || '')).toLowerCase();
  return text.includes('+') || text.includes('pluss') || text.includes('premium') || text.includes('abonnent');
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
    return items.slice(0, 10).map((item, idx) => {
      const title = item.querySelector('title')?.textContent || '';
      const description = item.querySelector('description')?.textContent?.replace(/<[^>]+>/g, '') || '';
      const link = item.querySelector('link')?.textContent || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      const category = detectCategory(title, description);
      const region = source.isInternational ? detectRegion(title, description) : null;
      return {
        id: `${source.id}-${idx}-${Date.now()}`,
        title, description: description.slice(0, 200), link,
        source: source.name, sourceId: source.id, sourceColor: source.color,
        isInternational: source.isInternational || false,
        pubDate: pubDate ? new Date(pubDate) : new Date(),
        category, region,
        image: getImageForCategory(category, idx),
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
    dagbladet: [
      { title: 'Kjendis åpner opp om psykisk helse', desc: 'I et åpent intervju deler den kjente TV-profilen sin kamp mot angst.' },
      { title: 'Boligprisene stuper i Oslo', desc: 'Gjennomsnittlig kvadratmeterpris i Oslo falt 4% siste måned.' },
      { title: 'Politiet advarer mot ny svindel', desc: 'Svindlere utgir seg for å være fra politiet og ber folk om bankopplysninger.' },
      { title: 'Matvarekjedene tjener rekordmye', desc: 'Norgesgruppen rapporterer rekordhøyt overskudd midt i priskrisen.' },
      { title: 'Ny norsk film nominert til Oscar', desc: 'Den norske filmen er nominert i kategorien Beste internasjonale film.' },
    ],
    aftenposten: [
      { title: 'Oslo kommune øker skatten neste år', desc: 'Bystyret vedtok budsjett med skatteøkning for å dekke underskudd.' },
      { title: 'Norsk AI-selskap børsnotert på Nasdaq', desc: 'Oslo-baserte selskap debuterte med en markedsverdi på 12 milliarder.' },
      { title: 'Klimaforhandlingene i Genève brøt sammen', desc: 'Manglende enighet om utslippsmål stanset forhandlingene etter fem dager.' },
      { title: 'Universitetet Oslo varsler 400 kutt', desc: 'Budsjettkutt tvinger UiO til å si opp over 400 ansatte innen 2026.' },
      { title: 'Ny rapport: Oslo er Europas dyreste by', desc: 'Oslo klatrer til toppen av europeisk levekostnadsindeks.' },
    ],
    tv2: [
      { title: 'Dramatisk redningsaksjon i Geirangerfjorden', desc: 'Helikopter og redningsskøyte hentet ut 12 turister som satt fast.' },
      { title: 'Ny norsk serie topper Netflix-listen', desc: 'Serien er nå den mest sette på Netflix i Norden.' },
      { title: 'Temperaturen slår rekord i Finnmark', desc: '32 grader i Karasjok – ny junirekord for Nord-Norge.' },
      { title: 'Minister trekker seg etter skandale', desc: 'Næringsministeren går av etter avsløringer om dobbeltroller.' },
      { title: 'Norsk fotballag klar for EM-semifinale', desc: 'Landslaget slo Italia 2-1 i en dramatisk kvartfinale.' },
    ],
    e24: [
      { title: 'Oslo Børs opp 2 prosent etter rentebeslutning', desc: 'Norges Bank holdt renten uendret, noe markedet reagerte positivt på.' },
      { title: 'Equinor varsler nytt funn i Barentshavet', desc: 'Funn anslås til 150 millioner fat oljeekvivalenter.' },
      { title: 'Oljeprisen faller kraftig på lavere etterspørsel', desc: 'Brent-olje handles nå under 70 dollar fatet.' },
      { title: 'Norsk krone svekkes mot euro', desc: 'Kronekursen er nå på det svakeste mot euro siden 2020.' },
      { title: 'Sjømat-eksporten rekordhøy i første kvartal', desc: 'Norge eksporterte sjømat for 40 milliarder i årets tre første måneder.' },
    ],
    dn: [
      { title: 'Milliardærene ble rikere i fjor', desc: 'Norges 100 rikeste økte formuen med 18% samlet i fjor.' },
      { title: 'Ny tech-gigant slår seg ned i Oslo', desc: 'Amazon Web Services åpner datasenter med 2000 arbeidsplasser.' },
      { title: 'Fondsforvalter anbefaler gull', desc: 'Etter børsuro anbefaler flere forvaltere økt eksponering mot gull.' },
      { title: 'Skatte-sjokk for norske aksjonærer', desc: 'Nye regler treffer særlig eiere av unoterte aksjer hardt.' },
      { title: 'Norsk eiendomsmarked: Hva skjer videre?', desc: 'Analytikerne er uenige om boligmarkedet vil stige eller falle.' },
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
    apnews: [
      { title: 'US Federal Reserve signals rate cut as inflation eases', desc: 'Fed Chair Powell says inflation data supports easing monetary policy this summer.' },
      { title: 'Germany bans Chinese 5G components from networks', desc: 'Berlin follows US and UK in excluding Huawei from critical telecommunications infrastructure.' },
      { title: 'Mexico cartel leader captured after month-long operation', desc: 'Federal police arrested the head of the Sinaloa cartel in Culiacan.' },
      { title: 'South Korea election: Opposition wins landslide victory', desc: 'Democratic Party secures two-thirds of parliamentary seats in historic vote.' },
      { title: 'Global food prices rise for third straight month', desc: 'FAO index shows 2.1% increase driven by grain and dairy costs worldwide.' },
    ],
    dw: [
      { title: 'Germany energy transition: Progress and pitfalls', desc: 'Renewables now cover 65% of German electricity, but grid stability remains a challenge.' },
      { title: 'Poland strengthens NATO eastern flank with record spending', desc: 'Warsaw announces 5% of GDP defence spending commitment, highest in alliance.' },
      { title: 'Hungary blocks EU aid package to Ukraine', desc: 'Viktor Orbán veto stalls 5bn euro military support fund in Brussels.' },
      { title: 'Spanish general strike over housing crisis hits major cities', desc: 'Millions march in Madrid and Barcelona against soaring rents and evictions.' },
      { title: 'Italy birth rate hits historic low since 1861 unification', desc: 'Country records fewest births since national unification, government alarmed.' },
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
