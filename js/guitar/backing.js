/*
 * Backing tracks : recherche sur YouTube, lecture intégrée (pas de téléchargement),
 * départ juste avant le solo quand la description indique où il commence, boucle A-B, vitesse.
 */
(function () {
  'use strict';
  const { h } = App;
  const norm = (t) => (t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  const PROXIES = [
    (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
    (u) => 'https://corsproxy.io/?url=' + encodeURIComponent(u),
    (u) => 'https://api.codetabs.com/v1/proxy/?quest=' + encodeURIComponent(u)
  ];
  async function fetchText(url, timeout) {
    for (const p of PROXIES) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), timeout || 10000);
      try {
        const r = await fetch(p(url), { signal: ctl.signal });
        clearTimeout(timer);
        if (r.ok) { const t = await r.text(); if (t && t.length > 100) return t; }
      } catch (e) { clearTimeout(timer); }
    }
    return null;
  }

  const videoId = (url) => {
    const m = /(?:v=|youtu\.be\/|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/.exec(url || '');
    return m ? m[1] : null;
  };

  /** Recherche des vidéos YouTube via DuckDuckGo. */
  async function searchVideos(q) {
    const html = await fetchText('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(q + ' site:youtube.com'));
    if (!html) return [];
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const out = [];
    doc.querySelectorAll('.result').forEach((r) => {
      const a = r.querySelector('a.result__a');
      if (!a) return;
      let href = a.getAttribute('href') || '';
      try { const u = new URL(href, 'https://duckduckgo.com'); href = u.searchParams.get('uddg') || u.href; } catch (e) { /* tel quel */ }
      const id = videoId(href);
      if (id && !out.some((x) => x.id === id)) out.push({ id, title: a.textContent.replace(/\s*-\s*YouTube\s*$/i, '').trim(), snippet: ((r.querySelector('.result__snippet') || {}).textContent || '').trim() });
    });
    return out;
  }

  function parseQuery(q) {
    const wantsSolo = /\bsolo\b/i.test(q);
    const song = q.replace(/backing ?tracks?|\bbacking\b|\bsolo\b|\bguitar\b|\bguitare\b|\bpour\b|\bdu\b|\bde\b|\bthe\b/gi, ' ').replace(/\s+/g, ' ').trim();
    return { wantsSolo, song };
  }

  function rank(v, song, wantsSolo) {
    const t = norm(v.title + ' ' + v.snippet);
    let s = 0;
    if (/backing/.test(t)) s += 4;
    if (wantsSolo && /solo/.test(t)) s += 3;
    norm(song).split(/\s+/).filter((w) => w.length > 2).forEach((w) => { if (t.indexOf(w) >= 0) s += 2; });
    if (/guitar|jam/.test(t)) s += 1;
    if (/lesson|tutorial|how to play|reaction|cover by|live at/.test(t) && !/backing/.test(t)) s -= 4;
    return s;
  }

  const toSec = (ts) => ts.split(':').map(Number).reduce((a, b) => a * 60 + b, 0);
  const fmtTime = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  /** Lit la description de la vidéo et cherche l'horodatage du solo (« 3:45 Solo »). */
  async function findSolo(id) {
    const html = await fetchText('https://www.youtube.com/watch?v=' + id, 12000);
    if (!html) return null;
    let desc = '';
    const m = /"shortDescription":"((?:[^"\\]|\\.)*)"/.exec(html);
    if (m) { try { desc = JSON.parse('"' + m[1] + '"'); } catch (e) { desc = m[1]; } }
    const stamps = [];
    desc.split(/\n/).forEach((line) => {
      const t = /(\d{1,2}:\d{2}(?::\d{2})?)/.exec(line);
      if (t) stamps.push({ sec: toSec(t[1]), label: line.replace(t[1], '').replace(/^[\s\-–—:|)(]+|[\s\-–—:|]+$/g, '').trim() || line.trim() });
    });
    stamps.sort((a, b) => a.sec - b.sec);
    const solo = stamps.find((s) => /solo/i.test(s.label));
    if (!solo) return { stamps };
    const next = stamps.find((s) => s.sec > solo.sec);
    return { stamps, solo: solo.sec, end: next ? next.sec : null, label: solo.label };
  }

  /* ------------------------------------------------------------------ */
  /* Lecteur YouTube                                                     */
  /* ------------------------------------------------------------------ */
  let apiPromise = null;
  function loadYT() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((res) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); res(); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    });
    return apiPromise;
  }

  function render(el) {
    const input = h('input', { type: 'text', placeholder: 'ex. backing track solo Stairway to Heaven' });
    const btn = h('button', { class: 'btn primary', text: 'Chercher' });
    const msg = h('div');
    const recent = h('div', { class: 'recent' });
    const out = h('div');
    el.appendChild(h('div', { class: 'panel' }, [
      h('div', { class: 'free-search' }, [input, btn]),
      h('p', { class: 'hint', text: 'Écris « solo » pour démarrer juste avant le solo. La backing track se joue ici, en boucle, à la vitesse que tu veux. Pas de téléchargement : les backing tracks de morceaux connus sont protégées par le droit d’auteur, et la lecture intégrée évite tout risque de virus.' }),
      recent, msg
    ]));
    el.appendChild(out);
    let player = null;
    let loopTimer = null;

    function cache() { return App.store('backingCache', {}); }
    function drawRecent() {
      recent.innerHTML = '';
      const c = cache();
      const list = Object.values(c).sort((a, b) => b.date - a.date).slice(0, 12);
      if (!list.length) return;
      recent.appendChild(h('div', { class: 'family', text: '⚡ Déjà cherchés' }));
      recent.appendChild(h('div', { class: 'chips' }, list.map((e) => {
        const b = h('button', { class: 'btn small', text: e.query });
        b.addEventListener('click', () => { input.value = e.query; search(e.query); });
        return b;
      })));
    }

    async function search(q, force) {
      q = (q || '').trim();
      if (!q) return;
      const key = norm(q).replace(/[^a-z0-9]+/g, ' ').trim();
      const c = cache();
      msg.innerHTML = '';
      if (!force && c[key]) { show(c[key].result, q, true); return; }
      const { wantsSolo, song } = parseQuery(q);
      msg.appendChild(h('div', { class: 'feedback info', text: '🔎 Recherche de backing tracks pour « ' + song + ' »…' }));
      out.innerHTML = '';
      let vids = [];
      try {
        const lists = await Promise.all([
          searchVideos(song + (wantsSolo ? ' solo' : '') + ' backing track'),
          wantsSolo ? searchVideos(song + ' backing track') : Promise.resolve([])
        ]);
        const seen = new Set();
        vids = [].concat(...lists).filter((v) => { if (seen.has(v.id)) return false; seen.add(v.id); return true; });
      } catch (e) { vids = []; }
      vids.forEach((v) => { v.score = rank(v, song, wantsSolo); });
      vids = vids.filter((v) => v.score > 0).sort((a, b) => b.score - a.score).slice(0, 8);
      msg.innerHTML = '';
      if (!vids.length) {
        msg.appendChild(h('div', { class: 'notice warn', text: 'Aucune backing track trouvée (ou la recherche n’a pas pu se faire). Vérifie l’orthographe du morceau, ou ta connexion.' }));
        return;
      }
      const result = { wantsSolo, song, videos: vids, chosen: 0, marks: {} };
      await locate(result, 0);
      c[key] = { query: q, date: Date.now(), result };
      const keys = Object.keys(c).sort((a, b) => c[b].date - c[a].date);
      keys.slice(60).forEach((k) => delete c[k]);
      App.save('backingCache', c);
      drawRecent();
      show(result, q, false);
    }

    /** Détermine le début (juste avant le solo) et la fin pour la vidéo n°i. */
    async function locate(result, i) {
      const v = result.videos[i];
      if (v.start != null) return;
      v.start = 0; v.end = null; v.how = '';
      const soloInTitle = /solo/i.test(v.title);
      if (result.wantsSolo) {
        msg.appendChild(h('div', { class: 'feedback info', text: '⏱ Je cherche où commence le solo dans la description de la vidéo…' }));
        let info = null;
        try { info = await findSolo(v.id); } catch (e) { info = null; }
        msg.innerHTML = '';
        if (info && info.solo != null) {
          v.start = Math.max(0, info.solo - 15);
          v.end = info.end;
          v.soloAt = info.solo;
          v.how = `D’après la description : « ${info.label} » à ${fmtTime(info.solo)}. Je démarre 15 secondes avant pour que tu entendes l’arrivée du solo.`;
        } else if (soloInTitle) {
          v.how = 'Cette backing track ne contient que le solo : elle démarre au début, avec la partie qui y mène.';
        } else {
          v.how = 'Je n’ai pas trouvé où commence le solo dans cette vidéo : avance jusqu’au solo puis appuie sur « Début ici » (le repère est gardé pour la prochaine fois).';
        }
      }
      const saved = App.store('backingMarks', {})[v.id];
      if (saved) { v.start = saved.start; v.end = saved.end; v.how = 'Tes repères enregistrés pour cette vidéo.'; }
    }

    function show(result, q, fromCache) {
      out.innerHTML = '';
      clearInterval(loopTimer);
      const v = result.videos[result.chosen];
      const card = h('div', { class: 'panel backing' });
      if (fromCache) {
        const again = h('button', { class: 'btn small', text: '🔄 Refaire la recherche' });
        again.addEventListener('click', () => search(q, true));
        card.appendChild(h('div', { class: 'cache-note' }, [h('span', { text: '⚡ Résultat gardé en mémoire.' }), again]));
      }
      card.appendChild(h('h2', { style: 'margin-top:0', text: v.title }));
      if (v.how) card.appendChild(h('div', { class: 'notice', text: v.how }));
      const frame = h('div', { class: 'yt-frame' }, [h('div', { id: 'yt-player' })]);
      card.appendChild(frame);

      const status = h('div', { class: 'hint' });
      const startBtn = h('button', { class: 'btn primary', text: '▶ Jouer depuis le début du passage' });
      const loopCb = h('input', { type: 'checkbox' });
      loopCb.checked = true;
      const setA = h('button', { class: 'btn small', text: '⏮ Début ici' });
      const setB = h('button', { class: 'btn small', text: '⏭ Fin ici' });
      const back = h('button', { class: 'btn small', text: '−5 s' });
      const fwd = h('button', { class: 'btn small', text: '+5 s' });
      const resetM = h('button', { class: 'btn small', text: 'Effacer les repères' });
      const speed = App.select([0.5, 0.75, 0.85, 1].map((x) => ({ value: x, label: (x * 100) + ' %' })), 1, (val) => { if (player && player.setPlaybackRate) player.setPlaybackRate(+val); });
      card.appendChild(h('div', { class: 'btn-row', style: 'margin-top:.6rem' }, [startBtn, h('label', { class: 'checkbox' }, [loopCb, 'En boucle']), App.field('Vitesse', speed)]));
      card.appendChild(h('div', { class: 'btn-row', style: 'margin-top:.4rem' }, [setA, setB, back, fwd, resetM]));
      card.appendChild(status);
      const ytLink = h('a', { href: 'https://www.youtube.com/watch?v=' + v.id + '&t=' + Math.floor(v.start || 0) + 's', target: '_blank', rel: 'noopener', text: 'Ouvrir sur YouTube' });
      card.appendChild(h('p', { class: 'hint' }, [document.createTextNode('La vidéo ne se lance pas ici (certaines interdisent la lecture sur d’autres sites) ? '), ytLink]));

      const drawStatus = () => { status.textContent = 'Passage : de ' + fmtTime(v.start || 0) + (v.end ? ' à ' + fmtTime(v.end) : ' à la fin') + (v.soloAt != null ? ' · solo à ' + fmtTime(v.soloAt) : ''); };
      drawStatus();
      const saveMarks = () => { const m = App.store('backingMarks', {}); m[v.id] = { start: v.start || 0, end: v.end || null }; App.save('backingMarks', m); };
      const now = () => (player && player.getCurrentTime ? player.getCurrentTime() : 0);
      startBtn.addEventListener('click', () => { if (player && player.seekTo) { player.seekTo(v.start || 0, true); player.playVideo(); } });
      setA.addEventListener('click', () => { v.start = Math.floor(now()); if (v.end && v.end <= v.start) v.end = null; saveMarks(); drawStatus(); });
      setB.addEventListener('click', () => { const t = Math.ceil(now()); if (t > (v.start || 0)) { v.end = t; saveMarks(); drawStatus(); } });
      back.addEventListener('click', () => player && player.seekTo(Math.max(0, now() - 5), true));
      fwd.addEventListener('click', () => player && player.seekTo(now() + 5, true));
      resetM.addEventListener('click', () => { const m = App.store('backingMarks', {}); delete m[v.id]; App.save('backingMarks', m); v.start = 0; v.end = null; drawStatus(); });

      if (result.videos.length > 1) {
        card.appendChild(h('h3', { text: 'Autres backing tracks trouvées' }));
        card.appendChild(h('div', { class: 'chips' }, result.videos.map((x, i) => {
          if (i === result.chosen) return null;
          const b = h('button', { class: 'btn small', text: x.title.slice(0, 70) });
          b.addEventListener('click', async () => { result.chosen = i; await locate(result, i); show(result, q, false); });
          return b;
        }).filter(Boolean)));
      }
      out.appendChild(card);

      loadYT().then(() => {
        if (player && player.destroy) { try { player.destroy(); } catch (e) { /* ignore */ } }
        player = new YT.Player('yt-player', {
          videoId: v.id, width: '100%', height: '100%',
          playerVars: { start: Math.floor(v.start || 0), rel: 0, modestbranding: 1, playsinline: 1 },
          events: { onReady: () => { if (player.setPlaybackRate) player.setPlaybackRate(+speed.value); } }
        });
        // boucle sur le passage
        loopTimer = setInterval(() => {
          if (!player || !player.getCurrentTime || !player.getPlayerState) return;
          const t = player.getCurrentTime();
          const playing = player.getPlayerState() === 1;
          const ended = player.getPlayerState() === 0;
          if (loopCb.checked && ((playing && v.end && t >= v.end) || ended)) player.seekTo(v.start || 0, true), player.playVideo();
        }, 250);
      });
    }

    btn.addEventListener('click', () => search(input.value));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(input.value); });
    drawRecent();
    return { destroy() { clearInterval(loopTimer); if (player && player.destroy) try { player.destroy(); } catch (e) { /* ignore */ } } };
  }

  let inst = null;
  App.register('/guitare/backing', {
    title: 'Backing tracks',
    subtitle: 'Cherche une backing track (ex. « solo Stairway to Heaven ») : elle se joue ici, démarre juste avant le solo et tourne en boucle pour t’entraîner.',
    render(el) { inst = render(el); },
    destroy() { inst && inst.destroy(); }
  });

  window.Backing = { parseQuery, rank, findSolo, searchVideos };
})();
