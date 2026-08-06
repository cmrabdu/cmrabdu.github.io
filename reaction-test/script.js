/* reaction-test — five rounds of visual reaction timing.
   No dependencies, no network, no storage beyond a single personal-record key. */

(function () {
  'use strict';

  var ROUNDS      = 5;
  var DELAY_MIN   = 1400;   // ms before green, lower bound
  var DELAY_MAX   = 3600;   // ms before green, upper bound
  var PR_KEY      = 'cmrabdu.reaction.pr';

  var stage     = document.getElementById('stage');
  var icon      = document.getElementById('stage-icon');
  var titleEl   = document.getElementById('stage-title-text');
  var subEl     = document.getElementById('stage-sub');
  var pips      = Array.prototype.slice.call(document.querySelectorAll('#pips .rt-pip'));
  var roundsEl  = document.getElementById('rounds');
  var verdictEl = document.getElementById('verdict');
  var avgEl     = document.getElementById('stat-avg');
  var bestEl    = document.getElementById('stat-best');
  var prEl      = document.getElementById('stat-pr');
  var prStat    = prEl.closest('.rt-stat');
  var resetRunBtn = document.getElementById('reset-run');
  var resetPrBtn  = document.getElementById('reset-pr');

  var STATES = ['is-idle', 'is-wait', 'is-go', 'is-result', 'is-early', 'is-done'];

  var state    = 'idle';
  var times    = [];        // valid round times, ms
  var entries  = [];        // display log, including voided false starts
  var timerId  = null;
  var goAt     = 0;         // performance-clock timestamp of the frame green was painted
  var rafId    = null;

  /* ---------- storage ---------- */

  function readPR() {
    try {
      var raw = localStorage.getItem(PR_KEY);
      var n = raw === null ? NaN : parseInt(raw, 10);
      return isFinite(n) && n > 0 ? n : null;
    } catch (err) {
      return null;   // private mode, storage disabled — the game still works
    }
  }

  function writePR(ms) {
    try { localStorage.setItem(PR_KEY, String(ms)); } catch (err) { /* non-fatal */ }
  }

  function clearPR() {
    try { localStorage.removeItem(PR_KEY); } catch (err) { /* non-fatal */ }
  }

  /* ---------- rendering ---------- */

  function setState(next, opts) {
    opts = opts || {};
    state = next;
    stage.classList.remove.apply(stage.classList, STATES);
    stage.classList.add('is-' + next);

    icon.textContent = opts.icon || '';
    subEl.textContent = opts.sub || '';

    if (opts.ms != null) {
      titleEl.classList.add('is-number');
      titleEl.innerHTML = '';
      titleEl.appendChild(document.createTextNode(String(opts.ms)));
      var small = document.createElement('small');
      small.textContent = 'ms';
      titleEl.appendChild(small);
    } else {
      titleEl.classList.remove('is-number');
      titleEl.textContent = opts.title || '';
    }
  }

  function renderPips() {
    pips.forEach(function (pip, i) {
      pip.classList.toggle('is-filled', i < times.length);
      pip.classList.toggle('is-active', i === times.length && state !== 'done' && state !== 'idle');
    });
  }

  function renderStats() {
    var pr = readPR();
    prEl.textContent = pr == null ? '—' : pr;

    if (!times.length) {
      avgEl.textContent = '—';
      bestEl.textContent = '—';
      return;
    }

    var sum = times.reduce(function (a, b) { return a + b; }, 0);
    avgEl.textContent = Math.round(sum / times.length);
    bestEl.textContent = Math.min.apply(Math, times);
  }

  function renderRounds() {
    roundsEl.innerHTML = '';
    if (!entries.length) return;

    // Scale the bars against the slowest valid time so the spread is legible.
    var slowest = times.length ? Math.max.apply(Math, times) : 1;
    var n = 0;

    entries.forEach(function (entry) {
      var li = document.createElement('li');
      var label = document.createElement('span');
      label.className = 'rt-round-n';

      var bar = document.createElement('span');
      bar.className = 'rt-round-bar';

      var ms = document.createElement('span');
      ms.className = 'rt-round-ms';

      if (entry.void) {
        li.classList.add('is-void');
        label.textContent = '––';
        bar.style.setProperty('--w', '14%');
        ms.textContent = 'false start';
      } else {
        n += 1;
        label.textContent = String(n).padStart(2, '0');
        bar.style.setProperty('--w', Math.max(4, (entry.ms / slowest) * 100) + '%');
        ms.textContent = entry.ms + ' ms';
      }

      li.appendChild(label);
      li.appendChild(bar);
      li.appendChild(ms);
      roundsEl.appendChild(li);
    });
  }

  function verdictFor(avg) {
    if (avg < 200) return ['Reflexes of a hummingbird.', 'That is genuinely quick — check you are not guessing the timing.'];
    if (avg < 250) return ['Sharp.', 'Comfortably faster than a typical visual reaction.'];
    if (avg < 300) return ['Solid.', 'Right around where a focused adult lands on a touchscreen.'];
    if (avg < 380) return ['Average.', 'Normal territory for a phone. A little caffeine moves this a lot.'];
    if (avg < 500) return ['A touch slow.', 'Worth a second run — first attempts are usually the worst.'];
    return ['Sluggish.', 'Either you were distracted, or the phone was. Try again.'];
  }

  function renderVerdict() {
    if (times.length < ROUNDS) {
      verdictEl.hidden = true;
      return;
    }
    var avg = Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length);
    var v = verdictFor(avg);
    verdictEl.innerHTML = '';
    var b = document.createElement('b');
    b.textContent = v[0];
    verdictEl.appendChild(b);
    verdictEl.appendChild(document.createTextNode(' ' + v[1]));
    verdictEl.hidden = false;
  }

  function refresh() {
    renderPips();
    renderStats();
    renderRounds();
    renderVerdict();
    resetRunBtn.disabled = entries.length === 0;
  }

  /* ---------- game flow ---------- */

  function clearTimers() {
    if (timerId !== null) { clearTimeout(timerId); timerId = null; }
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }

  function armRound() {
    clearTimers();
    goAt = 0;

    setState('wait', {
      icon: '●',
      title: 'Wait for green…',
      sub: 'round ' + (times.length + 1) + ' of ' + ROUNDS + ' · don’t jump the gun'
    });
    renderPips();

    var delay = DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN);

    timerId = setTimeout(function () {
      timerId = null;
      setState('go', { icon: '', title: 'TAP', sub: '' });

      // Start the clock from the frame timestamp rather than from here: the
      // class change above is only queued, and green does not exist on screen
      // until the browser paints this next frame.
      rafId = requestAnimationFrame(function (frameTime) {
        rafId = null;
        goAt = frameTime;
      });
    }, delay);
  }

  function startRun() {
    times = [];
    entries = [];
    verdictEl.hidden = true;
    prStat.classList.remove('is-new-pr');
    refresh();
    armRound();
  }

  function recordHit(tapTime) {
    // If the tap beat the rAF callback, fall back to the scheduled paint moment.
    var reference = goAt || tapTime;
    var ms = Math.max(1, Math.round(tapTime - reference));

    times.push(ms);
    entries.push({ ms: ms });

    var pr = readPR();
    var isPR = pr == null || ms < pr;
    if (isPR) {
      writePR(ms);
      prStat.classList.add('is-new-pr');
    }

    var done = times.length >= ROUNDS;

    if (done) {
      var avg = Math.round(times.reduce(function (a, b) { return a + b; }, 0) / times.length);
      setState('done', {
        icon: '◉',
        ms: avg,
        sub: 'average over ' + ROUNDS + ' rounds · tap to run it again'
      });
    } else {
      setState('result', {
        icon: isPR ? '★' : '◦',
        ms: ms,
        sub: (isPR ? 'new personal record · ' : '') + 'tap for round ' + (times.length + 1)
      });
    }

    refresh();
  }

  function recordFalseStart() {
    clearTimers();
    entries.push({ void: true });
    setState('early', {
      icon: '✕',
      title: 'Too early.',
      sub: 'you tapped before green · tap to replay this round'
    });
    refresh();
  }

  /* Single entry point for every activation, whatever the input device.
     `at` is a performance-clock timestamp for the input itself. */
  function tap(at) {
    switch (state) {
      case 'idle':
      case 'done':
        startRun();
        break;
      case 'wait':
        recordFalseStart();
        break;
      case 'go':
        recordHit(at);
        break;
      case 'result':
      case 'early':
        armRound();
        break;
    }
  }

  /* ---------- input ---------- */

  var suppressClickUntil = 0;

  // pointerdown fires as soon as the finger lands; click waits to rule out
  // drags and double taps, which would add tens of milliseconds of lie.
  stage.addEventListener('pointerdown', function (e) {
    if (e.button != null && e.button > 0) return;   // ignore right/middle click
    e.preventDefault();
    // Every pointer activation is followed by a click we must not double count.
    // Touch-synthesised clicks carry detail === 0, exactly like keyboard ones,
    // so the two are only separable by remembering that a pointer just fired.
    suppressClickUntil = performance.now() + 700;
    // Event timestamps share performance.now()'s time origin in current
    // browsers and are stamped closer to the hardware event than we can get.
    var at = (typeof e.timeStamp === 'number' && e.timeStamp > 0) ? e.timeStamp : performance.now();
    tap(at);
  });

  // Enter and Space arrive here as a click with no pointerdown ahead of them,
  // which is the only reliable way to tell them from a tap.
  stage.addEventListener('click', function () {
    if (performance.now() < suppressClickUntil) return;
    tap(performance.now());
  });

  stage.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // Backgrounding the tab freezes timers and paints, so any round in flight is
  // no longer measuring anything real. Void it rather than log a fake number.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && (state === 'wait' || state === 'go')) {
      clearTimers();
      setState('idle', {
        icon: '◉',
        title: 'Round cancelled',
        sub: 'you left the page mid-round · tap to start over'
      });
      times = [];
      entries = [];
      refresh();
    }
  });

  resetRunBtn.addEventListener('click', function () {
    clearTimers();
    times = [];
    entries = [];
    verdictEl.hidden = true;
    prStat.classList.remove('is-new-pr');
    setState('idle', {
      icon: '◉',
      title: 'Tap to start',
      sub: ROUNDS + ' rounds · tap the moment it turns green'
    });
    refresh();
  });

  resetPrBtn.addEventListener('click', function () {
    clearPR();
    prStat.classList.remove('is-new-pr');
    refresh();
  });

  /* ---------- boot ---------- */

  setState('idle', {
    icon: '◉',
    title: 'Tap to start',
    sub: ROUNDS + ' rounds · tap the moment it turns green'
  });
  refresh();
})();
