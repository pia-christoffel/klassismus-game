/* =============================================================================
   DER BERG – Reveal
   -----------------------------------------------------------------------------
   Dramaturgie (jeder Schritt per Klick / Leertaste / →):
     1–3  drei Sätze auf dunklem Grund
     4    DER BERG WAR NIE NUR EIN BERG.
     5    Metaphern, eine nach der anderen
     6    Der Rucksack öffnet sich
     7    Gleiche Grundwerte
     8    Vergleich der beiden eigenen Durchgänge
   Reihenfolge ändern: Array `steps` in start().
   ============================================================================= */

window.BERG = window.BERG || {};

BERG.Reveal = (function () {
  const T = BERG.TEXT;
  const R = T.reveal;
  let root, stageEl, hintEl;
  let steps = [];
  let idx = -1;
  let session = null;
  let onDone = null;
  let drawFigure = null;
  let readyAt = 0;
  let timers = [];

  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  function start(sess, done, figureFn) {
    session = sess;
    onDone = done;
    drawFigure = figureFn;
    root = document.getElementById('screen-reveal');
    root.innerHTML = `<div class="rv-stage"></div><div class="rv-hint">${R.continueHint} <span>›</span></div>`;
    stageEl = root.querySelector('.rv-stage');
    hintEl = root.querySelector('.rv-hint');

    steps = [
      ...R.lines.map((text) => ({ render: () => line(text), wait: 1600 })),
      { render: title, wait: 1800 },
      metaphors(),
      backpack(),
      { render: sameStats, wait: 2600 },
      { render: compare, wait: 1200, last: true },
    ];
    idx = -1;
    root.onclick = (e) => { if (!e.target.closest('button')) advance(); };
    window.addEventListener('keydown', onKey);
    later(next, 900); // erst einen Moment Dunkelheit
  }

  function onKey(e) {
    if (!root.classList.contains('active')) return window.removeEventListener('keydown', onKey);
    if (['Space', 'Enter', 'ArrowRight'].includes(e.code)) { e.preventDefault(); advance(); }
  }

  function advance() {
    if (idx < 0 || performance.now() < readyAt) return;
    const st = steps[idx];
    if (st.onAdvance && st.onAdvance() === false) return;
    next();
  }

  function next() {
    clearTimers();
    idx++;
    if (idx >= steps.length) return finish();
    const st = steps[idx];
    readyAt = Infinity; // keine Eingaben während der Überblendung
    hintEl.classList.remove('show');
    const old = stageEl.firstElementChild;
    const swap = () => {
      stageEl.innerHTML = '';
      const node = st.render();
      stageEl.appendChild(node);
      requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add('in')));
      readyAt = performance.now() + Math.min(st.wait || 1000, 900);
      if (!st.last) later(() => hintEl.classList.add('show'), st.wait || 1000);
    };
    if (old) { old.classList.remove('in'); old.classList.add('out'); setTimeout(swap, 550); }
    else swap();
  }

  function finish() {
    window.removeEventListener('keydown', onKey);
    root.onclick = null;
    clearTimers();
    onDone && onDone();
  }

  const h = (html, cls) => {
    const d = document.createElement('div');
    d.className = 'rv-step ' + (cls || '');
    d.innerHTML = html;
    return d;
  };

  // --- 1–4 -------------------------------------------------------------------
  function line(text) { return h(`<p class="rv-line">${text}</p>`); }
  function title() { return h(`<h1 class="rv-title">${R.title}</h1>`); }

  // --- 5: Metaphern ----------------------------------------------------------
  function metaphors() {
    let shown = 0;
    let list = null;
    const showOne = () => {
      if (shown >= R.metaphors.length) return;
      const m = R.metaphors[shown++];
      const row = document.createElement('li');
      row.innerHTML = `
        ${BERG.icon(m.icon, 'rv-icon')}
        <span class="rv-term">${m.term}</span>
        <span class="rv-eq">=</span>
        <span class="rv-meaning">${m.meaning}${m.note ? `<small>${m.note}</small>` : ''}</span>`;
      list.appendChild(row);
      requestAnimationFrame(() => requestAnimationFrame(() => row.classList.add('in')));
      if (shown < R.metaphors.length) later(showOne, 1150);
      else later(() => hintEl.classList.add('show'), 900);
    };
    return {
      wait: 99999, // Hinweis erscheint erst, wenn alle Metaphern sichtbar sind
      render: () => {
        shown = 0;
        const node = h('<ul class="rv-metaphors"></ul>', 'rv-meta-step');
        list = node.querySelector('ul');
        later(showOne, 700);
        return node;
      },
      onAdvance: () => {
        if (shown < R.metaphors.length) { clearTimers(); showOne(); return false; }
        return true;
      },
    };
  }

  // --- 6: Rucksack -----------------------------------------------------------
  const TAG_POS = [[-310, -120, -4], [300, -95, 3], [-340, 5, 2], [330, 25, -3], [-290, 130, -2], [300, 150, 4]];

  function backpack() {
    let state = 'closed';
    let node = null;
    const B = R.backpack;
    return {
      wait: 1400,
      render: () => {
        state = 'closed';
        node = h(`
          <h2 class="rv-sub">${B.title}</h2>
          <div class="rv-pack-wrap">
            <svg class="rv-pack" viewBox="0 0 240 290" aria-hidden="true">
              <g class="pk-roll"><rect x="52" y="14" width="136" height="34" rx="17"/><path d="M92 14 V48 M148 14 V48"/></g>
              <path class="pk-strap" d="M40 120 H24 Q18 120 18 128 V222 Q18 230 24 230 H40"/>
              <path class="pk-strap" d="M200 120 H216 Q222 120 222 128 V222 Q222 230 216 230 H200"/>
              <path class="pk-body" d="M40 92 Q40 50 120 50 Q200 50 200 92 V258 Q200 274 184 274 H56 Q40 274 40 258 Z"/>
              <path class="pk-dark" d="M58 64 Q120 56 182 64"/>
              <rect class="pk-pocket" x="70" y="186" width="100" height="62" rx="9"/>
              <path class="pk-line" d="M70 204 H170"/>
              <g class="pk-flap">
                <path d="M36 96 Q36 54 120 54 Q204 54 204 96 V142 Q120 160 36 142 Z"/>
                <rect x="108" y="134" width="24" height="18" rx="3"/>
              </g>
            </svg>
            ${B.items.map((it, i) => `<span class="rv-tag" style="--tx:${TAG_POS[i][0]};--ty:${TAG_POS[i][1]};--r:${TAG_POS[i][2]}deg">${it}</span>`).join('')}
          </div>
          <p class="rv-pack-hint">${B.hint}</p>
          <p class="rv-note">${B.note}</p>`, 'rv-pack-step');
        return node;
      },
      onAdvance: () => {
        if (state === 'closed') {
          state = 'opening';
          hintEl.classList.remove('show');
          node.classList.add('open');
          node.querySelectorAll('.rv-tag').forEach((tag, i) => later(() => tag.classList.add('out'), 700 + i * 650));
          later(() => { node.classList.add('noted'); state = 'open'; }, 700 + B.items.length * 650 + 400);
          later(() => hintEl.classList.add('show'), 700 + B.items.length * 650 + 1800);
          return false;
        }
        return state === 'open';
      },
    };
  }

  // --- 7: Gleiche Grundwerte ---------------------------------------------------
  function sameStats() {
    return h(R.sameStats.lines.map((l, i) => `<p class="rv-line small" style="transition-delay:${i * 1.2}s">${l}</p>`).join(''), 'rv-same');
  }

  // --- 8: Vergleich -----------------------------------------------------------
  function compare() {
    const Cp = R.compare;
    const runs = ['A', 'B'].map((id) => {
      const i = session.runs.findIndex((r) => r.char === id);
      return Object.assign({ n: i + 1 }, session.runs[i]);
    });
    const metrics = [
      ['time', (s) => s.time, (v) => BERG.HUD.fmtTime(v)],
      ['falls', (s) => s.falls, String],
      ['detours', (s) => s.detours, String],
      ['pauses', (s) => s.pauses, String],
      ['workShifts', (s) => s.workShifts, String],
      ['energy', (s) => Math.round(s.energy), String],
    ];
    const col = (run) => `
      <article class="cmp-col">
        <header>
          <canvas class="cmp-fig" data-char="${run.char}"></canvas>
          <div><small>${Cp.run} ${run.n}</small><h3>${T.start.characters[run.char].name}</h3></div>
        </header>
        <dl>${metrics.map(([k, get, fmt]) => {
          const v = get(run.stats);
          const max = Math.max(...runs.map((r) => get(r.stats)), 0.0001);
          return `<div class="cmp-row"><dt>${Cp.rows[k]}</dt><dd>${fmt(v)}</dd><span class="cmp-bar"><i style="--w:${(v / max) * 100}%"></i></span></div>`;
        }).join('')}</dl>
        <blockquote><small>${Cp.said}</small>„${run.answer || '–'}“</blockquote>
      </article>`;
    const node = h(`
      <h2 class="rv-sub">${Cp.title}</h2>
      <p class="rv-lead">${Cp.subtitle}</p>
      <div class="cmp-cols">${col(runs[0])}${col(runs[1])}</div>
      <p class="rv-learning">${Cp.learning}</p>
      <button type="button" class="btn light">${Cp.button}</button>`, 'rv-compare');
    node.querySelector('.btn').addEventListener('click', finish);
    requestAnimationFrame(() => node.querySelectorAll('.cmp-fig').forEach((c) => drawFigure(c, c.dataset.char, 0)));
    return node;
  }

  return { start };
})();
