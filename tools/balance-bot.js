/* =============================================================================
   DER BERG – Balancing-Bot (nur für Tests, nicht Teil des Spiels)
   -----------------------------------------------------------------------------
   Spielt den Berg mit echter Physik automatisch durch und liefert Zeit,
   Stürze, Umwege, Pausen … – praktisch, um nach Änderungen in config.js
   zu prüfen, ob sich A und B noch wie gewünscht unterscheiden.

   Benutzung (Spiel über einen lokalen Server öffnen, z. B.
   `python3 -m http.server` im Projektordner, dann http://localhost:8000):
     1. Browser-Konsole öffnen
     2. var s=document.createElement('script');s.src='tools/balance-bot.js';document.head.appendChild(s)
     3. runBot('A')   bzw.   runBot('B', { failRate: 0.15 })

   Optionen: failRate  = Anteil misslungener Sprünge an schweren Stellen
             restBelow / restTo = ab wann / bis wohin verschnauft wird
             guess     = 'random' | 'right' | 'wrong' (Wegwahl ohne Karte)
   Achtung: Der Bot braucht die Koordinaten aus js/level.js. Wer das Level
   umbaut, muss die Route (Array R unten) anpassen.
   ============================================================================= */
window.runBot = function (charId, opts) {
  opts = Object.assign({ failRate: 0.2, restBelow: 30, restTo: 70, workSeconds: 13, guess: 'random' }, opts || {});
  const g = BERG.game;
  let workCb = null;
  BERG.Work.start = (cb) => { workCb = cb; };
  BERG.HUD.toast = () => {}; BERG.HUD.intro = () => {};
  g.start(charId, 1, null); g.onFinish = null; g.paused = true;
  const L = g.level, p = g.player, DT = 1 / 120;
  const log = [];
  function upd(keys) { g.input.down = keys || {}; g.update(DT); }
  function settle() {
    let n = 0;
    while (g.mode !== 'play' && g.mode !== 'summit' && n < 120 * 60) {
      if (g.mode === 'work') { for (let i = 0; i < 120 * opts.workSeconds; i++) upd(); const cb = workCb; workCb = null; cb(); }
      else upd();
      n++;
    }
  }
  settle();
  const pl = (x, y) => { const s = L.solids.find((s) => s.x === x && s.y === y); if (!s) throw new Error('plat ' + x + ',' + y); return s; };
  function snap() { return { p: JSON.parse(JSON.stringify({ ...p, ground: null })), ground: p.ground, stats: JSON.parse(JSON.stringify(g.stats)), trig: new Set(g.triggered), env: { ...g.env }, mode: g.mode, modeT: g.modeT, t: g.t }; }
  function restore(s) { Object.assign(p, JSON.parse(JSON.stringify(s.p))); p.ground = s.ground; g.stats = JSON.parse(JSON.stringify(s.stats)); g.triggered = new Set(s.trig); g.env = { ...s.env }; g.mode = s.mode; g.modeT = s.modeT; g.t = s.t; g.input.pressed = {}; }
  function care() {
    if (p.provisions > 0 && p.stamina < 40 && g.mode === 'play') { g.input.pressed.use = true; upd(); }
    if (p.stamina < opts.restBelow) { let n = 0; while ((p.stamina < opts.restTo || p.exhausted) && n < 120 * 30) { upd({ down: true }); settle(); n++; } upd(); }
    let n = 0; while (p.exhausted && n < 120 * 30) { upd(); n++; }
  }
  function walk(x) {
    let n = 0, stuck = 0, lastX = p.x;
    while (Math.abs(p.x + p.w / 2 - x) > 8 && n < 120 * 40) {
      if (p.exhausted) { upd(); n++; continue; }
      const k = x > p.x + p.w / 2 ? { right: true } : { left: true };
      if (Math.abs(p.x - lastX) < 0.05 && p.onGround) stuck++; else stuck = 0;
      if (stuck > 6) { g.input.pressed.jump = true; k.jump = true; stuck = 0; }
      lastX = p.x;
      upd(k); settle(); n++;
      if (g.mode === 'summit') return;
    }
    for (let i = 0; i < 20; i++) upd();
  }
  function attempt(tgt, d) {
    let jumped = false, air = false;
    for (let i = 0; i < 120 * 6; i++) {
      if (g.mode === 'work' || g.mode === 'resting') { settle(); continue; }
      if (g.mode !== 'play') return g.mode === 'summit' ? 'ok' : 'fall';
      if (p.exhausted) { upd(); continue; }
      if (!jumped && p.onGround && g.env.gust > 0.25) { upd(); continue; } // Böe abwarten
      const dir = tgt.x > p.x + p.w - 2 ? 1 : tgt.x + tgt.w < p.x + 2 ? -1 : tgt.x + tgt.w / 2 > p.x + p.w / 2 ? 1 : -1;
      const gap = dir > 0 ? tgt.x - (p.x + p.w) : p.x - (tgt.x + tgt.w);
      let k = dir > 0 ? { right: true } : { left: true };
      if (d !== null && !jumped && p.onGround && gap <= d) { g.input.pressed.jump = true; jumped = true; }
      if (jumped) k.jump = true;
      if (air && p.x + p.w > tgt.x + 4 && p.x < tgt.x + tgt.w - 4) k = { jump: true };
      upd(k);
      if (!p.onGround) air = true;
      if (p.onGround && p.ground === tgt) { for (let j = 0; j < 8; j++) upd(); return 'ok'; }
      if (air && p.onGround && p.ground !== tgt && jumped) return 'miss';
    }
    return 'timeout';
  }
  function runUp(tgt) {
    // auf schmalen Plattformen erst in die Mitte (Anlauf), wie ein echter Mensch
    const gnd = p.ground;
    if (!gnd || !p.onGround || gnd.w > 400) return;
    const back = tgt.x > gnd.x ? gnd.x + Math.min(gnd.w / 2, 60) : gnd.x + gnd.w - Math.min(gnd.w / 2, 60);
    if (Math.abs(p.x + p.w / 2 - back) > 12 && ((tgt.x > gnd.x && p.x + p.w / 2 > back) || (tgt.x < gnd.x && p.x + p.w / 2 < back))) walk(back);
  }
  function plat(x, y, hazard) {
    const tgt = pl(x, y);
    care();
    if (p.onGround && p.ground === tgt) return 'ok';
    runUp(tgt);
    if (hazard && Math.random() < opts.failRate) {
      const r = attempt(tgt, 95);
      if (r === 'fall') { settle(); return 'fell'; }
      if (r === 'ok') return 'ok';
    }
    const s = snap();
    for (const d of [null, -20, 0, 8, 20, 35, 50, 70, 90, 120, 160]) {
      restore(s);
      const r = attempt(tgt, d);
      if (r === 'ok') return 'ok';
    }
    restore(s);
    return 'stuck';
  }
  function hut() { walk(5680); care(); g.input.pressed.use = true; upd(); let n = 0; while (g.mode === 'resting' && n < 120 * 10) { upd(); n++; } settle(); }
  const G = L.gates;
  const guess = (correct, other) => (opts.guess === 'right' ? correct : opts.guess === 'wrong' ? other : Math.random() < 0.5 ? correct : other);
  const forkChoice = g.char.map ? G.fork : guess(G.fork, G.fork === 'upper' ? 'tunnel' : 'upper');
  const fogChoice = g.char.compass ? G.fog : guess(G.fog, G.fog === 'left' ? 'right' : 'left');
  const upperR = [['p', 1480, -200], ['p', 1650, -290], ['p', 1850, -380], ['p', 2050, -470], ['p', 2250, -520]];
  const upperEnd = [['p', 3000, -610], ['p', 3100, -700], ['p', 3200, -760]];
  const tunnelR = [['w', 3310], ['p', 3360, -212], ['p', 3300, -304], ['p', 3360, -396], ['p', 3300, -488], ['p', 3360, -580], ['p', 3300, -670]];
  let fork;
  if (forkChoice === G.fork) fork = G.fork === 'upper' ? [...upperR, ...upperEnd] : tunnelR;
  else fork = G.fork === 'upper' ? [['w', 3100], ['w', 1420], ...upperR, ...upperEnd] : [...upperR, ['w', 2980], ['w', 1420], ...tunnelR];
  const towerL = [['w', 9040], ['p', 9080, -1965], ['p', 9230, -2060], ['p', 9080, -2155], ['p', 9230, -2250], ['p', 9080, -2340]];
  const towerR = [['w', 10180], ['p', 10240, -1965], ['p', 10090, -2060], ['p', 10240, -2155], ['p', 10090, -2250], ['p', 10240, -2340]];
  const exitL = [['p', 9190, -2430], ['p', 10490, -2430]], exitR = [['p', 10350, -2430], ['p', 10490, -2430]];
  let fog;
  if (fogChoice === G.fog) fog = G.fog === 'left' ? [...towerL, ...exitL] : [...towerR, ...exitR];
  else fog = G.fog === 'left' ? [...towerR, ['w', 10200], ['w', 9040], ...towerL, ...exitL] : [...towerL, ['w', 9060], ['w', 10180], ...towerR, ...exitR];
  const R = [
    ['cp', 0], ['p', 700, -60], ['p', 1000, -30], ['p', 1090, -120], ['w', 1420], ...fork, ['p', 3420, -760], ['w', 3640], ['cp', 1],
    ['p', 4020, -850], ['p', 4200, -940], ['p', 4360, -1030], ['p', 4560, -1120], ['p', 4720, -1200], ['p', 4940, -1290], ['p', 5120, -1380], ['p', 5320, -1440], ['w', 5520], ['cp', 2], ['hut'],
    ['p', 6020, -1500], ['p', 6280, -1580], ['p', 6520, -1650], ['p', 6820, -1700], ['w', 7280],
    ['h', 7430, -1720], ['h', 7640, -1780], ['h', 7860, -1750], ['h', 8070, -1815], ['h', 8280, -1810], ['h', 8500, -1870], ['w', 8720], ['cp', 3],
    ...fog, ['w', 10620], ['cp', 4], ['w', 10870],
    ['h', 10980, -2480], ['h', 11300, -2520], ['h', 11580, -2570], ['h', 11920, -2620], ['h', 12200, -2680], ['h', 12560, -2720],
    ['p', 12860, -2800], ['p', 13060, -2890], ['p', 13260, -2980], ['p', 13440, -3060], ['w', 13600],
  ];
  let i = 0, guard = 0;
  while (i < R.length && guard++ < 3000 && g.mode !== 'summit') {
    const a = R[i];
    if (a[0] === 'cp') { i++; continue; }
    if (a[0] === 'w') { walk(a[1]); i++; continue; }
    if (a[0] === 'hut') { if (g.char.job || p.stamina < 60) hut(); i++; continue; }
    const fallsBefore = g.stats.falls;
    const r = plat(a[1], a[2], a[0] === 'h');
    if (r === 'stuck') { log.push('STUCK at ' + a.join(',') + ' st=' + p.stamina.toFixed(0) + ' x=' + Math.round(p.x)); break; }
    if (g.stats.falls > fallsBefore) {
      settle();
      if (g.char.rope) continue;
      const idx = R.findIndex((x) => x[0] === 'cp' && x[1] === p.cp);
      log.push('fall->cp' + p.cp);
      i = idx + 1;
      continue;
    }
    i++;
  }
  const s = g.stats;
  return { char: charId, done: g.mode === 'summit', t: Math.round(s.time), falls: s.falls, detours: s.detours, pauses: s.pauses, rest: Math.round(s.restTime), work: Math.round(s.workTime), energy: Math.round(s.energy), events: s.events.join('/'), choice: forkChoice === G.fork && fogChoice === G.fog ? 'right' : 'wrong', log: log.join('; ') };
};
