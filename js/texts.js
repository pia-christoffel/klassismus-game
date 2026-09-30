/* =============================================================================
   DER BERG – Alle Texte
   -----------------------------------------------------------------------------
   Jeder Text, der im Spiel erscheint, steht hier. Zum Ändern einfach den
   String anpassen. Während des Spiels (bis zum Reveal) dürfen hier KEINE
   Begriffe wie Bildung, Privileg, Herkunft usw. auftauchen.
   ============================================================================= */

window.BERG = window.BERG || {};

BERG.TEXT = {
  // --- Startscreen -----------------------------------------------------------
  start: {
    overline: 'Ein Aufstieg in zwei Durchgängen',
    title: 'DER BERG',
    choose: 'Wähle deinen Charakter.',
    goal: 'Dein Ziel: Erreiche den Gipfel.',
    // Steuerungs-Legende: [Tasten, Beschreibung]. Jede Taste wird als eigenes Kästchen gezeigt.
    controls: [
      [['A', 'D', '←', '→'], 'gehen'],
      [['Leertaste', '↑'], 'springen'],
      [['E'], 'benutzen'],
      [['S', '↓'], 'verschnaufen'],
      [['Esc'], 'Pause'],
    ],
    characters: {
      A: { name: 'Charakter A', items: ['einfache Schuhe', 'großer Rucksack'] },
      B: { name: 'Charakter B', items: ['Bergschuhe', 'Karte', 'Kompass', 'Seil', 'Proviant', 'kleiner Rucksack'] },
    },
  },

  // --- Kurzer Titel vor jedem Durchgang --------------------------------------
  runIntro: { goal: 'Erreiche den Gipfel.' },

  // --- HUD ---------------------------------------------------------------------
  hud: {
    time: 'Zeit',
    stamina: 'Ausdauer',
    provisions: 'Proviant',
    altitude: 'Höhe',
    map: 'Karte',
    paused: 'Pause',
    pausedHint: 'Esc zum Fortsetzen',
  },

  prompts: {
    hut: 'E  rasten',
    eat: 'E  essen',
    sit: 'S halten  verschnaufen',
  },
  // dieselben Hinweise auf dem Handy (die passende Taste leuchtet zusätzlich auf)
  promptsTouch: {
    hut: 'Rasten: „benutzen“ tippen',
    eat: 'Essen: „benutzen“ tippen',
    sit: '„verschnaufen“ gedrückt halten',
  },

  // --- Handy / Touch -----------------------------------------------------------
  touch: {
    jump: 'springen',
    use: 'benutzen',
    sit: 'ver\u00ADschnaufen', // \u00AD = weiches Trennzeichen (bricht im Knopf um)
    pause: 'Pause',
    resume: 'Tippen zum Fortsetzen',
    rotate: 'Dreh dein Handy ins Querformat.',
    startHint: 'Gesteuert wird über die Tasten am Bildschirmrand. Am besten im Querformat spielen.',
  },

  // --- Kurze, neutrale Meldungen während des Spiels --------------------------
  toasts: {
    exhausted: 'Du musst kurz verschnaufen.',
    ropeHolds: 'Das Seil hält.',
    fall: 'Du stürzt ab.',
    respawnFar: 'Du fängst weiter unten wieder an.',
    deadEnd: 'Hier geht es nicht weiter.',
    eat: 'Du isst etwas.',
    hutRest: 'Du ruhst dich in der Hütte aus.',
    hutFood: 'Man gibt dir etwas Proviant mit.',
    hutFoodMore: 'Man packt dir reichlich Proviant ein.',
    hutRepack: 'Jemand hilft dir, den Rucksack neu zu packen. Er ist etwas leichter.',
    storm: 'Der Wind frischt auf.',
    fog: 'Nebel zieht auf.',
    workBack: 'Weiter geht’s.',
  },

  // Zufallsereignisse (IDs siehe CONFIG.events.pool)
  events: {
    fit: 'Du fühlst dich heute fit.',
    sun: 'Die Sonne kommt raus. Du atmest tief durch.',
    step: 'Ein guter Tritt. Es läuft.',
    slip: 'Kleiner Ausrutscher.',
    drizzle: 'Kalter Nieselregen.',
    sleep: 'Du hast schlecht geschlafen.',
  },

  // --- Unterbrechung: Schuh ist aufgegangen (= Nebenjob, siehe Reveal) ---
  work: {
    call: 'Dein Schuh ist aufgegangen.',
    lace: 'Schnürsenkel einfädeln',
    laceHint: 'Ösen anklicken  ·  oder A / D',
    laceHintTouch: 'Linke oder rechte Schuhseite antippen',
    laceHelp: 'Tipp: immer abwechselnd, von unten nach oben.',
    bow: 'Schleife binden',
    bowWatch: 'Merk dir die Reihenfolge …',
    bowHint: 'Nachmachen  ·  Pfeiltasten oder klicken',
    bowHintTouch: 'Nachmachen  ·  Pfeile antippen',
    wrong: 'Nicht so.',
    done: 'Fest verschnürt.',
  },

  // --- Gipfel & Fragen ---------------------------------------------------------
  summit: {
    title: 'GIPFEL ERREICHT.',
    stats: { time: 'Zeit', falls: 'Stürze', detours: 'Umwege', pauses: 'Pausen' },
  },
  question1: {
    q: 'Warum glaubst du, hast du den Gipfel erreicht?',
    options: [
      'Ich war gut.',
      'Ich habe mich angestrengt.',
      'Ich hatte gute Ausrüstung.',
      'Ich hatte Glück.',
      'Der Weg war fair.',
    ],
  },
  nextRun: {
    text: 'Versuche den Berg mit dem anderen Charakter.',
    button: 'Aufbrechen',
  },
  question2: {
    q: 'Warum ist es diesmal anders gelaufen?',
    options: [
      'Ich habe anders gespielt.',
      'Ich hatte andere Ausrüstung.',
      'Ich hatte weniger/mehr Zeit.',
      'Ich hatte weniger/mehr Unterstützung.',
      'Ich hatte Glück/Pech.',
    ],
    button: 'Weiter',
  },

  // --- REVEAL ----------------------------------------------------------------
  // Erst ab hier wird die Metapher aufgelöst.
  reveal: {
    continueHint: 'weiter',
    lines: [
      'Du hast zweimal denselben Berg bestiegen.',
      'Du warst zweimal dieselbe Spielerin / derselbe Spieler.',
      'Aber du hattest nicht zweimal dieselben Bedingungen.',
    ],
    title: 'DER BERG WAR NIE NUR EIN BERG.',

    // icon: Name eines Icons aus BERG.ICONS (js/art.js)
    metaphors: [
      { icon: 'mountain', term: 'Berg',          meaning: 'Bildungsweg' },
      { icon: 'flag',     term: 'Gipfel',        meaning: 'Bildungsabschluss', note: 'Schulabschluss, Abitur, Ausbildung, Studium' },
      { icon: 'map',      term: 'Karte',         meaning: 'Wissen über das Bildungssystem' },
      { icon: 'compass',  term: 'Kompass',       meaning: 'Orientierung durch Menschen, die den Weg schon kennen' },
      { icon: 'rope',     term: 'Sicherungsseil',meaning: 'Soziale und finanzielle Absicherung' },
      { icon: 'boot',     term: 'Ausrüstung',    meaning: 'Materielle und zeitliche Ressourcen' },
      { icon: 'lace',     term: 'Schuhe binden', meaning: 'Nebenjob und andere Pflichten neben der Schule', note: 'Einfache Schuhe gehen öfter auf. Wer schlechtere Voraussetzungen hat, muss öfter anhalten, und die Zeit läuft trotzdem weiter.' },
      { icon: 'bread',    term: 'Proviant',      meaning: 'Verfügbare Ressourcen und Regeneration' },
      { icon: 'backpack', term: 'Rucksack',      meaning: 'Zusätzliche Belastungen' },
      { icon: 'clock',    term: 'Zeit',          meaning: 'Verfügbare Zeit für Bildung' },
      { icon: 'hut',      term: 'Schutzhütte',   meaning: 'Unterstützung und Regeneration', note: 'Hilfe kommt nicht bei allen gleich an. Oft bekommen die am meisten, die sowieso schon gut ausgestattet sind.' },
      { icon: 'storm',    term: 'Sturm',         meaning: 'Allgemeine persönliche und schulische Herausforderungen' },
      { icon: 'dice',     term: 'Zufall',        meaning: 'Glück und Pech, die alle gleich treffen können' },
    ],

    backpack: {
      title: 'Und der Rucksack?',
      hint: 'Klicken zum Öffnen',
      items: [
        'finanzielle Sorgen',
        'Erwerbsarbeit / Nebenjob',
        'Care-Arbeit',
        'familiäre Belastungen',
        'kein ruhiger Lernort',
        'Vorurteile oder Diskriminierung',
      ],
      note: 'Das sind Beispiele, keine Checkliste. Nicht alle tragen all das, und zwei Menschen mit ähnlicher Herkunft tragen nicht automatisch dasselbe. Aber je mehr jemand tragen muss, desto steiler wird derselbe Weg.',
    },

    sameStats: {
      lines: [
        'Beide Charaktere waren gleich schnell, konnten gleich weit springen und hatten gleich viel Ausdauer.',
        'Der Unterschied lag nicht an ihnen, sondern an dem, was sie dabeihatten. Und an dem, was sie tragen mussten.',
      ],
    },

    compare: {
      title: 'Zweimal du.',
      subtitle: 'Beide Male warst du dieselbe Person auf demselben Berg. Nur die Bedingungen waren andere.',
      run: 'Durchgang',
      said: 'Du hast gesagt:',
      rows: {
        time: 'Zeit',
        falls: 'Stürze',
        detours: 'Umwege',
        pauses: 'Pausen',
        workShifts: 'Unterbrechungen',
        energy: 'Energieverbrauch',
      },
      learning: 'Übrigens: Beim zweiten Mal kanntest du den Berg schon. Auch das ist ein Vorteil, den nicht alle haben.',
      button: 'Weiter',
    },
  },

  // --- Abschluss ---------------------------------------------------------------
  end: {
    lines: ['GLEICHER BERG.', 'GLEICHES ZIEL.', 'GLEICHE CHANCEN?'],
    question: 'Was bedeutet Chancengleichheit, wenn die Ausgangsbedingungen unterschiedlich sind?',
    again: 'Nochmal spielen',
    disclaimer: 'DER BERG ist keine Simulation, sondern eine bewusst vereinfachte Metapher. Herkunft entscheidet nicht über das Ergebnis, schließlich sind beide oben angekommen. Aber dieselben Anforderungen können sehr unterschiedlich schwer sein, je nachdem, mit welchen Bedingungen man losgeht.',
    credit: 'Critical Thinking · Transformationsdesign',
  },
};
