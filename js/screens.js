/* =============================================================================
   DER BERG – Ablauf & Screens
   -----------------------------------------------------------------------------
   Start → Durchgang 1 → Gipfel + Frage 1 → Durchgang 2 → Gipfel + Frage 2
         → Reveal (reveal.js) → Abschluss
   Alle Texte kommen aus js/texts.js.
   ============================================================================= */

window.BERG = window.BERG || {};

BERG.Flow = (function () {
  const T = BERG.TEXT;
  const $ = (sel) => document.querySelector(sel);
  let game = null;
  let session = null;
  let startAnim = null;
  let endAnim = null;
  let keyHandler = null;

  function init() {
    game = new BERG.Game($('#game'));
    BERG.game = game; // für Tests in der Konsole
    buildStart();
    showStart();
  }

  /** Zeigt genau einen Screen (oder das Spielfeld) */
  function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
    $('#stage').classList.toggle('active', id === 'stage');
    if (keyHandler) { window.removeEventListener('keydown', keyHandler); keyHandler = null; }
    cancelAnimationFrame(startAnim);
    cancelAnimationFrame(endAnim);
    window.scrollTo(0, 0);
  }

  function onKeys(fn) {
    keyHandler = fn;
    window.addEventListener('keydown', fn);
  }

  const gearFor = (id) => BERG.Art.gearFor(id);

  /** Zeichnet eine Figur in ein kleines Canvas (Startscreen, Vergleich) */
  function drawFigure(canvas, id, t, scale) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const s = scale || h / 78;
    ctx.strokeStyle = BERG.PALETTE.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(w * 0.18, h * 0.9); ctx.lineTo(w * 0.82, h * 0.9); ctx.stroke();
    BERG.Art.drawCharacter(ctx, { id, x: w / 2 + 4 * s, y: h * 0.9, facing: 1, pose: 'idle', t, scale: s, gear: gearFor(id) });
  }

  // ---------------------------------------------------------------------------
  // STARTSCREEN
  // ---------------------------------------------------------------------------
  function buildStart() {
    const S = T.start;
    const card = (id) => `
      <button class="char-card" data-char="${id}" type="button">
        <canvas class="char-canvas"></canvas>
        <span class="char-name">${S.characters[id].name}</span>
        <span class="char-items">${S.characters[id].items.join(' · ')}</span>
      </button>`;
    $('#screen-start').innerHTML = `
      <div class="start-wrap">
        <header class="start-head">
          <p class="overline"><span>${S.overline}</span></p>
          <h1 class="title">${S.title}</h1>
          <p class="lead">${S.choose}</p>
        </header>
        <div class="chars">${card('A')}${card('B')}</div>
        <p class="goal">${S.goal}</p>
        <p class="controls">${S.controls.map(([keys, v]) => `<span>${keys.map((k) => `<kbd>${k}</kbd>`).join('')} ${v}</span>`).join('')}</p>
      </div>`;
    document.querySelectorAll('.char-card').forEach((b) =>
      b.addEventListener('click', () => chooseCharacter(b.dataset.char)));
  }

  function showStart() {
    show('screen-start');
    const cards = [...document.querySelectorAll('.char-card')];
    const loop = (ts) => {
      cards.forEach((c, i) => drawFigure(c.querySelector('canvas'), c.dataset.char, ts / 1000 + i * 1.7));
      startAnim = requestAnimationFrame(loop);
    };
    startAnim = requestAnimationFrame(loop);
    onKeys((e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') cards[0].focus();
      if (e.code === 'ArrowRight' || e.code === 'KeyD') cards[1].focus();
    });
  }

  function chooseCharacter(id) {
    session = { startedAt: new Date().toISOString(), runs: [] };
    startRun(id, 1);
  }

  // ---------------------------------------------------------------------------
  // DURCHGÄNGE
  // ---------------------------------------------------------------------------
  function startRun(charId, n) {
    show('stage');
    // Fokus vom Button nehmen, damit die Leertaste nicht „klickt“
    if (document.activeElement) document.activeElement.blur();
    game.start(charId, n, (stats) => {
      session.runs.push({ char: charId, stats, answer: null });
      showSummit(n);
    });
  }

  function showSummit(n) {
    const run = session.runs[n - 1];
    const st = run.stats;
    const Q = n === 1 ? T.question1 : T.question2;
    const L = T.summit.stats;
    const el = $('#screen-summit');
    el.innerHTML = `
      <div class="summit-wrap">
        <p class="overline"><span>${T.reveal.compare.run} ${n} · ${T.start.characters[run.char].name}</span></p>
        <h1 class="big">${T.summit.title}</h1>
        <dl class="stats">
          <div><dt>${L.time}</dt><dd>${BERG.HUD.fmtTime(st.time)}</dd></div>
          <div><dt>${L.falls}</dt><dd>${st.falls}</dd></div>
          <div><dt>${L.detours}</dt><dd>${st.detours}</dd></div>
          <div><dt>${L.pauses}</dt><dd>${st.pauses}</dd></div>
        </dl>
        <div class="question">
          <p class="q">${Q.q}</p>
          <div class="options">${Q.options.map((o, i) => `<button type="button" class="opt" data-i="${i}"><kbd>${i + 1}</kbd>${o}</button>`).join('')}</div>
        </div>
        <div class="next"></div>
      </div>`;
    show('screen-summit');

    const opts = [...el.querySelectorAll('.opt')];
    const answer = (i) => {
      if (run.answer !== null) return;
      run.answer = Q.options[i];
      opts.forEach((o, k) => { o.disabled = true; o.classList.toggle('chosen', k === i); });
      const next = el.querySelector('.next');
      if (n === 1) {
        next.innerHTML = `<p class="next-text">${T.nextRun.text}</p><button type="button" class="btn">${T.nextRun.button}</button>`;
      } else {
        next.innerHTML = `<button type="button" class="btn">${T.question2.button}</button>`;
      }
      next.classList.add('show');
      const btn = next.querySelector('.btn');
      btn.addEventListener('click', () => (n === 1 ? startRun(run.char === 'A' ? 'B' : 'A', 2) : startReveal()));
      setTimeout(() => btn.focus(), 50);
    };
    opts.forEach((o) => o.addEventListener('click', () => answer(+o.dataset.i)));
    onKeys((e) => {
      const d = parseInt(e.key, 10);
      if (d >= 1 && d <= opts.length) answer(d - 1);
    });
  }

  // ---------------------------------------------------------------------------
  // REVEAL & ABSCHLUSS
  // ---------------------------------------------------------------------------
  function startReveal() {
    saveSession();
    show('screen-reveal');
    BERG.Reveal.start(session, showEnd, drawFigure);
  }

  function showEnd() {
    const E = T.end;
    const el = $('#screen-end');
    el.innerHTML = `
      <div class="end-wrap">
        <canvas class="end-scene"></canvas>
        <div class="end-lines">${E.lines.map((l, i) => `<h1 style="animation-delay:${0.6 + i * 1.1}s" class="${i === E.lines.length - 1 ? 'accent' : ''}">${l}</h1>`).join('')}</div>
        <p class="end-q">${E.question}</p>
        <button type="button" class="btn end-btn">${E.again}</button>
        <p class="disclaimer">${E.disclaimer}</p>
        <p class="credit">${E.credit}</p>
      </div>`;
    show('screen-end');
    const canvas = el.querySelector('.end-scene');
    const loop = (ts) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      BERG.Art.drawEndScene(ctx, w, h, ts / 1000);
      endAnim = requestAnimationFrame(loop);
    };
    endAnim = requestAnimationFrame(loop);
    el.querySelector('.end-btn').addEventListener('click', () => { session = null; showStart(); });
  }

  /** Speichert Durchgänge lokal im Browser (z. B. für eine Ausstellung) */
  function saveSession() {
    try {
      const key = 'derberg.sessions';
      const all = JSON.parse(localStorage.getItem(key) || '[]');
      all.push(session);
      localStorage.setItem(key, JSON.stringify(all));
    } catch (e) { /* privater Modus o. Ä. – egal */ }
  }

  return { init, drawFigure };
})();
