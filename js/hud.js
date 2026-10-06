/* =============================================================================
   DER BERG – HUD (Anzeigen über dem Spielfeld, als HTML)
   ============================================================================= */

window.BERG = window.BERG || {};

BERG.HUD = (function () {
  const T = BERG.TEXT;
  const C = BERG.CONFIG;
  let root = null;
  const el = {};
  const last = {};
  let toastTimer = null;
  let restartTimer = null;

  function init(container) {
    root = container;
    root.innerHTML = `
      <div class="hud-panel hud-left">
        <div class="hud-row"><span class="hud-lbl">${T.hud.time}</span><span class="hud-val" data-k="time">0:00</span></div>
        <div class="hud-row"><span class="hud-lbl">${T.hud.stamina}</span>
          <div class="hud-bar" data-k="bar"><i data-k="stamina"></i><b style="left:${C.stamina.lowThreshold}%"></b></div></div>
        <div class="hud-row"><span class="hud-lbl">${T.hud.provisions}</span><span class="hud-prov" data-k="prov"></span></div>
        <div class="hud-row"><span class="hud-lbl">${T.hud.lives}</span><span class="hud-hearts" data-k="hearts"></span></div>
      </div>
      <div class="hud-panel hud-right">
        <span class="hud-lbl">${T.hud.altitude}</span><span class="hud-val" data-k="alt"></span>
      </div>
      <div class="hud-map" data-k="map"></div>
      <div class="hud-compass" data-k="compass">
        <svg viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="34" class="c-face"/>
          <circle cx="40" cy="40" r="27" class="c-ring"/>
          <path d="M40 3 V11 M40 69 V77 M3 40 H11 M69 40 H77" class="c-tick"/>
          <g data-k="needle"><path d="M40 12 L46 40 L40 44 L34 40 Z" class="c-north"/><path d="M40 68 L46 40 L40 36 L34 40 Z" class="c-south"/></g>
          <circle cx="40" cy="40" r="3" class="c-pin"/>
        </svg>
      </div>
      <div class="hud-toast" data-k="toast"></div>
      <div class="hud-prompt" data-k="prompt"></div>
      <div class="hud-controls" data-k="controls">${T.start.controls.map(([keys, v]) => `<span>${keys.map((k) => `<kbd>${k}</kbd>`).join('')} ${v}</span>`).join('')}</div>
      <div class="hud-intro" data-k="intro"></div>
      <div class="hud-fade" data-k="fade"></div>
      <div class="hud-restart" data-k="restart">
        <span class="hud-hearts">${heartsHTML(0)}</span>
        <strong>${T.restart.title}</strong>
        <small>${T.restart.sub}</small>
      </div>
      <div class="hud-pause" data-k="pause"><div><h2>${T.hud.paused}</h2><p>${BERG.isTouch ? T.touch.resume : T.hud.pausedHint}</p></div></div>
    `;
    root.querySelectorAll('[data-k]').forEach((n) => (el[n.dataset.k] = n));
    // Tippen/Klicken auf „Pause“ setzt fort
    el.pause.addEventListener('click', () => { if (BERG.game) BERG.game.paused = false; });
  }

  /** Leben als Herzen: volle zuerst, verlorene als leere Umrisse */
  const HEART = '<svg viewBox="0 0 20 18" aria-hidden="true"><path class="heart" d="M10 16.5 C4 12 1.5 9 1.5 5.6 C1.5 3.2 3.4 1.5 5.6 1.5 C7.6 1.5 9 2.7 10 4.3 C11 2.7 12.4 1.5 14.4 1.5 C16.6 1.5 18.5 3.2 18.5 5.6 C18.5 9 16 12 10 16.5 Z"/></svg>';
  function heartsHTML(n) {
    return Array.from({ length: C.lives.max }, (_, i) => `<span class="${i < n ? '' : 'empty'}">${HEART}</span>`).join('');
  }

  function fmtTime(s) {
    s = Math.max(0, Math.floor(s));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function set(key, value, fn) {
    if (last[key] === value) return;
    last[key] = value;
    fn(value);
  }

  /** Neue Runde: HUD zurücksetzen */
  function reset(game) {
    Object.keys(last).forEach((k) => delete last[k]);
    el.map.innerHTML = buildMap(game.level.gates.fork);
    el.map.classList.remove('show');
    el.compass.classList.remove('show');
    el.toast.classList.remove('show');
    el.prompt.classList.remove('show');
    el.pause.classList.remove('show');
    el.restart.classList.remove('show');
    clearTimeout(restartTimer);
    el.fade.style.opacity = 0;
  }

  function update(game) {
    const p = game.player;
    const st = game.stats;
    set('time', fmtTime(st.time), (v) => (el.time.textContent = v));
    // Balken ist genau dann leer, wenn die Zwangspause einsetzt (stamina.exhaustAt).
    // Bis dahin bleibt ein schmaler, sichtbarer Rest stehen.
    const S = C.stamina;
    const raw = ((p.stamina - S.exhaustAt) / (S.max - S.exhaustAt)) * 100;
    const pct = p.exhausted && raw <= 2 ? 0 : Math.max(2, raw);
    set('stamina', pct.toFixed(1), (v) => (el.stamina.style.width = v + '%'));
    const state = p.exhausted ? 'out' : pct < C.stamina.lowThreshold ? 'low' : '';
    set('bar', state, (v) => (el.bar.className = 'hud-bar ' + v));
    set('prov', p.provisions, (v) => {
      el.prov.innerHTML = v > 0 ? '<i></i>'.repeat(v) : '<span class="none">–</span>';
    });
    set('hearts', p.lives, (v) => (el.hearts.innerHTML = heartsHTML(v)));
    const alt = Math.round(C.altitude.base + -(p.y + p.h) * C.altitude.metersPerPixel);
    set('alt', alt, (v) => (el.alt.textContent = v.toLocaleString('de-DE') + ' m'));

    // Karte (nur mit Karte, nur an der Gabelung)
    const cx = p.x + p.w / 2;
    const z = game.level.mapCardZone;
    const showMap = game.char.map && cx > z.x1 && cx < z.x2 && game.mode === 'play';
    set('mapShow', showMap, (v) => el.map.classList.toggle('show', v));

    // Kompass (nur mit Kompass, nur im Nebel)
    const showCompass = game.char.compass && game.env.fog > 0.35;
    set('compassShow', showCompass, (v) => el.compass.classList.toggle('show', v));
    if (showCompass) {
      const tg = game.level.compassTarget;
      const ang = (Math.atan2(tg.y - (p.y + p.h / 2), tg.x - cx) * 180) / Math.PI + 90;
      const wobble = Math.sin(game.t * 3.1) * 3;
      el.needle.setAttribute('transform', `rotate(${(ang + wobble).toFixed(1)} 40 40)`);
    }

    // Aktionen & Legende nur beim Spielen – nie über dem Schuhe-binden-Rätsel
    const inWork = game.mode === 'work';
    set('inWork', inWork, (v) => root.classList.toggle('in-work', v));
    const promptText = BERG.isTouch && game.promptKey ? T.promptsTouch[game.promptKey] : game.prompt;
    set('prompt', game.mode === 'play' ? promptText || '' : '', (v) => {
      el.prompt.textContent = v;
      el.prompt.classList.toggle('show', !!v);
    });
    set('controls', game.showControls && !inWork, (v) => el.controls.classList.toggle('show', v));
    set('fade', game.fade.toFixed(2), (v) => (el.fade.style.opacity = v));
    set('fadeLight', game.fadeLight, (v) => el.fade.classList.toggle('light', v));
    set('paused', game.paused, (v) => el.pause.classList.toggle('show', v));
    BERG.Touch.update(game);
  }

  function toast(text, duration) {
    if (!el.toast) return;
    el.toast.textContent = text;
    el.toast.classList.remove('show');
    void el.toast.offsetWidth; // Animation neu starten
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), (duration || 2.8) * 1000);
  }

  /** Herz geht verloren: kurz aufpulsieren, dann leer */
  function loseLife(n) {
    if (!el.hearts) return;
    last.hearts = n;
    el.hearts.innerHTML = heartsHTML(n);
    const lost = el.hearts.children[n];
    if (lost) lost.classList.add('lost');
  }

  /** Alle Leben verloren: Meldung über der Schwarzblende */
  function restart(duration) {
    if (!el.restart) return;
    el.restart.classList.add('show');
    clearTimeout(restartTimer);
    restartTimer = setTimeout(() => el.restart.classList.remove('show'), duration * 1000);
  }

  function intro(title, sub, duration) {
    el.intro.innerHTML = `<small>${title}</small><strong>${sub}</strong>`;
    el.intro.classList.remove('show');
    void el.intro.offsetWidth;
    el.intro.classList.add('show');
    setTimeout(() => el.intro.classList.remove('show'), (duration || 2.2) * 1000);
  }

  /** Mini-Karte der Weggabelung (zeigt den günstigen Weg) */
  function buildMap(fork) {
    const upper = 'M22 78 L40 78 L52 64 L64 54 L76 44 L96 40 L110 22';
    const tunnel = 'M22 78 L40 78 L96 78 L100 52 L104 34 L110 22';
    const good = fork === 'upper' ? upper : tunnel;
    const bad = fork === 'upper' ? tunnel : upper;
    const badEnd = fork === 'upper' ? [92, 78] : [92, 40];
    return `
      <div class="hud-map-title">${T.hud.map}</div>
      <svg viewBox="0 0 130 96" aria-hidden="true">
        <path d="M6 88 Q40 70 64 74 T124 60" class="m-contour"/>
        <path d="M10 60 Q46 46 70 50 T124 30" class="m-contour"/>
        <path d="${bad}" class="m-bad"/>
        <path d="M${badEnd[0] - 4} ${badEnd[1] - 4} l8 8 m0 -8 l-8 8" class="m-x"/>
        <path d="${good}" class="m-good"/>
        <circle cx="22" cy="78" r="3.2" class="m-you"/>
        <path d="M110 22 V10 L118 13 L110 16" class="m-flag"/>
      </svg>`;
  }

  return { init, reset, update, toast, intro, loseLife, restart, fmtTime };
})();
