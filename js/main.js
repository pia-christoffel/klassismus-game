/* =============================================================================
   DER BERG – Start
   ============================================================================= */

(function () {
  function boot() {
    BERG.Art.init();
    BERG.Assets.load(() => {
      BERG.HUD.init(document.getElementById('hud'));
      BERG.Work.init(document.getElementById('work'));
      BERG.Flow.init();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
