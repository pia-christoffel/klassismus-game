/* =============================================================================
   DER BERG – Grafik (Canvas-Zeichnungen & Icons)
   -----------------------------------------------------------------------------
   Stil: reduzierte Editorial-Illustration, Siebdruck, alte Bergplakate.
   Alles hier ist „Platzhalter-Kunst“, die ohne externe Dateien auskommt.
   Eigene Bilder: siehe js/assets.js – dort eingetragene Bilder ersetzen
   automatisch die entsprechende Zeichnung.

   Farben ändern: BERG.PALETTE (unten).
   ============================================================================= */

window.BERG = window.BERG || {};

BERG.PALETTE = {
  paper: '#EEE8DA',
  paperLight: '#F5F1E8',
  paperDark: '#E2DACA',
  ink: '#1E1D1B',
  inkSoft: '#3A3834',

  // Hintergrund-Bergketten (hinten → vorn)
  goal: '#CBC2AE',
  far: '#D3CBB9',
  mid: '#B9AF9B',
  near: '#998F7C',

  rockLow: '#7A7366',
  rockHigh: '#5E5B56',
  rockDark: '#403D38',
  moss: '#6D7651',
  mossDark: '#4F573A',
  snow: '#F4F0E7',
  cave: '#2B2824',

  jacket: '#A9462D',
  jacketDark: '#7E3322',
  trousers: '#34332F',
  trousersDark: '#26251F',
  skin: '#D8B596',
  hat: '#2B2A27',

  pack: '#8A7E58',
  packBig: '#6C6246',
  packDark: '#4F4832',
  bedroll: '#5D6663',
  rope: '#D9A93F',
  brass: '#C39A45',
  paperItem: '#F3EEDF',
  bootGood: '#4A3426',
  bootSimple: '#D2CDC2',

  wood: '#7A5A3E',
  woodDark: '#5A4230',
  roof: '#3B3631',
  window: '#E8B85A',
  flag: '#B3452C',
  ochre: '#C9953A',
  tree: '#3E4636',
};

(function () {
  const P = BERG.PALETTE;
  const W = BERG.CONFIG.view.width;
  const H = BERG.CONFIG.view.height;

  // ---------------------------------------------------------------------------
  // Hilfsfunktionen
  // ---------------------------------------------------------------------------
  /** Deterministischer Zufall (gleicher Seed = gleiche Zahlenfolge) */
  function rng(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  BERG.rng = rng;

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function vnoise(x) {
    const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return lerp(hash(i), hash(i + 1), u);
  }
  function hexToRgb(h) {
    const n = parseInt(h.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mix(a, b, t, shift) {
    const A = hexToRgb(a), B = hexToRgb(b), s = shift || 0;
    return `rgb(${Math.round(lerp(A[0], B[0], t) + s)},${Math.round(lerp(A[1], B[1], t) + s)},${Math.round(lerp(A[2], B[2], t) + s)})`;
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const Art = (BERG.Art = { rr, mix });

  // ---------------------------------------------------------------------------
  // Vorberechnete Texturen
  // ---------------------------------------------------------------------------
  let hatchCanvas = null, vignetteCanvas = null, fogCanvas = null;
  const patternCache = new WeakMap();

  Art.init = function () {
    // Schraffur für Bergketten (Siebdruck-Linien)
    hatchCanvas = document.createElement('canvas');
    hatchCanvas.width = hatchCanvas.height = 14;
    const h = hatchCanvas.getContext('2d');
    h.strokeStyle = P.ink; h.lineWidth = 1;
    h.beginPath(); h.moveTo(0, 14); h.lineTo(14, 0); h.moveTo(-4, 4); h.lineTo(4, -4); h.moveTo(10, 18); h.lineTo(18, 10); h.stroke();

    // Vignette
    vignetteCanvas = document.createElement('canvas');
    vignetteCanvas.width = W; vignetteCanvas.height = H;
    const v = vignetteCanvas.getContext('2d');
    const g = v.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.72);
    g.addColorStop(0, 'rgba(30,29,27,0)');
    g.addColorStop(1, 'rgba(30,29,27,0.22)');
    v.fillStyle = g; v.fillRect(0, 0, W, H);

    fogCanvas = document.createElement('canvas');
    fogCanvas.width = W; fogCanvas.height = H;
  };

  function hatchPattern(ctx) {
    let p = patternCache.get(ctx);
    if (!p) { p = ctx.createPattern(hatchCanvas, 'repeat'); patternCache.set(ctx, p); }
    return p;
  }

  // ---------------------------------------------------------------------------
  // HINTERGRUND
  // ---------------------------------------------------------------------------
  const LAYERS = [
    { key: 'bgFar',  par: 0.06, parY: 0.04, base: 400, amp: 120, freq: 1 / 420, seed: 3, color: P.far, hatch: 0 },
    { key: 'bgMid',  par: 0.16, parY: 0.10, base: 470, amp: 125, freq: 1 / 300, seed: 9, color: P.mid, hatch: 0.07 },
    { key: 'bgNear', par: 0.32, parY: 0.20, base: 545, amp: 110, freq: 1 / 210, seed: 21, color: P.near, hatch: 0.1 },
  ];

  function ridge(x, L) {
    let v = 0, a = 1, f = L.freq, norm = 0;
    for (let o = 0; o < 3; o++) {
      const n = vnoise(x * f + L.seed * 17.3 + o * 31.1);
      v += a * (1 - Math.abs(n * 2 - 1));
      norm += a; a *= 0.45; f *= 2.3;
    }
    return (v / norm) * L.amp;
  }

  function drawRidge(ctx, cam, L) {
    const offX = cam.x * L.par;
    const base = L.base + -cam.y * L.parY;
    if (base - L.amp > H + 10) return;

    // Eigenes Bild?
    const img = BERG.Assets.get(L.key);
    if (img) {
      const h = BERG.ASSET_SIZES[L.key] || img.height;
      const w = img.width * (h / img.height);
      let sx = -((offX % w) + w) % w;
      for (; sx < W; sx += w) ctx.drawImage(img, sx, base - h, w, h);
      if (base < H) { ctx.fillStyle = L.color; ctx.fillRect(0, base, W, H - base); }
      return;
    }

    ctx.beginPath();
    ctx.moveTo(-10, H + 10);
    for (let sx = -10; sx <= W + 10; sx += 6) ctx.lineTo(sx, base - ridge(sx + offX, L));
    ctx.lineTo(W + 10, H + 10);
    ctx.closePath();
    ctx.fillStyle = L.color;
    ctx.fill();
    if (L.hatch) {
      ctx.save();
      ctx.clip();
      const pat = hatchPattern(ctx);
      if (pat.setTransform) pat.setTransform(new DOMMatrix([1, 0, 0, 1, -offX % 14, base % 14]));
      ctx.globalAlpha = L.hatch;
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  }

  function drawGoalPeak(ctx, cam) {
    // Der Gipfel ist von Anfang an in der Ferne zu sehen.
    const camCX = cam.x + W / 2;
    const sx = W / 2 + (13650 - camCX) * 0.035;
    const base = 470 + -cam.y * 0.05;
    const s = 1;
    const pts = [[-380, 0], [-240, -110], [-170, -140], [-70, -240], [0, -300], [40, -272], [90, -232], [170, -170], [260, -108], [400, 0]];
    ctx.save();
    ctx.translate(sx, base);
    ctx.scale(s, s);
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fillStyle = P.goal; ctx.fill();
    // Schattenseite
    ctx.beginPath();
    ctx.moveTo(0, -300); ctx.lineTo(40, -272); ctx.lineTo(90, -232); ctx.lineTo(170, -170); ctx.lineTo(260, -108); ctx.lineTo(400, 0); ctx.lineTo(40, 0); ctx.lineTo(20, -150);
    ctx.closePath();
    ctx.fillStyle = 'rgba(30,29,27,0.07)'; ctx.fill();
    // Schneekappe
    ctx.beginPath();
    ctx.moveTo(-70, -240); ctx.lineTo(0, -300); ctx.lineTo(40, -272); ctx.lineTo(90, -232);
    ctx.lineTo(62, -226); ctx.lineTo(38, -244); ctx.lineTo(12, -228); ctx.lineTo(-18, -246); ctx.lineTo(-44, -228);
    ctx.closePath();
    ctx.fillStyle = P.snow; ctx.fill();
    // winzige Fahne
    ctx.strokeStyle = P.inkSoft; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -300); ctx.lineTo(0, -314); ctx.stroke();
    ctx.fillStyle = P.flag; ctx.beginPath(); ctx.moveTo(0, -314); ctx.lineTo(8, -311); ctx.lineTo(0, -308); ctx.fill();
    ctx.restore();
  }

  const CLOUDS = [
    { x: 150, y: 95, w: 170 }, { x: 640, y: 58, w: 110 }, { x: 1120, y: 130, w: 200 }, { x: 1620, y: 76, w: 140 },
  ];

  Art.drawBackground = function (ctx, cam, env) {
    const high = clamp01(-cam.y / 2800);
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, mix('#E4DDCE', '#D5D7D1', high));
    sky.addColorStop(1, P.paper);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Sonne (leicht versetzt gedruckt)
    const sunY = 118 + -cam.y * 0.015;
    ctx.fillStyle = 'rgba(201,149,58,0.32)';
    ctx.beginPath(); ctx.arc(W * 0.74, sunY, 62, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(179,69,44,0.08)';
    ctx.beginPath(); ctx.arc(W * 0.74 + 5, sunY + 4, 62, 0, Math.PI * 2); ctx.fill();

    // Wolken
    ctx.fillStyle = 'rgba(245,241,232,0.85)';
    CLOUDS.forEach((c) => {
      const period = 2100;
      const sx = ((((c.x - cam.x * 0.05 + env.t * 7) % period) + period) % period) - 300;
      const y = c.y + -cam.y * 0.03;
      rr(ctx, sx, y, c.w, 16, 8); ctx.fill();
      rr(ctx, sx + c.w * 0.2, y - 10, c.w * 0.45, 14, 7); ctx.fill();
    });

    drawGoalPeak(ctx, cam);
    LAYERS.forEach((L) => drawRidge(ctx, cam, L));

    // Wolkenmeer in großer Höhe
    const a = clamp01((-cam.y - 1300) / 1500);
    if (a > 0) {
      const top = H - 20 - 120 * a;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let sx = 0; sx <= W; sx += 12) {
        ctx.lineTo(sx, top + Math.sin((sx + cam.x * 0.3) * 0.02 + env.t * 0.3) * 6 + Math.sin((sx + cam.x * 0.3) * 0.051) * 4);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = `rgba(245,241,232,${0.92 * a})`;
      ctx.fill();
    }
  };

  // ---------------------------------------------------------------------------
  // FELS / PLATTFORMEN
  // ---------------------------------------------------------------------------
  Art.preparePlatform = function (p) {
    const r = rng(p.seed * 9973 + 17);
    const top = [];
    const n = Math.max(2, Math.round(p.w / 16));
    for (let i = 0; i <= n; i++) {
      const x = p.x + (p.w * i) / n;
      const j = i === 0 || i === n ? 0 : (r() - 0.5) * 2.6;
      top.push([x, p.y + j]);
    }
    const alt = clamp01(-p.y / 3000);
    const tint = (r() - 0.5) * 14;
    const art = {
      top,
      fill: mix(P.rockLow, P.rockHigh, alt, tint),
      dark: mix(P.rockDark, '#34322F', alt, tint * 0.5),
      hatch: [],
      under: [],
      style: p.y > -330 ? 'moss' : p.y < -2050 ? 'snow' : 'rock',
      tufts: [],
      stones: [],
    };
    const depth = p.type === 'mass' ? 260 : p.h;
    const count = Math.round((p.w * depth) / 2400);
    for (let i = 0; i < count; i++) {
      art.hatch.push([p.x + 6 + r() * (p.w - 12), p.y + 16 + r() * Math.max(4, depth - 22), 4 + r() * 8]);
    }
    if (p.type === 'ledge') {
      const k = Math.max(2, Math.round(p.w / 22));
      art.under.push([p.x + p.w, p.y + p.h * 0.5]);
      for (let i = k - 1; i >= 1; i--) {
        art.under.push([p.x + (p.w * i) / k + (r() - 0.5) * 6, p.y + p.h * 0.75 + r() * (p.h * 0.5 + 6)]);
      }
      art.under.push([p.x, p.y + p.h * 0.5]);
    }
    if (art.style === 'moss') {
      for (let x = p.x + 8; x < p.x + p.w - 6; x += 14 + r() * 22) art.tufts.push([x, r()]);
    }
    if (p.type === 'rubble') {
      for (let i = 0; i < 16; i++) {
        art.stones.push([p.x + 10 + r() * (p.w - 20), p.y + 12 + r() * (p.h - 16), 10 + r() * 16, r()]);
      }
      art.stones.sort((a, b) => a[1] - b[1]);
    }
    // Bohrhaken-Positionen
    if (p.anchor) {
      art.rings = [];
      if (p.w < 140) art.rings.push(p.x + p.w / 2);
      else for (let x = p.x + 36; x < p.x + p.w - 20; x += 260) art.rings.push(x);
    }
    p.art = art;
  };

  function topPath(ctx, a) {
    ctx.moveTo(a.top[0][0], a.top[0][1]);
    for (let i = 1; i < a.top.length; i++) ctx.lineTo(a.top[i][0], a.top[i][1]);
  }

  function bandPath(ctx, a, d) {
    ctx.beginPath();
    topPath(ctx, a);
    for (let i = a.top.length - 1; i >= 0; i--) ctx.lineTo(a.top[i][0], a.top[i][1] + d);
    ctx.closePath();
  }

  Art.drawPlatform = function (ctx, p, view, t) {
    if (p.x > view.x2 || p.x + p.w < view.x1 || p.y > view.y2 || p.y + p.h < view.y1) return;
    const a = p.art;

    if (p.type === 'rubble') return drawRubble(ctx, p);
    if (p.type === 'boulder') return drawBoulder(ctx, p);

    const bottom = Math.min(p.y + p.h, view.y2 + 20);

    // Körper
    ctx.beginPath();
    topPath(ctx, a);
    if (p.type === 'ledge') a.under.forEach((q) => ctx.lineTo(q[0], q[1]));
    else { ctx.lineTo(p.x + p.w, bottom); ctx.lineTo(p.x, bottom); }
    ctx.closePath();
    if (p.type === 'mass') {
      const g = ctx.createLinearGradient(0, p.y, 0, p.y + 440);
      g.addColorStop(0, a.fill); g.addColorStop(1, a.dark);
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = p.type === 'wall' ? mix(P.rockHigh, P.rockDark, 0.25) : a.fill;
    }
    ctx.fill();

    // Schraffur
    ctx.strokeStyle = 'rgba(30,29,27,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const h of a.hatch) {
      if (h[1] > bottom - 4) continue;
      ctx.moveTo(h[0], h[1]); ctx.lineTo(h[0] + h[2] * 0.7, h[1] - h[2] * 0.7);
    }
    if (p.type === 'wall') {
      for (let x = p.x + 14; x < p.x + p.w - 6; x += 22) {
        ctx.moveTo(x, p.y + 10); ctx.lineTo(x + 3, p.y + p.h - 12);
      }
    }
    ctx.stroke();

    // Oberfläche (Wiese / Fels / Schnee)
    if (a.style === 'moss') {
      bandPath(ctx, a, 8); ctx.fillStyle = P.moss; ctx.fill();
      ctx.strokeStyle = P.mossDark; ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const tf of a.tufts) {
        ctx.moveTo(tf[0], p.y); ctx.lineTo(tf[0] - 2, p.y - 4 - tf[1] * 3);
        ctx.moveTo(tf[0] + 2, p.y); ctx.lineTo(tf[0] + 3, p.y - 3 - tf[1] * 4);
      }
      ctx.stroke();
    } else if (a.style === 'snow') {
      bandPath(ctx, a, 6); ctx.fillStyle = P.snow; ctx.fill();
    } else {
      bandPath(ctx, a, 3); ctx.fillStyle = 'rgba(245,241,232,0.28)'; ctx.fill();
    }

    // Tuschelinie
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 1.7;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    topPath(ctx, a);
    if (p.type === 'ledge') { a.under.forEach((q) => ctx.lineTo(q[0], q[1])); ctx.closePath(); }
    ctx.stroke();
    if (p.type !== 'ledge') {
      const sideLen = p.type === 'mass' ? Math.min(bottom - p.y, 220) : p.h;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + sideLen);
      ctx.moveTo(p.x + p.w, p.y); ctx.lineTo(p.x + p.w, p.y + sideLen);
      if (p.type === 'slab' || p.type === 'wall') { ctx.moveTo(p.x, p.y + p.h); ctx.lineTo(p.x + p.w, p.y + p.h); }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Bohrhaken (für beide sichtbar – nutzen kann sie nur, wer ein Seil hat)
    if (a.rings) {
      ctx.strokeStyle = P.ink; ctx.lineWidth = 1.3;
      for (const x of a.rings) {
        ctx.fillStyle = P.inkSoft;
        ctx.fillRect(x - 2, p.y + 10, 4, 4);
        ctx.beginPath(); ctx.arc(x, p.y + 17, 3.2, 0, Math.PI * 2); ctx.stroke();
      }
    }
  };

  function drawRubble(ctx, p) {
    if (BERG.Assets.draw(ctx, 'rubble', p.x + p.w / 2, p.y + p.h, { height: p.h })) return;
    for (const s of p.art.stones) {
      ctx.beginPath();
      ctx.ellipse(s[0], s[1], s[2], s[2] * 0.72, s[3], 0, Math.PI * 2);
      ctx.fillStyle = mix(P.rockLow, P.rockHigh, s[3], -6);
      ctx.fill();
      ctx.strokeStyle = P.ink; ctx.lineWidth = 1.3; ctx.stroke();
    }
  }

  function drawBoulder(ctx, p) {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2 - 2;
    if (BERG.Assets.draw(ctx, 'boulder', cx, p.y + p.h + 8, { height: p.h + 36 })) return;
    ctx.beginPath();
    ctx.ellipse(cx, cy, p.w / 2 + 10, p.h / 2 + 16, 0, 0, Math.PI * 2);
    ctx.fillStyle = mix(P.rockLow, P.rockHigh, 0.5);
    ctx.fill();
    ctx.strokeStyle = P.ink; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(cx - 18, cy - 12); ctx.lineTo(cx - 4, cy); ctx.lineTo(cx - 10, cy + 12); ctx.stroke();
    bandPath(ctx, { top: [[cx - 30, cy - p.h / 2 - 12], [cx, cy - p.h / 2 - 16], [cx + 30, cy - p.h / 2 - 12]] }, 5);
    ctx.fillStyle = P.snow; ctx.fill();
  }

  /** Dunkle Tiefe unter Grat und Sturmkamm, damit Abgründe als solche lesbar sind */
  Art.drawAbyss = function (ctx, hz, view) {
    if (hz.x1 > view.x2 || hz.x2 < view.x1) return;
    const top = hz.yTrigger - 140;
    const bottom = Math.max(view.y2, top + 10);
    if (top > view.y2) return;
    const g = ctx.createLinearGradient(0, top, 0, top + 420);
    g.addColorStop(0, 'rgba(43,40,36,0)');
    g.addColorStop(0.45, 'rgba(43,40,36,0.55)');
    g.addColorStop(1, 'rgba(30,29,27,0.9)');
    ctx.fillStyle = g;
    ctx.fillRect(hz.x1 - 40, top, hz.x2 - hz.x1 + 80, bottom - top);
  };

  Art.drawCave = function (ctx, c) {
    ctx.fillStyle = P.cave;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(c.x, c.y, c.w, 10);
  };

  // ---------------------------------------------------------------------------
  // DEKO
  // ---------------------------------------------------------------------------
  Art.drawDecor = function (ctx, d, t, state) {
    switch (d.type) {
      case 'tree': return drawTree(ctx, d);
      case 'grass': return drawGrass(ctx, d);
      case 'rocks': return drawRocks(ctx, d);
      case 'sign': return drawSign(ctx, d);
      case 'cairn': return drawCairn(ctx, d, t, state && state.cpActive);
      case 'hut': return drawHut(ctx, d, t);
      case 'flag': return drawFlag(ctx, d, t);
    }
  };

  function drawTree(ctx, d) {
    const s = d.s || 1;
    if (BERG.Assets.draw(ctx, 'tree', d.x, d.y, { height: 90 * s })) return;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.scale(s, s);
    ctx.fillStyle = P.inkSoft;
    ctx.fillRect(-2, -14, 4, 14);
    ctx.fillStyle = P.tree;
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 1.2;
    [[-22, -12, -52], [-18, -34, -70], [-13, -54, -88]].forEach(([hw, y0, y1]) => {
      ctx.beginPath(); ctx.moveTo(hw, y0); ctx.lineTo(0, y1); ctx.lineTo(-hw, y0); ctx.closePath();
      ctx.fill(); ctx.stroke();
    });
    ctx.restore();
  }

  function drawGrass(ctx, d) {
    ctx.strokeStyle = P.mossDark; ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const x = d.x + i * 5;
      ctx.moveTo(x, d.y); ctx.quadraticCurveTo(x + 1, d.y - 6, x + 3 - (i % 2) * 5, d.y - 10 - (i % 3) * 2);
    }
    ctx.stroke();
  }

  function drawRocks(ctx, d) {
    ctx.strokeStyle = P.ink; ctx.lineWidth = 1.1;
    [[0, 6, 7], [14, 4, 5], [24, 7, 8], [40, 3, 4]].forEach(([dx, r, w]) => {
      ctx.beginPath(); ctx.ellipse(d.x + dx, d.y - r * 0.6, w, r, 0, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = mix(P.rockLow, P.rockHigh, 0.4, 10); ctx.fill(); ctx.stroke();
    });
  }

  function drawSign(ctx, d) {
    if (BERG.Assets.draw(ctx, 'sign', d.x, d.y)) return;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.fillStyle = P.wood; ctx.strokeStyle = P.ink; ctx.lineWidth = 1.3;
    ctx.fillRect(-2.5, -62, 5, 62); ctx.strokeRect(-2.5, -62, 5, 62);
    const board = (y, rot) => {
      ctx.save(); ctx.translate(0, y); ctx.rotate(rot);
      ctx.beginPath(); ctx.moveTo(-6, -7); ctx.lineTo(30, -7); ctx.lineTo(38, 0); ctx.lineTo(30, 7); ctx.lineTo(-6, 7); ctx.closePath();
      ctx.fillStyle = '#CDBF9F'; ctx.fill(); ctx.stroke();
      // verwitterte Kratzer – absichtlich keine Beschriftung
      ctx.strokeStyle = 'rgba(30,29,27,0.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(14, -3); ctx.moveTo(6, 2); ctx.lineTo(22, 1); ctx.stroke();
      ctx.restore();
    };
    board(-54, -0.5);
    board(-34, 0);
    ctx.restore();
  }

  function drawCairn(ctx, d, t, active) {
    if (!BERG.Assets.draw(ctx, 'cairn', d.x, d.y)) {
      ctx.strokeStyle = P.ink; ctx.lineWidth = 1.2;
      [[0, 9, 5], [0, 7, 4.2], [1, 5.5, 3.6], [0, 4, 3]].reduce((y, [dx, w, h]) => {
        ctx.beginPath(); ctx.ellipse(d.x + dx, y - h, w, h, 0, 0, Math.PI * 2);
        ctx.fillStyle = mix(P.rockLow, P.paperDark, 0.35); ctx.fill(); ctx.stroke();
        return y - h * 2 + 1;
      }, d.y);
    }
    if (active) {
      const y = d.y - 26;
      ctx.strokeStyle = P.ochre; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(d.x, y);
      ctx.quadraticCurveTo(d.x - 6, y - 3 + Math.sin(t * 5) * 2, d.x - 13, y + 1 + Math.sin(t * 5 + 1) * 3);
      ctx.stroke(); ctx.lineCap = 'butt';
    }
  }

  function drawHut(ctx, d, t) {
    // Rauch
    for (let i = 0; i < 5; i++) {
      const k = (t * 0.35 + i / 5) % 1;
      ctx.fillStyle = `rgba(245,241,232,${0.75 * (1 - k)})`;
      ctx.beginPath();
      ctx.arc(d.x + 117 + Math.sin(k * 6 + i) * 6 - k * 26, d.y - 140 - k * 70, 5 + k * 12, 0, Math.PI * 2);
      ctx.fill();
    }
    if (BERG.Assets.draw(ctx, 'hut', d.x + 75, d.y)) return;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.strokeStyle = P.ink; ctx.lineWidth = 1.6;
    // Kamin
    ctx.fillStyle = P.roof; ctx.fillRect(110, -136, 14, 36); ctx.strokeRect(110, -136, 14, 36);
    // Wand
    ctx.fillStyle = P.wood; ctx.fillRect(0, -82, 150, 82); ctx.strokeRect(0, -82, 150, 82);
    ctx.strokeStyle = 'rgba(30,29,27,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); for (let y = -70; y < 0; y += 12) { ctx.moveTo(2, y); ctx.lineTo(148, y); } ctx.stroke();
    // Dach
    ctx.strokeStyle = P.ink; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-16, -78); ctx.lineTo(75, -140); ctx.lineTo(166, -78); ctx.closePath();
    ctx.fillStyle = P.roof; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, -84); ctx.lineTo(75, -140); ctx.lineTo(158, -84); ctx.lineTo(150, -84); ctx.lineTo(75, -132); ctx.lineTo(0, -84); ctx.closePath();
    ctx.fillStyle = P.snow; ctx.fill();
    // Tür & Fenster
    ctx.fillStyle = P.woodDark; ctx.fillRect(58, -54, 30, 54); ctx.strokeRect(58, -54, 30, 54);
    ctx.fillStyle = P.window; ctx.fillRect(106, -60, 26, 22); ctx.strokeRect(106, -60, 26, 22);
    ctx.beginPath(); ctx.moveTo(119, -60); ctx.lineTo(119, -38); ctx.moveTo(106, -49); ctx.lineTo(132, -49); ctx.stroke();
    ctx.fillStyle = P.window; ctx.fillRect(16, -60, 22, 22); ctx.strokeRect(16, -60, 22, 22);
    // Bank
    ctx.fillStyle = P.woodDark; ctx.fillRect(-30, -16, 26, 4);
    ctx.fillRect(-28, -12, 3, 12); ctx.fillRect(-9, -12, 3, 12);
    ctx.restore();
  }

  function drawFlag(ctx, d, t) {
    if (BERG.Assets.draw(ctx, 'flag', d.x + 20, d.y)) return;
    ctx.strokeStyle = P.ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x, d.y - 92); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(d.x, d.y - 90);
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      ctx.lineTo(d.x + k * 52, d.y - 90 + Math.sin(t * 5 - k * 4) * 4 * k + k * 6);
    }
    for (let i = 10; i >= 0; i--) {
      const k = i / 10;
      ctx.lineTo(d.x + k * 52, d.y - 64 + Math.sin(t * 5 - k * 4) * 4 * k - k * 6);
    }
    ctx.closePath();
    ctx.fillStyle = P.flag; ctx.fill();
    ctx.lineWidth = 1.3; ctx.stroke();
    // Steinhaufen am Fuß
    drawCairn(ctx, { x: d.x, y: d.y }, t, false);
  }

  // ---------------------------------------------------------------------------
  // KARTE (Route) & SEIL
  // ---------------------------------------------------------------------------
  Art.drawRoute = function (ctx, pts, alpha, t) {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = P.ochre;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash([2, 11]);
    ctx.lineDashOffset = -t * 22;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    ctx.setLineDash([]);
    const e = pts[pts.length - 1];
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.arc(e[0], e[1], 7, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  };

  Art.drawRope = function (ctx, ax, ay, px, py) {
    const dist = Math.hypot(px - ax, py - ay);
    const mx = (ax + px) / 2, my = (ay + py) / 2 + Math.min(70, dist * 0.2);
    ctx.strokeStyle = P.rope;
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, px, py); ctx.stroke();
    ctx.strokeStyle = P.ink; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(ax, ay, 3, 0, Math.PI * 2); ctx.stroke();
  };

  // ---------------------------------------------------------------------------
  // FIGUR
  // Beide Charaktere sind DIESELBE Figur. Unterschiede nur in der Ausrüstung.
  // o = { x, y (Füße), facing, pose, t, phase, gear: {…}, packScale, scale }
  // ---------------------------------------------------------------------------
  /** Sichtbare Ausrüstung eines Charakters (aus CONFIG.characters) */
  Art.gearFor = function (id) {
    const c = BERG.CONFIG.characters[id];
    return { pack: c.pack, boots: c.boots, map: c.map, compass: c.compass, rope: c.rope, provisions: c.provisions > 0 };
  };

  Art.drawCharacter = function (ctx, o) {
    const s = o.scale || 1;
    const dir = o.facing < 0 ? -1 : 1;
    const baseKey = 'char' + o.id;
    const poseKey = baseKey + '_' + o.pose;
    if (BERG.Assets.get(poseKey) || BERG.Assets.get(baseKey)) {
      const key = BERG.Assets.get(poseKey) ? poseKey : baseKey;
      BERG.Assets.draw(ctx, key, o.x, o.y, { height: (BERG.ASSET_SIZES[baseKey] || 50) * s, flip: dir < 0 });
      return;
    }

    const g = o.gear || {};
    const big = g.pack === 'big';
    const pose = o.pose || 'idle';
    const t = o.t || 0;

    // Pose-Parameter (Winkel: 0 = senkrecht nach unten, + = nach vorn)
    let hipY = -20, bob = 0, lean = big ? 0.06 : 0;
    let thF = 0, shF = 0, thB = 0, shB = 0, armF = 0.1, armB = -0.1;
    switch (pose) {
      case 'walk': {
        const sw = Math.sin(o.phase || 0);
        thF = sw * 0.62; thB = -sw * 0.62;
        shF = thF - (sw < 0 ? 0.55 * -sw : 0);
        shB = thB - (sw > 0 ? 0.55 * sw : 0);
        armF = -sw * 0.55; armB = sw * 0.55;
        bob = Math.abs(Math.cos(o.phase || 0)) * 1.5;
        if (big) lean = 0.17;
        break;
      }
      case 'jump':
        thF = 1.1; shF = 0.2; thB = -0.35; shB = -0.9; armF = -2.3; armB = 0.9;
        break;
      case 'fall':
        thF = 0.35; shF = 0.1; thB = -0.3; shB = -0.2; armF = -2.6; armB = 2.3;
        break;
      case 'sit':
        hipY = -9; thF = 1.5; shF = 0.15; thB = 1.4; shB = 0.05; armF = 0.9; armB = 0.7;
        lean = big ? 0.28 : 0.1;
        break;
      case 'slip': {
        // Ausrutscher: nach hinten auf den Hosenboden, Arme fangen ab
        const k = o.slip || 0;
        hipY = lerp(-20, -8, k); thF = 1.5 * k; shF = 0.9 * k; thB = 1.2 * k; shB = 0.6 * k;
        armF = lerp(0.1, -2.2, k); armB = lerp(-0.1, -1.4, k);
        lean = lerp(big ? 0.06 : 0, -0.55, k);
        break;
      }
      case 'hang':
        thF = 0.2; shF = 0.05; thB = -0.15; shB = -0.1; armF = Math.PI - 0.15; armB = Math.PI - 0.35;
        lean = -0.05;
        break;
      default:
        bob = Math.sin(t * 2.2) * 0.5;
    }

    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(s * dir, s);
    if (pose === 'hang') ctx.rotate(Math.sin(t * 3) * 0.08);
    ctx.translate(0, -bob);

    const leg = (hx, th, sh, color, boot) => {
      const kx = hx + Math.sin(th) * 10, ky = hipY + Math.cos(th) * 10;
      const fx = kx + Math.sin(sh) * 10, fy = ky + Math.cos(sh) * 10;
      ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(hx, hipY); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
      drawBoot(ctx, fx, fy + 1, g.boots);
    };
    const arm = (ang, color) => {
      const sx = 1, sy = hipY - 14;
      const ex = sx + Math.sin(ang) * 13, ey = sy + Math.cos(ang) * 13;
      ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = P.skin; ctx.beginPath(); ctx.arc(ex, ey, 2.2, 0, Math.PI * 2); ctx.fill();
    };

    // hinteres Bein
    leg(-1, thB, shB, P.trousersDark);

    // Oberkörper (mit Vorlage um die Hüfte gedreht)
    ctx.save();
    ctx.translate(0, hipY);
    ctx.rotate(lean);
    ctx.translate(0, -hipY);

    arm(armB, P.jacketDark);
    drawPack(ctx, hipY, g, o.packScale || 1, t);

    // Torso
    rr(ctx, -6, hipY - 17, 13, 19, 4);
    ctx.fillStyle = P.jacket; ctx.fill();
    ctx.strokeStyle = P.ink; ctx.lineWidth = 1.1; ctx.stroke();
    // Gurt
    ctx.strokeStyle = P.packDark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-5, hipY - 15); ctx.lineTo(-2, hipY - 1); ctx.stroke();

    ctx.restore();

    // vorderes Bein
    leg(2, thF, shF, P.trousers);

    ctx.save();
    ctx.translate(0, hipY); ctx.rotate(lean); ctx.translate(0, -hipY);

    // Ausrüstung am Körper (nur wenn vorhanden)
    if (g.rope) {
      ctx.strokeStyle = P.rope; ctx.lineWidth = 2.1;
      ctx.beginPath(); ctx.ellipse(0.5, hipY - 8, 6.5, 10, 0.55, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0.5, hipY - 8, 4.5, 8, 0.55, 0, Math.PI * 2); ctx.stroke();
    }
    if (g.compass) {
      ctx.strokeStyle = P.ink; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(1, hipY - 17); ctx.lineTo(5, hipY - 12); ctx.stroke();
      ctx.fillStyle = P.brass; ctx.beginPath(); ctx.arc(5.5, hipY - 10.5, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 0.9; ctx.stroke();
    }
    if (g.provisions) {
      rr(ctx, 3, hipY - 3, 6, 5, 2); ctx.fillStyle = '#8C6A43'; ctx.fill();
      ctx.strokeStyle = P.ink; ctx.lineWidth = 0.8; ctx.stroke();
    }

    arm(armF, P.jacket);

    // Kopf
    const hx = 1.5 + (pose === 'sit' && o.tired ? 2 : 0), hy = hipY - 24 + (pose === 'sit' && o.tired ? 2 : 0);
    ctx.fillStyle = P.skin;
    ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = P.ink; ctx.lineWidth = 1.1; ctx.stroke();
    // Mütze
    ctx.fillStyle = P.hat;
    ctx.beginPath(); ctx.arc(hx, hy - 0.5, 6.4, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); ctx.fill();
    ctx.fillRect(hx - 6.6, hy - 1.8, 13.2, 2.2);
    ctx.beginPath(); ctx.arc(hx - 1, hy - 7.5, 1.8, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
    ctx.restore();
  };

  function drawBoot(ctx, fx, fy, type) {
    ctx.lineWidth = 0.9; ctx.strokeStyle = P.ink;
    if (type === 'good') {
      rr(ctx, fx - 4, fy - 6, 11, 6.5, 2); ctx.fillStyle = P.bootGood; ctx.fill(); ctx.stroke();
      ctx.fillStyle = P.ink; ctx.fillRect(fx - 4, fy - 0.5, 11, 1.6);
      ctx.fillStyle = P.flag; ctx.fillRect(fx, fy - 5, 2, 2);
    } else {
      rr(ctx, fx - 4, fy - 3.8, 10, 4, 1.5); ctx.fillStyle = P.bootSimple; ctx.fill(); ctx.stroke();
    }
  }

  function drawPack(ctx, hipY, g, ps, t) {
    ctx.strokeStyle = P.ink; ctx.lineWidth = 1.1;
    if (g.pack === 'big') {
      const w = 18 * ps, h = 32 * ps;
      const x = -5 - w, y = hipY + 3 - h;
      // Isomatte oben
      rr(ctx, x - 1.5, y - 7, w + 3, 8, 4); ctx.fillStyle = P.bedroll; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + w * 0.3, y - 7); ctx.lineTo(x + w * 0.3, y + 1); ctx.moveTo(x + w * 0.7, y - 7); ctx.lineTo(x + w * 0.7, y + 1); ctx.stroke();
      // Sack
      rr(ctx, x, y, w, h, 5); ctx.fillStyle = P.packBig; ctx.fill(); ctx.stroke();
      rr(ctx, x + 2, y + 2, w - 4, h * 0.3, 3); ctx.fillStyle = P.packDark; ctx.fill(); ctx.stroke();
      rr(ctx, x + 3, y + h * 0.55, w - 6, h * 0.3, 2); ctx.stroke();
      // angehängte Tasche
      ctx.beginPath(); ctx.ellipse(x - 2, y + h * 0.72, 5 * ps, 6 * ps, 0.2 + Math.sin(t * 6) * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = '#8A8374'; ctx.fill(); ctx.stroke();
      // Riemen
      ctx.strokeStyle = P.packDark; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-5, y + 4); ctx.lineTo(2, hipY - 15); ctx.stroke();
    } else if (g.pack === 'small') {
      rr(ctx, -13, hipY - 16, 8, 15, 3); ctx.fillStyle = P.pack; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-13, hipY - 11); ctx.lineTo(-5, hipY - 11); ctx.stroke();
      if (g.map) {
        ctx.save(); ctx.translate(-11, hipY - 18); ctx.rotate(-0.25);
        ctx.fillStyle = P.paperItem; ctx.fillRect(-2, -4, 6, 7); ctx.strokeRect(-2, -4, 6, 7);
        ctx.beginPath(); ctx.moveTo(-1, -2); ctx.lineTo(3, -2); ctx.moveTo(-1, 0); ctx.lineTo(3, 0); ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // WETTER & ATMOSPHÄRE (Bildschirm-Koordinaten)
  // ---------------------------------------------------------------------------
  Art.drawFog = function (ctx, sx, sy, f, t, radius, density) {
    if (f <= 0.01) return;
    const g = fogCanvas.getContext('2d');
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, W, H);
    g.fillStyle = `rgba(228,223,212,${density * f})`;
    g.fillRect(0, 0, W, H);
    // Nebelschwaden
    g.fillStyle = `rgba(200,195,184,${0.25 * f})`;
    for (let i = 0; i < 6; i++) {
      const x = ((i * 237 + t * (12 + i * 3)) % (W + 400)) - 200;
      g.beginPath(); g.ellipse(x, 80 + i * 80, 220, 26, 0, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'destination-out';
    const r = radius * (1 + Math.sin(t * 1.3) * 0.03);
    const grad = g.createRadialGradient(sx, sy, r * 0.3, sx, sy, r);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(sx, sy, r, 0, Math.PI * 2); g.fill();
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(fogCanvas, 0, 0, W, H);
  };

  Art.drawStorm = function (ctx, f, rain, wind, gust) {
    if (f <= 0.01) return;
    ctx.fillStyle = `rgba(48,54,62,${0.26 * f + 0.1 * gust * f})`;
    ctx.fillRect(0, 0, W, H);
    const haze = ctx.createLinearGradient(W * 0.45, 0, W, 0);
    haze.addColorStop(0, 'rgba(200,202,200,0)');
    haze.addColorStop(1, `rgba(200,202,200,${0.35 * f})`);
    ctx.fillStyle = haze; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(236,236,230,${0.5 * f})`;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (const d of rain) {
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - wind * 0.08, d.y - d.len);
    }
    ctx.stroke();
  };

  Art.drawVignette = function (ctx) { ctx.drawImage(vignetteCanvas, 0, 0, W, H); };

  // ---------------------------------------------------------------------------
  // ABSCHLUSS-ILLUSTRATION (beide Figuren vor demselben Berg)
  // ---------------------------------------------------------------------------
  Art.drawEndScene = function (ctx, w, h, t) {
    ctx.clearRect(0, 0, w, h);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#E4DDCE'); sky.addColorStop(1, P.paper);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(201,149,58,0.3)';
    ctx.beginPath(); ctx.arc(w * 0.72, h * 0.28, h * 0.13, 0, Math.PI * 2); ctx.fill();

    const cx = w / 2, base = h * 0.84, peak = h * 0.1;
    ctx.save();
    ctx.translate(cx, base);
    const s = (base - peak) / 300;
    ctx.scale(s, s);
    ctx.beginPath();
    [[-560, 0], [-330, -120], [-240, -150], [-90, -250], [0, -300], [50, -268], [110, -226], [210, -160], [320, -96], [560, 0]]
      .forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fillStyle = '#A99F8B'; ctx.fill();
    ctx.save(); ctx.clip();
    const pat = hatchPattern(ctx);
    if (pat.setTransform) pat.setTransform(new DOMMatrix([1 / s, 0, 0, 1 / s, 0, 0]));
    ctx.globalAlpha = 0.1; ctx.fillStyle = pat; ctx.fillRect(-600, -320, 1200, 340);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(0, -300); ctx.lineTo(50, -268); ctx.lineTo(110, -226); ctx.lineTo(210, -160); ctx.lineTo(320, -96); ctx.lineTo(560, 0); ctx.lineTo(60, 0); ctx.lineTo(30, -150); ctx.closePath();
    ctx.fillStyle = 'rgba(30,29,27,0.1)'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-90, -250); ctx.lineTo(0, -300); ctx.lineTo(50, -268); ctx.lineTo(110, -226);
    ctx.lineTo(78, -220); ctx.lineTo(46, -240); ctx.lineTo(14, -222); ctx.lineTo(-24, -242); ctx.lineTo(-58, -222); ctx.closePath();
    ctx.fillStyle = P.snow; ctx.fill();
    ctx.strokeStyle = P.ink; ctx.lineWidth = 1.2 / s;
    ctx.beginPath(); ctx.moveTo(0, -300); ctx.lineTo(0, -322); ctx.stroke();
    ctx.fillStyle = P.flag; ctx.beginPath(); ctx.moveTo(0, -322); ctx.lineTo(14, -317); ctx.lineTo(0, -312); ctx.fill();
    ctx.restore();

    ctx.fillStyle = P.moss;
    ctx.fillRect(0, base - 2, w, h - base + 2);
    ctx.fillStyle = P.mossDark; ctx.fillRect(0, base - 2, w, 3);

    const fs = h / 150;
    ['A', 'B'].forEach((id, i) => {
      Art.drawCharacter(ctx, { id, x: cx + (i ? 38 : -30) * fs, y: base, facing: 1, pose: 'idle', t: t + i * 1.3, scale: fs, gear: Art.gearFor(id) });
    });
  };

  // ---------------------------------------------------------------------------
  // ICONS (SVG, für Reveal)
  // Eigene Icons: BERG.ASSET_PATHS.icon_<name> = 'assets/…svg'
  // ---------------------------------------------------------------------------
  BERG.ICONS = {
    mountain: '<path d="M3 40 L17 16 L24 26 L31 12 L45 40 Z"/><path d="M27 19 L31 12 L35 19 L32 17 L29 20 Z"/>',
    flag: '<path d="M14 42 V6"/><path d="M14 8 H36 L31 14 L36 20 H14"/><path d="M7 42 H22"/>',
    map: '<path d="M5 12 L17 8 L31 12 L43 8 V36 L31 40 L17 36 L5 40 Z"/><path d="M17 8 V36 M31 12 V40"/><path d="M9 31 Q14 22 22 25 T39 16" stroke-dasharray="1 4"/>',
    compass: '<circle cx="24" cy="24" r="17"/><path d="M24 11 L28 24 L24 37 L20 24 Z"/><path d="M24 3 V7 M24 41 V45 M3 24 H7 M41 24 H45"/>',
    rope: '<ellipse cx="24" cy="21" rx="15" ry="10"/><ellipse cx="24" cy="21" rx="9" ry="5.5"/><path d="M36 28 Q41 38 31 44"/>',
    boot: '<path d="M14 6 H26 V26 L40 31 Q44 33 43 38 H10 Q9 30 12 26 Z"/><path d="M10 38 V42 H43 V38"/><path d="M26 12 H20 M26 18 H20"/>',
    bread: '<path d="M7 30 Q5 15 24 13 Q43 15 41 30 Q41 36 24 36 Q7 36 7 30 Z"/><path d="M15 20 L18 26 M23 18 L26 25 M31 19 L34 25"/>',
    backpack: '<path d="M13 16 Q13 8 24 8 Q35 8 35 16 V40 Q35 43 32 43 H16 Q13 43 13 40 Z"/><path d="M13 21 H35 L33 28 H15 Z"/><rect x="18" y="32" width="12" height="7" rx="1"/><path d="M20 8 V5 H28 V8"/>',
    lace: '<path d="M4 38 Q4 30 12 28 L22 25 L30 18 Q33 16 36 19 L44 30 Q46 36 40 38 Z"/><path d="M4 38 V42 H44 V38"/><path d="M20 26 L27 22 M24 28 L31 24"/><path d="M29 19 Q20 6 17 13 Q20 18 29 19 Q34 6 39 11 Q37 17 29 19"/><path d="M29 19 Q26 25 22 27 M29 19 Q33 24 34 28"/>',
    box: '<path d="M6 16 L24 8 L42 16 V36 L24 44 L6 36 Z"/><path d="M6 16 L24 24 L42 16 M24 24 V44"/><path d="M15 12 L33 20"/>',
    clock: '<circle cx="24" cy="26" r="16"/><path d="M24 16 V26 L31 30"/><path d="M18 5 H30 M24 5 V10"/>',
    hut: '<path d="M4 24 L24 8 L44 24"/><path d="M9 20 V42 H39 V20"/><rect x="20" y="30" width="8" height="12"/><path d="M32 13 V6 H36 V16"/>',
    storm: '<path d="M13 28 Q5 28 6 21 Q7 14 15 15 Q17 7 26 8 Q35 9 35 17 Q43 17 42 24 Q41 28 35 28 Z"/><path d="M15 33 L11 42 M24 33 L20 42 M33 33 L29 42"/>',
    dice: '<rect x="8" y="8" width="32" height="32" rx="6"/><circle cx="17" cy="17" r="2.2" fill="currentColor"/><circle cx="24" cy="24" r="2.2" fill="currentColor"/><circle cx="31" cy="31" r="2.2" fill="currentColor"/><circle cx="31" cy="17" r="2.2" fill="currentColor"/><circle cx="17" cy="31" r="2.2" fill="currentColor"/>',
  };

  BERG.icon = function (name, cls) {
    const custom = BERG.ASSET_PATHS['icon_' + name];
    if (custom) return `<img class="icon ${cls || ''}" src="${custom}" alt="">`;
    return `<svg class="icon ${cls || ''}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${BERG.ICONS[name] || ''}</svg>`;
  };
})();
