// Owns playback within one view. This controller has no slide-navigation API.
export function createBeatPlayback({ state, play, pause, advance, holdMs, reduced, showAll, changed }) {
  let auto = false, active = false, held = false, queued = null, resumeManual = false, destroyed = false;
  const visible = () => active && !document.hidden && !destroyed;
  function clear() { if (queued !== null) clearTimeout(queued); queued = null; }
  function continueAuto() {
    clear();
    if (!visible() || !auto || held || state().complete) { changed(); return; }
    if (reduced.matches) { pause(); showAll(); changed(); return; }
    if (state().running) { changed(); return; }
    if (state().atBoundary) {
      queued = setTimeout(() => {
        queued = null;
        if (visible() && auto && !held && !state().complete) advance();
        changed();
      }, holdMs());
    } else play();
    changed();
  }
  function onVisibility() {
    if (document.hidden) {
      resumeManual = state().running;
      clear(); pause(); changed();
    } else {
      if (auto) continueAuto();
      else if (visible() && resumeManual && !held) play();
      resumeManual = false;
    }
  }
  function onMotion() { if (auto) continueAuto(); }
  document.addEventListener('visibilitychange', onVisibility);
  reduced.addEventListener('change', onMotion);
  return {
    get mode() { return auto; },
    get status() {
      if (state().complete) return 'complete';
      if (state().running) return 'running';
      if (queued !== null) return 'waiting';
      return held || !visible() ? 'paused' : 'manual';
    },
    settled: continueAuto,
    // Explicit Next/Replay owns the immediate beat, then Auto may continue.
    engage() { clear(); held = false; },
    hold() { clear(); held = true; pause(); changed(); },
    togglePause() {
      if (state().running || queued !== null) { this.hold(); return; }
      held = false;
      if (auto) continueAuto();
      else if (visible() && !state().complete) { if (state().atBoundary) advance(); else play(); changed(); }
    },
    setMode(value) {
      auto = value; held = false; clear();
      if (auto) continueAuto(); else { pause(); changed(); }
    },
    setActive(value) {
      if (active === value) return;
      active = value; clear(); resumeManual = false;
      if (active) continueAuto(); else { pause(); changed(); }
    },
    destroy() { destroyed = true; clear(); pause(); document.removeEventListener('visibilitychange', onVisibility); reduced.removeEventListener('change', onMotion); },
  };
}
