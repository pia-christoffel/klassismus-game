# DER BERG

Ein 2D-Bergsteiger-Spiel für das Modul *Critical Thinking* (Transformationsdesign).
Zwei Charaktere, derselbe Berg, dieselben Grundwerte, aber unterschiedliche Ausrüstung,
Absicherung und Belastungen. **Charakter A** (links im Startscreen) trägt einen schweren Rucksack und
einfache Schuhe, **Charakter B** (rechts) ist gut ausgerüstet. A steht links, damit man eher mit ihm beginnt. Die Bedeutung wird erst nach beiden Durchgängen aufgelöst.

## Starten

`index.html` per Doppelklick im Browser öffnen. Es braucht keinen Server, keine Installation und kein Build.
(Mit Internet werden die Schriften *Anton*, *Fraunces* und *IBM Plex Mono* geladen, ohne greifen Fallbacks.)

**Steuerung:** `A`/`D` oder `←`/`→` gehen · `Leertaste` (oder `W`/`↑`) springen ·
`E` benutzen (Proviant, Hütte) · `S` halten zum Verschnaufen · `Esc` Pause

**Fenstergröße:** Das Spielfeld füllt immer das ganze Fenster. Die Figur bleibt gleich groß, nur der
sichtbare Ausschnitt wird breiter oder höher. Grenzen dafür: `view.maxWidth` / `view.maxHeight` in `js/config.js`.

**Handy & Tablet:** Auf Touch-Geräten erscheinen automatisch Bildschirm-Tasten
(links ◀ ▶, rechts springen / benutzen / verschnaufen, oben Pause). Gespielt wird im Querformat,
im Hochformat pausiert das Spiel und bittet ums Drehen. Beim Schuhe binden tippt man die linke oder
rechte Schuhhälfte an. Am Desktop ändert sich nichts. Zum Testen am Rechner: `index.html?touch`.
Code: `js/touch.js`, Styles am Ende von `css/style.css`.
Fürs Handy muss das Spiel online liegen (z. B. GitHub Pages), denn eine Datei per Doppelklick
lässt sich auf dem Handy nicht einfach öffnen.

**Debug-Modus:** `index.html?debug`. Zeigt Hitboxen und erlaubt Sprünge im Level:
`1`–`5` Checkpoints · `6` Grat · `7` Nebel · `8` Sturm · `9` Gipfel ·
`M` volle / `N` leere Ausdauer · `K` Durchgang sofort beenden.

## Ablauf

Start → Durchgang 1 → Gipfel + Frage 1 → Durchgang 2 (anderer Charakter) → Gipfel + Frage 2
→ Reveal (Sätze · Titel · Metaphern · Rucksack öffnet sich · gleiche Grundwerte · Vergleich) → Abschluss.

## Dateien & Mechaniken

| Datei | Inhalt |
|---|---|
| `js/config.js` | **Alle Zahlen / Schwierigkeit** (siehe unten) |
| `js/texts.js` | **Alle Texte** (Startscreen, Meldungen, Fragen, Reveal, Abschluss) |
| `js/level.js` | Der Berg: Plattformen, Abschnitte, Checkpoints, Zonen, Sackgassen |
| `js/game.js` | Engine: Physik, Ausdauer, alle Mechaniken, Tracking, Rendering |
| `js/art.js` | Gezeichnete Grafik (Figuren, Fels, Hütte, Wetter, Icons) + Farbpalette |
| `js/assets.js` | Eigene PNG/SVG-Illustrationen eintragen |
| `js/hud.js` | Anzeigen im Spiel (Zeit, Ausdauer, Proviant, Höhe, Karte, Kompass) |
| `js/work.js` | Unterbrechung „Dein Schuh ist aufgegangen.“ (Einfädel- und Schleifen-Rätsel) |
| `js/screens.js` | Startscreen, Gipfel-Screens mit Fragen, Abschluss |
| `js/reveal.js` | Dramaturgie des Reveals |
| `css/style.css` | Gestaltung aller Screens und des HUD (Farben/Schriften als CSS-Variablen oben) |
| `tools/balance-bot.js` | Optionaler Test-Bot, der den Berg automatisch durchspielt |

In `js/game.js` sind die Mechaniken mit Suchbegriffen markiert:

| Mechanik | Wo | Was passiert |
|---|---|---|
| **[KARTE]** | `render()`, `hud.js` | An der Weggabelung (Höhle vs. Felsstufen) zeigt B eine gestrichelte Route + Karte im HUD. Welcher Weg offen ist, wird **pro Durchgang ausgelost**, damit man sich im 2. Durchgang nicht einfach erinnert. |
| **[KOMPASS]** | `hud.js → update()` | Im Nebel (Sichtradius klein) zeigt B's Kompass zum offenen Ausstieg. Zwei Türme, einer ist oben versperrt, dazu eine Sackgasse in der Mitte. |
| **[SEIL]** | `startFall()`, `updateCaught()` | Gleicher Absturz: B hängt kurz im Seil und steht wieder auf dem letzten Pfeiler. A stürzt ab und beginnt am letzten Checkpoint (Grat → zurück zur Hütte). |
| **[RUCKSACK]** | `updatePlay()`, `drain()` | Jeder Schritt/Sprung kostet Ausdauer × Rucksackgewicht. Unter 35 % wird man langsamer und springt kürzer, bei 0 muss man verschnaufen. |
| **[SCHUHE]** | `startWork()`, `work.js` | Nur A (einfache Schuhe), 2×: „Dein Schuh ist aufgegangen.“ → Rätsel 1: Schnürsenkel einfädeln (Regel „abwechselnd, von unten nach oben“ wird nicht verraten, nach 2 Fehlern kommt ein Tipp) → Rätsel 2: Schleife binden (Pfeil-Reihenfolge merken, 4 bzw. 5 Schritte) → „Fest verschnürt.“ Der Timer läuft weiter, danach −25 Ausdauer. Die zweite Unterbrechung kommt direkt vor dem Sturm. Im Reveal: Schuhe binden = Nebenjob / Verpflichtungen außerhalb der Schule. |
| **[STURM]** | `updateEnv()` | Für beide gleich: Böen gegen die Laufrichtung, Regen, schlechtere Sicht, rutschiger Boden. |
| **[HÜTTE]** | `startRest()`, `updateResting()` | Für alle offen, Ausdauer wird voll. Beim Proviant bekommt B (gut ausgerüstet) etwas mehr: +2 statt +1. Hilfe kommt also nicht gleich an. Das wird im Reveal bei der Schutzhütte aufgegriffen. Pro Charakter einstellbar über `hutProvisions` und `hutRelief` (Rucksack leichter, derzeit 0). |
| **[ZUFALL]** | `randomEvent()` | 3 Auslösepunkte, für beide gleiche Wahrscheinlichkeiten (±10–25 Ausdauer). |
| **[TRACKING]** | `this.stats` | Zeit, Stürze, Umwege, Pausen (Erschöpfung oder > 1,2 s verschnaufen), Rastzeit, Unterbrechungen, Zeit für Unterbrechungen, Energieverbrauch, Hüttenbesuche, Ereignisse |

## Texte ändern

Alles steht in `js/texts.js`. Bis zum Reveal gilt: keine Begriffe wie Bildung, Privileg, Herkunft.
Die Metaphern im Reveal (`reveal.metaphors`) lassen sich dort ergänzen, umsortieren oder löschen,
`icon` verweist auf ein Icon aus `BERG.ICONS` in `js/art.js`.

## Schwierigkeit ändern (`js/config.js`)

- **Grundwerte (für beide gleich):** `physics` (Tempo, Sprungkraft …) und `stamina` (Verbrauch, Erholung, ab wann es schwer wird).
- **Unterschied A/B:** `characters.A` / `characters.B`:
  - `load`: Rucksackgewicht (A: 1.7), Multiplikator auf den Verbrauch
  - `regenMultiplier`: Erholung (A: 0.65)
  - `hutProvisions`, `hutRelief`: Unterstützung in der Hütte
  - `grip`: Halt im Sturm
  - `map`, `compass`, `rope`, `job`: Mechanik an/aus
  - `provisions`: Proviant zu Beginn
- **Unterbrechung (Schuhe binden):** `work` (Anzahl Ösen-Reihen, Länge der Schleifen-Reihenfolge, Mindestdauer, Ausdauerverlust)
- **Hütte:** `hut` (Rastdauer, Proviant, `loadRelief` = wie viel leichter der Rucksack wird)
- **Sturm:** `storm` (Windstärke, Böen, Rutschigkeit) · **Nebel:** `fog.visibleRadius`
- **Zufall:** `events.chance` und `events.pool`
- **Routen fest statt zufällig:** `gates.fork = 'upper' | 'tunnel'`, `gates.fog = 'left' | 'right'`

Die Sprünge selbst (Abstände der Pfeiler am Grat usw.) stehen in `js/level.js`.
Orientierung: Volle Sprungweite ≈ 210 px, volle Sprunghöhe ≈ 156 px. Bei leerer Ausdauer sind es
≈ 140 px Weite und ≈ 110 px Höhe. Die Grat-Lücken (130–140 px) sind deshalb mit voller Ausdauer
gut, mit fast leerer kaum zu schaffen. Normale Stufen sind ≤ 100 px hoch und immer machbar.

**Richtwerte (Test-Bot, fehlerfreier Spieler, 15 % Fehlsprünge an schweren Stellen):**
B ≈ 95 s, A ≈ 150–220 s (5–6 Pausen, ~2× Energie). Menschen brauchen beim ersten Mal etwa
doppelt so lange, also ungefähr 3 Minuten (B) bzw. 5–7 Minuten (A).

## Eigene Illustrationen (PNG/SVG)

1. Ordner `assets/` anlegen, Bilder hineinlegen.
2. In `js/assets.js` den Pfad eintragen, z. B. `charA: 'assets/charakter-a.png'`.
3. Fertig: Das Bild ersetzt automatisch die gezeichnete Version.

Möglich sind: `charA` (schwerer Rucksack), `charB` (gut ausgerüstet) (optional pro Pose: `charA_walk`, `_jump`, `_fall`, `_sit`, `_hang`, `_idle`),
`hut`, `flag`, `sign`, `cairn`, `tree`, `boulder`, `rubble`, die Hintergrund-Ebenen `bgFar`, `bgMid`, `bgNear`
(werden gekachelt und mit Parallaxe bewegt) sowie Reveal-Icons `icon_map`, `icon_backpack`, `icon_rope` …

- Figuren schauen nach **rechts**, Füße am unteren Bildrand, mittig. Die Größe stellst du über `BERG.ASSET_SIZES` ein (Figur ≈ 50 px hoch).
- Die Kollision bleibt unabhängig vom Bild (Hitbox 26 × 42 px).
- Farben der gezeichneten Grafik: `BERG.PALETTE` in `js/art.js`. Farben & Schriften der Screens: CSS-Variablen oben in `css/style.css`.

## Daten

Nach dem zweiten Durchgang wird die Sitzung (beide Statistiken + Antworten) im Browser unter
`localStorage['derberg.sessions']` gespeichert, z. B. für eine Ausstellung. Abrufen in der Konsole:
`JSON.parse(localStorage['derberg.sessions'])`
