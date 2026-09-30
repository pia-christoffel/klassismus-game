/* =============================================================================
   DER BERG – Eigene Illustrationen (PNG / SVG)
   -----------------------------------------------------------------------------
   Standardmäßig wird alles per Canvas gezeichnet (js/art.js).
   Sobald hier ein Pfad eingetragen ist, wird stattdessen das Bild verwendet.

   Beispiel:
     charA: 'assets/charakter-a.png',

   Hinweise:
   - Pfade relativ zu index.html. Funktioniert auch per Doppelklick (file://).
   - Figuren: Bild zeigt nach RECHTS, Füße am unteren Bildrand, mittig.
     Größe über `sizes` einstellen (Höhe in Spielpixeln; Spielfigur ≈ 46 px).
   - Pro Pose kann ein eigenes Bild angegeben werden (z. B. charA_walk).
     Fehlt es, wird das Grundbild (charA) genommen.
     Posen: idle, walk, jump, fall, sit, hang
   - Hintergründe (bgFar, bgMid, bgNear) werden horizontal gekachelt und
     mit Parallaxe verschoben. Unterkante des Bildes = Unterkante der Ebene.
   ============================================================================= */

window.BERG = window.BERG || {};

BERG.ASSET_PATHS = {
  // Figuren
  charA: null,
  charB: null,
  // charA_walk: null, charA_jump: null, charA_sit: null, charA_hang: null, …

  // Objekte in der Welt
  hut: null,        // Schutzhütte   (Unterkante = Boden, mittig)
  flag: null,       // Gipfelfahne   (Unterkante = Boden, Mast links)
  sign: null,       // Wegweiser an der Gabelung
  cairn: null,      // Steinmännchen (Checkpoint)
  tree: null,       // Baum
  boulder: null,    // Felsbrocken, der den Nebel-Ausstieg versperrt
  rubble: null,     // Geröll in der Höhle

  // Hintergrund-Ebenen (von hinten nach vorn)
  bgFar: null,
  bgMid: null,
  bgNear: null,

  // Reveal & Startscreen (SVG/PNG, ersetzt die gezeichneten Icons)
  // icon_map: 'assets/icons/karte.svg', icon_backpack: …
};

// Darstellungsgröße in Spielpixeln (Höhe). Breite ergibt sich aus dem Bild.
BERG.ASSET_SIZES = {
  charA: 50, charB: 50,
  hut: 120, flag: 90, sign: 70, cairn: 30, tree: 90,
  bgFar: 360, bgMid: 300, bgNear: 240,
};

BERG.Assets = {
  images: {},

  /** Lädt alle eingetragenen Bilder. Ruft `done` auf, wenn alles fertig ist. */
  load(done) {
    const entries = Object.entries(BERG.ASSET_PATHS).filter(([, path]) => !!path);
    if (!entries.length) return done();
    let pending = entries.length;
    const finish = () => { if (--pending === 0) done(); };
    entries.forEach(([key, path]) => {
      const img = new Image();
      img.onload = () => { this.images[key] = img; finish(); };
      img.onerror = () => { console.warn('[DER BERG] Bild nicht gefunden:', path); finish(); };
      img.src = path;
    });
  },

  /** Liefert das Bild zu einem Schlüssel oder null. */
  get(key) {
    return this.images[key] || null;
  },

  /**
   * Zeichnet ein Bild mit Anker „unten mittig“ bei (x, y).
   * Gibt true zurück, wenn ein Bild gezeichnet wurde.
   */
  draw(ctx, key, x, y, opts) {
    const img = this.get(key);
    if (!img) return false;
    const o = opts || {};
    const h = o.height || BERG.ASSET_SIZES[key] || img.height;
    const w = img.width * (h / img.height);
    ctx.save();
    ctx.translate(x, y);
    if (o.flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
    return true;
  },
};
