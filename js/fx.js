'use strict';
// 이펙트: 폭발(섬광 → 불덩이 → 충격파 → 파편 → 연기), 격추된 기체의 추락, 점수 텍스트.
// (fx, ctx, rand, clamp, text, drawSprite, tint 등은 다른 스크립트의 전역을 호출 시점에 참조)
function makeGlow(rgb, mid) {
  const [c, g] = mkCanvas(64, 64, 1);
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${rgb},1)`);
  gr.addColorStop(0.45, `rgba(${rgb},${mid})`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return c;
}
const GLOW = {
  white: makeGlow('255,255,255', 0.85),
  yellow: makeGlow('255,225,120', 0.85),
  orange: makeGlow('255,140,40', 0.8),
  red: makeGlow('205,55,20', 0.7),
  smoke: makeGlow('38,38,44', 0.55),
};
function glowAt(s, x, y, r) { ctx.drawImage(s, x - r, y - r, r * 2, r * 2); }

const burntCache = new Map();
function burntOf(s) {
  let c = burntCache.get(s);
  if (!c) { c = tint(s, '#1a0f0a'); burntCache.set(s, c); }
  return c;
}
const TAU = Math.PI * 2;
const SPARK_COLORS = ['#fff6c8', '#ffd27a', '#ff9a3d', '#ff6a2a'];

function addShake(n) { if (n > shake) shake = n; }

// size: 소형기 10, 폭격기 20, 보스 30 정도
function explode(x, y, size) {
  if (fx.length > 900) return;
  fx.push({ k: 'flash', x, y, r: size * 2.8, t: 0, max: 6 });
  fx.push({ k: 'ring', x, y, r: size * 2.6, t: 0, max: 20 });
  const nf = 4 + Math.floor(size / 3);
  for (let i = 0; i < nf; i++) {
    const a = rand(0, TAU), d = rand(0, size * 0.55), s = rand(0.15, 0.7);
    fx.push({
      k: 'fire', x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      r: size * rand(0.55, 1.05), t: -Math.floor(rand(0, 7)), max: Math.floor(rand(16, 30)),
    });
  }
  const ns = 2 + Math.floor(size / 5);
  for (let i = 0; i < ns; i++) fx.push({
    k: 'smoke', x: x + rand(-size, size) * 0.4, y: y + rand(-size, size) * 0.4,
    vx: rand(-0.2, 0.2), vy: rand(0.3, 0.8), r: size * rand(0.7, 1.2),
    t: -Math.floor(rand(6, 14)), max: Math.floor(rand(45, 80)),
  });
  if (size >= 18) { // 큰 폭발: 불꼬리를 끌며 날아가는 파편
    for (let i = 0; i < size / 4; i++) {
      const a = rand(0, TAU), s = rand(1.2, 3.2);
      fx.push({ k: 'ember', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, max: Math.floor(rand(22, 40)) });
    }
  }
  const nd = Math.floor(size * 1.6);
  for (let i = 0; i < nd; i++) {
    const a = rand(0, TAU), s = rand(1.5, 2.5 + size * 0.22);
    fx.push({
      k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, max: rand(10, 30),
      c: SPARK_COLORS[Math.floor(rand(0, 4))], streak: true,
    });
  }
}
function spark(x, y, c, s) {
  const a = rand(0, TAU);
  fx.push({ k: 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: 0, max: rand(15, 30), c });
}
function addText(x, y, s) { fx.push({ k: 'text', x: clamp(x, 30, W - 30), y, s, t: 0, max: 60 }); }
// 불타며 빙글빙글 추락하는 기체
function addWreck(spr, x, y, vx, vy, ang, spin, max, onEnd) {
  fx.push({ k: 'wreck', spr, x, y, vx, vy, ang, spin, t: 0, max, onEnd });
}
function firePuff(x, y, r) {
  fx.push({ k: 'fire', x, y, vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.3), r, t: 0, max: Math.floor(rand(12, 20)) });
}
function smokePuff(x, y, r) {
  fx.push({ k: 'smoke', x, y, vx: rand(-0.15, 0.15), vy: rand(0.3, 0.7), r, t: 0, max: Math.floor(rand(30, 55)) });
}

function updateFx() {
  const n = fx.length; // 도중에 추가되는 것은 다음 프레임부터
  for (let i = 0; i < n; i++) {
    const f = fx[i];
    f.t++;
    if (f.t <= 0) continue;
    switch (f.k) {
      case 'spark': f.x += f.vx; f.y += f.vy; f.vx *= 0.93; f.vy *= 0.93; break;
      case 'fire': f.x += f.vx; f.y += f.vy + 0.15; f.vx *= 0.9; f.vy *= 0.9; break;
      case 'smoke': f.x += f.vx; f.y += f.vy; break;
      case 'text': f.y -= 0.4; break;
      case 'ember':
        f.x += f.vx; f.y += f.vy; f.vx *= 0.96; f.vy *= 0.96;
        if (f.t % 2 === 0) firePuff(f.x, f.y, rand(2.5, 4.5));
        break;
      case 'wreck':
        f.x += f.vx; f.y += f.vy; f.ang += f.spin;
        if (f.t % 3 === 0) { firePuff(f.x, f.y, rand(4, 7)); smokePuff(f.x, f.y, rand(5, 9)); }
        if (f.t === f.max - 1 && f.onEnd) f.onEnd(f);
        else if (f.t === f.max - 1) { // 바다에 추락: 물보라
          fx.push({ k: 'ring', x: f.x, y: f.y, r: 13, t: 0, max: 22, c: '#e8f6ff' });
          for (let j = 0; j < 7; j++) spark(f.x, f.y, '#e8f6ff', rand(0.6, 1.8));
        }
        break;
    }
  }
  fx = fx.filter(f => f.t < f.max);
}

function drawFx() {
  for (const f of fx) { // 추락 기체
    if (f.k !== 'wreck') continue;
    const p = f.t / f.max, sc = 1 - 0.5 * p;
    ctx.globalAlpha = 1 - p * 0.3;
    drawSprite(f.spr, f.x, f.y, f.ang, 1, sc);
    ctx.globalAlpha = 0.35 + 0.45 * p;
    drawSprite(burntOf(f.spr), f.x, f.y, f.ang, 1, sc);
  }
  for (const f of fx) { // 연기
    if (f.k !== 'smoke' || f.t <= 0) continue;
    const p = f.t / f.max;
    ctx.globalAlpha = 0.55 * (1 - p) * Math.min(1, p * 6);
    glowAt(GLOW.smoke, f.x, f.y, f.r * (0.6 + p * 1.2));
  }
  ctx.globalCompositeOperation = 'lighter'; // 불빛은 가산 합성으로 밝게
  for (const f of fx) {
    if (f.t <= 0) continue;
    const p = f.t / f.max;
    if (f.k === 'fire') {
      const s = p < 0.2 ? GLOW.white : p < 0.45 ? GLOW.yellow : p < 0.75 ? GLOW.orange : GLOW.red;
      ctx.globalAlpha = p < 0.7 ? 1 : (1 - p) / 0.3;
      const grow = Math.sin(Math.min(1, p * 1.7) * Math.PI / 2);
      glowAt(s, f.x, f.y, f.r * (0.45 + grow) * (p > 0.6 ? 1 - (p - 0.6) * 0.9 : 1));
    } else if (f.k === 'ember') {
      ctx.globalAlpha = 1 - p * 0.5;
      glowAt(GLOW.yellow, f.x, f.y, 3.2);
    } else if (f.k === 'flash') {
      ctx.globalAlpha = 1 - p;
      glowAt(GLOW.white, f.x, f.y, f.r * (0.6 + p * 0.6));
    } else if (f.k === 'spark') {
      ctx.globalAlpha = 1 - p;
      if (f.streak) {
        ctx.strokeStyle = f.c; ctx.lineWidth = 1.1;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.lineTo(f.x - f.vx * 2.4, f.y - f.vy * 2.4); ctx.stroke();
      } else {
        ctx.fillStyle = f.c; ctx.fillRect(f.x - 1, f.y - 1, 2, 2);
      }
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  for (const f of fx) {
    if (f.t <= 0) continue; // 지연 시작 대기 중
    const p = f.t / f.max;
    if (f.k === 'ring') {
      const e = 1 - (1 - p) * (1 - p);
      ctx.globalAlpha = (1 - p) * 0.8;
      ctx.strokeStyle = f.c || '#fff2c8';
      ctx.lineWidth = 2.6 * (1 - p) + 0.3;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r * (0.15 + 0.85 * e), 0, TAU); ctx.stroke();
    } else if (f.k === 'text') {
      ctx.globalAlpha = Math.min(1, (1 - p) * 2);
      text(f.s, f.x, f.y, 8, '#ffd27a');
    }
  }
  ctx.globalAlpha = 1;
}
