/* =========================================================================
   confetti.js — Bağımsız, kütüphanesiz konfeti efekti (ödül animasyonu)
   ========================================================================= */
(function () {
  'use strict';
  const AH = (window.AH = window.AH || {});

  const COLORS = ['#f59e0b', '#10b981', '#6366f1', '#ef4444', '#0ea5e9', '#ec4899'];
  let canvas = null;
  let ctx = null;
  let particles = [];
  let raf = null;
  let safety = null;

  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.className = 'confetti-layer';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    window.addEventListener('resize', size);
    size();
  }

  function size() {
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(originEl, count) {
    ensureCanvas();
    const w = window.innerWidth;
    let ox = w / 2;
    let oy = window.innerHeight * 0.35;
    if (originEl && originEl.getBoundingClientRect) {
      const r = originEl.getBoundingClientRect();
      ox = r.left + r.width / 2;
      oy = r.top + r.height / 2;
    }
    const n = count || 110;
    for (let i = 0; i < n; i++) {
      const angle = (-Math.PI / 2) + (Math.random() - 0.5) * 2.2;
      const speed = 5 + Math.random() * 9;
      particles.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        g: 0.22 + Math.random() * 0.15,
        size: 5 + Math.random() * 7,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        life: 1
      });
    }
    if (!raf) raf = requestAnimationFrame(tick);
    /* Güvenlik ağı: sekme arka plandayken rAF durur; parçacıklar ekranda
       donup kalmasın diye belirli süre sonra katman temizlenir. */
    clearTimeout(safety);
    safety = setTimeout(() => {
      particles.length = 0;
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }, 4000);
  }

  function tick() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    particles = particles.filter((p) => p.life > 0 && p.y < window.innerHeight + 60);
    for (const p of particles) {
      p.vy += p.g;
      p.vx *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 0.006;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (particles.length) {
      raf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(raf);
      raf = null;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  AH.confetti = { fire: spawn };
})();
