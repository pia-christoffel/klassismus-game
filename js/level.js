/* =============================================================================
   DER BERG – Leveldesign
   -----------------------------------------------------------------------------
   Der Berg wird aus einfachen Rechtecken gebaut (Weltkoordinaten in Pixeln,
   y wächst nach UNTEN, der Gipfel liegt also bei negativem y).

   Plattform-Typen:
     mass   – massiver Fels, reicht weit nach unten
     slab   – Felsband mit sichtbarer Unterkante (z. B. Höhlendecke)
     ledge  – schmaler Felsvorsprung
     wall   – glatte, zu hohe Felswand (Sackgasse)
     rubble – Geröll, das einen Durchgang versperrt (Sackgasse)
     boulder– Felsbrocken, der einen Ausstieg versperrt (Sackgasse)

   Abschnitte:
     1 Talwiese · 2 Weggabelung (Karte) · 3 Steilhang (Unterbrechung 1)
     4 Schutzhütte · 5 Grat (Sicherungsseil) · 6 Nebel (Kompass)
     7 Sturm (Unterbrechung 2 davor) · 8 Gipfel

   Beide Charaktere spielen exakt diesen Berg. Nur welche Route an der
   Gabelung / im Nebel offen ist, wird pro Durchgang ausgelost (für beide
   gleich zufällig), damit man sich im zweiten Durchgang nicht einfach an
   den Weg erinnert.
   ============================================================================= */

window.BERG = window.BERG || {};

BERG.Level = (function () {
  const BIG = 4000; // „reicht bis ins Tal“

  function pick(value, options) {
    if (value === 'random') return options[Math.random() < 0.5 ? 0 : 1];
    return value;
  }

  function build(gateConfig) {
    const gates = {
      fork: pick(gateConfig.fork, ['upper', 'tunnel']),
      fog: pick(gateConfig.fog, ['left', 'right']),
    };

    const solids = [];
    let seed = 7;
    const add = (x, y, w, h, type, extra) => {
      const p = Object.assign({ x, y, w, h, type, seed: seed++ }, extra || {});
      solids.push(p);
      return p;
    };
    const mass = (x, y, w, extra) => add(x, y, w, BIG, 'mass', extra);
    const slab = (x, y, w, h, extra) => add(x, y, w, h, 'slab', extra);
    const ledge = (x, y, w, h, extra) => add(x, y, w, h || 24, 'ledge', extra);
    const ANCHOR = { anchor: true };

    // Dunkle Hintergrundflächen (Höhle / Schacht)
    const caves = [];
    // Deko-Objekte (rein visuell)
    const decor = [];

    // =========================================================================
    // 1. TALWIESE
    // =========================================================================
    mass(-700, 0, 1400);          // Startwiese  (-700 … 700)
    mass(700, -60, 300);
    mass(1000, -30, 90);          // kleine Senke
    mass(1090, -120, 2330);       // Weggabelung + Höhlenboden (1090 … 3420)

    decor.push(
      { type: 'tree', x: -120, y: 0, s: 1.1 }, { type: 'tree', x: -60, y: 0, s: 0.8 },
      { type: 'tree', x: 330, y: 0, s: 0.9 }, { type: 'tree', x: 610, y: 0, s: 1.2 },
      { type: 'tree', x: 880, y: -60, s: 0.85 }, { type: 'tree', x: 1180, y: -120, s: 1.0 },
      { type: 'grass', x: 60, y: 0 }, { type: 'grass', x: 470, y: 0 }, { type: 'grass', x: 760, y: -60 },
      { type: 'grass', x: 1290, y: -120 }
    );

    // =========================================================================
    // 2. WEGGABELUNG  (Mechanik: KARTE)
    //    Route „upper“:  über Felsstufen außen am Berg nach oben
    //    Route „tunnel“: durch die Höhle und einen Schacht nach oben
    //    Eine der beiden ist pro Durchgang versperrt.
    // =========================================================================
    ledge(1480, -200, 110);
    slab(1650, -290, 200, 50);
    slab(1850, -380, 200, 140);
    slab(2050, -470, 200, 230);
    slab(2250, -520, 750, 280);   // oberer Weg (Unterkante = Höhlendecke bei -240)

    if (gates.fork === 'upper') {
      // oberer Weg offen: Stufen
      slab(3000, -610, 100, 370);
      slab(3100, -700, 100, 460);
      slab(3200, -760, 100, 520);
      // Höhle versperrt: Geröll
      add(3150, -240, 150, 120, 'rubble');
    } else {
      // oberer Weg endet an einer glatten, zu hohen Wand
      add(3000, -760, 300, 520, 'wall');
    }

    // Steine in der Höhle
    mass(2380, -150, 70);
    mass(2760, -146, 60);

    // Schacht (x 3300 … 3420) – Kletterstufen im Zickzack
    ledge(3360, -212, 60, 18);
    ledge(3300, -304, 60, 18);
    ledge(3360, -396, 60, 18);
    ledge(3300, -488, 60, 18);
    ledge(3360, -580, 60, 18);
    ledge(3300, -670, 60, 18);

    caves.push({ x: 1650, y: -240, w: 1770, h: 120 }, { x: 3300, y: -760, w: 120, h: 640 });

    mass(3420, -760, 600);        // Zusammenführung  (3420 … 4020)

    decor.push({ type: 'sign', x: 1425, y: -120 });

    // =========================================================================
    // 3. STEILHANG  (hoher Verbrauch · Unterbrechung 1)
    // =========================================================================
    mass(4020, -850, 180);
    mass(4200, -940, 160);
    mass(4360, -1030, 200);
    mass(4560, -1120, 160);
    mass(4720, -1200, 220);
    mass(4940, -1290, 180);
    mass(5120, -1380, 200);
    decor.push({ type: 'rocks', x: 4100, y: -850 }, { type: 'rocks', x: 4800, y: -1200 },
      { type: 'tree', x: 3560, y: -760, s: 0.9 }, { type: 'tree', x: 3900, y: -760, s: 0.75 });

    // =========================================================================
    // 4. SCHUTZHÜTTE
    // =========================================================================
    mass(5320, -1440, 700);       // Hüttenplateau (5320 … 6020)
    mass(6020, -1500, 260);
    mass(6280, -1580, 240);
    mass(6520, -1650, 300);
    mass(6820, -1700, 480, ANCHOR); // Beginn des Grats (6820 … 7300)
    decor.push({ type: 'hut', x: 5620, y: -1440 }, { type: 'rocks', x: 6400, y: -1580 });

    // =========================================================================
    // 5. GRAT  (Mechanik: SICHERUNGSSEIL)
    //    Schwierige Sprünge über den Abgrund. Pfeiler haben Bohrhaken
    //    (anchor) – nur wer ein Seil hat, kann sie nutzen.
    // =========================================================================
    mass(7430, -1720, 80, { anchor: true, pillar: true });
    mass(7640, -1780, 80, { anchor: true, pillar: true });
    mass(7860, -1750, 70, { anchor: true, pillar: true });
    mass(8070, -1815, 80, { anchor: true, pillar: true });
    mass(8280, -1810, 90, { anchor: true, pillar: true });
    mass(8500, -1870, 1990, ANCHOR); // Gratende + Boden des Nebelfelds (8500 … 10490)

    // =========================================================================
    // 6. NEBEL  (Mechanik: KOMPASS)
    //    Zwei Kletter-„Türme“ führen zu zwei Ausstiegen. Einer ist durch
    //    einen Felsbrocken versperrt. In der Mitte eine Sackgasse.
    // =========================================================================
    slab(8800, -2430, 200, 480);  // überhängender Fels am Eingang
    slab(9000, -2430, 80, 30);    // Decke …
    slab(9190, -2430, 1050, 30);
    slab(10350, -2430, 140, 30);

    const holes = { left: 9080, right: 10240 };
    const blocked = gates.fog === 'left' ? 'right' : 'left';
    add(holes[blocked], -2430, 110, 30, 'boulder');

    // linker Turm   (Spalten 9080 | 9230)
    ledge(9080, -1965, 110, 22); ledge(9230, -2060, 100, 22); ledge(9080, -2155, 110, 22);
    ledge(9230, -2250, 100, 22); ledge(9080, -2340, 110, 22);
    // rechter Turm  (Spalten 10090 | 10240)
    ledge(10240, -1965, 110, 22); ledge(10090, -2060, 110, 22); ledge(10240, -2155, 110, 22);
    ledge(10090, -2250, 110, 22); ledge(10240, -2340, 110, 22);
    // Mitte – endet unter geschlossener Decke (Sackgasse)
    ledge(9560, -1965, 120, 22); ledge(9720, -2060, 110, 22);
    ledge(9560, -2155, 120, 22); ledge(9720, -2250, 110, 22);

    // =========================================================================
    // 7. STURM  (trifft beide gleich)
    // =========================================================================
    mass(10490, -2430, 400, ANCHOR); // (10490 … 10890)
    mass(10980, -2480, 220, ANCHOR);
    mass(11300, -2520, 180, ANCHOR);
    mass(11580, -2570, 240, ANCHOR);
    mass(11920, -2620, 180, ANCHOR);
    mass(12200, -2680, 260, ANCHOR);
    mass(12560, -2720, 300, ANCHOR);

    // =========================================================================
    // 8. GIPFEL
    // =========================================================================
    mass(12860, -2800, 200);
    mass(13060, -2890, 200);
    mass(13260, -2980, 180);
    mass(13440, -3060, 420);      // Gipfel (13440 … 13860)
    decor.push({ type: 'flag', x: 13650, y: -3060 });

    // =========================================================================
    // CHECKPOINTS (Steinmännchen) – für BEIDE gleich
    // =========================================================================
    const checkpoints = [
      { x: 150, y: 0 },
      { x: 3620, y: -760 },
      { x: 5500, y: -1440 },   // bei der Hütte
      { x: 8700, y: -1870 },   // nach dem Grat
      { x: 10580, y: -2430 },  // vor dem Sturm
    ];
    checkpoints.forEach((c) => decor.push({ type: 'cairn', x: c.x + 24, y: c.y, cp: c }));

    // Karte: günstiger Weg (für Charaktere mit Karte eingeblendet)
    const routes = {
      upper: [[1400, -134], [1530, -214], [1700, -304], [1900, -394], [2100, -484], [2300, -534],
        [2970, -534], [3050, -624], [3150, -714], [3250, -774], [3380, -800], [3560, -774]],
      tunnel: [[1400, -134], [1640, -134], [3330, -134], [3390, -304], [3330, -488], [3390, -670],
        [3470, -774], [3560, -774]],
    };

    const holeX = holes[gates.fog];

    return {
      gates,
      solids,
      caves,
      decor,
      checkpoints,
      bounds: { minX: -300, maxX: 13860, killY: 900 },
      start: { x: 150, y: 0 },

      zones: {
        steep: [{ x1: 4020, x2: 5320 }, { x1: 12860, x2: 13440 }],
        fog: { x1: 8980, x2: 10490, ceiling: -2425, ramp: 140 },
        storm: { x1: 10860, x2: 12900, ramp: 220 },
      },

      // Abgründe: wer hier unter yTrigger fällt, stürzt ab
      hazards: [
        { x1: 7300, x2: 8500, yTrigger: -1600 },
        { x1: 10890, x2: 12560, yTrigger: -2340 },
      ],

      // Sackgassen: werden als „Umweg“ gezählt (einmal pro id)
      detourZones: [
        gates.fork === 'upper'
          ? { id: 'fork', x1: 2960, x2: 3150, y1: -160, y2: -100 }
          : { id: 'fork', x1: 2860, x2: 3000, y1: -560, y2: -500 },
        { id: 'fog', x1: holes[blocked] - 6, x2: holes[blocked] + 116, y1: -2360, y2: -2320 },
        { id: 'fogDecoy', x1: 9720, x2: 9830, y1: -2270, y2: -2230 },
      ],

      routes,
      mapZone: { x1: 1100, x2: 3650 },       // hier wird die Route eingeblendet
      mapCardZone: { x1: 1220, x2: 1760 },   // hier erscheint die Karte im HUD
      compassTarget: { x: holeX + 55, y: -2440 },

      hut: { x: 5620, y: -1440, w: 150, zone: { x1: 5590, x2: 5800 } },
      workTriggers: [{ x: 4640 }, { x: 10640 }],
      eventTriggers: [{ x: 900 }, { x: 6200 }, { x: 12900 }],
      summit: { x: 13560, flagX: 13650 },
    };
  }

  return { build, BIG };
})();
