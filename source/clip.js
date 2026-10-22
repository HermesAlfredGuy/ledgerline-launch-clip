'use strict';
/* ============================================================================
   Ledgerline — "one click" launch clip. 1080x1080, 30fps, 600 frames, 20s.
   Every value is a pure function of the frame number: window.render(t) seeks.
   Technique ids in comments map 1:1 to ../TIMELINE.md (oneshotprompts index).
   ========================================================================== */
const CV = document.getElementById('c');
const ctx = CV.getContext('2d');
const W = 1080, H = 1080, FPS = 30, DUR = 20;
const TOTAL = DUR * FPS;                     // 600

const C = { paper: '#EDE6D8', sheet: '#F8F3EA', ink: '#17120D', red: '#EE3A1C', blue: '#1B34C8', green: '#12A66B', white: '#FFFCF4' };

/* ---------------------------------------------------------------- helpers */
const cl = (x, a = 0, b = 1) => (x < a ? 0 : x > b ? 1 : (x - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
const eOutCubic = t => 1 - Math.pow(1 - t, 3);
const eInCubic = t => t * t * t;
const eInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const eOutQuart = t => 1 - Math.pow(1 - t, 4);
const eOutExpo = t => (t >= 1 ? 1 : 1 - Math.pow(2, -9 * t));
const eOutBack = t => { const s = 1.9; return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
const eOutElastic = t => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1);

/* technique helpers, one per named move (motion-vocab) */
const T = {
  reveal: (f, a, b, e = eOutExpo) => e(cl(f, a, b)),                       // generic eased window
  stagger: (f, i, a, step, d, e = eOutExpo) => e(cl(f, a + i * step, a + i * step + d)), // staggered-cascade-reveal
  stamp: (f, a, b) => ({ p: cl(f, a, b), s: lerp(1.34, 1, eOutQuart(cl(f, a, b))), flash: Math.max(0, 1 - (f - a) / 7) }), // stamp-impression
  tracking: (f, a, b, from = 20, to = 0) => lerp(from, to, eOutExpo(cl(f, a, b))),        // tracking-in
  marquee: f => f * 1.9,                                                   // infinite-marquee
  countUp: (f, a, b, to) => to * eOutCubic(cl(f, a, b)),                   // number count
  countDown: (f, a, b, from) => from * (1 - eInOutCubic(cl(f, a, b)))      // number count-down
};

function font(size, fam = 'sans', weight = 400, spacing = 0) {
  ctx.font = fam === 'black' ? `${size}px "Archivo Black"`
    : fam === 'mono' ? `${weight} ${size}px "PlexMono"`
      : fam === 'serif' ? `italic ${size}px "InstrumentSerif"`
        : `${weight} ${size}px Archivo`;
  ctx.letterSpacing = (spacing || 0) + 'px';
}
function text(s, x, y, o = {}) {
  const { size = 24, fam = 'sans', weight = 400, color = C.ink, align = 'left', spacing = 0, alpha = 1 } = o;
  if (alpha <= 0.002) return;
  ctx.save(); ctx.globalAlpha *= alpha; font(size, fam, weight, spacing);
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y); ctx.restore();
}
function measure(s, o = {}) {
  const { size = 24, fam = 'sans', weight = 400, spacing = 0 } = o;
  ctx.save(); font(size, fam, weight, spacing); const w = ctx.measureText(s).width; ctx.restore(); return w;
}
function rrect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
function shadow(blur, dy, color = 'rgba(23,18,13,0.30)') { ctx.shadowBlur = blur; ctx.shadowColor = color; ctx.shadowOffsetY = dy; }
function noShadow() { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.shadowOffsetY = 0; }

/* paper texture: one deterministic tile, moved per frame */
const NOISE = (() => {
  const n = document.createElement('canvas'); n.width = n.height = 256;
  const g = n.getContext('2d'); const d = g.createImageData(256, 256);
  for (let i = 0; i < 256 * 256; i++) {
    const v = 170 + Math.round(hash(i, 3) * 85);
    d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255;
  }
  g.putImageData(d, 0, 0); return n;
})();
const NOISE_PAT = ctx.createPattern(NOISE, 'repeat');

function grain(alpha, f) {
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = alpha;
  ctx.translate(-(f * 37) % 256, -(f * 53) % 256);
  ctx.fillStyle = NOISE_PAT; ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore();
}
function vignette(a = 0.16) {
  const g = ctx.createRadialGradient(540, 520, 300, 540, 540, 760);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(20,14,8,${a})`);
  ctx.save(); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
/* registration marks — print language, fixed to the frame, jittering */
function regMarks(f, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.fillStyle = color;
  const jx = (hash(f, 21) - 0.5) * 2.4, jy = (hash(f, 22) - 0.5) * 2.4;
  const pts = [[44, 44], [W - 44, 44], [44, H - 44], [W - 44, H - 44]];
  for (const [x, y] of pts) {
    const X = x + jx, Y = y + jy;
    ctx.beginPath(); ctx.arc(X, Y, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X - 19, Y); ctx.lineTo(X - 5, Y); ctx.moveTo(X + 5, Y); ctx.lineTo(X + 19, Y);
    ctx.moveTo(X, Y - 19); ctx.lineTo(X, Y - 5); ctx.moveTo(X, Y + 5); ctx.lineTo(X, Y + 19); ctx.stroke();
  }
  ctx.restore();
}
function halftone(f, x, y, w, h, opts = {}) {
  const { step = 13, rMax = 4.4, color = C.ink, alpha = 0.5, fn = null, phase = 0 } = opts;
  ctx.save(); ctx.fillStyle = color; ctx.globalAlpha *= alpha;
  for (let gy = y; gy < y + h; gy += step) {
    for (let gx = x; gx < x + w; gx += step) {
      const t = fn ? fn((gx - x) / w, (gy - y) / h) : 0.5;
      const r = rMax * Math.max(0, Math.min(1, t)) * (1 + 0.18 * Math.sin(f * 0.2 + phase + gx * 0.02));
      if (r > 0.25) { ctx.beginPath(); ctx.arc(gx, gy, r, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ camera */
function withCam(z, r, tx, ty, fn) {
  ctx.save(); ctx.translate(540, 540); ctx.rotate(r); ctx.scale(z, z); ctx.translate(-540 + tx, -540 + ty);
  fn(); ctx.restore();
}
/* gate weave: film jitter, one hash per axis per frame (gate-weave) */
function weave(f, k = 1) {
  return { tx: (hash(f, 1) - 0.5) * 2.1 * k, ty: (hash(f, 2) - 0.5) * 1.9 * k, r: (hash(f, 3) - 0.5) * 0.0011 * k };
}

/* ------------------------------------------------------- the 48-tab pile */
const CHIPS = (() => {
  const a = [], cols = 7, rows = 7, x0 = 64, y0 = 592, cw = 952 / cols, chh = (1014 - y0) / rows;
  for (let i = 0; i < 48; i++) {
    const cxi = i % cols, cyi = Math.floor(i / cols);
    const bx = x0 + cw * (cxi + 0.5) + (hash(i, 7) - 0.5) * 30;
    const by = y0 + chh * (cyi + 0.5) + (hash(i, 8) - 0.5) * 20;
    const rot = (hash(i, 9) - 0.5) * 0.16;
    const ang = hash(i, 10) * Math.PI * 2;
    a.push({ i, bx, by, rot, sx: 540 + Math.cos(ang) * 900, sy: 780 + Math.sin(ang) * 860 });
  }
  return a;
})();

function drawChip(ch, f) {
  const inP = T.stagger(f, ch.i, 28, 1.02, 13, eOutCubic);
  if (inP <= 0) return;
  const gatherT0 = 86 + (ch.i % 14) * 0.6;
  const g = eInOutCubic(cl(f, gatherT0, gatherT0 + 18));
  let x = lerp(ch.sx, ch.bx, inP), y = lerp(ch.sy, ch.by, inP);
  let rot = lerp(ch.rot + (hash(ch.i, 11) - 0.5) * 1.6, ch.rot, inP);
  let sc = lerp(0.82, 1, inP);
  let alpha = cl(inP * 3, 0, 1);
  // idle float while the pile sits (idle-float-bob)
  if (inP >= 1 && g <= 0) {
    x += 2.2 * Math.sin(f * 0.11 + ch.i * 1.7);
    y += 2.4 * Math.cos(f * 0.13 + ch.i);
    rot += 0.02 * Math.sin(f * 0.09 + ch.i);
  }
  if (g > 0) {
    const ang0 = Math.atan2(y - 780, x - 540), r0 = Math.hypot(x - 540, y - 780);
    const ang = ang0 + g * 2.5, r = r0 * (1 - eInCubic(g));
    x = 540 + Math.cos(ang) * r; y = 780 + Math.sin(ang) * r * 0.82;
    rot += g * 2.1; sc = lerp(1, 0.26, g); alpha *= 1 - cl(g, 0.72, 1);
  }
  if (alpha <= 0.002) return;
  const w = 132, h = 52;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc);
  shadow(14, 7, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = C.sheet; rrect(-w / 2, -h / 2, w, h, 3); ctx.fill(); noShadow();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6; rrect(-w / 2, -h / 2, w, h, 3); ctx.stroke();
  // little colour tab
  ctx.fillStyle = ch.i % 3 === 0 ? C.red : ch.i % 3 === 1 ? C.blue : C.ink;
  ctx.fillRect(-w / 2 + 8, -h / 2 + 8, 15, 15);
  font(11.5, 'mono', 600, 0.6); ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('TAB ' + String(ch.i + 1).padStart(2, '0'), -w / 2 + 30, -h / 2 + 20);
  ctx.globalAlpha *= 0.42; ctx.fillRect(-w / 2 + 8, h / 2 - 15, w - 16, 1.2);
  ctx.fillRect(-w / 2 + 8, h / 2 - 9, (w - 16) * (0.3 + 0.6 * hash(ch.i, 5)), 3);
  ctx.restore();
}

/* the one report sheet, drawn small in scene 1 and large in scene 2 */
function reportMini(x, y, w, h, f, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha;
  shadow(40, 18, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = C.sheet; ctx.fillRect(x, y, w, h); noShadow();
  ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = C.red; ctx.fillRect(x, y, w * 0.34, 6);
  ctx.fillStyle = C.ink;
  font(11, 'mono', 600, 1.2); ctx.textAlign = 'left';
  ctx.fillText('Q3 CONSOLIDATED', x + 18, y + 34);
  font(30, 'black'); ctx.fillText('Report', x + 18, y + 78);
  for (let i = 0; i < 4; i++) {
    const yy = y + 104 + i * 22;
    ctx.globalAlpha *= 0.5; ctx.fillRect(x + 18, yy, w - 36, 1.2); ctx.globalAlpha *= 2;
    ctx.globalAlpha *= 0.7; ctx.fillRect(x + 18, yy + 7, (w - 36) * (0.35 + 0.5 * hash(i, 4)), 4); ctx.globalAlpha /= 0.7;
  }
  ctx.restore();
}

/* ============================================================== SCENE 1 ===
   THE MESS. 0–119: 48 tabs slam in, pile up, spiral into one report.        */
function sceneMess(f) {
  const z = lerp(1.0, 1.075, eOutCubic(cl(f, 0, 86))) - 0.075 * eOutCubic(cl(f, 92, 116));
  const v = weave(f, 1.4);
  withCam(z, v.r, v.tx, v.ty, () => {
    ctx.fillStyle = C.ink; ctx.fillRect(-240, -240, W + 480, H + 480);

    // blueprint field, always drifting (pan)
    ctx.save(); ctx.strokeStyle = 'rgba(237,230,216,0.055)'; ctx.lineWidth = 1;
    const off = (f * 0.55) % 64;
    for (let x = -64 + off; x < W + 64; x += 64) { ctx.beginPath(); ctx.moveTo(x, -120); ctx.lineTo(x, H + 120); ctx.stroke(); }
    for (let y = -64 + off * 0.6; y < H + 64; y += 64) { ctx.beginPath(); ctx.moveTo(-120, y); ctx.lineTo(W + 120, y); ctx.stroke(); }
    ctx.restore();

    // kicker
    text('MONTH-END  /  THU 18:40', 64, 112, { size: 16, fam: 'mono', spacing: 2.6, color: 'rgba(237,230,216,0.60)', alpha: T.reveal(f, 2, 14) });

    // counter 48 -> 1 (number count-down), lands and holds on 1
    const tabCount = Math.max(1, Math.round(48 - 47 * eInOutCubic(cl(f, 86, 102))));
    const cntA = T.reveal(f, 2, 12);
    text(String(tabCount).padStart(2, '0'), W - 64, 118, { size: 46, fam: 'black', color: C.red, align: 'right', alpha: cntA });
    text(tabCount > 1 ? 'TABS OPEN' : 'TAB OPEN', W - 64, 142, { size: 12, fam: 'mono', spacing: 2.2, color: 'rgba(237,230,216,0.62)', align: 'right', alpha: cntA });

    // "MONTH" — stamp-impression (oversized slam, contact flash)
    const st = T.stamp(f, 2, 16);
    if (f >= 2) {
      ctx.save(); ctx.translate(64, 300); ctx.scale(st.s, st.s * (1 + 0.06 * (1 - st.p)));
      ctx.globalAlpha = cl(f, 2, 5);
      font(190, 'black', 400, -7); ctx.fillStyle = C.sheet; ctx.textAlign = 'left'; ctx.fillText('MONTH', 0, 0);
      if (st.flash > 0) {
        ctx.globalAlpha = st.flash * 0.55; ctx.fillStyle = C.red;
        font(190, 'black', 400, -7); ctx.fillText('MONTH', 0, 0);
      }
      ctx.restore();
    }
    // "END." — mask reveal rising from the baseline
    const mEnd = T.reveal(f, 11, 26, eOutExpo);
    if (mEnd > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(40, 470 + 210 * (1 - mEnd) - 210, 700, 210 * mEnd + 10); ctx.clip();
      font(190, 'black', 400, -7); ctx.fillStyle = C.sheet; ctx.textAlign = 'left';
      ctx.fillText('END.', 64, 470 + 42 * (1 - mEnd));
      ctx.restore();
    }
    // red rule — draws from the left
    const rw = 300 * T.reveal(f, 18, 34, eInOutCubic);
    ctx.fillStyle = C.red; ctx.fillRect(66, 500, rw, 10);

    // subtitle word by word (per-word-fade-in); at the gather the mess is crossed out
    const words = ['48', 'tabs.', '1', 'report.', '0', 'hours', 'left.'];
    let wx = 64; const spans = [];
    words.forEach((wd, i) => {
      const a = T.reveal(f, 22 + i * 1.6, 30 + i * 1.6);
      const o = { size: 27, fam: 'mono', spacing: 0.4, color: 'rgba(237,230,216,0.88)' };
      const wWidth = measure(wd, o);
      text(wd, wx, 534 - 14 * (1 - a), Object.assign({ alpha: a }, o));
      spans.push([wx, wWidth]);
      wx += wWidth + 12;
    });
    const strikeP = T.reveal(f, 88, 102, eInOutCubic);
    if (strikeP > 0) {
      const x0 = spans[0][0], x1 = spans[1][0] + spans[1][1];
      ctx.save(); ctx.fillStyle = C.red; ctx.fillRect(x0 - 2, 524, (x1 - x0 + 4) * strikeP, 4); ctx.restore();
    }
    const markP = T.reveal(f, 92, 106, eInOutCubic);
    if (markP > 0) {
      const x0 = spans[2][0], x1 = spans[3][0] + spans[3][1];
      ctx.save(); ctx.fillStyle = C.red; ctx.fillRect(x0 - 2, 543, (x1 - x0 + 4) * markP, 3); ctx.restore();
    }

    // the pile
    for (const ch of CHIPS) drawChip(ch, f);

    // the single report, after the swirl (dolly-in-and-out + anticipation squash)
    if (f >= 100) {
      const a = cl(f, 100, 110);
      const sq = 1 + 0.16 * Math.sin(Math.PI * cl(f, 106, 119)) * -1;
      const sc = lerp(0.82, 1, eOutBack(cl(f, 100, 112))) * (1 + 0.02 * Math.sin(f * 0.4));
      ctx.save(); ctx.globalAlpha = a; ctx.translate(540, 780); ctx.scale(sc, sc * sq);
      reportMini(-200, -140, 400, 280, f, 1);
      ctx.restore();
    }
  });

  // whip-pan out (whip-pan): smear to the right, cut happens inside the blur
  if (f >= 110) {
    const p = eInCubic(cl(f, 110, 120));
    ctx.save(); ctx.globalAlpha = 0.9 * p; ctx.fillStyle = C.ink;
    ctx.fillRect(-200 + p * 300, -10, 240, H + 20); ctx.restore();
  }
  // beat flash on the drop at f60 (contact, well under 3 flashes/s)
  if (f >= 60 && f < 63) { ctx.save(); ctx.globalAlpha = 0.12 * (1 - (f - 60) / 3); ctx.fillStyle = C.red; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  regMarks(f, 'rgba(237,230,216,0.22)');
  grain(0.12, f); vignette(0.2);
}

/* ============================================================== SCENE 2 ===
   ONE CLICK. 120–479: report lands, cursor presses, red fills, EXPORTED,
   folds into three formats, flies away, result board.                       */
const SH = { x: 64, y: 286, w: 952, h: 660 };

function sheetContent(mode, f) {
  const inkC = mode === 'red' ? C.sheet : C.ink;
  const sub = mode === 'red' ? 'rgba(248,243,234,0.72)' : 'rgba(23,18,13,0.56)';
  const pad = 44, w = SH.w, h = SH.h;
  // header
  text('Q3 CONSOLIDATED  ·  ALL SITES', pad, 46, { size: 13.5, fam: 'mono', spacing: 1.7, color: sub });
  text('PAGE 1 / 1', w - pad, 46, { size: 13.5, fam: 'mono', spacing: 1.7, color: sub, align: 'right' });
  ctx.fillStyle = sub; ctx.globalAlpha *= 0.5; ctx.fillRect(pad, 62, w - pad * 2, 1); ctx.globalAlpha /= 0.5;

  // title + time-to-export (OLD WAY struck out -> THIS WAY)
  text('Q3 revenue', pad, 118, { size: 48, fam: 'sans', weight: 700, color: inkC });
  const swapped = f >= 212;
  text(swapped ? 'THIS WAY' : 'OLD WAY', w - pad, 70, { size: 13, fam: 'mono', spacing: 2.2, color: sub, align: 'right' });
  const oldA = 1 - cl(f, 208, 220);
  if (oldA > 0) {
    const ow = measure('4 h 12 m', { size: 30, fam: 'mono', weight: 600 });
    text('4 h 12 m', w - pad, 112, { size: 30, fam: 'mono', weight: 600, color: inkC, align: 'right', alpha: oldA });
    const strikeP = T.reveal(f, 198, 212, eInOutCubic);
    if (strikeP > 0 && oldA > 0.4) {
      ctx.save(); ctx.fillStyle = C.red; ctx.globalAlpha *= Math.min(1, (oldA - 0.4) * 3);
      ctx.fillRect(w - pad - ow - 2, 100, (ow + 4) * strikeP, 4.5); ctx.restore();
    }
  }
  if (swapped) {
    const s = T.reveal(f, 212, 226);
    text('8 s', w - pad, 114 + 10 * (1 - s), { size: 34, fam: 'mono', weight: 600, color: mode === 'red' ? C.ink : C.red, align: 'right', alpha: s });
  }

  // three stats (staggered-cascade-reveal, numbers count)
  const stats = [['SITES', Math.round(T.countUp(f, 132, 158, 128)) + '', pad],
  ['ROWS', '2.4M', pad + 300],
  ['RECONCILED', T.countUp(f, 134, 162, 96.2).toFixed(1) + '%', pad + 600]];
  stats.forEach(([lab, val, x], i) => {
    const a = T.reveal(f, 130 + i * 2.4, 142 + i * 2.4);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    text(val, x, 196 + 14 * (1 - a), { size: 56, fam: 'sans', weight: 700, color: inkC });
    text(lab, x, 226, { size: 12.5, fam: 'mono', spacing: 2, color: sub });
    ctx.restore();
  });

  // table rows
  const rows = [['Riyadh · Olaya', 'SAR 1.24M'], ['Jeddah · Corniche', 'SAR 980K'], ['Dammam · Faisaliah', 'SAR 742K'],
  ['Khobar · Aqrab', 'SAR 604K'], ['Tabuk · Ula', 'SAR 388K'], ['Abha · Asir', 'SAR 271K']];
  rows.forEach(([site, rev], i) => {
    const a = T.stagger(f, i, 130, 2.2, 10);
    if (a <= 0) return;
    const yy = 292 + i * 44 + 16 * (1 - a);
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = sub; ctx.globalAlpha *= 0.34; ctx.fillRect(pad, yy - 18, w - pad * 2, 1); ctx.globalAlpha /= 0.34;
    text(site, pad, yy, { size: 17, fam: 'mono', color: inkC });
    text(rev, w - pad, yy, { size: 17, fam: 'mono', weight: 600, color: inkC, align: 'right' });
    ctx.restore();
  });

  // export button
  const bx = w - pad - 268, by = h - pad - 76, bw = 268, bh = 76;
  const press = f >= 180 && f < 196 ? 1 - 0.05 * Math.sin(Math.PI * cl(f, 180, 190)) : 1;
  const pressY = f >= 180 ? 3 * Math.sin(Math.PI * cl(f, 180, 192)) : 0;
  ctx.save(); ctx.translate(bx + bw / 2, by + bh / 2 + pressY); ctx.scale(press, press); ctx.translate(-bw / 2, -bh / 2);
  ctx.fillStyle = mode === 'red' ? C.ink : C.red; rrect(0, 0, bw, bh, 4); ctx.fill();
  // sheen sweep on hover
  const shp = T.reveal(f, 170, 182, eInOutCubic);
  if (shp > 0 && shp < 1) {
    ctx.save(); rrect(0, 0, bw, bh, 4); ctx.clip();
    const gx = lerp(-140, bw + 140, shp);
    const g = ctx.createLinearGradient(gx - 90, 0, gx + 90, bh);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.34)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, -10, bw, bh + 20); ctx.restore();
  }
  const lbl = f >= 186 && f < 208 ? 'Exporting…' : 'Export report';
  text(lbl, 24, bh / 2 + 6, { size: 18, fam: 'mono', weight: 600, spacing: 0.3, color: mode === 'red' ? C.paper : C.sheet });
  text('↗', bw - 28, bh / 2 + 7, { size: 21, fam: 'mono', color: mode === 'red' ? C.paper : C.sheet, align: 'right' });
  ctx.restore();

  return { bx: bx + bw / 2 - 60, by: by + bh / 2 };
}

function drawSheet(f, alpha = 1) {
  const { x, y, w, h } = SH;
  ctx.save(); ctx.globalAlpha *= alpha;
  shadow(50, 22, 'rgba(23,18,13,0.22)');
  ctx.fillStyle = C.sheet; ctx.fillRect(x, y, w, h); noShadow();
  ctx.strokeStyle = 'rgba(23,18,13,0.9)'; ctx.lineWidth = 1.6; ctx.strokeRect(x, y, w, h);
  ctx.save(); ctx.translate(x, y); sheetContent('paper', f); ctx.restore();
  ctx.restore();
}

/* the export red wipe happens between the two draws of the sheet */
function drawSheetWiped(f) {
  const { x, y, w, h } = SH;
  const inP = eInOutCubic(cl(f, 184, 206));
  const outP = eInOutCubic(cl(f, 236, 254));
  drawSheet(f);
  const wipeW = w * inP * (1 - outP);
  const fromRight = outP > 0;
  ctx.save(); ctx.beginPath();
  if (!fromRight) ctx.rect(x, y, wipeW, h); else ctx.rect(x, y, wipeW, h);
  ctx.clip();
  ctx.fillStyle = C.red; ctx.fillRect(x, y, w, h);
  ctx.save(); ctx.translate(x, y); sheetContent('red', f); ctx.restore();
  ctx.restore();
  // moving edge: a 2px ink/paper hairline leading the wipe
  if (wipeW > 1 && wipeW < w - 1) {
    const edgeX = x + wipeW;
    ctx.save(); ctx.fillStyle = C.ink; ctx.globalAlpha *= 0.35; ctx.fillRect(edgeX - 2, y, 2.5, h); ctx.restore();
  }
}

function stampExport(f) {
  const { x, y, w } = SH;
  const a = cl(f, 196, 200) * (1 - cl(f, 236, 252));
  if (a <= 0) return;
  const st = T.stamp(f, 196, 212);
  const onRed = f < 236;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.translate(x + 316, y + 644); ctx.rotate(-0.11);
  ctx.scale(st.s, st.s);
  const col = onRed ? C.sheet : C.red;
  font(92, 'black', 400, -2); ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  // double print with a 3px offset = letterpress bite
  ctx.globalAlpha *= 0.35; ctx.fillStyle = col; ctx.fillText('EXPORTED', 4, 6); ctx.globalAlpha /= 0.35;
  ctx.fillStyle = col; ctx.fillText('EXPORTED', 0, 0);
  ctx.restore();
  // halftone burst on contact (halftone-dot-scaling)
  const b = cl(f, 198, 230);
  if (b > 0 && b < 1) {
    ctx.save(); ctx.globalAlpha = 0.5 * (1 - b); ctx.translate(x + w / 2, y + 258);
    halftone(f, -w / 2, -180, w, 360, { step: 16, rMax: 5.2, color: onRed ? C.sheet : C.red, alpha: 0.6, fn: (u, v) => Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.5) * (1.6 + b * 2)) });
    ctx.restore();
  }
}

function cursorAt(f, path) {         // path: [[f, x, y], ...] eased between keys
  for (let i = 0; i < path.length - 1; i++) {
    const [f0, x0, y0] = path[i], [f1, x1, y1] = path[i + 1];
    if (f >= f0 && f < f1) {
      const p = eOutExpo(cl(f, f0, f1));
      return { x: lerp(x0, x1, p), y: lerp(y0, y1, p), p };
    }
  }
  const last = path[path.length - 1]; return { x: last[1], y: last[2], p: 1 };
}
function drawCursor(x, y, f, alpha = 1, scale = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.scale(scale, scale);
  shadow(12, 5, 'rgba(0,0,0,0.28)');
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 30); ctx.lineTo(8, 23); ctx.lineTo(14, 36); ctx.lineTo(20, 33);
  ctx.lineTo(14, 20); ctx.lineTo(24, 19); ctx.closePath();
  ctx.fillStyle = C.ink; ctx.fill(); noShadow();
  ctx.strokeStyle = C.sheet; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.restore();
}

/* the three format cards, after the fold */
const CARDS = [
  { id: 'PDF', sub: 'print-ready', rot: -0.10, dx: -300, dy: 20 },
  { id: 'XLSX', sub: 'live sheet', rot: 0.015, dx: 0, dy: -16 },
  { id: 'LINK', sub: 'share-safe', rot: 0.105, dx: 300, dy: 20 }
];

function sceneClick(f) {
  const z = f < 300 ? lerp(1.02, 1.10, eInOutCubic(cl(f, 120, 300))) : lerp(1.10, 1.03, eInOutCubic(cl(f, 300, 420)));
  const v = weave(f, 1.2);
  const shake = f >= 420 ? Math.max(0, 1 - (f - 420) / 10) * 9 : 0;
  withCam(z + (f >= 420 ? 0.012 * Math.max(0, 1 - (f - 420) / 12) : 0), v.r,
    v.tx + (hash(f, 31) - 0.5) * shake, v.ty + (hash(f, 32) - 0.5) * shake, () => {
      // paper field + blue grid (swiss-grid-slide) that never stops sliding
      ctx.fillStyle = C.paper; ctx.fillRect(-200, -200, W + 400, H + 400);
      const gp = T.reveal(f, 120, 146, eOutExpo);
      ctx.save(); ctx.globalAlpha = 0.30 * gp;
      const gx = ((f * 0.75) % 76);
      ctx.strokeStyle = 'rgba(27,52,200,0.55)'; ctx.lineWidth = 0.9;
      for (let x = -76 + gx; x < W + 76; x += 76) {
        const hh = H * gp;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 0 + hh); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(27,52,200,0.42)';
      for (let y = 0; y < H + 76; y += 76) {
        const ww = W * gp;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(0 + ww, y); ctx.stroke();
      }
      ctx.restore();

      // kicker + headline
      text('01 — ONE CLICK', 64, 96, { size: 13, fam: 'mono', spacing: 2.4, color: 'rgba(23,18,13,0.55)', alpha: T.reveal(f, 122, 134) * (1 - cl(f, 246, 260)) });
      const headA = T.reveal(f, 124, 140);
      if (headA > 0) {
        ctx.save(); ctx.globalAlpha *= headA;
        font(54, 'sans', 600, -0.4); ctx.fillStyle = C.ink; ctx.textAlign = 'left';
        ctx.fillText('Export the finished report', 64, 164 + 16 * (1 - headA));
        ctx.restore();
      }
      const subA = T.reveal(f, 132, 148);
      if (subA > 0) text('in one click.', 64, 226 + 12 * (1 - subA), { size: 46, fam: 'serif', color: C.red, alpha: subA });

      // the report sheet drops in (overshoot-bounce-in), squash on land
      const dropP = cl(f, 120, 140);
      const dyn = lerp(-680, 0, eOutBack(cl(f, 120, 140)));
      const landSquash = f >= 138 && f < 148 ? 1 - 0.035 * Math.sin(Math.PI * cl(f, 138, 148)) : 1;
      if (f < 264) {
        ctx.save(); ctx.translate(0, dyn); ctx.translate(SH.x + SH.w / 2, SH.y + SH.h / 2);
        ctx.scale(1, landSquash); ctx.translate(-(SH.x + SH.w / 2), -(SH.y + SH.h / 2));
        drawSheetWiped(f);
        ctx.restore();
      }

      // stamp + cursor + ripple always on top of the sheet
      stampExport(f);

      // press ripple
      if (f >= 180 && f < 200) {
        const rp = cl(f, 180, 198);
        const c = { x: SH.x + SH.w - 44 - 268 + 134, y: SH.y + SH.h - 44 - 76 + 38 };
        ctx.save(); ctx.globalAlpha = 0.6 * (1 - rp); ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(c.x, c.y, 10 + 120 * eOutCubic(rp), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      }

      // formats: fold (accordion-fold) then cards (stacked-card-reveal / fan)
      if (f >= 244) drawFoldAndCards(f);

      // cursor
      const curIn = cl(f, 164, 176);
      if (curIn > 0 && f < 352) {
        const btn = { x: SH.x + SH.w - 44 - 268 + 134, y: SH.y + SH.h - 44 - 76 + 38 };
        const path = [[164, 1180, 1180], [178, btn.x + 26, btn.y + 16], [196, btn.x + 20, btn.y + 10],
        [236, 900, 980], [268, 640, 900], [296, 320, 800], [304, 250, 742],
        [314, 540, 742], [324, 840, 742], [336, 870, 690], [352, 940, 580]];
        const c = cursorAt(f, path);
        // whip trail: 3 ghosts behind
        for (let k = 3; k >= 0; k--) {
          const cf = f - k * 1.2, cc = cursorAt(cf, path);
          drawCursor(cc.x, cc.y, cf, curIn * (k === 0 ? 1 : 0.16 / k), 1 + 0.02 * k);
        }
      }

      // shipped line during the card exit
      const shl = T.reveal(f, 336, 350);
      if (shl > 0 && f < 372) text('sent to 6 recipients  ·  0 clicks after this one', 64, 1010, { size: 14, fam: 'mono', spacing: 1.4, color: 'rgba(23,18,13,0.55)', alpha: shl });

      // result board (slide-over-cover)
      const boardP = eOutExpo(cl(f, 350, 366));
      const shrink = eInOutCubic(cl(f, 424, 448));
      if (boardP > 0) drawBoard(f, boardP, shrink);

      // closing line of the product scene (per-word-fade-in + underline-wipe)
      const lineA = T.reveal(f, 436, 452);
      if (lineA > 0 && f >= 424) {
        const words = ['Every', 'format.', 'Every', 'recipient.'];
        const sizes = { size: 60, fam: 'sans', weight: 700 };
        const tot = words.reduce((n2, wd) => n2 + measure(wd + ' ', sizes) + 6, 0);
        const fit = Math.min(1, 944 / tot);            // hard guard on the right margin
        ctx.save(); ctx.translate(64, 880); ctx.scale(fit, fit); ctx.translate(-64, -880);
        let lx = 64;
        words.forEach((wd, i) => {
          const a = T.reveal(f, 436 + i * 2.4, 448 + i * 2.4);
          const wWidth = measure(wd + ' ', sizes);
          text(wd, lx, 880 + 26 * (1 - a), Object.assign({ alpha: a }, sizes));
          lx += wWidth + 6;
        });
        const uw = 520 * T.reveal(f, 452, 470, eInOutCubic);
        ctx.fillStyle = C.red; ctx.fillRect(66, 908, uw, 8);
        ctx.restore();
      }
    });

  // incoming whip smear at the head of the scene
  if (f >= 120 && f < 128) {
    const p = 1 - cl(f, 120, 128);
    ctx.save(); ctx.globalAlpha = 0.75 * p; ctx.fillStyle = C.red; ctx.fillRect(-40, -10, 220 * p, H + 20); ctx.restore();
  }
  regMarks(f, 'rgba(23,18,13,0.16)');
  grain(0.10, f); vignette(0.14);
}

function drawFoldAndCards(f) {
  const { x, y, w, h } = SH;
  const foldP = eInOutCubic(cl(f, 238, 262));
  const cardP = cl(f, 262, 288);
  if (foldP < 1) {
    // three vertical panels folding toward their hinges
    const tw = w / 3;
    for (let i = 0; i < 3; i++) {
      const hinge = i === 0 ? x : i === 1 ? x + tw * 3 : x + tw * 3;
      const dir = i === 1 ? 1 : -1;
      const sc = Math.cos(foldP * Math.PI / 2 * 0.94);
      ctx.save();
      ctx.translate(x + tw * (i + 0.5) + (dir < 0 ? tw / 2 * foldP * 0.18 : -tw / 2 * foldP * 0.18), y + h / 2 - 30 * Math.sin(Math.PI * foldP));
      ctx.rotate(dir * 0.02 * foldP);
      ctx.scale(Math.max(0.04, sc), 1);
      ctx.translate(-(x + tw * (i + 0.5)), -(y + h / 2));
      shadow(50, 24, 'rgba(23,18,13,0.28)');
      ctx.fillStyle = C.sheet; ctx.fillRect(x, y, w, h); noShadow();
      ctx.strokeStyle = 'rgba(23,18,13,0.85)'; ctx.lineWidth = 1.4; ctx.strokeRect(x, y, w, h);
      ctx.save(); ctx.translate(x, y); sheetContent('paper', f); ctx.restore();
      // fold shading
      const g = ctx.createLinearGradient(x + tw * i, 0, x + tw * (i + 1), 0);
      g.addColorStop(0, `rgba(23,18,13,${0.10 + 0.16 * foldP})`); g.addColorStop(0.5, 'rgba(23,18,13,0)');
      g.addColorStop(1, `rgba(23,18,13,${0.10 + 0.16 * foldP})`);
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
  }
  if (cardP > 0) {
    const baseY = 720;
    const lblA = T.reveal(f, 288, 306);
    text('02  —  THREE FORMATS', 64, 372, { size: 16, fam: 'mono', spacing: 2.4, color: 'rgba(23,18,13,0.55)', alpha: lblA * (1 - cl(f, 352, 364)) });
    text('ONE REPORT  ·  THREE WAYS OUT', 64, 902, { size: 12, fam: 'mono', spacing: 2.6, color: 'rgba(23,18,13,0.45)', alpha: T.reveal(f, 300, 318) });
    CARDS.forEach((c, i) => {
      const t = eOutBack(cl(f, 264 + i * 4, 288 + i * 4));
      if (t <= 0) return;
      // exit: path-follow-motion up and out to the right
      const ex = eInOutCubic(cl(f, 330 + i * 5, 352 + i * 5));
      const cw = 300, chh = 232;
      let px = 540 + c.dx * t + ex * 520;
      let py = baseY + c.dy * t - ex * 900;
      const rot = c.rot * t + ex * 0.6;
      const sc = lerp(0.7, 1, t) * (1 - 0.25 * ex);
      ctx.save(); ctx.globalAlpha *= cl(t * 2.4, 0, 1) * (1 - cl(ex, 0.85, 1));
      // motion blur ghost on exit
      if (ex > 0.05) {
        ctx.globalAlpha *= 0.5; ctx.save(); ctx.translate(px, py - ex * 60); ctx.rotate(rot); ctx.scale(sc, sc);
        ctx.fillStyle = 'rgba(23,18,13,0.10)'; ctx.fillRect(-cw / 2, -chh / 2, cw, chh); ctx.restore();
        ctx.globalAlpha /= 0.5;
      }
      ctx.translate(px, py); ctx.rotate(rot); ctx.scale(sc, sc);
      shadow(40, 18, 'rgba(23,18,13,0.30)');
      ctx.fillStyle = C.sheet; ctx.fillRect(-cw / 2, -chh / 2, cw, chh); noShadow();
      ctx.strokeStyle = C.ink; ctx.lineWidth = 2; ctx.strokeRect(-cw / 2, -chh / 2, cw, chh);
      ctx.fillStyle = i === 1 ? C.ink : C.red; ctx.fillRect(-cw / 2, -chh / 2, cw, 8);
      text(c.id, -cw / 2 + 26, 34, { size: 62, fam: 'black', color: C.ink });
      text(c.sub, -cw / 2 + 26, 78, { size: 17, fam: 'mono', spacing: 1.4, color: 'rgba(23,18,13,0.62)' });
      // tick appears when the cursor passes (success green only)
      const tk = T.reveal(f, 306 + i * 10, 312 + i * 10, eOutBack);
      if (tk > 0) {
        ctx.save(); ctx.globalAlpha *= tk; ctx.strokeStyle = C.green; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(cw / 2 - 66, 68); ctx.lineTo(cw / 2 - 50, 84); ctx.lineTo(cw / 2 - 24, 50); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    });
  }
}

function drawBoard(f, boardP, shrink) {
  const { x, y, w } = SH;
  const bh = 330;
  const by = lerp(1120, 604, boardP);
  const sc = lerp(1, 0.26, shrink);
  const cx = lerp(540, 862, shrink), cy = lerp(by + bh / 2, 966, shrink);
  ctx.save();
  ctx.translate(cx, cy - (1 - boardP) * 260); ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(by + bh / 2));
  shadow(60, 26, 'rgba(23,18,13,0.28)');
  ctx.fillStyle = C.ink; ctx.fillRect(x, by, w, bh); noShadow();
  // inside
  const ix = x + 44, iy = by + 44;
  text('03  —  THE RESULT', ix, iy + 6, { size: 12, fam: 'mono', spacing: 2.4, color: 'rgba(237,230,216,0.55)' });
  const nA = T.reveal(f, 366, 376, eOutBack);
  ctx.save(); ctx.globalAlpha *= Math.min(1, nA);
  text('8 s', ix, iy + 148, { size: 150, fam: 'black', color: C.sheet, spacing: -6 });
  ctx.restore();
  const wasA = 1 - cl(f, 372, 384);
  if (wasA > 0) {
    const ow = measure('4 h 12 m', { size: 22, fam: 'mono', weight: 600 });
    text('4 h 12 m', x + w - 44, iy + 6, { size: 22, fam: 'mono', weight: 600, color: 'rgba(237,230,216,0.5)', align: 'right', alpha: wasA });
    ctx.save(); ctx.fillStyle = C.red; ctx.globalAlpha *= wasA;
    ctx.fillRect(x + w - 44 - ow - 2, iy - 2, ow + 4, 3); ctx.restore();
  }
  text('FROM CLOSE TO EXPORTED', ix, iy + 190, { size: 13, fam: 'mono', spacing: 2, color: 'rgba(237,230,216,0.62)' });
  const lines = [['128', 'sites'], ['2.4M', 'rows'], ['3', 'formats']];
  lines.forEach(([v, l], i) => {
    const a = T.stagger(f, i, 376, 4, 12);
    const bx = x + w - 380 + i * 118;
    text(v, bx, iy + 96 + 18 * (1 - a), { size: 40, fam: 'sans', weight: 700, color: C.sheet, alpha: a });
    text(l, bx, iy + 124, { size: 12, fam: 'mono', spacing: 1.8, color: 'rgba(237,230,216,0.55)', alpha: a });
  });
  // progress line snapping to full
  const pw = (w - 88) * T.reveal(f, 372, 404, eOutExpo);
  ctx.fillStyle = 'rgba(237,230,216,0.18)'; ctx.fillRect(x + 44, by + bh - 62, w - 88, 3);
  ctx.fillStyle = C.red; ctx.fillRect(x + 44, by + bh - 62, pw, 3);
  text('AUDIT TRAIL ATTACHED', x + w - 44, by + bh - 40, { size: 12, fam: 'mono', spacing: 2, color: 'rgba(237,230,216,0.55)', align: 'right' });
  ctx.restore();
  // payoff burst right at 420 (impact + halftone)
  const b = cl(f, 420, 452);
  if (b > 0 && b < 1) {
    ctx.save(); ctx.globalAlpha = 0.35 * (1 - b);
    halftone(f, 0, 0, W, H, { step: 18, rMax: 6, color: C.red, alpha: 0.8, fn: (u, v) => Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.5) * (1.2 + (1 - b) * 3)) });
    ctx.restore();
  }
}

/* ============================================================== SCENE 3 ===
   CLOSING. 480–599: the promise, the mark, the address.                     */
function sceneClose(f) {
  const z = lerp(1.0, 1.03, eInOutCubic(cl(f, 480, 600)));
  const v = weave(f, 0.9);
  withCam(z, v.r, v.tx, v.ty, () => {
    ctx.fillStyle = C.paper; ctx.fillRect(-200, -200, W + 400, H + 400);
    // marquee rows behind, alternating directions (parallax-marquee-rows)
    ctx.save();
    const rowDefs = [
      { y: 96, size: 52, dir: 1, sp: 1.5, txt: 'MONTH-END CLOSE  ·  RECONCILIATION  ·  AUDIT TRAIL  ·  ', a: 0.075 },
      { y: 1048, size: 74, dir: -1, sp: 2.2, txt: 'PDF  ·  XLSX  ·  LINK  ·  SENT TO 6  ·  ONE CLICK  ·  ', a: 0.07 }
    ];
    for (const r of rowDefs) {
      ctx.globalAlpha = r.a; font(r.size, 'black');
      const tw = ctx.measureText(r.txt).width;
      let sx = -((f * r.sp) % tw) * r.dir;
      if (r.dir < 0) sx = -tw + ((f * r.sp) % tw);
      ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      for (let k = 0; k < 4; k++) ctx.fillText(r.txt, sx + k * tw, r.y);
    }
    ctx.restore();

    // stacked-line-build: three lines rise out of their own masks
    const lines = [
      { s: 'Reports', y: 336, a: 480 },
      { s: 'that ship', y: 470, a: 488 },
      { s: 'themselves.', y: 604, a: 496 }
    ];
    lines.forEach((ln, i) => {
      const p = T.reveal(f, ln.a, ln.a + 18, eOutExpo);
      if (p <= 0) return;
      ctx.save();
      ctx.beginPath(); ctx.rect(48, ln.y - 128, 1000, 148); ctx.clip();
      const sp = T.tracking(f, ln.a, ln.a + 26, 10, -3);
      font(132, 'black', 400, sp);
      ctx.fillStyle = C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(ln.s, 64, ln.y + 116 * (1 - p));
      ctx.restore();
    });

    // red rule + mark + wordmark (logo-mask-wipe-reveal)
    const rule = T.reveal(f, 502, 530, eInOutCubic);
    if (rule > 0) { ctx.save(); ctx.fillStyle = C.red; ctx.fillRect(64, 660, 700 * rule, 7); ctx.restore(); }

    const logoP = T.reveal(f, 506, 534, eInOutCubic);
    if (logoP > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(64, 700, 96 * logoP, 96); ctx.clip();
      ctx.fillStyle = C.red; ctx.fillRect(64, 700, 96, 96);
      ctx.fillStyle = C.sheet; ctx.fillRect(82, 718, 60, 60);
      ctx.strokeStyle = C.red; ctx.lineWidth = 5; ctx.strokeRect(96, 726, 46, 52);
      ctx.save(); ctx.translate(64, 700); ctx.rotate(0.02 * Math.sin(f * 0.05));
      ctx.restore(); ctx.restore();
    }
    const wmP = T.reveal(f, 512, 546, eOutExpo);
    if (wmP > 0) {
      const sp = T.tracking(f, 512, 552, 16, 0);
      text('LEDGERLINE', 64 + 120, 762, { size: 42, fam: 'sans', weight: 700, spacing: sp, alpha: wmP });
      text('128 SITES  ·  2.4M ROWS  ·  8 S  ·  3 FORMATS', 64 + 122, 792, { size: 13, fam: 'mono', spacing: 2.4, color: 'rgba(23,18,13,0.62)', alpha: T.reveal(f, 524, 542) });
    }

    // CTA typewriter (typewriter-reveal) + blinking cursor
    // CTA as a live button (typewriter-reveal inside it) + blinking caret
    const cta = 'ledgerline.app  —  first export free';
    const bp = T.reveal(f, 526, 542, eOutExpo);
    if (bp > 0) {
      const bw2 = 700, bh2 = 82, by2 = 846;
      ctx.save(); ctx.globalAlpha *= Math.min(1, bp);
      ctx.translate(414, by2 + bh2 / 2); ctx.scale(lerp(0.94, 1, bp), lerp(0.94, 1, bp)); ctx.translate(-414, -(by2 + bh2 / 2));
      shadow(20, 10, 'rgba(23,18,13,0.22)');
      ctx.fillStyle = C.red; rrect(64, by2, bw2, bh2, 4); ctx.fill(); noShadow();
      const tp = T.reveal(f, 530, 568, t => t);
      const shown = cta.slice(0, Math.round(cta.length * tp));
      text(shown, 64 + 30, by2 + 52, { size: 30, fam: 'mono', color: C.sheet });
      const blinkOn = f >= 530 && (Math.floor((f - 530) / 15) % 2 === 0);
      if (blinkOn && tp < 1) {
        const cw = measure(shown, { size: 30, fam: 'mono' });
        ctx.save(); ctx.fillStyle = C.sheet; ctx.fillRect(96 + cw, by2 + 26, 3, 32); ctx.restore();
      }
      text('↗', 64 + bw2 - 34, by2 + 54, { size: 30, fam: 'mono', color: C.sheet, align: 'right' });
      ctx.restore();
    }
    text('MUSIC “RETRO SYNTHS” — HOLIZNACC0 · CC0', 64, 966, { size: 11, fam: 'mono', spacing: 2.2, color: 'rgba(23,18,13,0.40)', alpha: T.reveal(f, 538, 556) });

    // slow drift of a sheet out of the frame, bottom right
    const sp2 = cl(f, 480, 600);
    ctx.save(); ctx.globalAlpha = 0.9;
    ctx.translate(lerp(1120, 980, eOutCubic(sp2)), lerp(1180, 1010, eOutCubic(sp2))); ctx.rotate(-0.22 + 0.03 * sp2);
    shadow(40, 18, 'rgba(23,18,13,0.20)');
    ctx.fillStyle = C.sheet; ctx.fillRect(-150, -110, 300, 220); noShadow();
    ctx.strokeStyle = 'rgba(23,18,13,0.8)'; ctx.lineWidth = 1.6; ctx.strokeRect(-150, -110, 300, 220);
    ctx.fillStyle = C.red; ctx.fillRect(-150, -110, 96, 6);
    ctx.restore();
  });
  // incoming whip smear
  if (f >= 480 && f < 488) {
    const p = 1 - cl(f, 480, 488);
    ctx.save(); ctx.globalAlpha = 0.75 * p; ctx.fillStyle = C.ink; ctx.fillRect(-40, -10, 200 * p, H + 20); ctx.restore();
  }
  regMarks(f, 'rgba(23,18,13,0.18)');
  grain(0.10, f); vignette(0.13);
}

/* ------------------------------------------------------------------ frame */
function render(t) {
  const f = Math.max(0, Math.min(TOTAL - 1, Math.round(t * FPS)));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.filter = 'none';
  ctx.clearRect(0, 0, W, H);
  if (f < 120) sceneMess(f);
  else if (f < 480) sceneClick(f);
  else sceneClose(f);
}

window.DUR = DUR;
window.render = render;
document.fonts.ready.then(() => { render(0); window.READY = true; });
