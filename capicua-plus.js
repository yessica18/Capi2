/* =====================================================================
   CAPICÚA 2.0 — capa "Plus" (código legible, sin dependencias)
   ---------------------------------------------------------------------
   Se integra con el motor existente (CapEngine, CapUI, CapBattle,
   CapContent, CapSabios, CapW3) a través de ganchos pequeños añadidos
   en script.js / script-3d.js / script-extra.js. No reemplaza nada:
   si este archivo no carga, la plataforma sigue funcionando igual.

   Módulos:
     1. Estado propio (S.plus) guardado con el progreso normal
     2. Calidad gráfica automática + Modo rendimiento
     3. Tema claro mágico (migración única)
     4. Batallas: daño por dificultad, combos, ataques matemáticos,
        contraataque con ayuda de Capi, derrota no violenta e insignias
     5. Olvidina: repaso espaciado como batalla + aviso en Inicio
     6. Consejo de los Sabios (escena 3D explorable con respaldo 2D)
     7. Micrófono con estados reales (permiso, escucha, proceso, voz)
     8. Insignias / accesorios matemáticos desbloqueables
   ===================================================================== */
(function () {
  'use strict';
  const E = window.CapEngine, UI = window.CapUI, C = window.CapContent;
  if (!E || !UI || !C) return;

  const S = () => E.S;
  const esc = UI.esc || (s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduced = () => !!(S().settings && S().settings.motion) || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const save = (now) => { try { E.Store.save(now); } catch (e) { /* sin conexión: se guarda local */ } };
  const route = () => (location.hash.slice(1) || 'inicio');
  const capiFace = (expr, size = 56) => { try { return window.CapIA ? CapIA.capia({ expr, size, anim: false }) : ''; } catch (e) { return ''; } };
  const say = (txt, mood) => { try { if (S().settings.voice) E.voice.say(txt, { mood }); } catch (e) {} };

  /* ------------------------------------------------------------------
     1. Estado propio
     ------------------------------------------------------------------ */
  function P() {
    const s = S();
    if (!s.plus || typeof s.plus !== 'object') s.plus = {};
    const p = s.plus;
    p.v = 1;
    p.badges = p.badges || {};       // enemigos derrotados con animación de conocimiento
    p.charms = p.charms || ['charm-ninguno'];
    p.charm = p.charm || 'charm-ninguno';
    p.ally = p.ally || null;         // sabio aliado (aporta su ataque especial)
    p.met = p.met || {};             // sabios con los que hablaste en el Consejo
    p.perf = p.perf || 'auto';       // auto | on | off
    p.olv = p.olv || { wins: 0, fights: 0 };
    return p;
  }

  /* ------------------------------------------------------------------
     2. Calidad gráfica automática + Modo rendimiento
     ------------------------------------------------------------------ */
  const Quality = (() => {
    const nav = navigator, mem = nav.deviceMemory || 4, cpu = nav.hardwareConcurrency || 4;
    const saveData = !!(nav.connection && nav.connection.saveData);
    const touch = matchMedia('(pointer:coarse)').matches;
    let tier = 'MEDIUM';
    if (saveData || mem <= 2 || cpu <= 2 || (touch && (mem <= 3 || cpu <= 4))) tier = 'LOW';
    else if (!touch && mem >= 8 && cpu >= 8) tier = 'HIGH';
    return { tier, touch };
  })();
  function perfOn() {
    const p = P().perf;
    return p === 'on' || (p === 'auto' && Quality.tier === 'LOW') || (S().settings && S().settings.gfx === 'rendimiento');
  }
  function applyPerf() {
    const html = document.documentElement;
    html.classList.toggle('perf-mode', perfOn());
    html.classList.toggle('touch', Quality.touch);
    html.classList.toggle('reduce-motion', reduced());
    html.dataset.quality = perfOn() ? 'LOW' : Quality.tier;
  }

  /* ------------------------------------------------------------------
     3. Tema claro mágico: las cuentas existentes pasan una sola vez
        al tema claro (pueden volver al espacial en Ajustes).
     ------------------------------------------------------------------ */
  function migrateTheme() {
    const s = S(), p = P();
    if (p.themeMigrated) return;
    p.themeMigrated = true;
    if (!s.settings) return;
    if (!s.settings.theme || s.settings.theme === 'system' || s.settings.theme === 'dark') {
      s.settings.theme = 'light';
      document.documentElement.setAttribute('data-theme', 'light');
    }
    save();
  }

  /* ------------------------------------------------------------------
     4. Batallas
     ------------------------------------------------------------------ */
  const ATTACKS = {
    aritmetica: ['1 2 3', 'Ataque numérico'], algebra: ['x', 'Espada algebraica'], geometria: ['△', 'Golpe geométrico'],
    trigonometria: ['θ', 'Flecha trigonométrica'], datos: ['σ', 'Ataque estadístico'], lineal: ['[ ]', 'Matriz de impacto'],
    calculo: ['d/dx', 'Derivada'], vectorial: ['→', 'Vector'], ecdif: ['∫', 'Ataque integral'],
    fisica: ['F=ma', 'Impulso de Newton'], em: ['Ω', 'Descarga electromagnética'], ingenieria: ['∴', 'Rayo del conocimiento']
  };
  const ALLY_ATTACKS = {
    pitagoras: ['a²+b²', 'Golpe pitagórico'], euclides: ['△', 'Demostración de Euclides'], arquimedes: ['π', 'Palanca de Arquímedes'],
    hipatia: ['☉', 'Astrolabio de Hipatia'], alkhwarizmi: ['x=', 'Algoritmo de Al-Juarismi'], fibonacci: ['1 1 2 3 5', 'Espiral de Fibonacci'],
    descartes: ['(x,y)', 'Plano cartesiano'], newton: ['F=ma', 'Trayectoria de Newton'], leibniz: ['∫', 'Integral de Leibniz'],
    euler: ['eˣ', 'Exponencial de Euler'], gauss: ['∑', 'Suma de Gauss'], lovelace: ['{ }', 'Código de Ada'],
    noether: ['⟲', 'Simetría de Noether'], turing: ['0 1', 'Máquina de Turing'], mirzakhani: ['∞', 'Geometría dinámica']
  };
  const DIFF = { 1: ['fácil', 10], 2: ['media', 20], 3: ['difícil', 35], jefe: ['jefe', 50] };
  const comboMult = n => (n >= 15 ? 5 : n >= 10 ? 4 : n >= 5 ? 3 : n >= 3 ? 2 : 1);

  function currentRegion() {
    const r = route().split('.');
    const lv = C.LEVELS && C.LEVELS[String(r[1] || '').replace(/p$/, '')];
    if (lv) return lv.region;
    if (r[0] === 'region' || r[0] === 'jefe') return r[1];
    return null;
  }
  function difficulty(foe) {
    const r = route().split('.');
    if ((foe && foe.boss) || r[0] === 'jefe') return 'jefe';
    const id = String(r[1] || '').replace(/p$/, '');
    if (C.LEVELS && C.LEVELS[id]) { try { return E.difficultyFor(id) || 2; } catch (e) { return 2; } }
    return 2;
  }
  function attackFor() {
    const ally = P().ally;
    if (ally && ALLY_ATTACKS[ally] && Math.random() < 0.35) return ALLY_ATTACKS[ally];
    return ATTACKS[currentRegion()] || ['✦', 'Rayo del conocimiento'];
  }
  function fx(host, cls, html, ms) {
    if (!host) return;
    const el = document.createElement('div');
    el.className = cls; el.innerHTML = html;
    host.appendChild(el);
    setTimeout(() => el.remove(), ms);
  }

  /** HUD flotante: si la arena sale de la pantalla, las barras de vida siguen visibles. */
  const Hud = (() => {
    let bar = null, io = null, watched = null, mo = null;
    const sync = () => { if (bar && watched && watched.isConnected) bar.querySelector('.inner').innerHTML = watched.innerHTML; };
    function watch(duel) {
      const hud = duel && duel.querySelector('.duelhud');
      if (!hud || hud === watched) return;
      watched = hud;
      if (!bar) {
        bar = document.createElement('div'); bar.id = 'plusHud'; bar.setAttribute('aria-hidden', 'true'); bar.hidden = true;
        bar.innerHTML = '<div class="inner duelhud"></div>'; document.body.appendChild(bar);
      }
      io && io.disconnect(); mo && mo.disconnect();
      const topH = () => { const t = document.getElementById('top'); return t && !t.hidden ? Math.round(t.getBoundingClientRect().bottom) : 0; };
      io = new IntersectionObserver(([en]) => { bar.style.top = (topH() + 6) + 'px'; bar.hidden = en.isIntersecting || !watched.isConnected; sync(); }, { rootMargin: `-${topH() + 4}px 0px 0px 0px` });
      io.observe(hud);
      mo = new MutationObserver(sync); mo.observe(hud, { subtree: true, childList: true, characterData: true, attributes: true });
      addEventListener('hashchange', () => { bar.hidden = true; io.disconnect(); mo.disconnect(); watched = null; }, { once: true });
    }
    const visibleHost = duel => (bar && !bar.hidden) ? bar : duel;
    return { watch, visibleHost };
  })();

  const Battle = {
    /** Recalcula el daño: dificultad × calidad de la respuesta × combo. */
    damage(base, foe, hitsBefore, duel) {
      try {
        const d = difficulty(foe), [dLabel, dBase] = DIFF[d] || DIFF[2];
        const quality = base >= 10 ? 1 : base >= 8 ? 0.8 : 0.6;     // al primer intento / reintento / con pistas
        const combo = (hitsBefore || 0) + 1, mult = comboMult(combo);
        const dmg = Math.max(1, Math.round(dBase * quality * (1 + 0.15 * (mult - 1))));
        const [glyph, name] = attackFor();
        if (duel && !reduced()) {
          const stage = duel.querySelector('.stage') || duel;
          fx(stage, 'plus-proj', esc(glyph), 600);
          setTimeout(() => fx(stage, 'plus-flash', '', 500), 380);
        }
        if (duel) {
          Hud.watch(duel);
          const host = Hud.visibleHost(duel);
          fx(host, 'plus-dmg', `+${dmg} DAÑO<small>${esc(name)} · ${esc(dLabel)}</small>`, 1200);
          $$('.plus-combo').forEach(o => o.remove());
          if (mult > 1) fx(host, 'plus-combo', 'COMBO x' + mult, 2600);
          $$('.plus-coach').forEach(c => c.remove());
        }
        const s = S(); s.bestCombo = Math.max(s.bestCombo || 0, combo);
        return dmg;
      } catch (e) { return base; }
    },
    /** El enemigo contraataca: Capi convierte el error en información. */
    miss(foe, duel, dmg) {
      if (!duel) return;
      Hud.watch(duel);
      $$('.plus-coach').forEach(c => c.remove());
      const info = (C.ENEMY_INFO || {})[foe && foe.id] || {};
      const fname = (window.CapBattle && CapBattle.foeName && CapBattle.foeName(foe.id)) || (foe && foe.name) || 'El enemigo';
      fx(Hud.visibleHost(duel), 'plus-dmg bad', `−${dmg || ''} PV<small>${esc(fname)} contraataca${info.taunts ? ': ' + esc(info.taunts[0]) : ''}</small>`, 1200);
      const lv = String(route().split('.')[1] || '').replace(/p$/, '');
      const box = document.createElement('div');
      box.className = 'plus-coach'; box.setAttribute('role', 'status');
      box.innerHTML = `<div class="face">${capiFace('soft')}</div><div><p><b>¡No pasa nada!</b> Encontramos dónde estuvo el error. Mira la explicación y vuelve a atacar: el combo se reinicia, pero tu experiencia se queda.</p>
        <div class="row"><button type="button" class="btn sm primary" data-c="retry">Intentar de nuevo</button><button type="button" class="btn sm" data-c="hint">Ver pista</button>${C.LEVELS && C.LEVELS[lv] ? '<button type="button" class="btn sm ghost" data-c="review">Repasar el tema</button>' : ''}</div></div>`;
      const lastEx = () => { const xs = $$('.ex'); return xs[xs.length - 1]; };
      const exNow = lastEx();
      if (exNow && exNow.parentNode && !duel.contains(exNow)) exNow.after(box); else duel.appendChild(box);
      box.querySelector('[data-c=retry]').onclick = () => {
        const ex = lastEx(); box.remove();
        if (!ex) return;
        ex.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'center' });
        const inp = ex.querySelector('.answerzone input, .answerzone select, .opt'); inp && inp.focus();
      };
      box.querySelector('[data-c=hint]').onclick = () => { const ex = lastEx(); const b = ex && ex.querySelector('[data-a=hint]'); b ? b.click() : UI.toast('Pista', 'Abre la pista dentro del ejercicio.', 'i'); };
      const rv = box.querySelector('[data-c=review]'); if (rv) rv.onclick = () => UI.go('enciclopedia.' + lv);
      setTimeout(() => box.isConnected && box.remove(), 20000);
    },
    /** Derrota no violenta: el enemigo se convierte en conocimiento. */
    defeat(foe, duel) {
      const id = foe && (foe.boss ? 'boss' : foe.id);
      const fname = (window.CapBattle && CapBattle.foeName && CapBattle.foeName(id)) || (foe && foe.name) || 'El enemigo';
      const p = P(); const first = !p.badges[id];
      p.badges[id] = (p.badges[id] || 0) + 1;
      if (duel) {
        let sparks = '';
        if (!reduced()) {
          const glyphs = ['π', '∑', '√', '∞', '∫', 'θ', 'Δ', 'φ', '+', '×'], cols = ['#ffd34d', '#8ff3dc', '#c9a4ff', '#ff9ec8', '#9fd8ff'];
          for (let i = 0; i < 26; i++) {
            const a = Math.random() * Math.PI * 2, r = 80 + Math.random() * 140;
            sparks += `<i style="--x:${60 + Math.random() * 25}%;--y:${35 + Math.random() * 25}%;--dx:${Math.cos(a) * r}px;--dy:${Math.sin(a) * r}px;--c:${cols[i % 5]}">${glyphs[i % glyphs.length]}</i>`;
          }
        }
        fx(duel, 'plus-ko', `${sparks}<b>¡${esc(String(fname).toUpperCase())} HA SIDO DERROTAD${/a$/i.test(fname) ? 'A' : 'O'}!<br><small>Se convirtió en conocimiento</small></b>`, 2600);
      }
      if (first) {
        setTimeout(() => UI.toast('Nueva insignia', `Vencedora de ${fname}. En CAPICÚA no luchas contra las matemáticas: aprendes a utilizarlas.`, '★'), 1400);
        try { E.addPI(10, 'Insignia de enemigo'); } catch (e) {}
      }
      Charms.check();
      save();
    }
  };

  /* ------------------------------------------------------------------
     5. Olvidina: el repaso espaciado como batalla
     ------------------------------------------------------------------ */
  function olvidina(card, n) {
    if (!window.CapBattle || !CapBattle.arena) return null;
    const wrap = document.createElement('div');
    wrap.className = 'stack tight';
    wrap.innerHTML = '<div class="fb info"><div><b>¡Olvidina está intentando borrar lo que aprendiste!</b> Cada repaso correcto la debilita: así funciona la memoria de largo plazo (repetición espaciada y recuperación activa).</div></div>';
    card.parentNode.insertBefore(wrap, card);
    const base = (C.ENEMIES.minor || []).find(e => e.id === 'olvido') || { id: 'olvido', name: 'Olvido' };
    const foe = Object.assign({}, base, { id: 'olvido', tier: 1, title: 'La que borra lo que no repasas' });
    const hp = Math.max(30, n * 20);
    let arena = null;
    try { arena = CapBattle.arena(wrap, foe, hp, { height: innerWidth < 600 ? '200px' : '240px' }); } catch (e) { arena = null; }
    const p = P(); p.olv.fights++; save();
    return {
      hit(res) { if (arena) arena.hit(res && res.attempts === 1 && !res.hints ? 12 : 8); },
      miss() { if (arena) arena.taunt(); },
      end(ok, total) {
        if (arena && arena.hp > 0) {
          arena.say && arena.say('Volveré cuando dejes de repasar…');
          UI.toast('Olvidina huyó', `Recordaste ${ok} de ${total}. Lo que fallaste volverá mañana para reforzarlo.`, '…');
        } else { p.olv.wins++; save(); }
      }
    };
  }
  function homeBanner() {
    if (route().split('.')[0] !== 'inicio' || $('#plusOlv')) return;
    let due = [];
    try { due = E.dueReviews(); } catch (e) {}
    const view = $('#view'); if (!view || !due.length) return;
    const svg = window.CapBattle && CapBattle.foeSVG ? CapBattle.foeSVG('olvido', 84, { expr: 'smug' }) : '';
    const box = document.createElement('div');
    box.id = 'plusOlv'; box.className = 'plus-olv';
    box.innerHTML = `<div class="pic">${svg}</div><div><h3 class="h3">¡Olvidina está intentando borrar lo que aprendiste!</h3><p>Tienes ${due.length} ${due.length === 1 ? 'tema' : 'temas'} por repasar. Cada respuesta correcta la debilita.</p><a class="btn primary" href="#repaso">Repasar y vencerla</a></div>`;
    const first = view.firstElementChild;
    (first && first.classList.contains('stack') ? first : view).prepend(box);
  }

  /* ------------------------------------------------------------------
     8. Insignias y accesorios matemáticos (se declaran antes porque
        el Consejo y las batallas los usan)
     ------------------------------------------------------------------ */
  const CHARMS = [
    ['charm-ninguno', '–', 'Sin insignia', 'Disponible', () => true],
    ['charm-pi', 'π', 'Pin π', 'Nivel 2', s => E.level() >= 2],
    ['charm-sumatoria', '∑', 'Broche de Sumatoria', 'Nivel 5', s => E.level() >= 5],
    ['charm-raiz', '√', 'Diadema de la Raíz', 'Nivel 8', s => E.level() >= 8],
    ['charm-mochila', '+−', 'Mochila del Matemático', '10 lecciones completadas', s => (s.stats.lessons || 0) >= 10],
    ['charm-compas', '⊙', 'Compás de Euclides', 'Habla con Euclides en el Consejo', () => !!P().met.euclides],
    ['charm-lentes', '☉', 'Lentes del Astrónomo', 'Habla con Hipatia en el Consejo', () => !!P().met.hipatia],
    ['charm-codigo', '{ }', 'Chip de Ada y Turing', 'Habla con Ada Lovelace y Alan Turing', () => !!(P().met.lovelace && P().met.turing)],
    ['charm-guantes', 'Ω', 'Guantes de Electricidad', 'Nivel 15', s => E.level() >= 15],
    ['charm-lab', 'Δ', 'Mochila de Laboratorio', 'Nivel 20', s => E.level() >= 20],
    ['charm-memoria', '…', 'Lazo de la Memoria', 'Vence a Olvidina en un repaso', () => P().olv.wins > 0 || !!P().badges.olvido],
    ['charm-infinito', '∞', 'Corona del Infinito', 'Vence a un jefe o llega al nivel 30', s => Object.keys(s.bosses || {}).length > 0 || !!P().badges.boss || E.level() >= 30]
  ];
  const Charms = {
    list: CHARMS,
    glyph(id) { const c = CHARMS.find(x => x[0] === id); return c && id !== 'charm-ninguno' ? c[1] : ''; },
    check() {
      const s = S(), p = P(); let nuevos = [];
      CHARMS.forEach(([id, , name, , test]) => {
        if (p.charms.includes(id)) return;
        let ok = false; try { ok = test(s); } catch (e) {}
        if (ok) { p.charms.push(id); if (id !== 'charm-ninguno') nuevos.push(name); }
      });
      if (nuevos.length) { UI.toast('Accesorio desbloqueado', nuevos.join(', ') + '. Equípalo en tu Perfil o en el Consejo.', '◆'); save(); }
    },
    panel() {
      const p = P();
      return `<div class="card stack tight" id="plusCharms"><span class="eyebrow">Accesorios matemáticos</span>
        <p class="small muted">Se desbloquean con tu progreso, venciendo enemigos y hablando con los sabios. La insignia equipada aparece junto a tu avatar en las batallas.</p>
        <div class="charm-grid">${CHARMS.map(([id, g, name, req]) => {
          const own = p.charms.includes(id);
          return `<button type="button" data-charm="${id}" aria-pressed="${p.charm === id}" ${own ? '' : 'disabled'}><span class="g">${esc(g)}</span><span><b>${esc(name)}</b><small>${own ? (p.charm === id ? 'Equipada' : 'Toca para equipar') : 'Bloqueada · ' + esc(req)}</small></span></button>`;
        }).join('')}</div></div>`;
    },
    bind(root) {
      $$('[data-charm]', root).forEach(b => b.onclick = () => {
        P().charm = b.dataset.charm; save();
        $$('[data-charm]', root).forEach(x => { x.setAttribute('aria-pressed', String(x === b)); const sm = x.querySelector('small'); if (sm && !x.disabled) sm.textContent = x === b ? 'Equipada' : 'Toca para equipar'; });
        decorateAvatars();
      });
    }
  };
  function decorateAvatars() {
    const g = Charms.glyph(P().charm);
    $$('.dh.me .dh-pic').forEach(el => {
      let c = el.querySelector('.plus-charm');
      if (!g) { c && c.remove(); return; }
      if (!c) { c = document.createElement('span'); c.className = 'plus-charm'; c.setAttribute('aria-hidden', 'true'); el.appendChild(c); }
      c.textContent = g;
    });
  }
  function profilePanel() {
    if (route().split('.')[0] !== 'perfil' || $('#plusCharms')) return;
    const view = $('#view'); if (!view) return;
    Charms.check();
    const host = view.querySelector('.stack') || view;
    host.insertAdjacentHTML('beforeend', Charms.panel());
    Charms.bind($('#plusCharms'));
  }

  /* ------------------------------------------------------------------
     6. Consejo de los Sabios
     ------------------------------------------------------------------ */
  const FEATURED = ['pitagoras', 'euclides', 'arquimedes', 'hipatia', 'alkhwarizmi', 'fibonacci', 'descartes', 'newton', 'leibniz', 'euler', 'gauss', 'lovelace', 'noether', 'turing', 'mirzakhani'];
  const LINES = {
    pitagoras: 'En un triángulo rectángulo, el cuadrado de la hipotenusa es la suma de los cuadrados de los catetos. ¿Lo comprobamos juntos?',
    euclides: 'Te mostraré cómo pensar geométricamente: pocas ideas claras y, a partir de ellas, demostraciones.',
    arquimedes: '¡Eureka! Con una palanca y un punto de apoyo se puede mover casi todo. Con las matemáticas, también.',
    hipatia: 'Enseñé matemáticas y astronomía en Alejandría. Mirar el cielo con números es una forma de entenderlo.',
    alkhwarizmi: 'De mi nombre viene la palabra "algoritmo" y de mi libro, "álgebra". Vamos a equilibrar ecuaciones.',
    fibonacci: 'Llevé a Europa los números indo-arábigos. ¿Quieres contar conejos y descubrir una sucesión famosa?',
    descartes: 'Uní el álgebra con la geometría: cada punto puede describirse con dos números, (x, y).',
    newton: '¿Quieres descubrir cómo describir el movimiento? Fuerza, masa y aceleración te esperan.',
    leibniz: 'Inventé una notación del cálculo que aún usas: dx y el símbolo ∫. También soñé con el sistema binario.',
    euler: 'Escribí más matemáticas que casi nadie. e, i, π, 1 y 0 caben en una sola fórmula. ¿Te atreves?',
    gauss: 'De niño sumé del 1 al 100 en segundos: emparejando 1 + 100, 2 + 99… Las sumas tienen trucos.',
    lovelace: 'Vamos a convertir las matemáticas en instrucciones. Escribí uno de los primeros algoritmos para una máquina.',
    noether: 'Donde hay simetría, hay algo que se conserva. El álgebra abstracta también explica la física.',
    turing: 'Imaginé una máquina sencilla capaz de calcular cualquier cosa calculable. ¿Programamos juntos?',
    mirzakhani: 'Estudié superficies curvas y sus caminos. Fui la primera mujer en recibir la Medalla Fields (2014).'
  };
  function regionForBranch(b) {
    b = String(b || '').toLowerCase();
    const map = [['electro', 'em'], ['óptica', 'fisica'], ['físic', 'fisica'], ['mecánica', 'fisica'], ['astronom', 'trigonometria'], ['trigonom', 'trigonometria'],
      ['estadíst', 'datos'], ['probabil', 'datos'], ['dato', 'datos'], ['ecuaciones diferenciales', 'ecdif'], ['sistemas dinámicos', 'ecdif'], ['series', 'calculo'],
      ['cálculo', 'calculo'], ['análisis', 'calculo'], ['infinito', 'calculo'], ['determinantes', 'lineal'], ['matri', 'lineal'], ['vector', 'vectorial'],
      ['geometr', 'geometria'], ['cónica', 'geometria'], ['topolog', 'geometria'], ['superficies', 'geometria'], ['álgebra', 'algebra'], ['ecuaci', 'algebra'],
      ['cúbica', 'algebra'], ['notación', 'algebra'], ['algoritmo', 'algebra'], ['logaritmo', 'algebra'], ['grupo', 'algebra'], ['computa', 'ingenieria'],
      ['programa', 'ingenieria'], ['ingenier', 'ingenieria'], ['trayectoria', 'fisica'], ['información', 'datos'], ['juegos', 'datos'], ['lógica', 'aritmetica'],
      ['número', 'aritmetica'], ['fraccion', 'aritmetica'], ['aritmét', 'aritmetica'], ['cero', 'aritmetica'], ['π', 'geometria']];
    const hit = map.find(([k]) => b.includes(k));
    return hit ? hit[1] : 'aritmetica';
  }
  const ERA_COLORS = { 'Antigüedad': '#ffd9a8', 'Medieval': '#c9f2e3', 'Renacimiento': '#ffd1e6', 'Revolución científica': '#d6e4ff', 'Ilustración': '#fff3b0', 'Siglo XIX': '#e3d7ff', 'Siglo XX': '#cdf4ff', 'Siglo XXI': '#ffe0f0' };

  function sageDialog(sab) {
    const p = P(), firstMeet = !p.met[sab.id];
    p.met[sab.id] = Date.now();
    if (firstMeet) { try { E.addXP(5); } catch (e) {} }
    save(); Charms.check();
    const region = regionForBranch(sab.branch), reg = (C.REGIONS || []).find(r => r.id === region);
    const line = LINES[sab.id] || (sab.jokes && sab.jokes[0]) || `Soy ${sab.name}. Mi especialidad es ${sab.branch}.`;
    const joke = (sab.jokes || []).find(j => j !== line) || '';
    const atk = ALLY_ATTACKS[sab.id];
    const portrait = UI.sabioPortrait ? UI.sabioPortrait(sab, 96) : '';
    UI.modal(`<div class="sage-dialog stack">
      <div class="sd-head"><div class="pic">${portrait}</div><div><span class="eyebrow">${esc(sab.era || '')} · ${esc(sab.place || '')}</span><h2 class="h2" style="margin:.2rem 0">${esc(sab.name)}</h2><span class="small muted">${esc(sab.years || '')}</span></div></div>
      <p class="sd-quote">${esc(line)}</p>
      <dl><dt>Especialidad</dt><dd>${esc(sab.branch || '')}</dd><dt>Dato real</dt><dd>${esc(sab.fact || '')}</dd>${joke ? `<dt>Curiosidad</dt><dd>${esc(joke)}</dd>` : ''}${atk ? `<dt>Ataque aliado</dt><dd>${esc(atk[0])} · ${esc(atk[1])}</dd>` : ''}</dl>
      <div class="card" style="padding:.8rem 1rem"><b>Misión:</b> practica en ${esc(reg ? reg.name : 'la Aldea de los Números')} con ${esc(sab.name)} como aliado${atk ? ': su ataque especial aparecerá en tus combates' : ''}.</div>
      <div class="row"><button class="btn primary" data-close id="sdGo">Aceptar misión</button><button class="btn" id="sdVoice">Escuchar</button><button class="btn ghost" data-close>Seguir explorando</button></div></div>`, (el) => {
      $('#sdVoice', el).onclick = () => say(`${sab.name} dice: ${line}`, 'feliz');
      $('#sdGo', el).onclick = () => {
        P().ally = sab.id; save();
        let lvl = null; try { lvl = E.nextLevel(region); } catch (e) {}
        UI.toast('Misión aceptada', `${sab.name} te acompaña como aliado.`, '★');
        UI.go(lvl ? 'leccion.' + lvl : 'region.' + region);
      };
    });
  }

  function councilList(sabios) {
    const p = P(), eras = [];
    sabios.forEach(s => { if (!eras.includes(s.era)) eras.push(s.era); });
    return eras.map(era => `<h3 class="council-era">${esc(era)}</h3><div class="council-list">${sabios.filter(s => s.era === era).map(s =>
      `<button type="button" data-sage="${esc(s.id)}" class="${p.met[s.id] ? 'met' : ''}"><b>${esc(s.name)}</b><small>${esc(s.years)} · ${esc(s.branch)}</small></button>`).join('')}</div>`).join('');
  }

  function viewConsejo(root) {
    const sabios = (window.CapSabios && CapSabios.SABIOS) || [];
    const featured = FEATURED.map(id => sabios.find(s => s.id === id)).filter(Boolean);
    const met = Object.keys(P().met).length;
    root.innerHTML = `<div class="council stack">
      <div class="stack tight"><span class="eyebrow">Mundo de fantasía matemática</span><h1 class="h1">El Consejo de los Sabios</h1>
      <p>Los grandes pioneros de las matemáticas están reunidos. Camina entre ellos, acércate y habla: cada uno te ofrece una misión y su ataque especial. Has conocido a ${met} de ${sabios.length}.</p></div>
      <div class="council-stage" id="cStage"><div class="council-loading" id="cLoad"><div>${capiFace('happy', 80)}<p>Preparando el Consejo…</p></div></div>
        <p class="council-help" id="cHelp">${Quality.touch ? 'Mueve el círculo para caminar. Toca a un sabio para hablar.' : 'Camina con WASD o flechas. Pulsa E o Enter cerca de un sabio para hablar. También puedes hacer clic en ellos.'}</p>
        <div class="council-joy" id="cJoy" aria-hidden="true"><i></i></div>
        <button class="btn primary council-prompt" id="cTalk" hidden></button></div>
      <p class="small muted">En CAPICÚA no luchas contra las matemáticas: aprendes a utilizarlas.</p>
      <details class="card" ${Quality.tier === 'LOW' ? 'open' : ''}><summary><b>Todos los sabios (${sabios.length})</b> · lista accesible por épocas</summary>${councilList(sabios)}</details>
    </div>`;
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-sage]'); if (!b) return;
      const s = sabios.find(x => x.id === b.dataset.sage); s && sageDialog(s);
    });
    const start = () => buildCouncil($('#cStage', root), sabios, featured).catch(err => {
      console.warn('Consejo 3D no disponible:', err);
      council2D(root, featured);
    });
    const W = window.CapW3;
    if (W && W.ok && W.stage) start();
    else {
      try { window.CapLoad3D && CapLoad3D(); } catch (e) {}
      let tries = 0;
      const wait = setInterval(() => {
        const w = window.CapW3;
        if (!root.isConnected) return clearInterval(wait);
        if (w && w.ok && w.stage) { clearInterval(wait); start(); }
        else if (++tries > 40 || document.documentElement.classList.contains('no-3d')) { clearInterval(wait); council2D(root, featured); }
      }, 200);
    }
  }
  function council2D(root, featured) {
    const st = $('#cStage', root); if (!st) return;
    st.style.minHeight = 'auto';
    st.innerHTML = `<div style="padding:1rem"><p class="small"><b>Vista 2D:</b> tu dispositivo no pudo abrir la escena 3D, así que el Consejo se muestra en tarjetas. Todo funciona igual.</p>
      <div class="council-list">${featured.map(s => `<button type="button" data-sage="${esc(s.id)}">${UI.sabioPortrait ? UI.sabioPortrait(s, 72) : ''}<b>${esc(s.name)}</b><small>${esc(s.branch)}</small></button>`).join('')}</div></div>`;
  }

  /** Etiqueta de nombre nítida (canvas a la medida del texto, compartida por la escena). */
  function nameTag(T, text, tint) {
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d'), px = 44;
    ctx.font = `800 ${px}px Quicksand, system-ui, sans-serif`;
    const w = Math.ceil(ctx.measureText(text).width) + 48, h = px + 26;
    cv.width = w; cv.height = h;
    ctx.font = `800 ${px}px Quicksand, system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    const r = h / 2; ctx.beginPath(); ctx.moveTo(r, 0); ctx.arcTo(w, 0, w, h, r); ctx.arcTo(w, h, 0, h, r); ctx.arcTo(0, h, 0, 0, r); ctx.arcTo(0, 0, w, 0, r); ctx.fill();
    ctx.lineWidth = 6; ctx.strokeStyle = tint || '#c9a4ff'; ctx.stroke();
    ctx.fillStyle = '#2a1f72'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, w / 2, h / 2 + 2);
    const tex = new T.CanvasTexture(cv); tex.minFilter = T.LinearFilter;
    const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    const sh = .42; sp.scale.set(sh * w / h, sh, 1);
    return sp;
  }

  async function buildCouncil(host, sabios, featured) {
    const W = window.CapW3, T = window.THREE;
    if (!host || !W || !W.stage || !T) throw new Error('sin 3D');
    const tier = perfOn() ? 'LOW' : Quality.tier;
    const extra = sabios.filter(s => !FEATURED.includes(s.id));
    const roster = featured.concat(tier === 'LOW' ? [] : tier === 'MEDIUM' ? extra.slice(0, 30) : extra);
    const h = innerWidth < 600 ? '54vh' : 'min(68vh,640px)';
    const st = W.stage(host, { height: h, cam: [0, 7, 14], look: [0, 1, 0], fov: 50, cls: 'council3d' });
    const scene = st.scene, cam = st.camera;
    scene.fog = new T.Fog(new T.Color('#e9e4ff'), 22, 60);
    // Suelo, plaza y columnas (geometría ligera, sin sombras)
    const mat = c => new T.MeshLambertMaterial({ color: new T.Color(c) });
    const floor = new T.Mesh(new T.CircleGeometry(40, 56), mat('#cfe9ff')); floor.rotation.x = -Math.PI / 2; scene.add(floor);
    [[6, '#ffe0f0'], [10, '#d9fff1'], [14, '#fff3b0']].forEach(([r, c]) => {
      const ring = new T.Mesh(new T.RingGeometry(r - .08, r + .08, 64), new T.MeshBasicMaterial({ color: new T.Color(c) }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = .01; scene.add(ring);
    });
    const colGeo = new T.CylinderGeometry(.35, .42, 6, tier === 'LOW' ? 8 : 14), colMat = mat('#ffffff');
    for (let i = 0; i < (tier === 'LOW' ? 8 : 14); i++) {
      const a = i / (tier === 'LOW' ? 8 : 14) * Math.PI * 2, col = new T.Mesh(colGeo, colMat);
      col.position.set(Math.cos(a) * 33, 3, Math.sin(a) * 33); scene.add(col);
    }
    const core = new T.Mesh(new T.IcosahedronGeometry(1.1, 1), new T.MeshLambertMaterial({ color: new T.Color('#c9a4ff'), emissive: new T.Color('#5b3df0'), emissiveIntensity: .35, flatShading: true }));
    core.position.y = 2.4; scene.add(core);
    const glyphs = [];
    if (W.textSprite) ['π', '∑', '∞', '√', '∫', 'θ'].forEach((g, i) => {
      try { const sp = W.textSprite(g, '#ffffff', .9, { glow: ['#8ff3dc', '#ff9ec8', '#c9a4ff'][i % 3] }); sp.userData.i = i; scene.add(sp); glyphs.push(sp); } catch (e) {}
    });
    // Jugador
    let me = null;
    try { me = W.chibi(Object.assign(W.avatarCfg(S().profile.avatar, 'happy'), { bake: true })); } catch (e) { me = null; }
    if (!me) { me = new T.Mesh(new T.CapsuleGeometry ? new T.CapsuleGeometry(.4, .8, 4, 8) : new T.CylinderGeometry(.4, .4, 1.4, 10), mat('#ff9ec8')); me.position.y = .7; }
    const player = new T.Group(); player.add(me); player.position.set(0, 0, 11.5); scene.add(player);
    const charmG = Charms.glyph(P().charm);
    if (charmG && W.textSprite) { try { const cs = W.textSprite(charmG, '#ffffff', .5, { glow: '#ffd34d' }); cs.position.set(0, 2.6, 0); player.add(cs); } catch (e) {} }
    // Sabios: carga progresiva (primero los destacados, cerca del jugador)
    const sages = [];
    const placeOf = (i) => {
      if (i < featured.length) { const a = i / featured.length * Math.PI * 2; return [Math.cos(a) * 7, Math.sin(a) * 7, a]; }
      const j = i - featured.length, ring = j < 30 ? 10 : 14, count = j < 30 ? Math.min(30, roster.length - featured.length) : Math.max(1, roster.length - featured.length - 30);
      const k = j < 30 ? j : j - 30, a = k / count * Math.PI * 2 + .1;
      return [Math.cos(a) * ring, Math.sin(a) * ring, a];
    };
    const loadEl = $('#cLoad', host);
    let built = 0;
    await new Promise((resolve) => {
      const step = (deadline) => {
        if (!st.alive) return resolve();
        const t0 = performance.now();
        while (built < roster.length && (performance.now() - t0 < 12)) {
          const sab = roster[built], [x, z, a] = placeOf(built);
          let obj = null;
          try { obj = W.chibi(Object.assign(W.sabioCfg(sab), { bake: true })); } catch (e) { obj = null; }
          const g = new T.Group();
          if (obj) { obj.scale.setScalar(built < featured.length ? 1 : .85); g.add(obj); }
          else { const m = new T.Mesh(new T.ConeGeometry(.5, 1.6, 10), mat('#c9a4ff')); m.position.y = .8; g.add(m); }
          const ped = new T.Mesh(new T.CylinderGeometry(.75, .85, .18, 20), mat(ERA_COLORS[sab.era] || '#ffffff')); ped.position.y = .09; g.add(ped);
          if (obj) obj.position.y = .18;
          g.position.set(x, 0, z); g.rotation.y = Math.atan2(x, z);
          if (built < featured.length || tier === 'HIGH') {
            const lab = nameTag(T, sab.name.split(' (')[0].replace('Leonardo de Pisa', 'Fibonacci'), ERA_COLORS[sab.era]);
            lab.position.set(0, 2.7, 0); g.add(lab);
          }
          scene.add(g);
          sages.push({ sab, g, obj, base: g.rotation.y });
          st.clickables.push({ obj: g, fn: () => sageDialog(sab) });
          built++;
        }
        if (loadEl) loadEl.style.display = built >= Math.min(roster.length, featured.length) ? 'none' : '';
        if (built < roster.length) (window.requestIdleCallback ? requestIdleCallback(step, { timeout: 200 }) : setTimeout(step, 16));
        else resolve();
        if (built === featured.length) resolve();   // la escena ya es usable; el resto sigue cargando
      };
      step();
    });
    // Controles
    const keys = {};
    const onKey = e => {
      if (!st.alive) return cleanup();
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) { keys[k] = e.type === 'keydown'; if (route() === 'consejo') e.preventDefault(); }
      if (e.type === 'keydown' && (k === 'e' || k === 'enter') && near && !$('#modal-root .modal')) { e.preventDefault(); sageDialog(near.sab); }
    };
    addEventListener('keydown', onKey); addEventListener('keyup', onKey);
    const joy = $('#cJoy', host), knob = joy && joy.querySelector('i'); const jv = { x: 0, y: 0 };
    if (joy) {
      let id = null;
      const set = (e) => {
        const r = joy.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const len = Math.min(1, Math.hypot(dx, dy) / (r.width / 2)), ang = Math.atan2(dy, dx);
        jv.x = Math.cos(ang) * len; jv.y = Math.sin(ang) * len;
        knob.style.transform = `translate(${jv.x * 32}px,${jv.y * 32}px)`;
      };
      joy.addEventListener('pointerdown', e => { id = e.pointerId; joy.setPointerCapture(id); set(e); });
      joy.addEventListener('pointermove', e => { if (e.pointerId === id) set(e); });
      const end = () => { id = null; jv.x = jv.y = 0; knob.style.transform = ''; };
      joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
    }
    // Tocar el suelo para caminar hasta ese punto
    const ray = new T.Raycaster(); let target = null;
    st.renderer.domElement.addEventListener('pointerup', e => {
      const r = st.renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new T.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height * 2 - 1)), cam);
      const hit = ray.intersectObject(floor)[0];
      if (hit && !ray.intersectObjects(sages.map(s => s.g), true).length) target = hit.point.clone();
    });
    const talk = $('#cTalk', host);
    talk.onclick = () => near && sageDialog(near.sab);
    let near = null;
    const camPos = new T.Vector3(), look = new T.Vector3();
    function cleanup() { removeEventListener('keydown', onKey); removeEventListener('keyup', onKey); }
    addEventListener('hashchange', cleanup, { once: true });
    st.onFrame((t, dt) => {
      // movimiento
      let mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + jv.x;
      let mz = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0) + jv.y;
      if (target && !mx && !mz) {
        const d = target.clone().sub(player.position); d.y = 0;
        if (d.length() < .25) target = null; else { d.normalize(); mx = d.x; mz = d.z; }
      } else if (mx || mz) target = null;
      const len = Math.hypot(mx, mz);
      if (len > .05) {
        const sp = 4.2 * dt / Math.max(1, len);
        player.position.x += mx * sp; player.position.z += mz * sp;
        const r = Math.hypot(player.position.x, player.position.z);
        if (r > 19) { player.position.x *= 19 / r; player.position.z *= 19 / r; }
        if (r < 1.8) { player.position.x *= 1.8 / r; player.position.z *= 1.8 / r; }
        player.rotation.y = Math.atan2(mx, mz);
        me.position.y = (me.isMesh ? .7 : 0) + Math.abs(Math.sin(t * 9)) * .08;
      }
      // cámara en tercera persona
      const portrait = st.el.clientWidth < st.el.clientHeight;
      camPos.set(player.position.x, player.position.y + (portrait ? 8 : 6.2), player.position.z + (portrait ? 13 : 10.5));
      cam.position.lerp(camPos, Math.min(1, dt * 3));
      look.set(player.position.x, 1.2, player.position.z - 1.5);
      cam.lookAt(look);
      core.rotation.y = t * .4; core.position.y = 2.4 + Math.sin(t) * .15;
      glyphs.forEach(g => { const a = t * .35 + g.userData.i / glyphs.length * Math.PI * 2; g.position.set(Math.cos(a) * 2.6, 3.4 + Math.sin(t * 1.3 + g.userData.i) * .3, Math.sin(a) * 2.6); });
      // sabios vivos: animación idle, miran al jugador y saludan
      let best = null, bd = 2.8;
      for (const s of sages) {
        const d = s.g.position.distanceTo(player.position);
        if (d > 26) { s.g.visible = false; continue; }
        s.g.visible = true;
        if (s.obj && W.animChibi && d < 16) { try { W.animChibi(s.obj, t); } catch (e) {} }
        if (d < 4.5) {
          const want = Math.atan2(player.position.x - s.g.position.x, player.position.z - s.g.position.z);
          s.g.rotation.y += (want - s.g.rotation.y) * Math.min(1, dt * 4);
          if (!s.greeted && s.obj && s.obj.userData.setExpr) { s.greeted = true; s.obj.userData.setExpr('happy', 2.5); }
        } else s.greeted = false;
        if (d < bd) { bd = d; best = s; }
      }
      if (W.animChibi && me && me.userData && me.userData.body) { try { W.animChibi(me, t); } catch (e) {} }
      if (best !== near) {
        near = best;
        talk.hidden = !near;
        if (near) talk.textContent = 'Hablar con ' + near.sab.name.split(' (')[0];
      }
    });
    const help = $('#cHelp', host); if (help) setTimeout(() => { help.style.transition = 'opacity .6s'; help.style.opacity = '.0'; }, 9000);
    return st;
  }

  /* ------------------------------------------------------------------
     7. Micrófono con estados reales
     ------------------------------------------------------------------ */
  const Mic = (() => {
    let rec = null, state = 'idle', pill = null, speakTimer = null, mediaRec = null;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const LABEL = { idle: 'Activar micrófono', asking: 'Pidiendo permiso del micrófono…', listening: 'Grabando · te escucho…', processing: 'Procesando lo que dijiste…', speaking: 'Capi está hablando', error: 'Micrófono no disponible' };
    function ui(s, text, btn) {
      state = s;
      if (!pill) {
        pill = document.createElement('div'); pill.id = 'plusMic'; pill.setAttribute('role', 'status'); pill.setAttribute('aria-live', 'polite');
        pill.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="txt"></span><button type="button" class="btn sm ghost" data-m="stop">Detener</button>';
        document.body.appendChild(pill);
        pill.querySelector('[data-m=stop]').onclick = stop;
      }
      pill.hidden = s === 'idle';
      pill.dataset.s = s;
      pill.querySelector('.txt').textContent = text || LABEL[s];
      const b = pill.querySelector('[data-m=stop]');
      b.hidden = !(s === 'listening' || s === 'speaking');
      b.textContent = s === 'speaking' ? 'Silenciar' : 'Detener';
      $$('#capiMic, #mic, #tVoice + .mic-on').forEach(x => x.classList.toggle('on', s === 'listening'));
      if (btn) btn.setAttribute('aria-pressed', String(s === 'listening'));
      if (s === 'error') setTimeout(() => state === 'error' && ui('idle'), 6000);
    }
    function help(kind) {
      const ua = navigator.userAgent, isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua), isFirefox = /Firefox/.test(ua);
      const how = isSafari ? 'En Safari: Ajustes del sitio (aA en la barra) → Micrófono → Permitir.' : isFirefox ? 'En Firefox: toca el ícono del micrófono tachado junto a la dirección y quita el bloqueo.' : 'En Chrome o Edge: toca el candado junto a la dirección → Micrófono → Permitir, y recarga la página.';
      const msg = {
        denied: `<p>El navegador bloqueó el micrófono para CAPICÚA.</p><p class="small">${how}</p>`,
        nodevice: '<p>No encontramos ningún micrófono conectado. Revisa que esté conectado y que otra aplicación no lo esté usando.</p>',
        insecure: '<p>El micrófono solo funciona en páginas seguras (https). Abre CAPICÚA desde <b>https://yessica18.github.io/Capi2/</b>.</p>',
        nostt: `<p>Tu navegador detecta el micrófono, pero no ofrece conversión de voz a texto${isFirefox ? ' (Firefox aún no la incluye)' : ''}.</p><p class="small">Usa Chrome, Edge o Safari para hablar con Capi, o escríbele: el chat por texto siempre funciona.</p>`
      }[kind];
      UI.modal(`<div class="stack"><div class="row" style="flex-wrap:nowrap;gap:1rem">${capiFace('think', 64)}<h2 class="h2">Micrófono</h2></div>${msg}<div class="row"><button class="btn primary" data-close id="mhWrite">Escribirle a Capi</button><button class="btn ghost" data-close>Cerrar</button></div></div>`,
        el => { $('#mhWrite', el).onclick = () => UI.go('capia.conversar'); });
    }
    async function permission() {
      if (!window.isSecureContext) return 'insecure';
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return SR ? 'ok' : 'nodevice';
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const q = await navigator.permissions.query({ name: 'microphone' });
          if (q.state === 'denied') return 'denied';
        }
      } catch (e) { /* Firefox/Safari antiguos no permiten consultar */ }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        return 'ok';
      } catch (e) {
        return e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'denied' : e && e.name === 'NotFoundError' ? 'nodevice' : 'denied';
      }
    }
    function deliver(text, opts) {
      ui('processing');
      setTimeout(() => {
        if (opts.onText) opts.onText(text);
        else { UI._ask = text; UI.go('capia.conversar'); }
        watchSpeech();
      }, 150);
    }
    function watchSpeech() {
      clearInterval(speakTimer);
      let waited = 0, spoke = false;
      speakTimer = setInterval(() => {
        waited += 250;
        const speaking = (window.speechSynthesis && speechSynthesis.speaking) || (E.voice && E.voice.speaking && E.voice.speaking());
        if (speaking) { spoke = true; if (state !== 'speaking') ui('speaking'); }
        else if (spoke || waited > 20000) { clearInterval(speakTimer); ui('idle'); }
        else if (state === 'processing' && waited > 2500) ui('processing', 'Capi está pensando su respuesta…');
      }, 250);
    }
    function stop() {
      if (state === 'speaking') { try { E.voice.stop(); } catch (e) {} try { speechSynthesis.cancel(); } catch (e) {} clearInterval(speakTimer); return ui('idle'); }
      if (rec) { try { rec.stop(); } catch (e) {} }
      if (mediaRec && mediaRec.state === 'recording') mediaRec.stop();
    }
    async function recordToEndpoint(opts) {
      // Integración preparada: define window.CAPICUA_STT_URL con un servicio que reciba audio y devuelva {text}
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = []; mediaRec = new MediaRecorder(stream);
      mediaRec.ondataavailable = e => chunks.push(e.data);
      mediaRec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        ui('processing');
        try {
          const r = await fetch(window.CAPICUA_STT_URL, { method: 'POST', body: new Blob(chunks, { type: mediaRec.mimeType || 'audio/webm' }) });
          const j = await r.json();
          j && j.text ? deliver(j.text, opts) : (ui('error', 'No entendí el audio. Inténtalo de nuevo.'));
        } catch (e) { ui('error', 'El servicio de voz no respondió.'); }
      };
      mediaRec.start(); ui('listening', 'Grabando… toca Detener cuando termines');
      setTimeout(() => mediaRec && mediaRec.state === 'recording' && mediaRec.stop(), 12000);
    }
    async function toggle(opts = {}) {
      if (state === 'listening' || state === 'speaking') return stop();
      if (state === 'asking' || state === 'processing') return;
      ui('asking');
      const perm = await permission();
      if (perm !== 'ok') { ui('error'); return help(perm); }
      if (!SR) {
        if (window.CAPICUA_STT_URL && window.MediaRecorder) return recordToEndpoint(opts).catch(() => ui('error'));
        ui('error'); return help('nostt');
      }
      try { E.voice.stop(); } catch (e) {}
      rec = new SR(); rec.lang = 'es-CO'; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
      let text = '';
      rec.onstart = () => ui('listening');
      rec.onresult = e => { text = [...e.results].map(r => r[0].transcript).join(' '); ui('listening', '«' + text + '»'); };
      rec.onerror = e => {
        rec = null;
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { ui('error'); help('denied'); }
        else if (e.error === 'no-speech') ui('error', 'No escuché nada. Acércate al micrófono e inténtalo otra vez.');
        else if (e.error === 'audio-capture') { ui('error'); help('nodevice'); }
        else if (e.error === 'network') ui('error', 'El reconocimiento de voz necesita internet. Revisa tu conexión.');
        else if (e.error !== 'aborted') ui('error', 'No te escuché bien. Inténtalo de nuevo.');
      };
      rec.onend = () => { rec = null; if (state !== 'listening') return; text.trim() ? deliver(text.trim(), opts) : ui('idle'); };
      try { rec.start(); ui('listening'); } catch (e) { rec = null; ui('error'); }
    }
    return { toggle, stop, get state() { return state; }, supported: !!SR };
  })();

  /* ------------------------------------------------------------------
     Ajustes: bloque de rendimiento dentro del modal de Ajustes
     ------------------------------------------------------------------ */
  function settingsBlock() {
    const gfx = $('#modal-root #sGfx');
    if (!gfx || $('#plusPerf')) return;
    const box = document.createElement('div');
    box.className = 'stack tight'; box.id = 'plusPerf';
    const p = P();
    box.innerHTML = `<span class="eyebrow">Modo rendimiento</span>
      <div class="row" role="group" aria-label="Modo rendimiento">${[['auto', 'Automático'], ['on', 'Activado'], ['off', 'Desactivado']].map(([v, l]) => `<button type="button" class="btn sm" data-perf="${v}" aria-pressed="${p.perf === v}">${l}</button>`).join('')}</div>
      <span class="tiny muted">Calidad detectada en este dispositivo: ${Quality.tier === 'LOW' ? 'baja' : Quality.tier === 'HIGH' ? 'alta' : 'media'}. El modo rendimiento reduce partículas, desenfoques y resolución 3D; el juego sigue completo.</span>`;
    const anchor = gfx.closest('.stack') || gfx.parentNode;
    anchor.parentNode.insertBefore(box, anchor.nextSibling);
    $$('[data-perf]', box).forEach(b => b.onclick = () => {
      P().perf = b.dataset.perf; save(); applyPerf();
      $$('[data-perf]', box).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      UI.toast('Modo rendimiento', perfOn() ? 'Activado: menos efectos, misma diversión.' : 'Desactivado: efectos completos.', '◆');
    });
  }

  /* ------------------------------------------------------------------
     Arranque e integración con el enrutador existente
     ------------------------------------------------------------------ */
  UI.views && (UI.views.consejo = viewConsejo);
  // El enrutador pudo dibujar antes de que existiera esta vista (carga directa de #consejo)
  if (UI.views && route().split('.')[0] === 'consejo' && !document.querySelector('#view .council')) { try { UI.render(); } catch (e) {} }
  window.CapPlus = { battle: Battle, olvidina, mic: Mic, charms: Charms, quality: Quality, perfOn, sageDialog, regionForBranch, version: '2.0.0' };

  try { P(); migrateTheme(); } catch (e) {}
  applyPerf();

  const afterRender = () => { try { homeBanner(); profilePanel(); decorateAvatars(); settingsBlock(); } catch (e) { console.warn(e); } };
  let raf = 0;
  const mo = new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(afterRender); });
  const startObs = () => {
    const v = $('#view'), m = $('#modal-root');
    v && mo.observe(v, { childList: true, subtree: false });
    m && mo.observe(m, { childList: true, subtree: true });
    afterRender();
    Charms.check();
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', startObs, { once: true }) : startObs();
  addEventListener('hashchange', () => setTimeout(afterRender, 60));
  try { E.Store.on && E.Store.on(() => applyPerf()); } catch (e) {}
})();
