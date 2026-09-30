/* =============================================================================
   DER BERG – Unterbrechung: „Dein Schuh ist aufgegangen.“
   -----------------------------------------------------------------------------
   Betrifft nur Charaktere mit `job: true` (CONFIG.characters) – also den
   Charakter mit den einfachen Schuhen. Im Reveal steht das Schuhebinden für
   Nebenjob & Verpflichtungen außerhalb der Schule: Man muss kurz weg,
   während die Zeit weiterläuft.

   Ablauf:
     1. Meldung            „Dein Schuh ist aufgegangen.“
     2. Rätsel 1           Schnürsenkel einfädeln – Regel wird nicht verraten:
                           immer die unterste freie Öse auf der GEGENÜBERLIEGENDEN
                           Seite (nach 2 Fehlern erscheint ein Tipp)
     3. Rätsel 2           Schleife binden – Reihenfolge merken und nachmachen
     4. Meldung            „Fest verschnürt.“
   Der Haupttimer des Spiels läuft währenddessen weiter (siehe game.js).
   Einstellungen: CONFIG.work · Texte: TEXT.work
   ============================================================================= */

window.BERG = window.BERG || {};

BERG.Work = (function () {
  const T = BERG.TEXT.work;
  const C = BERG.CONFIG.work;
  const DIRS = { left: '←', up: '↑', right: '→', down: '↓' };
  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  };
  const COL = { L: 76, R: 124 };        // x-Position der Ösen-Spalten im SVG
  const rowY = (i) => 236 - i * 40;     // Reihe 0 = unten (Zehen), nach oben aufsteigend

  let root = null;
  const el = {};
  let s = null; // Zustand der laufenden Unterbrechung
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function init(container) {
    root = container;
    root.innerHTML = `
      <div class="work-call" data-w="call">
        ${BERG.icon('lace', 'work-icon')}
        <h2>${T.call}</h2>
      </div>
      <div class="work-task" data-w="task">
        <div class="work-head"><span data-w="title"></span><span data-w="count"></span></div>
        <div class="work-body">
          <div class="shoe-wrap" data-w="shoeWrap"></div>
          <div class="bow-pad" data-w="pad">
            ${Object.entries(DIRS).map(([d, sym]) => `<button type="button" class="bow-btn" data-dir="${d}" style="grid-area:${d}">${sym}</button>`).join('')}
          </div>
        </div>
        <div class="work-hint" data-w="hint"></div>
      </div>
      <div class="work-done" data-w="done"><h2>${T.done}</h2></div>
    `;
    root.querySelectorAll('[data-w]').forEach((n) => (el[n.dataset.w] = n));
    el.pad.querySelectorAll('.bow-btn').forEach((b) => b.addEventListener('click', () => bowInput(b.dataset.dir)));
  }

  function phase(name) {
    ['call', 'task', 'done'].forEach((k) => el[k].classList.toggle('show', k === name));
  }

  function hint(text, isError) {
    el.hint.textContent = text;
    el.hint.classList.toggle('error', !!isError);
  }

  /** Startet eine Unterbrechung. `index` = wievielte (0, 1 …). `onDone(sek)` am Ende. */
  function start(onDone, index) {
    const rows = Math.max(2, C.eyeletRows);
    const lens = C.bowLengths || [4];
    s = {
      onDone,
      t0: performance.now(),
      stage: 'call',
      rows,
      used: { L: [true], R: [true] },  // unterste Reihe ist schon geschnürt
      side: 'R',                        // das Schnürsenkel-Ende liegt rechts unten
      path: [[COL.L, rowY(0)], [COL.R, rowY(0)]],
      steps: 0,
      total: 2 * (rows - 1),
      wrong: 0,
      bowLen: lens[Math.min(index || 0, lens.length - 1)],
    };
    buildShoe();
    el.pad.classList.remove('show');
    root.classList.add('show');
    phase('call');
    window.addEventListener('keydown', onKey);
    later(startLacing, C.callDuration * 1000);
  }

  // ---------------------------------------------------------------------------
  // Schuh (Draufsicht, Zehen unten)
  // ---------------------------------------------------------------------------
  function buildShoe() {
    let eyelets = '';
    for (let r = 0; r < s.rows; r++) {
      ['L', 'R'].forEach((side) => {
        eyelets += `<circle class="eyelet${r === 0 ? ' used' : ''}" data-side="${side}" data-row="${r}" cx="${COL[side]}" cy="${rowY(r)}" r="8"/>`;
      });
    }
    const top = rowY(s.rows - 1);
    el.shoeWrap.innerHTML = `
      <svg class="shoe" viewBox="0 0 200 320" aria-hidden="true">
        <path class="shoe-body" d="M100 312 C52 312 40 272 42 232 L46 96 C48 52 64 30 100 30 C136 30 152 52 154 96 L158 232 C160 272 148 312 100 312 Z"/>
        <path class="shoe-stitch" d="M100 300 C60 300 52 268 54 232 L58 100 C60 62 72 44 100 44 C128 44 140 62 142 100 L146 232 C148 268 140 300 100 300 Z"/>
        <path class="shoe-toe" d="M56 270 Q100 246 144 270"/>
        <ellipse class="shoe-collar" cx="100" cy="62" rx="34" ry="17"/>
        <path class="shoe-tongue" d="M82 ${top - 34} Q100 ${top - 44} 118 ${top - 34} L120 ${rowY(0) + 16} Q100 ${rowY(0) + 26} 80 ${rowY(0) + 16} Z"/>
        <path class="lace-tail" d="M${COL.L} ${rowY(0)} q-26 18 -34 50"/>
        <polyline class="lace" data-w2="lace" points=""/>
        <g class="bow" data-w2="bow" transform="translate(100 ${top - 24})">
          <path class="bow-part" d="M0 0 C-30 -26 -46 4 -16 8 Z"/>
          <path class="bow-part" d="M0 0 C30 -26 46 4 16 8 Z"/>
          <path class="bow-part tail" d="M-2 4 Q-14 26 -22 40"/>
          <path class="bow-part tail" d="M2 4 Q16 24 26 38"/>
          <circle class="bow-part knot" r="5"/>
        </g>
        ${eyelets}
      </svg>`;
    el.lace = el.shoeWrap.querySelector('[data-w2="lace"]');
    el.bow = el.shoeWrap.querySelector('[data-w2="bow"]');
    el.shoe = el.shoeWrap.querySelector('.shoe');
    el.shoeWrap.querySelectorAll('.eyelet').forEach((c) =>
      c.addEventListener('click', () => laceInput(c.dataset.side, +c.dataset.row)));
    drawLace();
    showBow(0);
  }

  function drawLace() {
    el.lace.setAttribute('points', s.path.map((p) => p.join(',')).join(' '));
  }

  function showBow(k) {
    // k von 0 … 1: die Schleife entsteht Stück für Stück
    const parts = el.bow.querySelectorAll('.bow-part');
    const n = Math.round(k * parts.length);
    parts.forEach((p, i) => p.classList.toggle('on', i < n));
  }

  function shake(node) {
    node.classList.remove('shake');
    void node.getBoundingClientRect();
    node.classList.add('shake');
  }

  // ---------------------------------------------------------------------------
  // Rätsel 1: Einfädeln
  // ---------------------------------------------------------------------------
  function startLacing() {
    s.stage = 'lace';
    phase('task');
    el.title.textContent = T.lace;
    el.count.textContent = `0 / ${s.total}`;
    hint(T.laceHint);
  }

  function lowestFree(side) {
    for (let r = 0; r < s.rows; r++) if (!s.used[side][r]) return r;
    return -1;
  }

  function laceInput(side, row) {
    if (!s || s.stage !== 'lace') return;
    if (row === undefined) row = lowestFree(side);
    const target = s.side === 'L' ? 'R' : 'L';
    const ok = side === target && row === lowestFree(target);
    const node = el.shoeWrap.querySelector(`.eyelet[data-side="${side}"][data-row="${row}"]`);
    if (!ok) {
      s.wrong++;
      shake(node || el.shoe);
      hint(s.wrong >= 2 ? T.laceHelp : T.wrong, s.wrong < 2);
      return;
    }
    s.used[side][row] = true;
    s.side = side;
    s.path.push([COL[side], rowY(row)]);
    s.steps++;
    node.classList.add('used');
    drawLace();
    el.count.textContent = `${s.steps} / ${s.total}`;
    hint(T.laceHint);
    if (s.steps >= s.total) later(startBow, 450);
  }

  // ---------------------------------------------------------------------------
  // Rätsel 2: Schleife binden (Reihenfolge merken)
  // ---------------------------------------------------------------------------
  function startBow() {
    s.stage = 'bow-watch';
    const keys = Object.keys(DIRS);
    s.seq = Array.from({ length: s.bowLen }, () => keys[Math.floor(Math.random() * keys.length)]);
    el.title.textContent = T.bow;
    el.pad.classList.add('show');
    later(playDemo, 500);
  }

  function playDemo() {
    s.stage = 'bow-watch';
    s.input = 0;
    showBow(0);
    el.count.textContent = `0 / ${s.seq.length}`;
    hint(T.bowWatch);
    s.seq.forEach((d, i) => later(() => flash(d, 'demo'), i * 620));
    later(() => { s.stage = 'bow-input'; hint(T.bowHint); }, s.seq.length * 620);
  }

  function flash(dir, cls) {
    const b = el.pad.querySelector(`[data-dir="${dir}"]`);
    b.classList.remove('demo', 'ok');
    void b.offsetWidth;
    b.classList.add(cls);
    setTimeout(() => b.classList.remove(cls), 420);
  }

  function bowInput(dir) {
    if (!s || s.stage !== 'bow-input') return;
    if (dir === s.seq[s.input]) {
      flash(dir, 'ok');
      s.input++;
      showBow(s.input / s.seq.length);
      el.count.textContent = `${s.input} / ${s.seq.length}`;
      if (s.input >= s.seq.length) { s.stage = 'finished'; later(finish, 500); }
    } else {
      s.stage = 'bow-wrong';
      shake(el.pad);
      hint(T.wrong, true);
      later(playDemo, 900);
    }
  }

  // ---------------------------------------------------------------------------
  function onKey(e) {
    if (!s) return;
    const dir = KEYMAP[e.code];
    if (!dir) return;
    e.preventDefault();
    if (s.stage === 'lace' && (dir === 'left' || dir === 'right')) laceInput(dir === 'left' ? 'L' : 'R');
    else if (s.stage === 'bow-input') bowInput(dir);
  }

  function finish() {
    const elapsed = (performance.now() - s.t0) / 1000;
    const wait = Math.max(0, C.minShiftSeconds - elapsed);
    later(() => {
      phase('done');
      later(() => {
        root.classList.remove('show');
        window.removeEventListener('keydown', onKey);
        timers.length = 0;
        const secs = (performance.now() - s.t0) / 1000;
        const cb = s.onDone;
        s = null;
        cb && cb(secs);
      }, C.doneDuration * 1000);
    }, wait * 1000);
  }

  function active() { return !!s; }

  return { init, start, active };
})();
