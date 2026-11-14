'use strict';
// ===== 기본 설정 =====
const W = 240, H = 320, STEP = 1000 / 60;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let SCALE = 2;

function resize() {
  const css = Math.min(innerWidth / W, innerHeight / H);
  SCALE = Math.max(1, Math.ceil(css * (devicePixelRatio || 1)));
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  canvas.style.width = Math.floor(W * css) + 'px';
  canvas.style.height = Math.floor(H * css) + 'px';
}
addEventListener('resize', resize);
resize();

// ===== 입력 =====
const keys = {}, pressed = {};
const BLOCK = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'];
addEventListener('keydown', e => {
  if (BLOCK.includes(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true;
  Sound.unlock();
});
addEventListener('keyup', e => { keys[e.code] = false; });
// ----- 터치 (모바일): 드래그한 만큼 기체가 따라 움직이고, 닿아 있는 동안 자동 발사 -----
let touchUI = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
const touch = { id: null, lx: 0, ly: 0, dx: 0, dy: 0 };
const BTN_BOMB = { x: 240 - 27, y: 320 - 47, r: 18 }, BTN_PAUSE = { x: 15, y: 320 - 31, r: 10 };
const inBtn = (b, x, y) => (x - b.x) ** 2 + (y - b.y) ** 2 < (b.r + 6) ** 2;
function toLogical(e) {
  const r = canvas.getBoundingClientRect();
  return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H];
}
addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  e.preventDefault();
  touchUI = true;
  Sound.unlock();
  const [x, y] = toLogical(e);
  if (state !== 'play') { pressed.Enter = true; return; }        // 탭으로 시작/재시작
  if (paused || inBtn(BTN_PAUSE, x, y)) { pressed.KeyP = true; return; }
  if (inBtn(BTN_BOMB, x, y)) { pressed.KeyX = true; return; }
  if (touch.id === null) { touch.id = e.pointerId; touch.lx = x; touch.ly = y; touch.dx = touch.dy = 0; }
}, { passive: false });
addEventListener('pointermove', e => {
  if (e.pointerId !== touch.id) return;
  e.preventDefault();
  const [x, y] = toLogical(e);
  touch.dx += (x - touch.lx) * 1.2; touch.dy += (y - touch.ly) * 1.2;
  touch.lx = x; touch.ly = y;
}, { passive: false });
function touchEnd(e) {
  if (e.pointerType !== 'mouse') Sound.unlock(); // iOS는 손을 뗄 때 오디오가 풀린다
  if (e.pointerId === touch.id) touch.id = null;
}
addEventListener('pointerup', touchEnd);
addEventListener('pointercancel', touchEnd);
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('blur', () => {
  touch.id = null;
  for (const k in keys) keys[k] = false;
  if (state === 'play') { paused = true; Sound.setPaused(true); }
});

// ===== 유틸 =====
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const pad = n => String(n).padStart(7, '0');
function loadHi() { try { return +localStorage.getItem('pacificAce.hi') || 0; } catch { return 0; } }
function saveHi(v) { try { localStorage.setItem('pacificAce.hi', String(v)); } catch {} }

function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function text(s, x, y, size, color, align = 'center') {
  ctx.font = `bold ${size}px "Courier New", monospace`;
  ctx.textAlign = align;
  ctx.fillStyle = '#000'; ctx.fillText(s, x + 0.7, y + 0.7);
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function drawSprite(s, x, y, ang = 0, sx = 1, sc = 1) {
  ctx.save();
  ctx.translate(x, y);
  if (ang) ctx.rotate(ang);
  if (sx !== 1 || sc !== 1) ctx.scale(sx * sc, sc);
  ctx.drawImage(s, -s.lw / 2, -s.lh / 2, s.lw, s.lh);
  ctx.restore();
}

// ===== 게임 상태 =====
let state = 'title', paused = false, frame = 0;
let player, bullets, eBullets, enemies, items, fx, schedule, formations, formId;
let score = 0, hiscore = loadHi(), gameTime = 0, waveTimer = 0, waveCount = 0;
let drainT = 0, flash = 0, shake = 0, deathTimer = 0, overTimer = 0, warnT = 0;
// 스테이지 진행: waves(편대전) → warning(경고) → boss(보스전) → clear(클리어) → 다음 스테이지
const STAGE_LEN = 3300; // 보스 등장까지 55초
let stage = 1, stageTime = 0, phase = 'waves', phaseT = 0, hitstop = 0, clearBonus = 0;
const MAX_LIVES = 5, MAX_BOMBS = 5;
let bombsOut = []; // 투하되어 떨어지는 중인 폭탄
let respawnT = 0, slowmo = 0, nextExtend = 20000, clearLife = false;
function addLife() {
  if (player.lives >= MAX_LIVES) return false;
  player.lives++;
  return true;
}

function startGame() {
  resetGame();
  state = 'play';
  Sound.setPaused(false);
  Sound.music.play('stage');
}
function stageClear() {
  phase = 'clear'; phaseT = 270;
  clearBonus = 5000 * stage;
  score += clearBonus;
  clearLife = addLife();
  Sound.fanfare();
}
// ===== 엔딩 =====
let endT = 0, endBonus = 0, endRecord = false, endLives = 0;
function startEnding() {
  const old = loadHi();
  state = 'ending'; endT = 0;
  endLives = player.lives;
  endBonus = player.lives * 5000 + player.bombs * 1000; // 남은 목숨·폭탄 보너스
  score += endBonus;
  endRecord = score > old;
  if (score > hiscore) hiscore = score;
  saveHi(hiscore);
  bullets = []; eBullets = []; enemies = []; items = []; fx = []; schedule = []; bombsOut = [];
  flash = 0; shake = 0;
  setTheme(1); // 노을 지는 바다 위로 귀환
  Sound.music.play('stage');
  Sound.fanfare();
}
function endRank() {
  return score >= 240000 ? ['S', '전설의 에이스'] : score >= 210000 ? ['A', '에이스']
    : score >= 180000 ? ['B', '베테랑 파일럿'] : ['C', '신참 파일럿'];
}
function drawEnding() {
  const t = endT, cx = W / 2;
  const ease = k => 1 - (1 - clamp(k, 0, 1)) ** 3;
  // 귀환 편대: 내 기체가 먼저 올라오고 호위기 2기가 뒤따라 붙는다
  const bob = Math.sin(t * 0.04) * 3, prop = SPR.player[(frame >> 1) & 1];
  const y = H + 30 - ease(t / 150) * (H + 30 - 236) + bob;
  const wy = H + 30 - ease((t - 70) / 150) * (H + 30 - 262) + Math.sin(t * 0.04 + 1) * 3;
  ctx.globalAlpha = 0.28;
  for (const [x, yy] of [[cx - 36, wy], [cx + 36, wy], [cx, y]]) drawSprite(shadowOf(prop), x + 12, yy + 18, 0, 1, 0.7);
  ctx.globalAlpha = 1;
  drawSprite(prop, cx - 36, wy, 0, 1, 0.9);
  drawSprite(prop, cx + 36, wy, 0, 1, 0.9);
  drawSprite(prop, cx, y);

  const g = ctx.createLinearGradient(0, 0, 0, 215);
  g.addColorStop(0, 'rgba(4,8,20,0.72)'); g.addColorStop(0.8, 'rgba(4,8,20,0.5)'); g.addColorStop(1, 'rgba(4,8,20,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 215);
  const show = (t0, fn) => { if (t > t0) { ctx.globalAlpha = Math.min(1, (t - t0) / 30); fn(); ctx.globalAlpha = 1; } };
  show(50, () => {
    text('MISSION COMPLETE', cx, 50, 19, '#ffd27a');
    ctx.fillStyle = '#ffd27a'; ctx.fillRect(cx - 70, 57, 140, 1);
  });
  show(120, () => text('태평양에 다시 평화가 찾아왔다', cx, 76, 9, '#fff'));
  show(180, () => text('적 함대는 괴멸했고, 편대는 노을 속으로 귀환한다', cx, 91, 8, '#cfe8ff'));
  show(260, () => {
    text(`남은 기체 ${endLives}  ·  귀환 보너스 +${endBonus}`, cx, 116, 8, '#9fd8a0');
  });
  show(320, () => {
    text('FINAL SCORE', cx, 138, 9, '#cfe8ff');
    text(pad(score), cx, 157, 18, '#fff');
    if (endRecord) text('NEW RECORD!', cx, 171, 9, '#ffd27a');
  });
  show(390, () => { const [r, n] = endRank(); text(`RANK ${r}  -  ${n}`, cx, 190, 10, '#ff9a8a'); });
  if (t > 460 && frame % 60 < 40) text(START_TEXT(), cx, 208, 10, '#fff');
  show(460, () => text('THANK YOU FOR PLAYING', cx, H - 8, 7, '#ffd27a'));
  if (t < 50) { ctx.fillStyle = `rgba(2,6,14,${1 - t / 50})`; ctx.fillRect(0, 0, W, H); } // 암전에서 밝아짐
}
function resetGame() {
  stage = 1; stageTime = 0; phase = 'waves'; phaseT = 0; hitstop = 0; boss = null;
  // 목숨제: 한 발 맞으면 격추. 목숨 3개, 폭탄 3발로 시작
  player = {
    x: W / 2, y: H + 24, lives: 3, bombs: 3, shot: 1, cool: 0, inv: 150, bombCool: 0,
    dead: false, entering: true, tilt: 0,
  };
  respawnT = 0; slowmo = 0; nextExtend = 20000;
  bombsOut = [];
  if (bg.theme && bg.theme !== THEMES[0]) { setTheme(0); bg.islandTimer = 300; }
  bullets = []; eBullets = []; enemies = []; items = []; fx = []; schedule = [];
  formations = {}; formId = 0;
  score = 0; gameTime = 0; waveTimer = 90; waveCount = 0;
  drainT = 0; flash = 0; shake = 0; deathTimer = 0; warnT = 0; paused = false;
}
// 난이도: 스테이지가 오를수록, 스테이지 안에서도 시간이 갈수록 상승 (최대 4)
// 1스테이지는 입문용으로 낮게 시작해서 천천히 오른다 (0.6 → 약 1.15)
const diff = () => (stage === 1 ? 0.6 + stageTime / 6000 : Math.min(1 + (stage - 1) * 0.7 + stageTime / 3600, 4));
const EASY = () => stage === 1; // 1스테이지 완화 적용 여부
const later = (t, fn) => schedule.push({ t, fn });

// ===== 편대 (전부 격추하면 보너스 아이템) =====
function newForm(n) { formations[++formId] = { total: n, killed: 0, gone: 0 }; return formId; }
function formEvent(e, killed) {
  const f = formations[e.form];
  if (!f) return;
  if (killed) f.killed++; else f.gone++;
  if (f.killed + f.gone < f.total) return;
  if (f.killed === f.total && f.total >= 3) {
    score += 500;
    addText(e.x, e.y - 8, '+500 BONUS');
    const r = Math.random();
    spawnItem(e.x, e.y, r < 0.4 ? 'P' : r < 0.6 ? 'B' : 'M');
  }
  delete formations[e.form];
}

// ===== 적 =====
function addEnemy(o) {
  const e = Object.assign({
    t: 0, hp: 1, r: 7, spr: SPR.green, flashSpr: SPR.greenFlash, score: 100,
    fire: rand(30, 120), hitF: 0, rot: true, ang: 0, form: 0, dead: false,
  }, o);
  enemies.push(e);
  return e;
}

// V자 편대: 일직선 하강
function waveV() {
  const x0 = rand(50, W - 50), id = newForm(5), vy = 1.2 + diff() * 0.15;
  [[0, 0], [-20, -14], [20, -14], [-40, -28], [40, -28]].forEach(([dx, dy]) =>
    addEnemy({ x: x0 + dx, y: -12 + dy, form: id, move(e) { e.y += vy; } }));
}
// 뱀 편대: 사인 곡선으로 줄지어 하강
function waveSnake() {
  const x0 = rand(70, W - 70), id = newForm(6), dir = Math.random() < 0.5 ? 1 : -1;
  for (let i = 0; i < 6; i++) later(i * 14, () => addEnemy({
    x: x0, y: -12, x0, form: id, spr: SPR.red, flashSpr: SPR.redFlash, score: 150,
    move(e) { e.y = -12 + e.t * 1.1; e.x = e.x0 + dir * 55 * Math.sin(e.t * 0.03); },
  }));
}
// 측면 편대: 옆에서 들어와 휘어지며 통과
function waveSweep() {
  const left = Math.random() < 0.5, id = newForm(5), y0 = rand(20, 90);
  for (let i = 0; i < 5; i++) later(i * 12, () => addEnemy({
    x: left ? -10 : W + 10, y: y0, vx: (left ? 1 : -1) * 1.9, vy: -0.3, form: id, score: 120,
    spr: SPR.tan, flashSpr: SPR.tanFlash,
    move(e) { e.x += e.vx; e.vy += 0.012; e.y += e.vy; },
  }));
}
// 급강하: 내려오다가 플레이어 쪽으로 돌진
function waveDive() {
  const id = newForm(4);
  for (let i = 0; i < 4; i++) later(i * 22, () => addEnemy({
    x: rand(20, W - 20), y: -12, vx: 0, vy: 1.1, form: id, score: 130,
    spr: SPR.tan, flashSpr: SPR.tanFlash,
    move(e) {
      if (e.t === 45) { e.vx = clamp((player.x - e.x) / 60, -1.6, 1.6); e.vy = 2.6; }
      e.x += e.vx; e.y += e.vy;
    },
  }));
}
// 중형 폭격기: 체력 높음, 부채꼴 탄막, 격추 시 P 아이템
function waveBomber() {
  const x0 = rand(60, W - 60), d = diff();
  addEnemy({
    kind: 'bomber', x: x0, y: -24, x0, hp: Math.round(28 + d * 8), r: 14,
    spr: SPR.bomber, flashSpr: SPR.bomberFlash, score: 1000, rot: false, fire: 90, drop: 'P',
    move(e) {
      if (e.t < 700) { e.y += (70 - e.y) * 0.015; e.x = e.x0 + 45 * Math.sin(e.t * 0.012); }
      else e.y += 0.9;
    },
  });
}
// 조준 부채꼴 탄 (n발)
function fanShot(e, n, spread, spd) {
  const a = aimAt(e.x, e.y + 6);
  for (let i = 0; i < n; i++) enemyShot(e.x, e.y + 6, a + (i - (n - 1) / 2) * spread, spd);
}
// 수상기: 느리게 좌우로 흔들리며 내려오고 2~3갈래 탄을 쏜다. 맷집이 조금 있음
function waveFloat() {
  const id = newForm(3), x0 = rand(60, W - 60);
  [-44, 0, 44].forEach((dx, i) => later(i * 26, () => addEnemy({
    x: clamp(x0 + dx, 24, W - 24), y: -14, form: id, hp: 3, r: 8, score: 250, rot: false, ex: 14,
    spr: SPR.float, flashSpr: SPR.floatFlash, ph: rand(0, 6),
    move(e) { e.y += 0.62; e.x += Math.sin(e.t * 0.04 + e.ph) * 0.5; },
    shoot(e, d) { fanShot(e, EASY() ? 2 : 3, 0.26, 1.2 + d * 0.2); return rand(110, 170) / (0.7 + 0.3 * d); },
  })));
}
// 전익기: 화면 아래 가장자리에서 치고 올라와 위에서 크게 선회한 뒤 내리꽂는다
function waveLoop() {
  const left = Math.random() < 0.5, id = newForm(5), dir = left ? 1 : -1, xs = left ? 20 : W - 20;
  addText(xs, H - 30, '!!');
  for (let i = 0; i < 5; i++) later(45 + i * 13, () => addEnemy({
    x: xs, y: H + 14, form: id, score: 160, spr: SPR.wing, flashSpr: SPR.wingFlash,
    a: -Math.PI / 2, turned: 0,
    move(e) {
      if (e.y < 92 && e.turned < Math.PI) { e.a += dir * 0.066; e.turned += 0.066; }
      e.x += Math.cos(e.a) * 2.3; e.y += Math.sin(e.a) * 2.3;
    },
  }));
}
// 로켓 요격기: 플레이어 위치를 노리고 빠르게 일직선으로 내리꽂는다 (탄은 쏘지 않음)
function waveDart() {
  const id = newForm(6), vy = EASY() ? 2.7 : 3.3;
  for (let i = 0; i < 6; i++) later(i * 16, () => addEnemy({
    x: clamp(player.x + rand(-34, 34), 14, W - 14), y: -14, form: id, score: 140, r: 6, fire: 1e9,
    spr: SPR.dart, flashSpr: SPR.dartFlash,
    move(e) { e.y += vy; },
  }));
}
// 쌍동 중전투기: 2기가 내려와 좌우로 오가며 3갈래 탄을 쏜다
function waveTwin() {
  const id = newForm(2);
  [-1, 1].forEach((s, i) => later(i * 30, () => addEnemy({
    x: W / 2 + s * 56, y: -18, form: id, hp: 8, r: 10, score: 400, rot: false, ex: 17, fire: 70,
    spr: SPR.twin, flashSpr: SPR.twinFlash, ty: 52 + i * 26, ph: i * Math.PI,
    move(e) {
      if (e.t < 520) { e.y += (e.ty - e.y) * 0.03; e.x += Math.cos(e.t * 0.022 + e.ph) * 0.8; }
      else e.y += 1.3;
    },
    shoot(e, d) { fanShot(e, 3, 0.2, 1.4 + d * 0.22); return Math.max(60, 120 - d * 12); },
  })));
}
// 에이스기: 플레이어를 따라다니며 3연사. 격추하면 아이템
function waveAce() {
  const d = diff();
  addEnemy({
    x: rand(50, W - 50), y: -18, hp: Math.round(14 + d * 4), r: 9, score: 800, rot: false, ex: 19, fire: 80,
    spr: SPR.ace, flashSpr: SPR.aceFlash, drop: Math.random() < 0.5 ? 'B' : 'P', vx: 0,
    move(e) {
      if (e.t < 640) {
        e.y += (58 + 16 * Math.sin(e.t * 0.03) - e.y) * 0.04;
        e.vx += clamp((player.x - e.x) * 0.004, -0.06, 0.06); e.vx *= 0.94;
        e.x = clamp(e.x + e.vx, 16, W - 16);
      } else e.y -= 1.6;
    },
    shoot(e, d) {
      for (let i = 0; i < 3; i++) later(1 + i * 7, () => {
        if (!e.dead && !player.dead) enemyShot(e.x, e.y + 8, aimAt(e.x, e.y + 8), 1.7 + d * 0.25);
      });
      return Math.max(70, 130 - d * 12);
    },
  });
}
// 스테이지가 오를수록 새 기종이 섞여 나온다
function spawnWave() {
  waveCount++;
  const pool = [waveV, waveSnake, waveSweep, waveDive, waveFloat, waveLoop];
  if (stage >= 2) pool.push(waveDart, waveTwin);
  if (waveCount % 6 === 0) waveBomber();
  else if (waveCount % 6 === 3 && (stage >= 2 || waveCount > 6)) waveAce();
  else pool[Math.floor(Math.random() * pool.length)]();
  waveTimer = Math.max(80, 170 - diff() * 22);
}

function enemyShot(x, y, ang, spd) { eBullets.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd }); }
const aimAt = (x, y) => Math.atan2(player.y - y, player.x - x);

function damageEnemy(e, n) {
  if (e.dead) return;
  e.hp -= n; e.hitF = 3;
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e) {
  e.dead = true;
  score += e.score;
  const mx = e.mx || 0, my = e.my || 0;
  if (e.kind === 'bomber') {
    explode(e.x, e.y, 22); Sound.boom(); addShake(12); hitstop = 4; flash = Math.max(flash, 5);
    for (let i = 1; i <= 5; i++) later(i * 6, () => explode(e.x + rand(-18, 18), e.y + rand(-10, 10), 12));
    addWreck(e.spr, e.x, e.y, mx * 0.5, 0.5, 0, rand(-0.05, 0.05), 70);
    addText(e.x, e.y - 14, '+1000');
  } else {
    // 펑 터진 뒤 불붙은 채 빙글빙글 추락해서 바다에 물보라
    explode(e.x, e.y, e.ex || 11); Sound.pop(); addShake(e.ex ? 7 : 4);
    if (e.ex) later(5, () => explode(e.x + rand(-6, 6), e.y + rand(-6, 6), 9));
    addWreck(e.spr, e.x, e.y, mx * 0.6, my * 0.6 + 0.4, e.ang, rand(0.15, 0.3) * (Math.random() < 0.5 ? -1 : 1), 38);
  }
  if (e.drop) spawnItem(e.x, e.y, e.drop);
  formEvent(e, true);
}

function updateEnemies() {
  const d = diff();
  for (const e of enemies) {
    if (e.dead) continue;
    const px = e.x, py = e.y;
    e.move(e); e.t++;
    if (e.hitF > 0) e.hitF--;
    const mx = e.x - px, my = e.y - py;
    e.mx = mx; e.my = my;
    if (e.rot && (mx || my)) e.ang = Math.atan2(my, mx) - Math.PI / 2;

    if (!player.dead) {
      if (e.kind === 'bomber') {
        if (--e.fire <= 0 && e.y > 20) {
          const a = aimAt(e.x, e.y + 16);
          for (let i = -2; i <= 2; i++) enemyShot(e.x, e.y + 16, a + i * 0.22, 1.5 + d * 0.2);
          e.fire = Math.max(45, 90 - d * 10);
        }
      } else if (e.shoot) { // 기종별 전용 사격
        if (--e.fire <= 0) e.fire = e.y > 10 && e.y < player.y - 40 ? e.shoot(e, d) * (EASY() ? 1.4 : 1) : 30;
      } else if (--e.fire <= 0) {
        if (e.y > 8 && e.y < player.y - 40 && Math.random() < (0.3 + 0.15 * d) * (EASY() ? 0.6 : 1))
          enemyShot(e.x, e.y, aimAt(e.x, e.y), 1.3 + 0.3 * d);
        e.fire = rand(70, 160) / (0.7 + 0.3 * d);
      }
      // 몸통 충돌
      if (player.inv <= 0 && d2(e, player) < (e.r + 4) ** 2) {
        killPlayer();
        if (e.kind !== 'bomber') killEnemy(e);
      }
    }
    if (!e.dead && (e.y > H + 24 || e.x < -30 || e.x > W + 30 || (e.y < -50 && e.t > 60))) {
      e.dead = true;
      formEvent(e, false);
    }
  }
  enemies = enemies.filter(e => !e.dead);
}

// ===== 플레이어 =====
function fire() {
  const p = player, B = (x, vx) => bullets.push({ x: p.x + x, y: p.y - 9, vx, vy: -6 });
  if (p.shot === 1) { B(-5, 0); B(5, 0); }
  else if (p.shot === 2) { B(-5, 0); B(0, 0); B(5, 0); }
  else { B(-5, 0); B(0, 0); B(5, 0); B(-7, -1.2); B(7, 1.2); }
  Sound.shoot();
}
// 폭탄: 기체에서 투하 → 앞쪽으로 날아가며 떨어짐 → 착탄 지점에서 대폭발
const BOMB_RADIUS = 95;
function bomb() {
  const p = player;
  if (p.bombCool > 0 || p.bombs <= 0 || p.entering) return;
  p.bombs--; p.bombCool = 40;
  p.inv = Math.max(p.inv, 75); // 떨어지는 동안은 무적 (위기 탈출용)
  bombsOut.push({ sx: p.x, sy: p.y - 6, tx: p.x, ty: Math.max(45, p.y - 100), x: p.x, y: p.y - 6, t: 0, max: 38 });
  Sound.whistle();
}
function detonate(x, y) {
  explode(x, y, 36);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + rand(0, 0.6), d = rand(28, 64);
    later(2 + i * 2, () => explode(x + Math.cos(a) * d, y + Math.sin(a) * d, rand(14, 22)));
  }
  fx.push({ k: 'ring', x, y, r: BOMB_RADIUS * 1.25, t: 0, max: 30 });
  fx.push({ k: 'ring', x, y, r: 200, t: -4, max: 46, c: '#ffd9a0' });
  flash = 16; addShake(22); hitstop = 5;
  Sound.bomb();
  for (const b of eBullets) spark(b.x, b.y, '#ffd27a', 1.5);
  eBullets.length = 0;
  for (const e of enemies) {
    if (e.y < -10) continue;
    damageEnemy(e, (e.x - x) ** 2 + (e.y - y) ** 2 < BOMB_RADIUS ** 2 ? 30 : 6);
  }
  bossBomb(x, y, BOMB_RADIUS);
}
function updateBombs() {
  for (const b of bombsOut) {
    b.t++;
    const k = b.t / b.max, e = 1 - (1 - k) * (1 - k); // 처음엔 빠르게, 갈수록 느리게
    b.x = b.sx + (b.tx - b.sx) * e;
    b.y = b.sy + (b.ty - b.sy) * e;
    if (b.t >= b.max) { b.dead = true; detonate(b.tx, b.ty); }
  }
  bombsOut = bombsOut.filter(b => !b.dead);
}
function drawBombs() {
  for (const b of bombsOut) {
    const k = b.t / b.max;
    // 착탄 예정 지점 표시
    ctx.strokeStyle = `rgba(255,80,60,${0.5 + 0.4 * Math.sin(frame * 0.5)})`;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(b.tx, b.ty, 11 - k * 4, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(b.tx - 4, b.ty); ctx.lineTo(b.tx + 4, b.ty);
    ctx.moveTo(b.tx, b.ty - 4); ctx.lineTo(b.tx, b.ty + 4); ctx.stroke();
    // 떨어질수록 작아지고 그림자가 가까워진다
    ctx.globalAlpha = 0.3;
    drawSprite(shadowOf(SPR.bomb), b.x + 12 * (1 - k), b.y + 17 * (1 - k), 0, 1, 0.6);
    ctx.globalAlpha = 1;
    drawSprite(SPR.bomb, b.x, b.y, Math.sin(b.t * 0.3) * 0.12, 1, 1.7 - 0.95 * k);
  }
}
// 피격 = 격추. 화면 정지 → 슬로모션 속에서 대폭발 → 불붙은 기체가 추락해 바다에서 2차 폭발
function killPlayer() {
  const p = player, px = p.x, py = p.y;
  if (p.inv > 0 || p.dead) return;
  p.dead = true; p.lives--;
  explode(px, py, 28);
  fx.push({ k: 'ring', x: px, y: py, r: 95, t: 0, max: 34 });
  fx.push({ k: 'ring', x: px, y: py, r: 150, t: -6, max: 44, c: '#ffd9a0' });
  Sound.boom(); Sound.hit();
  addShake(20); hitstop = 9; slowmo = 56; flash = 12;
  for (let i = 1; i <= 6; i++) later(i * 6, () => explode(px + rand(-16, 16), py + rand(-16, 16), rand(11, 17)));
  addWreck(SPR.player[0], px, py, p.tilt * 0.9, 0.55, 0, 0.26, 58, f => {
    explode(f.x, f.y, 20); Sound.pop(); addShake(10);
    fx.push({ k: 'ring', x: f.x, y: f.y, r: 40, t: 0, max: 30, c: '#e8f6ff' });
    for (let j = 0; j < 14; j++) spark(f.x, f.y, '#e8f6ff', rand(0.8, 2.6));
  });
  // 남은 적 탄은 지워서 부활 직후 억울하게 죽지 않게
  for (const b of eBullets) spark(b.x, b.y, '#ffd27a', 1.5);
  eBullets.length = 0;
  if (p.lives > 0) respawnT = 115;
  else { deathTimer = 200; Sound.music.stop(); Sound.gameover(); }
}
function updatePlayer() {
  const p = player;
  if (p.dead || p.entering) touch.dx = touch.dy = 0;
  if (p.dead) {
    if (p.lives > 0 && --respawnT <= 0) { // 부활: 화면 아래에서 날아 들어온다
      p.dead = false; p.entering = true; p.x = W / 2; p.y = H + 24; p.tilt = 0; p.inv = 200;
      p.shot = Math.max(1, p.shot - 1);
      p.bombs = Math.max(p.bombs, 3);
    }
    return;
  }
  if (p.inv > 0) p.inv--;
  if (p.entering) {
    p.y -= 2.2;
    if (p.y <= H - 50) p.entering = false;
    return;
  }
  const dx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  const dy = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
  const sp = 2.1 * (dx && dy ? 0.7071 : 1);
  // 터치 드래그: 쌓인 이동량을 프레임당 최대 9px씩 따라간다
  const tx = clamp(touch.dx, -9, 9), ty = clamp(touch.dy, -9, 9);
  touch.dx -= tx; touch.dy -= ty;
  p.x = clamp(p.x + dx * sp + tx, 8, W - 8);
  p.y = clamp(p.y + dy * sp + ty, 22, H - 26);
  p.tilt += (clamp(dx + tx / 2, -1, 1) - p.tilt) * 0.2;

  if (p.cool > 0) p.cool--;
  if ((keys.KeyZ || keys.Space || touch.id !== null) && p.cool <= 0) { fire(); p.cool = 6; }
  if (p.bombCool > 0) p.bombCool--;
  if (pressed.KeyX) bomb();
}

// ===== 탄 =====
function updateBullets() {
  for (const b of bullets) {
    b.x += b.vx; b.y += b.vy;
    if (bossHitTest(b.x, b.y)) { b.dead = true; spark(b.x, b.y, '#fff', 1); continue; }
    for (const e of enemies) {
      if (!e.dead && (b.x - e.x) ** 2 + (b.y - e.y) ** 2 < (e.r + 2) ** 2) {
        b.dead = true;
        damageEnemy(e, 1);
        spark(b.x, b.y, '#fff', 1);
        break;
      }
    }
  }
  bullets = bullets.filter(b => !b.dead && b.y > -10 && b.x > -10 && b.x < W + 10);

  for (const b of eBullets) {
    b.x += b.vx; b.y += b.vy;
    if (!player.dead && player.inv <= 0 && d2(b, player) < 4 * 4) { killPlayer(); break; }
  }
  eBullets = eBullets.filter(b => !b.dead && b.y > -10 && b.y < H + 10 && b.x > -10 && b.x < W + 10);
}

// ===== 아이템 =====
function spawnItem(x, y, type) {
  const x0 = clamp(x, 20, W - 20);
  items.push({ x: x0, y, x0, type, t: 0 });
}
function updateItems() {
  const p = player;
  for (const it of items) {
    it.t++;
    it.y += 0.5;
    it.x = it.x0 + Math.sin(it.t * 0.05) * 12;
    if (!p.dead && d2(it, p) < 12 * 12) {
      it.dead = true;
      Sound.item();
      if (it.type === 'B' && p.bombs < MAX_BOMBS) { p.bombs++; addText(it.x, it.y - 8, 'BOMB +1'); }
      else if (it.type === 'P' && p.shot < 3) { p.shot++; addText(it.x, it.y - 8, 'POWER UP!'); }
      else { score += 1000; addText(it.x, it.y - 8, '+1000'); } // 훈장, 또는 이미 가득 찬 경우
    }
  }
  items = items.filter(it => !it.dead && it.y < H + 10 && it.t < 720);
}

// ===== 업데이트 =====
function runSchedule() {
  const due = [];
  schedule = schedule.filter(s => (--s.t > 0) || (due.push(s), false));
  due.forEach(s => s.fn());
}
function updatePlay() {
  if (pressed.KeyP || pressed.Escape) { paused = !paused; Sound.setPaused(paused); }
  if (paused) return;
  if (hitstop > 0) { hitstop--; return; } // 큰 폭발 순간 화면을 잠깐 멈춰 타격감을 준다
  if (slowmo > 0 && --slowmo % 2) return;  // 격추 순간 슬로모션 (절반 속도)
  gameTime++;
  updateBg();
  runSchedule();
  if (!player.dead) {
    if (phase === 'waves') {
      stageTime++;
      if (--waveTimer <= 0) spawnWave();
      if (stageTime >= STAGE_LEN) { phase = 'warning'; phaseT = 210; Sound.music.stop(); }
    } else if (phase === 'warning') {
      if (phaseT % 42 === 0) Sound.siren();
      if (--phaseT <= 0) { phase = 'boss'; spawnBoss(); Sound.music.play('boss'); }
    } else if (phase === 'clear') {
      if (--phaseT <= 0) { // 다음 스테이지: 화면이 어두워진 사이에 배경 테마를 바꾼다
        if (stage >= BOSS_DEFS.length) { startEnding(); return; } // 마지막 보스 격파 → 엔딩
        stage++; stageTime = 0; phase = 'waves'; waveTimer = 90;
        setTheme(stage - 1);
        Sound.music.play('stage');
      }
    }
  }
  if (phase === 'boss') updateBoss();
  updatePlayer();
  updateBombs();
  updateBullets();
  updateEnemies();
  updateItems();
  updateFx();
  if (flash > 0) flash--;
  if (shake > 0) shake--;
  if (score > hiscore) hiscore = score;
  if (score >= nextExtend) { // 점수로 목숨 추가
    nextExtend += 30000;
    if (addLife()) { addText(player.x, player.y - 18, '1UP!'); Sound.item(); }
  }
  if (player.dead && player.lives <= 0 && --deathTimer <= 0) { state = 'over'; overTimer = 60; saveHi(hiscore); }
}
function update() {
  frame++;
  if (pressed.KeyM) Sound.toggle();
  if (state === 'title') {
    updateBg();
    if (pressed.Enter || pressed.Space || pressed.KeyZ) { startGame(); Sound.item(); }
    return;
  }
  if (state === 'ending') {
    updateBg(); endT++;
    if (endT > 460 && (pressed.Enter || pressed.Space || pressed.KeyZ)) { Sound.music.stop(); resetGame(); state = 'title'; }
    return;
  }
  if (state === 'over') {
    updateBg(); runSchedule(); updateBullets(); updateEnemies(); updateItems(); updateFx();
    if (flash > 0) flash--;
    if (shake > 0) shake--;
    if (overTimer > 0) overTimer--;
    else if (pressed.Enter || pressed.Space || pressed.KeyZ) startGame();
    return;
  }
  updatePlay();
}

// ===== 그리기 =====
// 그림자: 작게, 멀리 떨어뜨려 그려서 고도감을 준다
function drawShadows() {
  const p = player;
  ctx.globalAlpha = 0.3;
  for (const e of enemies) drawSprite(shadowOf(e.spr), e.x + 12, e.y + 18, e.rot ? e.ang : 0, 1, 0.7);
  if (!p.dead) drawSprite(shadowOf(SPR.player[0]), p.x + 14, p.y + 20, 0, 1 - Math.abs(p.tilt) * 0.25, 0.7);
  ctx.globalAlpha = 1;
}
function drawWorld() {
  const p = player;

  // 아이템
  for (const it of items) {
    if (it.t > 540 && frame % 10 < 5) continue;
    ctx.fillStyle = it.type === 'B' ? '#2e86de' : it.type === 'P' ? '#e74c3c' : '#d9a520';
    circle(it.x, it.y, 7);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(it.x, it.y, 7, 0, Math.PI * 2); ctx.stroke();
    text(it.type === 'M' ? '★' : it.type, it.x, it.y + 3.5, 10, '#fff');
  }

  // 적기
  for (const e of enemies) drawSprite(e.hitF > 0 ? e.flashSpr : e.spr, e.x, e.y, e.rot ? e.ang : 0);

  drawBombs();

  // 플레이어 탄
  for (const b of bullets) {
    ctx.fillStyle = 'rgba(255,190,70,0.4)'; ctx.fillRect(b.x - 1.6, b.y - 4.5, 3.2, 9);
    ctx.fillStyle = '#fff8cc'; ctx.fillRect(b.x - 0.7, b.y - 3.5, 1.4, 7);
  }

  // 플레이어
  if (!p.dead && !(p.inv > 0 && frame % 6 < 3)) {
    drawSprite(SPR.player[(frame >> 1) & 1], p.x, p.y, 0, 1 - Math.abs(p.tilt) * 0.25);
  }
}
function drawTop() {
  // 적 탄 (구름 위에 그려서 항상 보이게)
  for (const b of eBullets) {
    ctx.fillStyle = '#ff5a3c'; circle(b.x, b.y, 2.5);
    ctx.fillStyle = '#fff'; circle(b.x, b.y, 1.1);
  }
  drawFx();
}
// 스테이지 시작 / 보스 경고 / 클리어 안내
function drawStageText() {
  if (state !== 'play' || paused) return;
  if (phase === 'waves' && stageTime < 150) {
    ctx.globalAlpha = Math.min(1, stageTime / 20, (150 - stageTime) / 30);
    text(`STAGE ${stage}`, W / 2, 120, 20, '#fff');
    text(bg.theme.name, W / 2, 138, 9, '#ffd27a');
    ctx.globalAlpha = 1;
  } else if (phase === 'warning') {
    const on = frame % 30 < 18;
    ctx.fillStyle = `rgba(255,0,0,${on ? 0.16 : 0.05})`; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(160,0,0,0.75)'; ctx.fillRect(0, 96, W, 3); ctx.fillRect(0, 148, W, 3);
    if (on) text('WARNING', W / 2, 126, 24, '#ff4a3a');
    text(bossDef().warn, W / 2, 142, 9, '#ffd27a');
  } else if (phase === 'clear') {
    text(`STAGE ${stage} CLEAR!`, W / 2, 120, 18, '#ffd27a');
    text(`BONUS +${clearBonus}`, W / 2, 142, 10, '#fff');
    if (clearLife) text('1UP!', W / 2, 157, 10, '#9fd8a0');
  }
}
function drawTouchButtons() {
  const b = BTN_BOMB, q = BTN_PAUSE, has = player.bombs > 0;
  ctx.lineWidth = 1;
  ctx.fillStyle = has ? 'rgba(61,155,255,0.28)' : 'rgba(255,255,255,0.08)'; circle(b.x, b.y, b.r);
  ctx.strokeStyle = has ? 'rgba(190,225,255,0.75)' : 'rgba(255,255,255,0.25)';
  ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = has ? 0.95 : 0.35;
  drawSprite(SPR.bomb, b.x, b.y - 3, 0, 1, 0.95);
  text('BOMB', b.x, b.y + 13, 6, '#fff');
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; circle(q.x, q.y, q.r);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(q.x - 3.5, q.y - 4, 2.4, 8); ctx.fillRect(q.x + 1.1, q.y - 4, 2.4, 8);
}
function drawHud() {
  const p = player;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, W, 12);
  ctx.fillRect(0, H - 14, W, 14);
  text(`SCORE ${pad(score)}`, 4, 9, 8, '#fff', 'left');
  text(`HI ${pad(hiscore)}`, W - 4, 9, 8, '#ffd27a', 'right');

  // 남은 목숨 (기체 아이콘) / 폭탄 / 무기 단계
  for (let i = 0; i < p.lives; i++) drawSprite(SPR.player[0], 9 + i * 13, H - 7, 0, 1, 0.4);
  text('BOMB', 112, H - 4, 7, '#9fc8ff', 'left');
  for (let i = 0; i < MAX_BOMBS; i++) {
    ctx.fillStyle = i < p.bombs ? '#3d9bff' : 'rgba(255,255,255,0.15)';
    circle(140 + i * 9, H - 7, 3.2);
  }
  text(`PW${p.shot}`, W - 3, H - 4, 7, '#ff9a8a', 'right');
  if (Sound.muted) text('MUTE', W / 2, 9, 7, '#aaa');
  if (touchUI && state === 'play' && !paused) drawTouchButtons();
}
const START_TEXT = () => (touchUI ? 'TAP TO START' : 'PRESS ENTER');
function drawTitle() {
  ctx.fillStyle = 'rgba(0,10,30,0.45)'; ctx.fillRect(0, 0, W, H);
  text('PACIFIC ACE', W / 2, 78, 24, '#ffd27a');
  text('- 태평양의 에이스 -', W / 2, 96, 9, '#fff');
  drawSprite(SPR.player[(frame >> 1) & 1], W / 2, 136 + Math.sin(frame * 0.05) * 4);
  (touchUI ? [
    '이동     화면을 드래그',
    '발사     터치하는 동안 자동 발사',
    '폭탄     BOMB 버튼 (B로 보충)',
    '일시정지 왼쪽 아래 II 버튼',
  ] : [
    '이동     방향키 / WASD',
    '발사     Z / SPACE (누르고 있기)',
    '폭탄     X  (앞쪽에 투하, B로 보충)',
    '일시정지 P      사운드 M',
  ]).forEach((l, i) => text(l, 22, 176 + i * 13, 8, '#cfe8ff', 'left'));
  text('한 발만 맞아도 격추! 목숨은 3개', W / 2, 236, 8, '#9fd8a0');
  if (frame % 60 < 40) text(START_TEXT(), W / 2, 266, 12, '#fff');
  text(`HI SCORE ${pad(hiscore)}`, W / 2, 300, 8, '#ffd27a');
}
function drawOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
  text('GAME OVER', W / 2, 130, 22, '#ff5a3c');
  text(`SCORE ${pad(score)}`, W / 2, 160, 10, '#fff');
  if (score > 0 && score >= hiscore) text('NEW RECORD!', W / 2, 178, 10, '#ffd27a');
  if (overTimer <= 0 && frame % 60 < 40) text(START_TEXT(), W / 2, 215, 11, '#fff');
}
function render() {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if (shake > 0) ctx.translate(Math.round(rand(-shake, shake) / 2), Math.round(rand(-shake, shake) / 2));
  const world = state === 'play' || state === 'over';
  drawSea();
  if (world) { drawBoss(); drawShadows(); }
  drawCloudsLow();
  if (world) { drawBossAir(); drawWorld(); }
  drawCloudsHigh();
  if (world) drawTop();
  drawVignette();
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash / 20})`; ctx.fillRect(-10, -10, W + 20, H + 20); }
  // 스테이지 전환: 클리어 끝에 어두워졌다가 새 배경에서 밝아진다
  if (state === 'play') {
    let fade = 0;
    if (phase === 'clear' && phaseT < 40) fade = 1 - phaseT / 40;
    else if (phase === 'waves' && stage > 1 && stageTime < 40) fade = 1 - stageTime / 40;
    if (fade > 0) { ctx.fillStyle = `rgba(2,6,14,${fade})`; ctx.fillRect(-10, -10, W + 20, H + 20); }
  }

  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  if (state === 'title') drawTitle();
  else if (state === 'ending') drawEnding();
  else {
    drawHud();
    drawBossBar();
    drawStageText();
    if (state === 'over') drawOver();
    else if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 12, W, H - 26);
      text('PAUSE', W / 2, H / 2, 16, '#fff');
      if (touchUI) text('화면을 탭하면 계속', W / 2, H / 2 + 16, 8, '#cfe8ff');
    }
  }
}

// ===== 메인 루프 (60fps 고정 스텝) =====
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(250, now - last);
  last = now;
  while (acc >= STEP) {
    update();
    acc -= STEP;
    for (const k in pressed) delete pressed[k];
  }
  render();
  requestAnimationFrame(loop);
}
initBg();
resetGame();
requestAnimationFrame(loop);
