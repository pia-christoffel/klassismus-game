/* =============================================================================
   DER BERG – Konfiguration & Balancing
   -----------------------------------------------------------------------------
   Hier stehen ALLE Zahlen, mit denen sich Schwierigkeit und Spielgefühl
   einstellen lassen. Nichts davon muss im restlichen Code angefasst werden.

   Wichtigstes Designprinzip:
   - `physics` und `stamina` sind die GRUNDWERTE. Sie gelten für beide
     Charaktere identisch (gleiche Geschwindigkeit, Sprungkraft, Ausdauer).
   - Unterschiede entstehen ausschließlich über `characters` – also über
     Ausrüstung, Absicherung und zusätzliche Belastungen.
   ============================================================================= */

window.BERG = window.BERG || {};

BERG.CONFIG = {
  // Logische Auflösung des Spielfelds (wird auf die Fenstergröße skaliert)
  // Sichtbereich in Spielpixeln. 960 × 540 ist die Grundgröße (16:9). Je nach
  // Fenster wird er breiter oder höher – Figur und Sprünge bleiben gleich groß.
  view: {
    width: 960, height: 540,
    maxWidth: 1400,  // breiteste Ansicht (sehr breite Fenster bekommen sonst Ränder)
    maxHeight: 1080, // höchste Ansicht (nur sehr hohe, schmale Fenster bekommen Ränder)
  },

  // ---------------------------------------------------------------------------
  // GRUNDWERTE – für beide Charaktere identisch
  // ---------------------------------------------------------------------------
  physics: {
    gravity: 2200,        // px/s²
    maxFallSpeed: 1150,   // px/s
    runSpeed: 250,        // px/s Laufgeschwindigkeit
    groundAccel: 2400,    // Beschleunigung am Boden
    groundDecel: 2800,    // Abbremsen am Boden
    airAccel: 1500,       // Lenkbarkeit in der Luft
    jumpVelocity: 830,    // Absprunggeschwindigkeit (≈ 156 px Sprunghöhe)
    jumpCut: 0.55,        // Leertaste früh loslassen = kürzerer Sprung
    coyoteTime: 0.1,      // Kulanz: kurz nach der Kante noch springen
    jumpBuffer: 0.13,     // Kulanz: Sprung kurz vor der Landung vormerken
    playerWidth: 26,
    playerHeight: 42,
  },

  stamina: {
    max: 100,
    walkDrain: 1.2,         // Verbrauch pro Sekunde beim Gehen
    jumpDrain: 3.0,         // Verbrauch pro Sprung
    steepMultiplier: 1.6,   // Faktor in steilen Abschnitten
    stormMultiplier: 1.3,   // Faktor im Sturm
    regenIdle: 16,          // Erholung pro Sekunde im Stehen
    regenSit: 26,           // Erholung pro Sekunde beim Verschnaufen (S halten)
    regenWalk: 1.0,         // Erholung pro Sekunde beim Gehen
    idleDelay: 0.35,        // so lange stillstehen, bevor Erholung einsetzt
    lowThreshold: 35,       // unter diesem Wert wird es schwerer …
    lowSpeedFactor: 0.72,   // … Gehen bei 0 Ausdauer (Faktor)
    lowJumpFactor: 0.84,    // … Sprungkraft bei 0 Ausdauer (Faktor)
    exhaustedRecoverTo: 40, // nach Erschöpfung geht es erst ab hier weiter
    fallCost: 15,           // Ausdauerverlust bei einem Sturz (für beide gleich)
    sitCountsAsPauseAfter: 1.2, // so lange verschnaufen = zählt als Pause
  },

  // ---------------------------------------------------------------------------
  // AUSRÜSTUNG & BELASTUNGEN – hier (und nur hier) unterscheiden sich A und B
  // ---------------------------------------------------------------------------
  characters: {
    // Charakter A: schwerer Rucksack, einfache Schuhe (steht im Startscreen LINKS)
    A: {
      id: 'A',
      load: 1.7,            // Rucksackgewicht → Multiplikator auf Verbrauch
      regenMultiplier: 0.65,// schweres Gepäck → langsamere Erholung
      grip: 0.85,           // einfache Schuhe → weniger Halt im Sturm
      map: false,           // Karte: Hinweis an der Weggabelung
      compass: false,       // Kompass: Richtung im Nebel
      rope: false,          // Sicherungsseil: naher Wiedereinstieg nach Sturz
      provisions: 0,        // Proviant (E = essen)
      job: true,            // Unterbrechungen (Schuhe binden = Nebenjob)
      hutProvisions: 1,     // Proviant, den es in der Hütte gibt
      hutRelief: 0,         // Rucksack wird in der Hütte um diesen Wert leichter
      boots: 'simple',
      pack: 'big',
    },
    // Charakter B: gute Ausrüstung (steht im Startscreen RECHTS)
    B: {
      id: 'B',
      load: 1.0,
      regenMultiplier: 1.0,
      grip: 1.0,
      map: true,
      compass: true,
      rope: true,
      provisions: 2,
      job: false,
      hutProvisions: 2,     // bekommt in der Hütte etwas mehr
      hutRelief: 0,
      boots: 'good',
      pack: 'small',
    },
  },

  provisions: { restore: 35, max: 4 },

  // Schutzhütte: steht allen offen. Wie viel Unterstützung es dort gibt,
  // steht pro Charakter oben (hutProvisions, hutRelief).
  hut: {
    restDuration: 3.0,     // Sekunden Rast
    regenPerSecond: 45,
  },

  // Unterbrechung „Schuh ist aufgegangen“ (nur für Charaktere mit job: true)
  // Steht in der Metapher für Nebenjob / Verpflichtungen außerhalb der Schule.
  work: {
    eyeletRows: 4,         // Ösen-Reihen beim Einfädeln (erste Reihe ist schon geschnürt)
    bowLengths: [4, 5],    // Länge der Schleifen-Reihenfolge bei 1. / 2. Unterbrechung
    minShiftSeconds: 7,    // Unterbrechung dauert mindestens so lange
    callDuration: 1.9,     // Einstiegsmeldung wird so lange gezeigt
    doneDuration: 1.6,     // Schlussmeldung wird so lange gezeigt
    staminaCost: 25,       // Ausdauer danach reduziert
  },

  // Sturm – trifft beide Charaktere gleich
  storm: {
    baseWind: -40,         // Grundwind (negativ = gegen die Laufrichtung)
    gustWind: -115,        // Wind in Böen
    gustDuration: 1.3,
    gustPauseMin: 2.6,
    gustPauseMax: 4.6,
    airFactor: 1.0,        // Windwirkung in der Luft
    groundFactor: 0.3,     // Windwirkung am Boden (im Stehen voll, beim Gehen halb)
    windCanPushOffEdge: false, // true = Wind kann Stehende auch über die Kante schieben
    slipperiness: 0.4,     // rutschiger Untergrund (0 = kein Effekt)
  },

  fog: { visibleRadius: 170, density: 0.95 },

  // Zufallsereignisse – für beide Charaktere mit identischer Wahrscheinlichkeit
  events: {
    slipDuration: 1.3, // so lange liegt man nach einem Ausrutscher
    chance: 0.65, // Wahrscheinlichkeit, dass an einem Auslösepunkt etwas passiert
    pool: [
      { id: 'fit',    stamina: +25 },
      { id: 'sun',    stamina: +15 },
      { id: 'step',   stamina: +10 },
      { id: 'slip',   stamina: -15, slip: true }, // fällt kurz hin
      { id: 'drizzle',stamina: -10 },
      { id: 'sleep',  stamina: -20 },
    ],
  },

  // Welche Route ist pro Durchgang offen? 'random' sorgt dafür, dass man sich
  // beim zweiten Durchgang nicht einfach an den Weg erinnern kann.
  gates: {
    fork: 'random', // 'random' | 'upper' | 'tunnel'
    fog: 'random',  // 'random' | 'left'  | 'right'
  },

  altitude: { base: 1150, metersPerPixel: 0.9 },
  camera: { lerp: 6, lookAhead: 90, verticalAnchor: 0.6 },
};

// -----------------------------------------------------------------------------
// Handy / Tablet: Touch-Geräte bekommen Bildschirm-Tasten. Desktop bleibt
// unverändert. Zum Testen am Rechner: index.html?touch
// -----------------------------------------------------------------------------
BERG.isTouch =
  /[?&]touch/.test(location.search) ||
  (window.matchMedia('(pointer: coarse)').matches && window.matchMedia('(hover: none)').matches);
document.documentElement.classList.toggle('touch', BERG.isTouch);
