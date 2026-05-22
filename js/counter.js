// Live "time since" counter — ticks every second.
// Reference date per-element via data-since="YYYY-MM-DDTHH:MM:SSZ".
// Always shows hours, minutes, seconds; days prepended when ≥1.

(function () {
  const FALLBACK = '2026-05-20T00:00:00Z';

  function format(sinceMs) {
    const s = Math.max(0, Math.floor((Date.now() - sinceMs) / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return d > 0
      ? `${d}d ${pad(h)}h ${pad(m)}m ${pad(sec)}s`
      : `${pad(h)}h ${pad(m)}m ${pad(sec)}s`;
  }

  function render(el) {
    const since = new Date(el.dataset.since || FALLBACK).getTime();
    const tick = () => { el.textContent = format(since); };
    tick();
    setInterval(tick, 1000);
  }

  function init() {
    document.querySelectorAll('[data-counter]').forEach(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
