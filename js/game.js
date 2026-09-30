/* =============================================================================
   DER BERG – Spiel-Engine
   -----------------------------------------------------------------------------
   Enthält: Eingabe, Physik & Kollision, Ausdauer, alle Mechaniken
   (Karte, Kompass, Seil, Rucksack, Unterbrechung, Sturm, Hütte, Zufall),
   Tracking der Statistiken und das Rendering der Spielwelt.

   Übersicht der Mechaniken (Suchbegriffe im Code):
     [KARTE]      Route an der Weggabelung             → render()  / hud.js
     [KOMPASS]    Richtung im Nebel                    → hud.js (update)
     [SEIL]       Absturz mit/ohne Sicherung           → startFall(), updateCaught()
     [RUCKSACK]   Ausdauerverbrauch × Gewicht          → updatePlay() / drain()
     [SCHUHE]     Unterbrechung „Schuh ist offen“      → startWork() / work.js
                  (= Nebenjob), Timer läuft weiter
     [STURM]      Wind, Rutschigkeit, Sicht            → updateEnv()
     [HÜTTE]      Rast & Unterstützung                 → startRest(), updateResting()
     [ZUFALL]     Ereignisse für beide gleich          → randomEvent()
     [TRACKING]   Zeit, Stürze, Umwege, Pausen …       → this.stats
   ============================================================================= */

window.BERG = window.BERG || {};

(function () {
  const C = BERG.CONFIG;
  const T = BERG.TEXT;
  const P = C.physics;
  const S = C.stamina;
  const W = C.view.width;
  const H = C.view.height;
  const STEP = 1 / 120; // feste Physik-Schrittweite
  const DEBUG = /[?&]debug/.test(location.search);
  BERG.DEBUG = DEBUG;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const approach = (v, target, d) => (v < target ? Math.min(v + d, target) : Math.max(v - d, target));
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // ---------------------------------------------------------------------------
  // EINGABE
  // ---------------------------------------------------------------------------
  class Input {
    constructor() {
      this.down = {};
      this.pressed = {};
      this.enabled = false;
      window.addEventListener('keydown', (e) => {
        if (!this.enabled) return;
        const k = Input.map(e.code);
        if (!k) return;
        e.preventDefault();
        if (!this.down[k]) this.pressed[k] = true;
        this.down[k] = true;
      });
      window.addEventListener('keyup', (e) => {
        const k = Input.map(e.code);
        if (k) this.down[k] = false;
      });
      window.addEventListener('blur', () => this.reset());
    }
    static map(code) {
      switch (code) {
        case 'KeyA': case 'ArrowLeft': return 'left';
        case 'KeyD': case 'ArrowRight': return 'right';
        case 'Space': case 'KeyW': case 'ArrowUp': return 'jump';
        case 'KeyS': case 'ArrowDown': return 'down';
        case 'KeyE': return 'use';
        case 'Escape': case 'KeyP': return 'pause';
      }
      if (DEBUG && /^(Digit\d|KeyK|KeyM|KeyN)$/.test(code)) return code;
      return null;
    }
    take(k) {
      if (this.pressed[k]) { this.pressed[k] = false; return true; }
      return false;
    }
    reset() { this.down = {}; this.pressed = {}; }
  }

  // ---------------------------------------------------------------------------
  // SPIEL
  // ---------------------------------------------------------------------------
  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.input = new Input();
      this.running = false;
      this.paused = false;
      this.fade = 0;
      this.fadeLight = false;
      this.frame = this.frame.bind(this);
      this.resize();
      window.addEventListener('resize', () => this.resize());
      const autoPause = () => { if (this.running && this.mode === 'play') this.paused = true; };
      window.addEventListener('blur', autoPause);
      document.addEventListener('visibilitychange', () => document.hidden && autoPause());
    }

    /** Spielfeld an Fenstergröße anpassen (16:9, scharf auf Retina) */
    resize() {
      const stage = this.canvas.parentElement;
      const w = Math.min(window.innerWidth, (window.innerHeight * W) / H);
      const h = (w * H) / W;
      stage.style.width = w + 'px';
      stage.style.height = h + 'px';
      stage.style.setProperty('--u', w / W + 'px');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.scale = this.canvas.width / W;
    }

    /** Neuen Durchgang starten */
    start(charId, runNumber, onFinish) {
      this.char = C.characters[charId];
      this.runNumber = runNumber;
      this.onFinish = onFinish;
      this.level = BERG.Level.build(C.gates);
      this.level.solids.forEach((s) => BERG.Art.preparePlatform(s));

      const L = this.level;
      this.player = {
        x: L.start.x - P.playerWidth / 2, y: L.start.y - P.playerHeight,
        w: P.playerWidth, h: P.playerHeight,
        vx: 0, vy: 0, onGround: false, ground: null, facing: 1,
        coyote: 0, jumpBuffer: 0, jumpCut: true,
        stamina: S.max, exhausted: false, sitting: false, sitT: 0, sitCounted: false, idleT: 0,
        phase: 0,
        slipT: 0, slipTotal: 0, // [ZUFALL] Ausrutscher
        provisions: this.char.provisions,
        load: this.char.load,       // [RUCKSACK] aktuelles Gewicht
        relieved: false, hutFood: false,
        anchor: null,               // [SEIL] letzter Bohrhaken
        cp: 0,                      // letzter Checkpoint (für beide gleich)
      };

      // [TRACKING]
      this.stats = {
        char: charId, time: 0, falls: 0, detours: 0, pauses: 0, restTime: 0,
        workShifts: 0, workTime: 0, energy: 0, hutVisits: 0, provisionsUsed: 0,
        events: [], gates: Object.assign({}, L.gates),
      };

      this.triggered = new Set();
      this.env = { fog: 0, storm: 0, wind: 0, gust: 0, gusting: false, gustTimer: 2, steep: false };
      this.fx = [];
      this.rain = Array.from({ length: 150 }, () => ({
        x: Math.random() * (W + 200) - 100, y: Math.random() * H, v: 650 + Math.random() * 350, len: 10 + Math.random() * 14,
      }));
      this.t = 0;
      this.mode = 'intro';
      this.modeT = 0;
      this.fade = 1;
      this.fadeLight = false;
      this.prompt = '';
      this.showControls = false;
      this.hasSat = false;
      this.look = C.camera.lookAhead;
      this.cam = { x: 0, y: 0 };
      this.snapCamera();

      BERG.HUD.reset(this);
      BERG.HUD.intro(T.start.characters[charId].name, T.runIntro.goal, 2.4);
      this.input.reset();
      this.input.enabled = true;
      this.paused = false;
      this.running = true;
      this.acc = 0;
      this.last = performance.now();
      requestAnimationFrame(this.frame);
    }

    stop() {
      this.running = false;
      this.input.enabled = false;
    }

    setMode(m) { this.mode = m; this.modeT = 0; }

    // -------------------------------------------------------------------------
    // HAUPTSCHLEIFE
    // -------------------------------------------------------------------------
    frame(ts) {
      if (!this.running) return;
      const dt = Math.min((ts - this.last) / 1000, 0.1);
      this.last = ts;

      if (this.input.take('pause') && this.mode !== 'work' && this.mode !== 'summit') {
        this.paused = !this.paused;
        this.input.pressed = {};
      }
      if (DEBUG) this.debugKeys();

      if (!this.paused) {
        this.acc += dt;
        let n = 0;
        while (this.acc >= STEP && n < 14 && this.running) { this.update(STEP); this.acc -= STEP; n++; }
        if (n >= 14) this.acc = 0;
      }
      this.render();
      BERG.HUD.update(this);
      if (this.running) requestAnimationFrame(this.frame);
    }

    update(dt) {
      this.t += dt;
      this.modeT += dt;
      this.updateEnv(dt);
      this.updateFx(dt);

      switch (this.mode) {
        case 'intro':
          this.fade = Math.max(0, 1 - this.modeT / 0.7);
          if (this.modeT > 0.9) { this.setMode('play'); this.showControls = true; }
          break;
        case 'play':
          this.stats.time += dt;
          this.updatePlay(dt);
          break;
        case 'caught':
          this.stats.time += dt;
          this.updateCaught(dt);
          break;
        case 'falling':
          this.stats.time += dt;
          this.updateFalling(dt);
          break;
        case 'resting':
          this.stats.time += dt;
          this.updateResting(dt);
          break;
        case 'work':
          // [SCHUHE] Der Haupttimer läuft weiter!
          this.stats.time += dt;
          this.stats.workTime += dt;
          break;
        case 'summit':
          this.updateSummit(dt);
          break;
      }
      this.updateCamera(dt);
    }

    // -------------------------------------------------------------------------
    // UMGEBUNG: Nebel, Sturm, Steilhang
    // -------------------------------------------------------------------------
    updateEnv(dt) {
      const p = this.player;
      const cx = p.x + p.w / 2;
      const feet = p.y + p.h;
      const Z = this.level.zones;

      // Nebel
      let f = 0;
      const fz = Z.fog;
      if (cx > fz.x1 && cx < fz.x2) {
        f = Math.min((cx - fz.x1) / fz.ramp, (fz.x2 - cx) / 40, 1);
        if (feet < fz.ceiling) f *= Math.max(0, 1 - (fz.ceiling - feet) / 50);
      }
      this.env.fog = approach(this.env.fog, clamp(f, 0, 1), dt * 2);

      // [STURM] trifft beide gleich
      let s = 0;
      const sz = Z.storm;
      if (cx > sz.x1 && cx < sz.x2) s = Math.min((cx - sz.x1) / sz.ramp, (sz.x2 - cx) / sz.ramp, 1);
      this.env.storm = approach(this.env.storm, clamp(s, 0, 1), dt * 1.5);

      const st = C.storm;
      if (this.env.storm > 0.05) {
        this.env.gustTimer -= dt;
        if (this.env.gustTimer <= 0) {
          this.env.gusting = !this.env.gusting;
          this.env.gustTimer = this.env.gusting
            ? st.gustDuration
            : st.gustPauseMin + Math.random() * (st.gustPauseMax - st.gustPauseMin);
        }
      } else {
        this.env.gusting = false;
      }
      this.env.gust = approach(this.env.gust, this.env.gusting ? 1 : 0, dt * 3);
      this.env.wind = this.env.storm * (st.baseWind + (st.gustWind - st.baseWind) * this.env.gust);
      this.env.steep = Z.steep.some((r) => cx > r.x1 && cx < r.x2);

      if (this.env.storm > 0.01) {
        for (const d of this.rain) {
          d.x += (this.env.wind * 2.4 - 40) * dt;
          d.y += d.v * dt;
          if (d.y > H + 20) { d.y = -20; d.x = Math.random() * (W + 200) - 100; }
          if (d.x < -60) d.x += W + 120;
          if (d.x > W + 60) d.x -= W + 120;
        }
      }
    }

    // -------------------------------------------------------------------------
    // SPIELEN
    // -------------------------------------------------------------------------
    updatePlay(dt) {
      const p = this.player;
      const I = this.input;
      const ch = this.char;

      let dir = (I.down.right ? 1 : 0) - (I.down.left ? 1 : 0);
      const jumpPressed = I.take('jump');
      const usePressed = I.take('use');

      // [ZUFALL] Ausrutscher: kurz hingefallen, keine Eingaben
      const slipping = p.slipT > 0 && p.onGround;
      if (slipping) {
        p.slipT -= dt;
        dir = 0;
      }

      // Erschöpfung: erst ab einem Mindestwert geht es weiter
      if (p.exhausted) {
        dir = 0;
        if (p.stamina >= S.exhaustedRecoverTo) p.exhausted = false;
      }

      // Verschnaufen (S halten)
      p.sitting = !!I.down.down && p.onGround && !p.exhausted && !slipping && dir === 0;
      if (p.sitting) {
        p.sitT += dt;
        if (p.sitT > 0.8) this.hasSat = true;
        if (!p.sitCounted && p.sitT > S.sitCountsAsPauseAfter && p.stamina < S.max - 1) {
          p.sitCounted = true;
          this.stats.pauses++;
        }
      } else {
        p.sitT = 0;
        p.sitCounted = false;
      }
      if (dir !== 0) p.facing = dir;

      // Ausdauer beeinflusst Tempo und Sprungkraft (für beide gleich berechnet)
      const low = clamp(p.stamina / S.lowThreshold, 0, 1);
      const speedMul = lerp(S.lowSpeedFactor, 1, low);
      const jumpMul = lerp(S.lowJumpFactor, 1, low);
      const zoneMul = (this.env.steep ? S.steepMultiplier : 1) * lerp(1, S.stormMultiplier, this.env.storm);
      const slip = C.storm.slipperiness * this.env.storm * (2 - ch.grip);
      const grip = 1 - clamp(slip, 0, 0.85);

      // Horizontal
      const target = dir * P.runSpeed * speedMul;
      const accel = p.onGround ? (dir !== 0 ? P.groundAccel : P.groundDecel) * grip : P.airAccel;
      p.vx = approach(p.vx, target, accel * dt);

      // Springen
      p.coyote = p.onGround ? P.coyoteTime : p.coyote - dt;
      p.jumpBuffer = jumpPressed ? P.jumpBuffer : p.jumpBuffer - dt;
      if (p.jumpBuffer > 0 && p.coyote > 0 && !p.exhausted && !slipping) {
        p.sitting = false;
        p.vy = -P.jumpVelocity * jumpMul;
        p.onGround = false;
        p.coyote = 0;
        p.jumpBuffer = 0;
        p.jumpCut = false;
        // [RUCKSACK] gleicher Sprung, aber Gewicht erhöht den Verbrauch
        this.drain(S.jumpDrain * p.load * zoneMul);
        this.dust(p.x + p.w / 2, p.y + p.h, 3);
      }
      if (!I.down.jump && p.vy < 0 && !p.jumpCut) { p.vy *= P.jumpCut; p.jumpCut = true; }

      // Schwerkraft
      p.vy = Math.min(p.vy + P.gravity * dt, P.maxFallSpeed);

      // [STURM] Wind drückt zurück: im Stehen, beim Gehen (etwas weniger) und in der Luft
      let wind = this.env.wind * (p.onGround ? C.storm.groundFactor * (dir !== 0 ? 0.5 : 1) : C.storm.airFactor);
      if (p.sitting || p.exhausted || slipping) wind *= 0.3;
      // Sicherung: Wer stillsteht, wird höchstens bis an die Kante geschoben, nicht darüber
      if (p.onGround && dir === 0 && p.ground && !C.storm.windCanPushOffEdge) {
        const minX = p.ground.x - p.w + 10, maxX = p.ground.x + p.ground.w - 10;
        const nx = p.x + (p.vx + wind) * dt;
        if (nx < minX || nx > maxX) wind = (clamp(nx, minX, maxX) - p.x) / dt - p.vx;
      }

      const wasGround = p.onGround;
      const vyBefore = p.vy;
      this.collectNearby();
      this.moveX(p, (p.vx + wind) * dt);
      this.moveY(p, p.vy * dt);
      if (!wasGround && p.onGround && vyBefore > 450) this.dust(p.x + p.w / 2, p.y + p.h, 5);

      // [RUCKSACK] Ausdauer: Verbrauch × Gewicht, Erholung × Erholungsfaktor
      const moving = p.onGround && dir !== 0 && Math.abs(p.vx) > 20;
      if (moving) {
        p.idleT = 0;
        this.drain(S.walkDrain * p.load * zoneMul * dt);
        this.regen(S.regenWalk * ch.regenMultiplier * dt);
      } else if (p.onGround) {
        p.idleT += dt;
        if (p.idleT > S.idleDelay) {
          if (p.stamina < S.max) this.stats.restTime += dt;
          this.regen((p.sitting || p.exhausted ? S.regenSit : S.regenIdle) * ch.regenMultiplier * dt);
        }
      } else {
        p.idleT = 0;
      }
      if (p.stamina <= 0 && p.onGround && !p.exhausted) {
        p.exhausted = true;
        p.vx = 0;
        this.stats.pauses++;
        BERG.HUD.toast(T.toasts.exhausted);
      }

      if (p.onGround && Math.abs(p.vx) > 10) p.phase += dt * Math.abs(p.vx) * 0.045;
      if (p.stamina < S.lowThreshold && Math.random() < dt * 2.4) this.puff();

      // E: Hütte oder Proviant
      this.prompt = '';
      const cx = p.x + p.w / 2;
      const hz = this.level.hut.zone;
      if (p.onGround && cx > hz.x1 && cx < hz.x2) {
        this.prompt = T.prompts.hut;
        if (usePressed) { this.startRest(); return; }
      } else if (p.provisions > 0 && p.stamina < S.max - 10) {
        if (p.stamina < 60) this.prompt = T.prompts.eat;
        if (usePressed) this.eat();
      }
      if (!this.prompt && !this.hasSat && p.stamina < 25 && !p.exhausted) this.prompt = T.prompts.sit;

      this.checkTriggers();
    }

    drain(v) {
      const p = this.player;
      p.stamina = Math.max(0, p.stamina - v);
      this.stats.energy += v;
    }

    regen(v) {
      const p = this.player;
      p.stamina = Math.min(S.max, p.stamina + v);
    }

    // Kollision ---------------------------------------------------------------
    collectNearby() {
      const p = this.player;
      this.nearby = this.level.solids.filter((s) =>
        s.x < p.x + 320 && s.x + s.w > p.x - 320 && s.y < p.y + 600 && s.y + s.h > p.y - 600);
    }

    moveX(p, dx) {
      if (!dx) return;
      p.x += dx;
      for (const s of this.nearby) {
        if (overlap(p, s)) {
          p.x = dx > 0 ? s.x - p.w : s.x + s.w;
          p.vx = 0;
        }
      }
      p.x = clamp(p.x, this.level.bounds.minX + 60, this.level.bounds.maxX - p.w);
    }

    moveY(p, dy) {
      p.y += dy;
      p.onGround = false;
      for (const s of this.nearby) {
        if (overlap(p, s)) {
          if (dy > 0) { p.y = s.y - p.h; p.vy = 0; p.onGround = true; p.ground = s; }
          else if (dy < 0) { p.y = s.y + s.h; p.vy = 0; }
        }
      }
    }

    // -------------------------------------------------------------------------
    // AUSLÖSER IN DER WELT
    // -------------------------------------------------------------------------
    checkTriggers() {
      const p = this.player;
      const L = this.level;
      const cx = p.x + p.w / 2;
      const feet = p.y + p.h;

      // [SEIL] Bohrhaken merken (existieren für alle, nutzbar nur mit Seil)
      if (p.onGround && p.ground && p.ground.anchor) {
        const g = p.ground;
        const rings = g.art.rings;
        const rx = rings.reduce((best, x) => (Math.abs(x - cx) < Math.abs(best - cx) ? x : best), rings[0]);
        // Wiedereinstieg: Mitte schmaler Pfeiler bzw. mit Abstand zur Kante (Anlauf möglich)
        const ax = g.w < 160 ? g.x + g.w / 2 : clamp(cx, g.x + 50, g.x + g.w - 50);
        p.anchor = { x: ax, y: g.y, rx, ry: g.y + 17 };
      }

      // Checkpoints (für beide identisch)
      for (let i = p.cp + 1; i < L.checkpoints.length; i++) {
        const c = L.checkpoints[i];
        if (p.onGround && cx >= c.x && Math.abs(feet - c.y) < 160) p.cp = i;
      }

      // Absturz
      for (const hz of L.hazards) {
        if (cx > hz.x1 && cx < hz.x2 && feet > hz.yTrigger) return this.startFall(hz);
      }
      if (feet > L.bounds.killY) return this.startFall(null);

      // [TRACKING] Umwege / Sackgassen
      for (const z of L.detourZones) {
        if (!this.triggered.has(z.id) && p.onGround && cx > z.x1 && cx < z.x2 && feet > z.y1 && feet < z.y2) {
          this.triggered.add(z.id);
          this.stats.detours++;
          BERG.HUD.toast(T.toasts.deadEnd);
        }
      }

      // [ZUFALL]
      L.eventTriggers.forEach((e, i) => {
        const id = 'event' + i;
        if (!this.triggered.has(id) && cx >= e.x) { this.triggered.add(id); this.randomEvent(); }
      });

      // Atmosphäre
      if (this.env.fog > 0.3 && !this.triggered.has('fogMsg')) { this.triggered.add('fogMsg'); BERG.HUD.toast(T.toasts.fog); }
      if (this.env.storm > 0.25 && !this.triggered.has('stormMsg')) { this.triggered.add('stormMsg'); BERG.HUD.toast(T.toasts.storm); }

      // Gipfel
      if (cx >= L.summit.x && p.onGround) return this.reachSummit();

      // [SCHUHE] nur für Charaktere mit job: true (einfache Schuhe)
      if (this.char.job) {
        for (let i = 0; i < L.workTriggers.length; i++) {
          const id = 'work' + i;
          if (!this.triggered.has(id) && cx >= L.workTriggers[i].x && p.onGround) {
            this.triggered.add(id);
            return this.startWork(i);
          }
        }
      }
    }

    // [ZUFALL] gleiche Wahrscheinlichkeiten für beide Charaktere
    randomEvent() {
      if (Math.random() > C.events.chance) return;
      const pool = C.events.pool;
      const e = pool[Math.floor(Math.random() * pool.length)];
      if (e.stamina > 0) this.regen(e.stamina);
      else this.player.stamina = Math.max(0, this.player.stamina + e.stamina);
      if (e.slip) {
        // kurz hinfallen (setzt ein, sobald die Figur Boden unter den Füßen hat)
        this.player.slipT = C.events.slipDuration;
        this.player.slipTotal = C.events.slipDuration;
        this.dust(this.player.x + this.player.w / 2, this.player.y + this.player.h, 6);
      }
      this.stats.events.push(e.id);
      BERG.HUD.toast(T.events[e.id], 3.2);
    }

    eat() {
      const p = this.player;
      p.provisions--;
      this.regen(C.provisions.restore);
      this.stats.provisionsUsed++;
      BERG.HUD.toast(T.toasts.eat, 2);
    }

    // -------------------------------------------------------------------------
    // [SEIL] ABSTURZ – derselbe Fehler, unterschiedliche Folgen
    // -------------------------------------------------------------------------
    startFall(hazard) {
      const p = this.player;
      this.stats.falls++;
      p.stamina = Math.max(12, p.stamina - S.fallCost);
      p.exhausted = false;
      p.sitting = false;
      if (this.char.rope && p.anchor && hazard) {
        // Seil greift: kurz hängen, dann zurück zum letzten Bohrhaken
        this.caught = { anchor: p.anchor };
        this.setMode('caught');
        BERG.HUD.toast(T.toasts.ropeHolds);
      } else {
        // Kein Seil: weiter Sturz, zurück zum letzten Checkpoint
        this.fallRespawned = false;
        this.setMode('falling');
        BERG.HUD.toast(T.toasts.fall);
      }
    }

    updateCaught(dt) {
      const p = this.player;
      const c = this.caught;
      const t = this.modeT;
      if (t < 0.22) {
        p.vy *= Math.pow(0.004, dt);
        p.y += p.vy * dt;
        p.x += p.vx * dt * 0.3;
        c.hx = p.x; c.hy = p.y;
      } else if (t < 0.95) {
        const k = (t - 0.22) / 0.73;
        p.x = c.hx + Math.sin((t - 0.22) * 7) * 7 * (1 - k);
        p.y = c.hy;
      } else if (t < 1.75) {
        if (c.fx === undefined) { c.fx = p.x; c.fy = p.y; }
        const k = ease((t - 0.95) / 0.8);
        p.x = lerp(c.fx, c.anchor.x - p.w / 2, k);
        p.y = lerp(c.fy, c.anchor.y - p.h, k) - Math.sin(k * Math.PI) * 30;
      } else {
        p.x = c.anchor.x - p.w / 2;
        p.y = c.anchor.y - p.h;
        p.vx = p.vy = 0;
        p.onGround = true;
        this.setMode('play');
      }
    }

    updateFalling(dt) {
      const p = this.player;
      const t = this.modeT;
      if (!this.fallRespawned) {
        p.vy = Math.min(p.vy + P.gravity * dt, P.maxFallSpeed);
        p.y += p.vy * dt;
        p.x += p.vx * dt * 0.4;
      }
      if (t > 0.75 && t <= 1.25) this.fade = Math.min(1, (t - 0.75) / 0.45);
      if (t > 1.25 && !this.fallRespawned) {
        this.fallRespawned = true;
        const cp = this.level.checkpoints[p.cp];
        this.placePlayer(cp.x, cp.y);
        this.snapCamera();
        BERG.HUD.toast(T.toasts.respawnFar, 3);
      }
      if (t > 1.7) this.fade = Math.max(0, 1 - (t - 1.7) / 0.5);
      if (t > 2.2) { this.fade = 0; this.setMode('play'); }
    }

    placePlayer(x, feetY) {
      const p = this.player;
      p.x = x - p.w / 2;
      p.y = feetY - p.h;
      p.vx = p.vy = 0;
      p.onGround = true;
      p.ground = null;
    }

    // -------------------------------------------------------------------------
    // [HÜTTE] Unterstützung – steht allen offen
    // -------------------------------------------------------------------------
    startRest() {
      const p = this.player;
      const hut = this.level.hut;
      p.vx = 0;
      p.x = hut.x - 12 - p.w / 2;
      p.facing = 1;
      p.exhausted = false;
      this.stats.hutVisits++;
      this.setMode('resting');
      BERG.HUD.toast(T.toasts.hutRest, C.hut.restDuration);
    }

    updateResting(dt) {
      const p = this.player;
      this.regen(C.hut.regenPerSecond * dt);
      if (this.modeT < C.hut.restDuration) return;
      // Unterstützung pro Charakter (config.js → hutProvisions / hutRelief).
      // Standard: Wer ohnehin gut ausgestattet ist, bekommt etwas mehr.
      const msgs = [];
      const food = this.char.hutProvisions || 0;
      if (!p.hutFood && food > 0) {
        p.hutFood = true;
        p.provisions = Math.min(C.provisions.max, p.provisions + food);
        msgs.push(food > 1 ? T.toasts.hutFoodMore : T.toasts.hutFood);
      }
      const relief = this.char.hutRelief || 0;
      if (!p.relieved && relief > 0 && p.load > 1) {
        p.relieved = true;
        p.load = Math.max(1, p.load - relief);
        msgs.push(T.toasts.hutRepack);
      }
      msgs.forEach((m, i) => setTimeout(() => BERG.HUD.toast(m, 3.4), i * 3600));
      this.setMode('play');
    }

    // -------------------------------------------------------------------------
    // [SCHUHE] Unterbrechung – der Timer läuft weiter
    // -------------------------------------------------------------------------
    startWork(index) {
      const p = this.player;
      p.vx = 0;
      p.sitting = false;
      this.setMode('work');
      BERG.Work.start(() => {
        this.stats.workShifts++;
        p.stamina = Math.max(5, p.stamina - C.work.staminaCost);
        this.input.reset();
        this.setMode('play');
        BERG.HUD.toast(T.toasts.workBack, 2);
      }, index);
    }

    // -------------------------------------------------------------------------
    // GIPFEL
    // -------------------------------------------------------------------------
    reachSummit() {
      this.player.vx = 0;
      this.setMode('summit');
    }

    updateSummit(dt) {
      const p = this.player;
      p.vx = approach(p.vx, 0, 2000 * dt);
      if (this.modeT > 1.6) { this.fadeLight = true; this.fade = Math.min(1, (this.modeT - 1.6) / 0.8); }
      if (this.modeT > 2.6) {
        this.stop();
        this.onFinish && this.onFinish(this.stats);
      }
    }

    // -------------------------------------------------------------------------
    // KAMERA
    // -------------------------------------------------------------------------
    updateCamera(dt) {
      const p = this.player;
      this.look = approach(this.look, p.facing * C.camera.lookAhead, dt * 160);
      const tx = p.x + p.w / 2 + this.look - W / 2;
      const ty = p.y + p.h - H * C.camera.verticalAnchor;
      const k = 1 - Math.exp(-C.camera.lerp * dt);
      this.cam.x += (tx - this.cam.x) * k;
      const freezeY = this.mode === 'falling' && !this.fallRespawned && this.modeT > 0.2;
      if (!freezeY) this.cam.y += (ty - this.cam.y) * k;
      this.clampCamera();
    }

    snapCamera() {
      const p = this.player;
      this.cam.x = p.x + p.w / 2 + this.look - W / 2;
      this.cam.y = p.y + p.h - H * C.camera.verticalAnchor;
      this.clampCamera();
    }

    clampCamera() {
      const b = this.level.bounds;
      this.cam.x = clamp(this.cam.x, b.minX, b.maxX - W);
      this.cam.y = Math.min(this.cam.y, 240 - H);
    }

    // -------------------------------------------------------------------------
    // PARTIKEL
    // -------------------------------------------------------------------------
    puff() {
      const p = this.player;
      this.fx.push({ x: p.x + p.w / 2 + p.facing * 9, y: p.y + (p.sitting || p.exhausted ? 14 : 4), vx: p.facing * 18, vy: -14, life: 0, max: 0.9, r: 2.2 });
    }

    dust(x, y, n) {
      for (let i = 0; i < n; i++) {
        this.fx.push({ x: x + (Math.random() - 0.5) * 16, y: y - 2, vx: (Math.random() - 0.5) * 70, vy: -20 - Math.random() * 30, life: 0, max: 0.45, r: 2 + Math.random() * 2 });
      }
    }

    updateFx(dt) {
      for (const f of this.fx) { f.life += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += dt * 4; }
      this.fx = this.fx.filter((f) => f.life < f.max);
    }

    // -------------------------------------------------------------------------
    // RENDERING
    // -------------------------------------------------------------------------
    render() {
      const ctx = this.ctx;
      const A = BERG.Art;
      const L = this.level;
      const p = this.player;
      ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      ctx.imageSmoothingEnabled = true;

      const cam = { x: Math.round(this.cam.x * 2) / 2, y: Math.round(this.cam.y * 2) / 2 };
      A.drawBackground(ctx, cam, { t: this.t });

      ctx.save();
      ctx.translate(-cam.x, -cam.y);
      const view = { x1: cam.x - 60, x2: cam.x + W + 60, y1: cam.y - 60, y2: cam.y + H + 60 };
      const visible = (o, w, h) => o.x < view.x2 && o.x + (w || 0) > view.x1 - 200 && o.y > view.y1 - 200 && o.y - (h || 0) < view.y2 + 200;

      for (const c of L.caves) if (c.x < view.x2 && c.x + c.w > view.x1) A.drawCave(ctx, c);
      for (const hz of L.hazards) A.drawAbyss(ctx, hz, view);
      for (const s of L.solids) A.drawPlatform(ctx, s, view, this.t);
      for (const d of L.decor) {
        if (!visible(d, 180, 200)) continue;
        const cpActive = d.cp ? L.checkpoints.indexOf(d.cp) <= p.cp : false;
        A.drawDecor(ctx, d, this.t, { cpActive });
      }

      const cx = p.x + p.w / 2;

      // [KARTE] Route nur mit Karte sichtbar
      if (this.char.map) {
        const z = L.mapZone;
        const a = cx > z.x1 && cx < z.x2 ? Math.min(1, (cx - z.x1) / 200, (z.x2 - cx) / 200) : 0;
        A.drawRoute(ctx, L.routes[L.gates.fork], a * 0.9, this.t);
      }

      // [SEIL] Seil zum letzten Bohrhaken
      const nearHazard = L.hazards.some((h) => cx > h.x1 - 200 && cx < h.x2 + 40);
      if (this.char.rope && p.anchor && (nearHazard || this.mode === 'caught')) {
        A.drawRope(ctx, p.anchor.rx, p.anchor.ry, cx, p.y + p.h - 22);
      }

      A.drawCharacter(ctx, {
        id: this.char.id, x: cx, y: p.y + p.h, facing: p.facing,
        pose: this.poseFor(), t: this.t, phase: p.phase, tired: p.exhausted,
        slip: this.slipAmount(),
        packScale: 1 - (this.char.load - p.load) * 0.5,
        gear: {
          pack: this.char.pack, boots: this.char.boots, map: this.char.map,
          compass: this.char.compass, rope: this.char.rope, provisions: p.provisions > 0,
        },
      });

      for (const f of this.fx) {
        ctx.fillStyle = `rgba(245,241,232,${0.8 * (1 - f.life / f.max)})`;
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
      }

      if (DEBUG) this.drawDebug(ctx);
      ctx.restore();

      A.drawFog(ctx, cx - cam.x, p.y + p.h / 2 - cam.y, this.env.fog, this.t, C.fog.visibleRadius, C.fog.density);
      A.drawStorm(ctx, this.env.storm, this.rain, this.env.wind, this.env.gust);
      A.drawVignette(ctx);
    }

    /** 0 … 1: wie weit die Figur beim Ausrutscher gerade „liegt“ */
    slipAmount() {
      const p = this.player;
      if (!(p.slipT > 0)) return 0;
      const elapsed = p.slipTotal - p.slipT;
      return Math.min(1, elapsed / 0.18, p.slipT / 0.35);
    }

    poseFor() {
      const p = this.player;
      if (this.mode === 'caught') return 'hang';
      if (p.slipT > 0 && p.onGround && this.mode === 'play') return 'slip';
      if (this.mode === 'resting' || this.mode === 'work' || p.exhausted || p.sitting) return 'sit';
      if (this.mode === 'falling') return 'fall';
      if (!p.onGround) return p.vy < 0 ? 'jump' : 'fall';
      if (Math.abs(p.vx) > 15) return 'walk';
      return 'idle';
    }

    // -------------------------------------------------------------------------
    // DEBUG  (index.html?debug)
    //   1–5 Checkpoints · 6 Grat · 7 Nebel · 8 Sturm · 9 Gipfel
    //   M volle Ausdauer · N leere Ausdauer · K Durchgang sofort beenden
    // -------------------------------------------------------------------------
    debugKeys() {
      const I = this.input;
      const L = this.level;
      const jumps = { Digit6: [7200, -1700], Digit7: [8900, -1870], Digit8: [10700, -2430], Digit9: [13300, -2980] };
      for (let i = 1; i <= 5; i++) {
        if (I.take('Digit' + i)) { const c = L.checkpoints[i - 1]; this.player.cp = i - 1; this.placePlayer(c.x, c.y); this.snapCamera(); }
      }
      for (const k in jumps) if (I.take(k)) { this.placePlayer(jumps[k][0], jumps[k][1]); this.snapCamera(); }
      if (I.take('KeyM')) this.player.stamina = S.max;
      if (I.take('KeyN')) this.player.stamina = 3;
      if (I.take('KeyK')) { this.stop(); this.onFinish && this.onFinish(this.stats); }
    }

    drawDebug(ctx) {
      const L = this.level;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,0,80,0.6)';
      for (const s of this.nearby || []) ctx.strokeRect(s.x, s.y, s.w, Math.min(s.h, 400));
      ctx.strokeStyle = 'rgba(0,120,255,0.8)';
      for (const h of L.hazards) { ctx.beginPath(); ctx.moveTo(h.x1, h.yTrigger); ctx.lineTo(h.x2, h.yTrigger); ctx.stroke(); }
      ctx.strokeStyle = 'rgba(0,160,60,0.9)';
      for (const z of L.detourZones) ctx.strokeRect(z.x1, z.y1, z.x2 - z.x1, z.y2 - z.y1);
      const p = this.player;
      ctx.strokeStyle = '#0a0';
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#000';
      ctx.font = '11px monospace';
      ctx.fillText(`${this.mode}  x${Math.round(p.x)} y${Math.round(p.y + p.h)}  st${p.stamina.toFixed(0)} load${p.load.toFixed(2)}  cp${p.cp}  fork:${L.gates.fork} fog:${L.gates.fog}`, p.x - 120, p.y - 30);
    }
  }

  BERG.Game = Game;
})();
