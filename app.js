/* Proof page: player + beat sync + always-on reveal motion. No tracking, no network. */
(function () {
  const film = document.getElementById('film');
  const player = document.getElementById('player');
  const frame = document.querySelector('.frame');
  const playBtn = document.getElementById('play');
  const snd = document.getElementById('snd');
  const tc = document.getElementById('tc');
  const beats = [...document.querySelectorAll('.beat')];

  const fmt = s => '00:' + String(Math.min(20, Math.floor(s))).padStart(2, '0');

  function start() {
    film.muted = false;                 // the cue pass is the point
    film.currentTime = 0;
    film.play().catch(() => { film.muted = true; film.play().catch(() => {}); });
  }

  frame.addEventListener('click', e => {
    if (e.target.closest('.snd')) return;
    if (film.paused) start(); else film.pause();
  });

  snd.addEventListener('click', () => {
    film.muted = !film.muted;
    snd.setAttribute('aria-pressed', String(!film.muted));
    snd.textContent = film.muted ? 'SOUND OFF' : 'SOUND ON';
  });

  film.addEventListener('play', () => player.classList.add('playing'));
  film.addEventListener('pause', () => player.classList.remove('playing'));
  film.addEventListener('ended', () => {
    player.classList.remove('playing');
    playBtn.innerHTML = '<span class="btn-ico" aria-hidden="true">▶</span> Play again';
  });

  playBtn.addEventListener('click', () => {
    if (film.paused) start(); else film.pause();
  });

  film.addEventListener('timeupdate', () => {
    const t = film.currentTime;
    tc.textContent = fmt(t);
    beats.forEach(b => {
      const a = +b.dataset.t, z = +b.dataset.end;
      b.classList.toggle('active', t >= a && t < z);
    });
  });

  // clicking a beat seeks the film to that beat — the page is the timeline
  beats.forEach(b => b.querySelector('.beat-in').addEventListener('click', () => {
    film.muted = false;
    film.currentTime = +b.dataset.t + 0.04;
    film.play().catch(() => {});
    player.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));

  // keyboard: space toggles, arrows scrub a second
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') { e.preventDefault(); if (film.paused) start(); else film.pause(); }
    if (e.code === 'ArrowRight') { film.currentTime = Math.min(20, film.currentTime + 1); }
    if (e.code === 'ArrowLeft') { film.currentTime = Math.max(0, film.currentTime - 1); }
  });

  // always-on scroll reveal (owner decision 2026-10-20: full motion, no reduced-motion branch)
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.hero-copy, .player, .beat, .col, .spec, .files, .foot-note')
    .forEach((el, i) => { el.classList.add('rv'); el.style.transitionDelay = (i % 4) * 60 + 'ms'; io.observe(el); });
})();
