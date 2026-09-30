/* Layer-safe overlap transitions: immutable previous image + live incoming image.
   New entries opt into source-over composition; legacy region-replacement stays intact. */
(() => {
'use strict';
const register = (id, name, tags, duration, incoming, draw) => J.register('trans', id, {
  name, tags, w: 0.8, dur: duration,
  overlap: { minDuration: 1, incoming },
  plan: rng => ({ direction: rng.pick([-1, 1]), phase: rng.range(0, J.TAU) }),
  draw(ctx, A, B, p, I) {
    ctx.save();
    try {
      // Explicitly own clearing; transparent holes must not erase the other image.
      ctx.clearRect(0, 0, I.cw, I.ch);
      if (p <= 0) { ctx.drawImage(A, 0, 0); return; }
      if (p >= 1) { ctx.drawImage(B, 0, 0); return; }
      const q = J.E.inOutCubic(p);
      draw(ctx, A, B, p, q, I, I.P || {});
    } finally { ctx.restore(); }
  },
}, 'kinetic');
const incoming = (ctx, B, p) => { ctx.globalAlpha = J.smooth(0, 0.45, p); ctx.drawImage(B, 0, 0); ctx.globalAlpha = 1; };
register('carryRetreat', '余韻を縮小', ['calm', 'emotional', 'editorial', 'graphic'], 1.1, 'keep', (ctx, A, B, p, q, I, P) => {
  const s = 1 - q * 0.3, dir = P.direction || -1;
  ctx.save(); ctx.globalAlpha = 1 - J.smooth(0.05, 0.95, p);
  ctx.translate(I.cw / 2, I.ch / 2 + dir * I.ch * 0.17 * q); ctx.scale(s, s);
  ctx.drawImage(A, -I.cw / 2, -I.ch / 2); ctx.restore();
  incoming(ctx, B, p);
});
register('carrySlash', '斜めに断ち切る', ['graphic', 'pop', 'glitch'], 0.8, 'replace', (ctx, A, B, p, q, I, P) => {
  incoming(ctx, B, p);
  const { cw:w, ch:h } = I, dir = P.direction || 1;
  // Two complementary diagonal polygons, moved apart along the cut normal.
  for (const side of [-1, 1]) {
    ctx.save(); ctx.globalAlpha = 1 - J.smooth(0.4, 1, p);
    ctx.translate(-side * dir * w * 0.16 * q, side * h * 0.4 * q);
    ctx.beginPath();
    const left = h * (dir > 0 ? 0.28 : 0.72), right = h - left;
    if (side < 0) { ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, right); ctx.lineTo(0, left); }
    else { ctx.moveTo(0, left); ctx.lineTo(w, right); ctx.lineTo(w, h); ctx.lineTo(0, h); }
    ctx.closePath(); ctx.clip(); ctx.drawImage(A, 0, 0); ctx.restore();
  }
});
register('carryShatter', '放射状に砕ける', ['graphic', 'pop', 'glitch', 'emotional'], 0.9, 'replace', (ctx, A, B, p, q, I, P) => {
  incoming(ctx, B, p);
  const { cw:w, ch:h } = I, cx = w * 0.5, cy = h * 0.5, radius = Math.hypot(w,h), n = 11, phase = P.phase || 0;
  const angles = Array.from({length:n+1}, (_,i) => phase + i * J.TAU / n + (i && i<n ? Math.sin(i*7.31+phase)*0.13 : 0));
  for(let i=0;i<n;i++) {
    const a=angles[i], b=angles[i+1], mid=(a+b)/2;
    ctx.save(); ctx.globalAlpha = 1-J.smooth(0.25,1,p);
    ctx.translate(cx+Math.cos(mid)*w*0.32*q,cy+Math.sin(mid)*h*0.4*q);
    ctx.rotate(Math.sin(i*3.7+phase)*0.16*q); ctx.translate(-cx,-cy);
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(a)*radius,cy+Math.sin(a)*radius); ctx.lineTo(cx+Math.cos(b)*radius,cy+Math.sin(b)*radius); ctx.closePath(); ctx.clip();
    ctx.drawImage(A,0,0); ctx.restore();
  }
});
J.reviewTransitions = ['carryRetreat', 'carrySlash', 'carryShatter'];
})();
