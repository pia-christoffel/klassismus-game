/* =============================================================================
   DER BERG – Steuerung auf Handy & Tablet
   -----------------------------------------------------------------------------
   Nur aktiv, wenn BERG.isTouch (config.js) true ist. Am Desktop passiert hier
   nichts. Die Tasten schreiben in dieselbe Eingabe wie die Tastatur
   (game.input), die Spiellogik merkt also keinen Unterschied.

   Links:  Steuerkreuz ← / → (Daumen kann zwischen beiden Seiten gleiten)
   Rechts: springen (groß), benutzen, verschnaufen (gedrückt halten)
   Oben:   Pause
   Im Hochformat pausiert das Spiel und bittet darum, das Handy zu drehen.
   ============================================================================= */

window.BERG = window.BERG || {};

BERG.Touch = (function () {
  const T = BERG.TEXT.touch;
  let root = null;
  let input = null;
  const el = {};
  const last = {};

  function init(game) {
    if (!BERG.isTouch) return;
    input = game.input;
    root = document.getElementById('touch');
    root.innerHTML = `
      <div class="tc-pad" data-t="pad">
        <span class="tc-arrow" data-t="left">◀</span>
        <span class="tc-arrow" data-t="right">▶</span>
      </div>
      <div class="tc-actions">
        <button type="button" class="tc-btn tc-small" data-key="down" data-t="down">${T.sit}</button>
        <button type="button" class="tc-btn tc-small" data-key="use" data-t="use">${T.use}</button>
        <button type="button" class="tc-btn tc-jump" data-key="jump">${T.jump}</button>
      </div>
      <button type="button" class="tc-pause" data-key="pause" aria-label="${T.pause}"><i></i><i></i></button>`;
    root.querySelectorAll('[data-t]').forEach((n) => (el[n.dataset.t] = n));

    document.getElementById('rotate').innerHTML = `
      <div>
        <svg viewBox="0 0 64 64" aria-hidden="true"><rect x="20" y="8" width="24" height="44" rx="4"/><path d="M28 46 h8"/><path d="M52 22 a18 18 0 0 1 -4 24" /><path d="M44 44 l4 3 l2 -5"/></svg>
        <p>${T.rotate}</p>
      </div>`;

    bindPad(el.pad);
    root.querySelectorAll('[data-key]').forEach(bindButton);
    // Kein Kontextmenü / Text-Auswahl bei langem Drücken
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Steuerkreuz: linke Hälfte = links, rechte Hälfte = rechts */
  function bindPad(pad) {
    let active = null;
    const setDir = (dir) => {
      input.touch('left', dir < 0);
      input.touch('right', dir > 0);
      el.left.classList.toggle('on', dir < 0);
      el.right.classList.toggle('on', dir > 0);
    };
    const fromEvent = (e) => {
      const r = pad.getBoundingClientRect();
      return e.clientX < r.left + r.width / 2 ? -1 : 1;
    };
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      active = e.pointerId;
      try { pad.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
      setDir(fromEvent(e));
    });
    pad.addEventListener('pointermove', (e) => { if (e.pointerId === active) setDir(fromEvent(e)); });
    const end = (e) => { if (e.pointerId === active) { active = null; setDir(0); } };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => pad.addEventListener(ev, end));
  }

  function bindButton(btn) {
    const key = btn.dataset.key;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* egal */ }
      input.touch(key, true);
      btn.classList.add('on');
    });
    const end = () => { input.touch(key, false); btn.classList.remove('on'); };
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, end));
  }

  /** Wird jedes Frame vom HUD aufgerufen */
  function update(game) {
    if (!root) return;
    const hide = game.mode === 'work' || game.mode === 'summit';
    if (last.hide !== hide) { last.hide = hide; root.classList.toggle('hidden', hide); }
    const k = game.mode === 'play' ? game.promptKey : '';
    if (last.k !== k) {
      last.k = k;
      el.use.classList.toggle('pulse', k === 'hut' || k === 'eat');
      el.down.classList.toggle('pulse', k === 'sit');
    }
  }

  /** Hochformat auf dem Handy → Spiel anhalten */
  function blocked() {
    return BERG.isTouch && window.innerHeight > window.innerWidth;
  }

  return { init, update, blocked };
})();
