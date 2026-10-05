/*
 * Recherche en ligne sur le son d'une chanson / d'un artiste :
 * Wikipédia (articles anglais, souvent détaillés sur le matériel) + Wikidata (interprète, guitaristes, genres).
 * On repère les guitares, amplis, effets et accordages cités, avec la phrase source.
 */
(function () {
  'use strict';

  const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  async function getJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }
  const qs = (o) => Object.entries(Object.assign({ format: 'json', origin: '*' }, o)).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');
  const wiki = (lang, params) => getJSON(`https://${lang}.wikipedia.org/w/api.php?${qs(params)}`);
  const wd = (params) => getJSON(`https://www.wikidata.org/w/api.php?${qs(params)}`);

  async function searchTitles(lang, q, n) {
    const d = await wiki(lang, { action: 'query', list: 'search', srsearch: q, srlimit: n || 5 });
    return ((d.query && d.query.search) || []).map((x) => x.title);
  }
  async function article(lang, title) {
    const d = await wiki(lang, { action: 'query', prop: 'extracts|pageprops', explaintext: 1, exsectionformat: 'wiki', ppprop: 'wikibase_item', redirects: 1, titles: title });
    const p = Object.values((d.query && d.query.pages) || {})[0];
    if (!p || p.missing !== undefined) return null;
    return { title: p.title, text: p.extract || '', qid: p.pageprops && p.pageprops.wikibase_item, lang };
  }
  async function entities(ids) {
    if (!ids.length) return {};
    const d = await wd({ action: 'wbgetentities', ids: ids.slice(0, 50).join('|'), props: 'claims|sitelinks|labels', languages: 'fr|en', sitefilter: 'enwiki|frwiki' });
    return d.entities || {};
  }
  const claimIds = (e, p) => ((e && e.claims && e.claims[p]) || []).map((c) => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value && c.mainsnak.datavalue.value.id).filter(Boolean);
  const label = (e) => (e && e.labels && ((e.labels.fr && e.labels.fr.value) || (e.labels.en && e.labels.en.value))) || '';
  const enTitle = (e) => e && e.sitelinks && e.sitelinks.enwiki && e.sitelinks.enwiki.title;

  const Q = { human: 'Q5', guitarist: 'Q855091', genre: 'Q188451' };
  const GROUPS = ['Q215380', 'Q5741069', 'Q2088357', 'Q56816954', 'Q9212979', 'Q281643'];

  /* ------------------------------------------------------------------ */
  /* Repérage du matériel dans le texte                                  */
  /* ------------------------------------------------------------------ */
  const FEATURES = [
    // guitares
    { id: 'g-strat', cat: 'guitar', label: 'Fender Stratocaster', re: /stratocaster|\bstrat\b/i, pickup: 'single' },
    { id: 'g-tele', cat: 'guitar', label: 'Fender Telecaster', re: /telecaster|\btele\b|esquire/i, pickup: 'single' },
    { id: 'g-offset', cat: 'guitar', label: 'Fender Jazzmaster / Jaguar / Mustang', re: /jazzmaster|jaguar|mustang|jag-stang/i, pickup: 'single' },
    { id: 'g-lp', cat: 'guitar', label: 'Gibson Les Paul', re: /les paul/i, pickup: 'humbucker' },
    { id: 'g-sg', cat: 'guitar', label: 'Gibson SG', re: /gibson sg|\bsg\b/i, pickup: 'humbucker' },
    { id: 'g-semi', cat: 'guitar', label: 'Demi-caisse (ES-335 / hollow body)', re: /es-335|es-355|semi-hollow|hollow.?body|archtop/i, pickup: 'humbucker' },
    { id: 'g-explorer', cat: 'guitar', label: 'Gibson Explorer / Flying V', re: /explorer|flying v/i, pickup: 'humbucker' },
    { id: 'g-superstrat', cat: 'guitar', label: 'Superstrat (Ibanez, Jackson, ESP…)', re: /ibanez|jackson|\besp\b|charvel|schecter|frankenstrat/i, pickup: 'humbucker' },
    { id: 'g-prs', cat: 'guitar', label: 'PRS', re: /\bprs\b|paul reed smith/i, pickup: 'humbucker' },
    { id: 'g-p90', cat: 'guitar', label: 'Micros P-90', re: /p-?90/i, pickup: 'p90' },
    { id: 'g-rick', cat: 'guitar', label: 'Rickenbacker', re: /rickenbacker/i, pickup: 'single' },
    { id: 'g-gretsch', cat: 'guitar', label: 'Gretsch', re: /gretsch/i, pickup: 'humbucker' },
    { id: 'g-acoustic', cat: 'guitar', label: 'Guitare acoustique', re: /acoustic guitar|guitare acoustique|12-string/i },
    // amplis
    { id: 'a-marshall', cat: 'amp', label: 'Marshall', re: /marshall/i, amp: 'marshall' },
    { id: 'a-vox', cat: 'amp', label: 'Vox (AC30 / AC15)', re: /\bvox\b|ac30|ac15/i, amp: 'vox' },
    { id: 'a-fender', cat: 'amp', label: 'Ampli Fender (Twin, Deluxe, Bassman…)', re: /twin reverb|deluxe reverb|bassman|super reverb|vibroverb|hot rod deluxe|blues junior|fender (amp|amplifier|twin)/i, amp: 'fender' },
    { id: 'a-mesa', cat: 'amp', label: 'Mesa/Boogie', re: /mesa|boogie|rectifier/i, amp: 'highgain' },
    { id: 'a-highgain', cat: 'amp', label: 'Ampli haute saturation (5150, Engl, Peavey…)', re: /5150|6505|peavey|engl|bogner|diezel|soldano|evh/i, amp: 'highgain' },
    { id: 'a-orange', cat: 'amp', label: 'Orange', re: /orange (amp|amplifier|rockerverb|th)|orange amps/i, amp: 'marshall' },
    { id: 'a-hiwatt', cat: 'amp', label: 'Hiwatt', re: /hiwatt/i, amp: 'fender' },
    { id: 'a-jc', cat: 'amp', label: 'Roland Jazz Chorus', re: /jazz chorus|jc-120/i, amp: 'fender' },
    { id: 'a-dumble', cat: 'amp', label: 'Dumble', re: /dumble/i, amp: 'fender' },
    // effets
    { id: 'fuzz', cat: 'fx', label: 'Fuzz', re: /fuzz|big muff|tone bender|fuzz face|fuzz factory/i },
    { id: 'od', cat: 'fx', label: 'Overdrive', re: /tube screamer|ts-?808|ts-?9\b|overdrive|klon|blues driver|od-?1\b|sd-1/i },
    { id: 'dist', cat: 'fx', label: 'Distorsion', re: /distortion|ds-?1\b|ds-?2\b|\brat\b|metal zone|\bdistorted/i },
    { id: 'wah', cat: 'fx', label: 'Wah-wah', re: /wah|cry baby|crybaby/i },
    { id: 'chorus', cat: 'fx', label: 'Chorus', re: /chorus (pedal|effect|unit)|small clone|\bce-?[12]\b|chorused|chorus-laden|chorus and (delay|reverb|flanger)|(delay|reverb|flanger) and chorus/i },
    { id: 'phaser', cat: 'fx', label: 'Phaser', re: /phaser|phase 90|small stone|phasing/i },
    { id: 'flanger', cat: 'fx', label: 'Flanger', re: /flang|electric mistress/i },
    { id: 'vibe', cat: 'fx', label: 'Uni-Vibe / Leslie (rotatif)', re: /uni-?vibe|leslie|rotary/i },
    { id: 'tremolo', cat: 'fx', label: 'Trémolo', re: /tremolo/i },
    { id: 'delay', cat: 'fx', label: 'Delay / écho', re: /delay|echo(plex)?\b|memory man|tape echo|slapback/i },
    { id: 'reverb', cat: 'fx', label: 'Reverb', re: /reverb/i },
    { id: 'octave', cat: 'fx', label: 'Octaver / Whammy', re: /whammy|octav|octave (pedal|divider)|pitch.?shift/i },
    { id: 'comp', cat: 'fx', label: 'Compresseur', re: /compress|dyna ?comp/i },
    { id: 'talkbox', cat: 'fx', label: 'Talk box', re: /talk ?box/i },
    { id: 'ebow', cat: 'fx', label: 'E-Bow', re: /e-?bow/i },
    // jeu / accordage
    { id: 't-dropd', cat: 'tuning', label: 'Drop D', re: /drop[- ]?d\b|drop d tuning/i, tuning: 'Drop D (Ré grave)' },
    { id: 't-dropc', cat: 'tuning', label: 'Drop C', re: /drop[- ]?c\b/i, tuning: 'Drop C' },
    { id: 't-half', cat: 'tuning', label: 'Un demi-ton plus bas', re: /half[- ]step (down|lower)|tuned down (a )?half|e♭ tuning|eb tuning|e-flat tuning|down a semitone/i, tuning: '½ ton plus bas (Mi♭)' },
    { id: 't-dstd', cat: 'tuning', label: 'Un ton plus bas', re: /d standard|whole step (down|lower)|tuned down a (full|whole) step/i, tuning: '1 ton plus bas (Ré standard)' },
    { id: 't-open', cat: 'tuning', label: 'Accordage ouvert', re: /open (g|d|e|c) tuning|open tuning|dadgad/i, tuning: 'accordage ouvert (voir les sources)' },
    { id: 'p-slide', cat: 'play', label: 'Slide (bottleneck)', re: /\bslide guitar|bottleneck|\bslide\b/i },
    { id: 'p-palm', cat: 'play', label: 'Palm mute', re: /palm[- ]mut/i },
    { id: 'p-finger', cat: 'play', label: 'Jeu aux doigts', re: /fingerpick|fingerstyle|without a pick|with his fingers|with her fingers/i },
    { id: 'p-tapping', cat: 'play', label: 'Tapping', re: /tapping/i },
    { id: 'p-dyn', cat: 'play', label: 'Couplets clairs, refrains saturés', re: /(clean|quiet) verses?|verses? (are|were|is) (clean|quiet)|quiet[- ]loud|loud[- ]quiet|soft verses?/i },
    { id: 'p-feedback', cat: 'play', label: 'Larsen (feedback)', re: /feedback/i }
  ];
  const GENRE_MAP = [
    [/shoegaze/, 'st-shoegaze'], [/post-rock|ambient/, 'st-ambient'], [/grunge/, 'st-grunge'], [/metal/, 'st-metal'], [/punk/, 'st-punk'],
    [/reggae|\bska\b/, 'st-reggae'], [/funk|disco/, 'st-funk'], [/jazz|swing/, 'st-jazz'], [/country|bluegrass/, 'st-country'],
    [/hard rock|heavy rock/, 'st-classic-rock'], [/blues/, 'st-blues'], [/indie|garage|alternative|alternatif|britpop|independant/, 'st-indie'],
    [/rock/, 'st-classic-rock'], [/pop|chanson|variete|folk|soul|r&b|rhythm and blues/, 'st-clean-pop']
  ];

  const SKIP = /references|notes|external links|further reading|see also|charts|certifications|track listing|release history|bibliograph|discograph|filmograph|awards|accolades|cover versions|in popular culture|music video|legacy/i;
  const GEARSEC = /equipment|gear|guitars|instruments|amplif|effects|pedal|signature|rig|sound|style|technique|playing/i;

  function sections(text) {
    const out = [{ title: '', text: '' }];
    text.split('\n').forEach((l) => {
      const m = /^(={2,})\s*(.+?)\s*=+\s*$/.exec(l.trim());
      if (m) out.push({ title: m[2], text: '' }); else out[out.length - 1].text += l + '\n';
    });
    return out;
  }
  function sentencesOf(t, minLen) {
    return t.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z"“(])/).map((s) => s.trim()).filter((s) => s.length > (minLen || 20) && s.length < 600);
  }

  /** Analyse un texte : pour chaque caractéristique, nombre de mentions + meilleure phrase. */
  function scan(text, sourceName, url, weight, found, onlyGearSections, minLen) {
    sections(text).forEach((sec) => {
      if (SKIP.test(sec.title)) return;
      if (onlyGearSections && sec.title && !GEARSEC.test(sec.title)) return;
      sentencesOf(sec.text, minLen).forEach((s) => {
        FEATURES.forEach((f) => {
          if (!f.re.test(s)) return;
          // éviter les faux positifs évidents
          if (f.id === 'g-sg' && !/gibson|guitar|played|plays|using/i.test(s)) return;
          if (f.id === 'reverb' && /twin reverb|deluxe reverb|super reverb/i.test(s) && !/reverb (pedal|effect|unit)/i.test(s)) return;
          if (f.id === 'dist' && /without distortion|no distortion/i.test(s)) return;
          if (f.id === 'p-feedback' && !/guitar|amp/i.test(s)) return;
          const cur = found[f.id] || (found[f.id] = { feature: f, score: 0, quotes: [] });
          cur.score += weight;
          if (cur.quotes.length < 2 && !cur.quotes.some((q) => q.text === s)) cur.quotes.push({ text: s.length > 260 ? s.slice(0, 257) + '…' : s, source: sourceName, url });
        });
      });
    });
  }

  function genreRef(labels, text) {
    const t = norm(labels.join(' ') + ' ' + (text || '').slice(0, 1500));
    const g = GENRE_MAP.find(([re]) => re.test(t));
    return g ? g[1] : null;
  }

  /**
   * Lance la recherche. Retourne null si rien de musical n'est trouvé.
   * { title, kind: 'work'|'artist', performers: [], guitarists: [], genres: [], genreRef, found: { id: {feature, score, quotes} }, sources: [{name,url}], bpm }
   */
  async function wikiRun(query) {
    // 1. Article principal (anglais d'abord, souvent plus détaillé)
    let titles = await searchTitles('en', query, 5);
    if (!titles.length) titles = await searchTitles('en', query + ' song', 5);
    if (!titles.length) return null;
    const qn = norm(query).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 1);
    const best = titles.find((t) => qn.every((w) => norm(t).indexOf(w) >= 0)) || titles[0];
    const main = await article('en', best);
    if (!main) return null;
    const res = { title: main.title, kind: 'work', performers: [], guitarists: [], genres: [], found: {}, sources: [], bpm: null };
    const src = (a) => ({ name: a.title + ' (Wikipédia ' + a.lang + ')', url: `https://${a.lang}.wikipedia.org/wiki/` + encodeURIComponent(a.title.replace(/ /g, '_')) });
    res.sources.push(src(main));

    // 2. Wikidata : nature de l'article, interprète, genres, guitaristes
    let ents = main.qid ? await entities([main.qid]) : {};
    const me = ents[main.qid];
    const inst = claimIds(me, 'P31');
    if (inst.indexOf(Q.genre) >= 0) return { isGenre: true }; // c'est un genre musical, pas une chanson
    let artistIds = [];
    if (inst.indexOf(Q.human) >= 0 || inst.some((x) => GROUPS.indexOf(x) >= 0) || claimIds(me, 'P527').length) { res.kind = 'artist'; artistIds = [main.qid]; }
    else artistIds = claimIds(me, 'P175').slice(0, 2);
    if (res.kind === 'work' && !artistIds.length && !/song|single|album|track|recorded|band|guitar/i.test(main.text.slice(0, 800))) return null;
    let genreIds = claimIds(me, 'P136');
    const more = await entities(artistIds.filter((x) => x !== main.qid));
    Object.assign(ents, more);
    const artists = artistIds.map((id) => ents[id]).filter(Boolean);
    res.performers = artists.map(label).filter(Boolean);
    // guitaristes : la personne elle-même, ou les membres guitaristes du groupe
    let memberIds = [];
    artists.forEach((a) => { memberIds = memberIds.concat(claimIds(a, 'P527')); genreIds = genreIds.concat(claimIds(a, 'P136')); });
    const members = await entities(memberIds.slice(0, 20));
    const guitarEnts = [];
    artists.forEach((a) => { if (claimIds(a, 'P106').indexOf(Q.guitarist) >= 0) guitarEnts.push(a); });
    Object.values(members).forEach((m) => { if (claimIds(m, 'P106').indexOf(Q.guitarist) >= 0) guitarEnts.push(m); });
    res.guitarists = guitarEnts.slice(0, 2).map(label).filter(Boolean);
    const genreEnts = await entities([...new Set(genreIds)].slice(0, 8));
    res.genres = Object.values(genreEnts).map(label).filter(Boolean);

    // 3. Lecture des textes : chanson (poids fort), guitaristes, groupe
    scan(main.text, src(main).name, src(main).url, res.kind === 'work' ? 3 : 2, res.found, false);
    const bpm = /(\d{2,3})\s*(beats per minute|bpm)/i.exec(main.text);
    if (bpm) res.bpm = +bpm[1];
    const extra = [];
    guitarEnts.slice(0, 2).forEach((g) => { const t = enTitle(g); if (t && t !== main.title) extra.push({ t, w: 2 }); });
    artists.forEach((a) => { const t = enTitle(a); if (t && t !== main.title) extra.push({ t, w: 1 }); });
    for (const x of extra.slice(0, 3)) {
      try {
        const a = await article('en', x.t);
        if (a && a.text) { res.sources.push(src(a)); scan(a.text, src(a).name, src(a).url, x.w, res.found, true); }
      } catch (e) { /* on continue */ }
    }
    res.genreRef = genreRef(res.genres, main.text);
    return res;
  }

  /* ------------------------------------------------------------------ */
  /* Autres sources : sites spécialisés trouvés par un moteur de recherche */
  /* ------------------------------------------------------------------ */
  // Un site web ne peut pas lire directement les pages des autres sites (sécurité des navigateurs) :
  // on passe par des relais publics qui récupèrent la page pour nous.
  const PROXIES = [
    (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
    (u) => 'https://corsproxy.io/?url=' + encodeURIComponent(u),
    (u) => 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(u)
  ];
  const GEAR_SITES = /equipboard|groundguitar|premierguitar|guitarworld|musicradar|guitarplayer|ultimate-guitar|guitar\.com|reverb\.com|sweetwater|andertons|thegearpage|reddit|guitarchalk|guitarinteractive|totalguitar|vintageguitar|guitar-?pedal|pedal|tone|rig/i;

  async function fetchText(url, timeout) {
    for (const p of PROXIES) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), timeout || 9000);
      try {
        const r = await fetch(p(url), { signal: ctl.signal });
        clearTimeout(timer);
        if (!r.ok) continue;
        const t = await r.text();
        if (t && t.length > 100) return t;
      } catch (e) { clearTimeout(timer); }
    }
    return null;
  }

  /** Recherche DuckDuckGo (version HTML) : [{ title, url, snippet }] */
  async function webSearch(q) {
    const html = await fetchText('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(q), 9000);
    if (!html) return [];
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return [...doc.querySelectorAll('.result')].map((r) => {
      const a = r.querySelector('a.result__a');
      if (!a) return null;
      let href = a.getAttribute('href') || '';
      try { const u = new URL(href, 'https://duckduckgo.com'); href = u.searchParams.get('uddg') || u.href; } catch (e) { /* tel quel */ }
      const sn = r.querySelector('.result__snippet');
      return { title: a.textContent.trim(), url: href, snippet: sn ? sn.textContent.trim() : '' };
    }).filter((x) => x && /^https?:/.test(x.url) && !/duckduckgo\.com\/y\.js|ad_provider/.test(x.url));
  }

  function pageText(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,noscript,nav,header,footer,aside,form,iframe,svg').forEach((e) => e.remove());
    const title = (doc.querySelector('title') || {}).textContent || '';
    const seen = new Set();
    const lines = [];
    doc.querySelectorAll('h1,h2,h3,h4,p,li,td,figcaption,blockquote').forEach((e) => {
      if (lines.length > 500) return;
      const t = e.textContent.replace(/\s+/g, ' ').trim();
      if (t.length < 12 || t.length > 1500 || seen.has(t)) return;
      seen.add(t);
      lines.push(t.endsWith('.') ? t : t + '.');
    });
    return { title: title.trim(), text: lines.join('\n') };
  }

  const domainOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };

  async function webRun(res, query, onProgress) {
    const song = res.kind === 'work' ? res.title.replace(/ \(.*\)$/, '') : '';
    const performer = res.performers[0] || '';
    const who = res.guitarists[0] || performer;
    const queries = [];
    if (song) queries.push(`${song} ${performer} guitar tone gear`);
    if (who) queries.push(`${who} guitar rig gear amp pedals`);
    if (!queries.length) queries.push(`${query} guitar tone gear rig`);
    // mots qui prouvent qu'une page parle bien de ce morceau / cet artiste
    const STOP = ['guitar', 'song', 'tone', 'sound', 'band', 'the', 'and', 'with', 'live', 'version', 'chanson', 'groupe'];
    const keys = [song, performer, who, query].filter(Boolean).map((k) => norm(k)).concat(
      [who, performer].filter(Boolean).map((n) => norm(n).split(/\s+/).pop()),
      norm(query).split(/[^a-z0-9]+/)).filter((w) => w && w.length > 3 && STOP.indexOf(w) < 0);
    const relevant = (t) => { const n = norm(t); return keys.some((k) => k && n.indexOf(k) >= 0); };

    const lists = await Promise.all(queries.map((q) => webSearch(q).catch(() => [])));
    const seen = new Set();
    const results = [].concat(...lists).filter((r) => { if (seen.has(r.url)) return false; seen.add(r.url); return true; });
    if (!results.length) return;
    // extraits de recherche
    results.filter((r) => relevant(r.title + ' ' + r.snippet)).slice(0, 10).forEach((r) => {
      scan(r.snippet, domainOf(r.url) + ' (résultat de recherche)', r.url, 1, res.found, false, 12);
    });
    // pages complètes des sites spécialisés
    const pages = results.filter((r) => !/wikipedia\.org/.test(r.url) && relevant(r.title + ' ' + r.url))
      .sort((a, b) => (GEAR_SITES.test(b.url) ? 1 : 0) - (GEAR_SITES.test(a.url) ? 1 : 0)).slice(0, 4);
    if (onProgress && pages.length) onProgress('Lecture de ' + pages.map((p) => domainOf(p.url)).join(', ') + '…');
    await Promise.all(pages.map(async (r) => {
      const html = await fetchText(r.url, 10000);
      if (!html) return;
      const pg = pageText(html);
      const name = domainOf(r.url) + ' — ' + (pg.title || r.title).slice(0, 80);
      const before = JSON.stringify(Object.keys(res.found).map((k) => res.found[k].score));
      scan(pg.text, name, r.url, 2, res.found, false, 12);
      if (JSON.stringify(Object.keys(res.found).map((k) => res.found[k].score)) !== before) res.sources.push({ name, url: r.url });
    }));
    if (!res.genres.length) res.webText = results.map((r) => r.snippet).join(' ');
  }

  /** Recherche complète : Wikipédia + Wikidata, puis sites spécialisés. */
  async function run(query, onProgress) {
    if (onProgress) onProgress('Wikipédia et Wikidata…');
    let res = null;
    try { res = await wikiRun(query); } catch (e) { res = null; }
    if (res && res.isGenre) return null;
    const fromWiki = !!res;
    if (!res) res = { title: query, kind: 'work', performers: [], guitarists: [], genres: [], found: {}, sources: [], bpm: null };
    if (onProgress) onProgress('Recherche sur les sites spécialisés (Equipboard, Ground Guitar, Premier Guitar, Guitar World, MusicRadar, forums…)…');
    try { await webRun(res, query, onProgress); } catch (e) { /* on garde ce qu'on a */ }
    if (!fromWiki && !Object.keys(res.found).length) return null;
    if (!res.genreRef) res.genreRef = genreRef(res.genres, res.webText || '');
    return res;
  }

  /** Construit un profil de réglages à partir de la recherche (et d'une base : artiste connu ou style). */
  function buildRef(res, base) {
    const ref = JSON.parse(JSON.stringify(base));
    ref.id = 'research';
    ref.kind = 'song';
    ref.title = res.title.replace(/ \(.*\)$/, '');
    ref.artist = res.performers.join(', ') + (res.guitarists.length ? ' – ' + res.guitarists.join(', ') : '');
    ref.fx = ref.fx || {};
    // les conseils d'une autre chanson ne s'appliquent pas forcément : on ne garde que ceux d'un artiste ou d'un style
    ref.tips = base.kind === 'song' ? [] : (ref.tips || []).slice();
    const f = res.found;
    const has = (id) => f[id] && f[id].score > 0;
    const top = (cat) => Object.values(f).filter((x) => x.feature.cat === cat).sort((a, b) => b.score - a.score)[0];
    const heavy = /metal/.test(norm(res.genres.join(' ')));
    // saturation
    if (has('fuzz')) { ref.drive = 'fuzz'; ref.gain = Math.max(ref.gain, 7); }
    else if (has('dist') && f.dist.score >= 2) { ref.drive = heavy ? 'highgain' : 'distortion'; ref.gain = Math.max(ref.gain, heavy ? 8.5 : 7); }
    else if (has('od')) { if (ref.drive === 'clean') { ref.drive = 'edge'; ref.gain = Math.max(ref.gain, 4); } else if (ref.gain < 5.5) { ref.drive = 'overdrive'; ref.gain = 5.5; } }
    // guitare
    const g = top('guitar');
    if (g && g.feature.pickup) {
      ref.pickupType = g.feature.pickup;
      if (g.feature.pickup === 'single' && ref.pickup === 'both') ref.pickup = 'neck+middle';
    }
    // ampli d'origine : petite correction d'égalisation
    const a = top('amp');
    if (a) {
      const eq = ref.eq = Object.assign({ bass: 5, mid: 5, treble: 5, presence: 5 }, ref.eq);
      if (a.feature.amp === 'marshall') eq.mid += 1;
      if (a.feature.amp === 'vox') eq.treble += 1;
      if (a.feature.amp === 'highgain') { eq.bass += 0.5; if (ref.gain < 7) { ref.drive = 'distortion'; ref.gain = 7; } }
      if (a.feature.amp === 'fender' && ref.drive !== 'clean') eq.mid -= 0.5;
    }
    // effets
    if (has('comp')) ref.fx.comp = ref.fx.comp || 4;
    if (has('chorus')) ref.fx.chorus = ref.fx.chorus || { rate: 3, depth: 5 };
    if (has('phaser')) ref.fx.phaser = ref.fx.phaser || { speed: 3, depth: 5 };
    if (has('flanger')) ref.fx.flanger = ref.fx.flanger || { rate: 3, depth: 5 };
    if (has('vibe')) ref.fx.vibe = ref.fx.vibe || { speed: 4, depth: 5 };
    if (has('tremolo')) ref.fx.tremolo = ref.fx.tremolo || { speed: 5, depth: 5 };
    if (has('wah')) ref.fx.wah = ref.fx.wah || 'pour les solos et les effets';
    if (has('octave')) ref.fx.octave = ref.fx.octave || (/octave (down|lower|below)/i.test(f.octave.quotes.map((q) => q.text).join(' ')) ? 'down' : 'up');
    if (has('delay')) {
      const slap = /slapback/i.test(f.delay.quotes.map((q) => q.text).join(' '));
      ref.fx.delay = ref.fx.delay || (slap ? { ms: 110, mix: 4, repeats: 1 } : res.bpm ? { ms: Math.round(60000 / res.bpm), mix: 3, repeats: 3 } : { ms: 400, mix: 3, repeats: 3 });
    }
    if (has('reverb')) ref.fx.reverb = Math.max(ref.fx.reverb || 0, 4);
    // accordage
    const t = top('tuning');
    if (t) ref.tuning = t.feature.tuning;
    // jeu
    if (has('p-slide')) ref.tips.unshift('Joue au bottleneck (slide), souvent en accordage ouvert.');
    if (has('p-palm')) ref.tips.unshift('Beaucoup de palm mute (tranche de la main sur le chevalet).');
    if (has('p-finger')) ref.tips.unshift('Joué aux doigts plutôt qu’au médiator.');
    if (has('p-tapping')) ref.tips.unshift('Passages en tapping.');
    if (has('p-dyn')) ref.tips.unshift('Couplets en son clair (coupe la saturation), refrains avec la saturation à fond.');
    if (has('talkbox')) ref.tips.push('L’original utilise une talk box : pas d’équivalent simple, une wah bougée lentement s’en approche un peu.');
    if (has('ebow')) ref.tips.push('L’original utilise un E-Bow (sustain infini) : monte le gain et joue en hammer-on, ou utilise le volume de la guitare.');
    ref.desc = 'Réglages construits à partir de ce que j’ai trouvé sur ce morceau / cet artiste (voir « Ce que j’ai trouvé » en bas).';
    return ref;
  }

  window.ToneResearch = { run, buildRef, scan, webSearch, pageText, FEATURES };
})();
