'use strict';
// 배경: 스테이지마다 다른 테마(한낮 / 노을 / 폭풍우 치는 밤 / 빙해).
// 바다(얼룩 + 물결 2겹 + 반짝임), 섬 또는 유빙, 2층 구름, 날씨(비·번개·눈), 비네트.
// 테마를 바꿀 때 오프스크린 캔버스에 미리 그려 두고 스크롤만 한다.
// (W, H, rand, ctx, frame, tint, Sound 는 다른 스크립트의 전역을 호출 시점에 참조)
const SEA_SPEED = 0.5;
const CLOUD_DAY = ['255,255,255', '240,246,252', '225,235,248', '110,140,180'];
const THEMES = [
  { name: '한낮의 바다', base: '#16527f', light: '46,132,178', dark: '7,38,78',
    crestHi: '196,230,248', crestLo: '4,30,66', crestA: 1, glints: 45, glintCol: '#fff',
    cloud: CLOUD_DAY, cloudA: 1, clouds: [4, 2], shadowCol: '#04203a',
    vig: '0,12,32', vigA: 0.5, sun: '255,236,190', sunA: 0.13,
    land: 'tropic', landTint: null, landEvery: [420, 900] },
  { name: '노을 지는 바다', base: '#4a3a6b', light: '225,120,85', dark: '24,16,52',
    crestHi: '255,205,160', crestLo: '30,14,50', crestA: 1, glints: 90, glintCol: '#ffe0a8',
    cloud: ['255,214,170', '250,160,130', '200,120,150', '90,50,110'], cloudA: 1, clouds: [4, 3], shadowCol: '#1a0a2a',
    vig: '30,6,30', vigA: 0.55, sun: '255,140,60', sunA: 0.26,
    land: 'tropic', landTint: 'rgba(70,25,60,0.5)', landEvery: [420, 900] },
  { name: '폭풍우 치는 밤', base: '#0c1c33', light: '36,70,105', dark: '2,6,16',
    crestHi: '170,195,220', crestLo: '0,4,12', crestA: 0.8, glints: 12, glintCol: '#cfe0ff',
    cloud: ['150,160,178', '105,115,135', '80,90,110', '15,20,32'], cloudA: 1.25, clouds: [6, 4], shadowCol: '#000510',
    vig: '0,2,10', vigA: 0.7, sun: '120,150,200', sunA: 0.05,
    land: 'tropic', landTint: 'rgba(5,12,30,0.68)', landEvery: [600, 1200], rain: true },
  { name: '얼어붙은 바다', base: '#2b6a85', light: '130,200,220', dark: '12,48,72',
    crestHi: '235,248,255', crestLo: '10,45,70', crestA: 0.9, glints: 35, glintCol: '#fff',
    cloud: CLOUD_DAY, cloudA: 0.8, clouds: [3, 2], shadowCol: '#0a3048',
    vig: '0,20,40', vigA: 0.4, sun: '220,240,255', sunA: 0.12,
    land: 'ice', landTint: null, landEvery: [110, 260], snow: true },
];
const bg = {
  theme: null, deep: null, crestA: null, crestB: null, vignette: null,
  cloudSprites: [], cloudShadows: [],
  islands: [], low: [], high: [], glints: [], rain: [], snow: [],
  scroll: 0, islandTimer: 420, lightT: 200, bolt: 0,
};

function mkCanvas(lw, lh, res) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(lw * res); c.height = Math.ceil(lh * res);
  c.lw = lw; c.lh = lh;
  const g = c.getContext('2d');
  g.scale(res, res);
  return [c, g];
}
function unionCircles(g, blobs, grow, ox = 0, oy = 0) {
  g.beginPath();
  for (const b of blobs) {
    const r = b.r + grow;
    if (r <= 0.5) continue;
    g.moveTo(b.x + ox + r, b.y + oy);
    g.arc(b.x + ox, b.y + oy, r, 0, Math.PI * 2);
  }
  g.fill();
}
function dot(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }

// 깊은 물/얕은 물 얼룩 (세로로 이어지는 타일)
function makeDeep(t) {
  const [c, g] = mkCanvas(W, H, 2);
  g.fillStyle = t.base; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 46; i++) {
    const x = rand(0, W), y = rand(0, H), r = rand(28, 80), a = rand(0.10, 0.24);
    const col = Math.random() < 0.5 ? t.light : t.dark;
    for (const oy of [-H, 0, H]) {
      const gr = g.createRadialGradient(x, y + oy, 0, x, y + oy, r);
      gr.addColorStop(0, `rgba(${col},${a})`);
      gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr;
      g.fillRect(x - r, y + oy - r, r * 2, r * 2);
    }
  }
  return c;
}
// 물결 마루: 밝은 선 + 바로 아래 어두운 선으로 입체감
function makeCrests(n, t) {
  const [c, g] = mkCanvas(W, H, 2);
  g.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = rand(-5, W + 5), y = rand(0, H), l = rand(3, 13), bend = rand(0.6, 2), a = rand(0.10, 0.34) * t.crestA;
    g.lineWidth = rand(0.5, 0.9);
    for (const oy of [-H, 0, H]) {
      const yy = y + oy;
      g.strokeStyle = `rgba(${t.crestLo},${a * 0.9})`;
      g.beginPath(); g.moveTo(x - l / 2, yy + 1.3); g.quadraticCurveTo(x, yy + 1.3 - bend, x + l / 2, yy + 1.3); g.stroke();
      g.strokeStyle = `rgba(${t.crestHi},${a})`;
      g.beginPath(); g.moveTo(x - l / 2, yy); g.quadraticCurveTo(x, yy - bend, x + l / 2, yy); g.stroke();
    }
  }
  return c;
}

// 섬: 산호초 얕은 물 → 파도 거품 → 모래사장 → 풀 → 정글 → 나무
function makeIslandSprite(t) {
  const S = 130, [c, g] = mkCanvas(S, S, 3);
  const n = 4 + Math.floor(rand(0, 5)), blobs = [];
  blobs.push({ x: S / 2 + rand(-10, 10), y: S / 2 + rand(-10, 10), r: rand(12, 19) });
  for (let i = 1; i < n; i++) {
    const p = blobs[Math.floor(rand(0, blobs.length))], a = rand(0, Math.PI * 2), d = p.r * rand(0.7, 1.1);
    blobs.push({
      x: Math.min(S / 2 + 27, Math.max(S / 2 - 27, p.x + Math.cos(a) * d)),
      y: Math.min(S / 2 + 27, Math.max(S / 2 - 27, p.y + Math.sin(a) * d)),
      r: rand(8, 17),
    });
  }
  g.fillStyle = 'rgba(70,180,200,0.18)'; unionCircles(g, blobs, 11);
  g.fillStyle = 'rgba(84,200,205,0.30)'; unionCircles(g, blobs, 8);
  g.fillStyle = 'rgba(140,225,215,0.50)'; unionCircles(g, blobs, 5.2);
  g.fillStyle = 'rgba(255,255,255,0.75)'; unionCircles(g, blobs, 3);
  g.fillStyle = '#c9b678'; unionCircles(g, blobs, 2.2);
  g.fillStyle = '#ecdfa8'; unionCircles(g, blobs, 1.4, -0.3, -0.3);
  g.fillStyle = '#2f6a2c'; unionCircles(g, blobs, -1.2, 0.8, 1);
  g.fillStyle = '#5c9f42'; unionCircles(g, blobs, -1.6);
  g.fillStyle = '#3f7f33'; unionCircles(g, blobs, -4.5);

  // 큰 섬에는 가끔 활주로
  const big = blobs.reduce((a, b) => (b.r > a.r ? b : a));
  if (big.r > 15 && Math.random() < 0.5) {
    const len = (big.r - 4) * 2;
    g.save(); g.translate(big.x, big.y); g.rotate(rand(0, Math.PI));
    g.fillStyle = '#bfae82'; g.fillRect(-len / 2, -1.7, len, 3.4);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    for (let x = -len / 2 + 1.5; x < len / 2 - 2; x += 3.2) g.fillRect(x, -0.18, 1.6, 0.36);
    g.restore();
  }
  // 나무 (그림자 + 몸통 + 하이라이트)
  for (let i = 0; i < 26 + n * 9; i++) {
    const b = blobs[Math.floor(rand(0, n))], a = rand(0, Math.PI * 2), d = rand(0, Math.max(0, b.r - 5.5));
    const tx = b.x + Math.cos(a) * d, ty = b.y + Math.sin(a) * d, tr = rand(1.3, 2.6);
    g.fillStyle = 'rgba(12,40,18,0.55)'; dot(g, tx + 0.9, ty + 1.1, tr);
    g.fillStyle = '#2c6628'; dot(g, tx, ty, tr);
    g.fillStyle = '#62ad4c'; dot(g, tx - tr * 0.3, ty - tr * 0.35, tr * 0.5);
  }
  if (t.landTint) { // 노을·밤에는 섬도 어둡게 물든다
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = t.landTint; g.fillRect(0, 0, S, S);
  }
  return c;
}
// 유빙: 들쭉날쭉한 얼음판 여러 장 (물속 비침 → 옆면 그늘 → 윗면 → 금)
function makeIceSprite() {
  const S = 130, [c, g] = mkCanvas(S, S, 3);
  const n = 1 + Math.floor(rand(0, 4));
  for (let k = 0; k < n; k++) {
    const cx = S / 2 + rand(-26, 26), cy = S / 2 + rand(-26, 26), R = rand(9, 24);
    const nv = 7 + Math.floor(rand(0, 4)), pts = [];
    for (let i = 0; i < nv; i++) {
      const a = i / nv * Math.PI * 2 + rand(-0.2, 0.2), r = R * rand(0.7, 1.08);
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    const poly = (sc, ox, oy) => {
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(cx + x * sc + ox, cy + y * sc + oy) : g.moveTo(cx + x * sc + ox, cy + y * sc + oy)));
      g.closePath(); g.fill();
    };
    g.fillStyle = 'rgba(150,220,235,0.28)'; poly(1.2, 0, 0);
    g.fillStyle = '#6fa8c2'; poly(1, 1.3, 2);
    g.fillStyle = '#e6f3f9'; poly(1, 0, 0);
    g.fillStyle = '#ffffff'; poly(0.7, -0.8, -0.9);
    g.strokeStyle = 'rgba(110,165,195,0.65)'; g.lineWidth = 0.35;
    for (let i = 0; i < 3; i++) {
      const a = rand(0, Math.PI * 2), r = R * 0.6;
      g.beginPath(); g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      g.lineTo(cx + rand(-3, 3), cy + rand(-3, 3));
      g.lineTo(cx + Math.cos(a + rand(2, 4)) * r * 0.8, cy + Math.sin(a + rand(2, 4)) * r * 0.8);
      g.stroke();
    }
  }
  return c;
}
const makeLand = t => (t.land === 'ice' ? makeIceSprite() : makeIslandSprite(t));

// 구름: 부드러운 방사형 덩어리를 겹치고 아래쪽에 음영
function makeCloudSprite(t) {
  const CW = 150, CH = 90, [c, g] = mkCanvas(CW, CH, 2), col = t.cloud;
  const n = 6 + Math.floor(rand(0, 6));
  for (let i = 0; i < n; i++) {
    const x = CW / 2 + rand(-42, 42), y = CH / 2 + rand(-14, 14);
    const r = rand(12, 24) * (1 - Math.abs(x - CW / 2) / 90);
    const gr = g.createRadialGradient(x - r * 0.15, y - r * 0.25, r * 0.1, x, y, r);
    gr.addColorStop(0, `rgba(${col[0]},0.95)`);
    gr.addColorStop(0.55, `rgba(${col[1]},0.75)`);
    gr.addColorStop(1, `rgba(${col[2]},0)`);
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  g.globalCompositeOperation = 'source-atop';
  const sh = g.createLinearGradient(0, CH * 0.3, 0, CH * 0.85);
  sh.addColorStop(0, `rgba(${col[3]},0)`);
  sh.addColorStop(1, `rgba(${col[3]},0.45)`);
  g.fillStyle = sh; g.fillRect(0, 0, CW, CH);
  return c;
}
function makeVignette(t) {
  const [c, g] = mkCanvas(W, H, 1);
  let gr = g.createRadialGradient(W / 2, H / 2, H * 0.32, W / 2, H / 2, H * 0.72);
  gr.addColorStop(0, `rgba(${t.vig},0)`);
  gr.addColorStop(1, `rgba(${t.vig},${t.vigA})`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  gr = g.createLinearGradient(0, 0, W * 0.8, H * 0.6); // 왼쪽 위에서 드는 빛
  gr.addColorStop(0, `rgba(${t.sun},${t.sunA})`);
  gr.addColorStop(1, `rgba(${t.sun},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  return c;
}

function newCloud(high, y) {
  const sc = high ? rand(1.4, 2) : rand(0.7, 1.1);
  return {
    i: Math.floor(rand(0, bg.cloudSprites.length)), x: rand(-20, W + 20), sc,
    y: y === undefined ? -50 * sc : y,
    v: high ? rand(1.7, 2.3) : rand(0.75, 1),
    a: high ? rand(0.2, 0.3) : rand(0.5, 0.7),
  };
}
// 테마 교체: 텍스처를 전부 새로 굽는다
function setTheme(i) {
  const t = THEMES[i % THEMES.length];
  bg.theme = t;
  bg.deep = makeDeep(t);
  bg.crestA = makeCrests(230, t);
  bg.crestB = makeCrests(150, t);
  bg.vignette = makeVignette(t);
  bg.cloudSprites = []; bg.cloudShadows = [];
  for (let k = 0; k < 5; k++) {
    const c = makeCloudSprite(t);
    bg.cloudSprites.push(c);
    bg.cloudShadows.push(tint(c, t.shadowCol));
  }
  bg.low = []; bg.high = [];
  for (let k = 0; k < t.clouds[0]; k++) bg.low.push(newCloud(false, rand(-40, H)));
  for (let k = 0; k < t.clouds[1]; k++) bg.high.push(newCloud(true, rand(-100, H)));
  bg.glints = [];
  for (let k = 0; k < t.glints; k++) bg.glints.push({ x: rand(0, W), y: rand(0, H), ph: rand(0, 6.28), sp: rand(0.05, 0.13) });
  bg.islands = []; bg.islandTimer = 100;
  bg.rain = []; bg.snow = []; bg.bolt = 0; bg.lightT = 200;
  if (t.rain) for (let k = 0; k < 70; k++) bg.rain.push({ x: rand(0, W + 80), y: rand(0, H), l: rand(6, 13), v: rand(7, 11) });
  if (t.snow) for (let k = 0; k < 60; k++) bg.snow.push({ x: rand(0, W), y: rand(0, H), r: rand(0.5, 1.3), v: rand(0.8, 1.9), ph: rand(0, 6.28) });
}
function initBg() {
  setTheme(0);
  bg.islands.push({ c: makeLand(bg.theme), x: rand(150, 200), y: 190 });
}
function updateBg() {
  const t = bg.theme;
  bg.scroll += SEA_SPEED;
  for (const gl of bg.glints) { gl.y += SEA_SPEED; if (gl.y > H + 2) { gl.y = -2; gl.x = rand(0, W); } }
  for (const is of bg.islands) is.y += SEA_SPEED;
  bg.islands = bg.islands.filter(i => i.y < H + 70);
  if (--bg.islandTimer <= 0) {
    bg.islands.push({ c: makeLand(t), x: rand(10, W - 10), y: -70 });
    bg.islandTimer = rand(t.landEvery[0], t.landEvery[1]);
  }
  for (const c of bg.low) if ((c.y += c.v) > H + 50 * c.sc) Object.assign(c, newCloud(false));
  for (const c of bg.high) if ((c.y += c.v) > H + 50 * c.sc) Object.assign(c, newCloud(true));

  for (const r of bg.rain) {
    r.y += r.v; r.x -= r.v * 0.28;
    if (r.y > H + 10) { r.y = -12; r.x = rand(0, W + 80); }
  }
  for (const s of bg.snow) {
    s.y += s.v; s.x += Math.sin(frame * 0.03 + s.ph) * 0.4 - 0.25;
    if (s.y > H + 3) { s.y = -3; s.x = rand(0, W + 20); }
  }
  if (t.rain) { // 번개
    if (bg.bolt > 0) bg.bolt--;
    if (--bg.lightT <= 0) { bg.bolt = 12; bg.lightT = rand(260, 560); Sound.thunder(); }
  }
}

function drawTile(c, off, dx = 0) {
  const y = ((off % H) + H) % H;
  ctx.drawImage(c, dx, y - H, W, H);
  ctx.drawImage(c, dx, y, W, H);
}
function drawCloudLayer(list, sprites, ox, oy, alphaMul) {
  for (const c of list) {
    const s = sprites[c.i], w = s.lw * c.sc, h = s.lh * c.sc;
    ctx.globalAlpha = Math.min(1, c.a * alphaMul);
    ctx.drawImage(s, c.x - w / 2 + ox, c.y - h / 2 + oy, w, h);
  }
  ctx.globalAlpha = 1;
}
function drawSea() {
  const t = bg.theme;
  ctx.fillStyle = t.base; ctx.fillRect(-10, -10, W + 20, H + 20);
  drawTile(bg.deep, bg.scroll * 0.8);
  drawTile(bg.crestA, bg.scroll);
  ctx.globalAlpha = 0.7;
  drawTile(bg.crestB, bg.scroll * 1.25, Math.sin(frame * 0.012) * 3);
  ctx.globalAlpha = 1;
  // 햇빛(달빛) 반짝임
  ctx.fillStyle = t.glintCol;
  for (const gl of bg.glints) {
    const a = Math.sin(frame * gl.sp + gl.ph);
    if (a <= 0) continue;
    ctx.globalAlpha = a * a * a * a * 0.9;
    ctx.fillRect(gl.x - 1.5, gl.y - 0.25, 3, 0.5);
    ctx.fillRect(gl.x - 0.25, gl.y - 1.5, 0.5, 3);
  }
  ctx.globalAlpha = 1;
  for (const is of bg.islands) ctx.drawImage(is.c, is.x - 65, is.y - 65, 130, 130);
  drawCloudLayer(bg.low, bg.cloudShadows, 16, 34, 0.3); // 낮은 구름의 그림자
}
function drawCloudsLow() { drawCloudLayer(bg.low, bg.cloudSprites, 0, 0, bg.theme.cloudA); }
function drawCloudsHigh() { drawCloudLayer(bg.high, bg.cloudSprites, 0, 0, bg.theme.cloudA); }
function drawVignette() {
  // 날씨는 화면 맨 위 층
  if (bg.rain.length) {
    ctx.strokeStyle = 'rgba(190,210,235,0.38)'; ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (const r of bg.rain) { ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - r.l * 0.28, r.y + r.l); }
    ctx.stroke();
  }
  if (bg.snow.length) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const s of bg.snow) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.drawImage(bg.vignette, 0, 0, W, H);
  if (bg.bolt > 0) { // 번개 섬광
    ctx.fillStyle = `rgba(225,235,255,${bg.bolt > 8 ? 0.55 : bg.bolt / 8 * 0.3})`;
    ctx.fillRect(-10, -10, W + 20, H + 20);
  }
}
