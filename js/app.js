/* Routeur minimal et utilitaires d'interface. */
(function () {
  'use strict';

  const routes = {};
  let current = null;

  function register(path, page) { routes[path] = page; }

  function h(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k === 'text') e.textContent = v;
        else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
        else if (v === true) e.setAttribute(k, '');
        else e.setAttribute(k, v);
      }
    }
    (children || []).forEach((c) => {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return e;
  }

  function select(options, value, onchange, attrs) {
    const s = h('select', attrs);
    options.forEach((o) => {
      const opt = typeof o === 'object' ? o : { value: o, label: o };
      const oe = h('option', { value: opt.value, text: opt.label });
      if (opt.group) oe.dataset.group = opt.group;
      s.appendChild(oe);
    });
    if (value != null) s.value = value;
    if (onchange) s.addEventListener('change', () => onchange(s.value));
    return s;
  }

  function field(label, control, hint) {
    return h('label', { class: 'field' }, [h('span', { class: 'field-label', text: label }), control, hint ? h('small', { class: 'hint', text: hint }) : null]);
  }

  function store(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  function renderHome(el) {
    el.appendChild(h('section', { class: 'hero' }, [
      h('h1', { text: 'Ton atelier de musique' }),
      h('p', { class: 'lead', text: 'Entraîne ton oreille et ta lecture, révise tes gammes, et transforme une partition en fiche d’accompagnement guitare prête à imprimer.' })
    ]));
    const card = (href, icon, title, text) => h('a', { class: 'card link-card', href }, [
      h('div', { class: 'card-icon', text: icon }), h('h3', { text: title }), h('p', { text: text })
    ]);
    el.appendChild(h('h2', { class: 'section-heading theorie', text: 'Théorie' }));
    el.appendChild(h('div', { class: 'grid cards' }, [
      card('#/theorie/oreille', '👂', 'Oreille', 'Reconnaître les notes, les intervalles et les accords au son. 5 niveaux de difficulté.'),
      card('#/theorie/lecture', '🎼', 'Lecture de notes', 'Clé de sol, clé de fa ou les deux, des notes dans la portée jusqu’aux altérations.'),
      card('#/theorie/gammes', '📚', 'Gammes', 'Majeure, mineures, modes, pentatoniques, blues… expliquées et à écouter.'),
      card('#/theorie/rythme', '🥁', 'Rythme', 'Croches, doubles croches, pointées, syncopes : explications, reconnaissance à l’oreille et exercice de frappe.'),
      card('#/theorie/accords', '🧱', 'Accords', 'Comment on construit un accord : triades, septièmes, extensions, renversements. Constructeur et quiz.')
    ]));
    el.appendChild(h('h2', { class: 'section-heading guitare', text: 'Guitare' }));
    el.appendChild(h('div', { class: 'grid cards' }, [
      card('#/guitare/notes-manche', '🧠', 'Notes du manche', 'Mémorise les notes des 12 premières cases : explications, repères et jeu.'),
      card('#/guitare/manche', '🎸', 'Gammes sur le manche', 'Toutes les gammes sur le manche, par position, avec les fondamentales en évidence.'),
      card('#/guitare/formes-accords', '📖', 'Formes d’accords', 'La banque de formes mobiles : chaque forme = un type d’accord, la fondamentale est repérée.'),
      card('#/guitare/jeu-accords', '🎮', 'Jeu : construis l’accord', 'Un nom d’accord s’affiche : place les doigts sur le manche pour le jouer.'),
      card('#/guitare/guitaristes', '⭐', 'Guitaristes', 'La vie, le matériel et la technique des grands guitaristes.'),
      card('#/guitare/son', '🎛', 'Trouver le son', 'Ton matériel + le son d’une chanson ou d’un artiste = les réglages de guitare, pédales et ampli.'),
      card('#/guitare/backing', '🎶', 'Backing tracks', 'Cherche une backing track, démarre juste avant le solo, en boucle et à la vitesse voulue.'),
      card('#/guitare/accompagnement', '📄', 'Partition → accompagnement', 'Importe ou scanne une partition : accords, rythmique selon le style, fiche PDF d’une page.')
    ]));
  }

  function route() {
    const hash = location.hash.replace(/^#/, '') || '/';
    const page = routes[hash];
    const app = document.getElementById('app');
    if (current && current.destroy) current.destroy();
    app.innerHTML = '';
    document.querySelectorAll('.sections a').forEach((a) => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + hash);
    });
    const section = hash.split('/')[1] || '';
    document.body.dataset.section = section;
    if (!page) {
      current = null;
      document.title = 'Atelier musique';
      renderHome(app);
      return;
    }
    current = page;
    document.title = page.title + ' · Atelier musique';
    const wrap = h('div', { class: 'page ' + section });
    wrap.appendChild(h('div', { class: 'page-head' }, [
      h('span', { class: 'crumb ' + section, text: section === 'guitare' ? 'Guitare' : 'Théorie' }),
      h('h1', { text: page.title }),
      page.subtitle ? h('p', { class: 'lead', text: page.subtitle }) : null
    ]));
    const body = h('div', { class: 'page-body' });
    wrap.appendChild(body);
    app.appendChild(wrap);
    page.render(body);
    window.scrollTo(0, 0);
  }

  function start() {
    window.addEventListener('hashchange', route);
    route();
  }

  window.App = { register, start, h, select, field, store, save, route };
})();
