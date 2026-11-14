'use strict';
// 기체 스프라이트: 외부 이미지 없이 벡터(그라데이션·패널라인·캐노피 하이라이트)로 그려
// 고해상도 오프스크린 캔버스에 미리 렌더링해 둔다. 좌표 단위는 게임 논리 픽셀.
const RES = 6; // 논리 픽셀당 실제 픽셀 수

function buildSprite(lw, lh, draw, flip) {
  const c = document.createElement('canvas');
  c.width = lw * RES; c.height = lh * RES;
  c.lw = lw; c.lh = lh;
  const g = c.getContext('2d');
  g.scale(RES, RES);
  g.translate(lw / 2, lh / 2);
  if (flip) g.rotate(Math.PI); // 적기는 기수가 아래
  g.lineJoin = 'round'; g.lineCap = 'round';
  draw(g);
  return c;
}

// 스프라이트 모양 그대로 단색으로 칠한 버전 (피격 플래시, 그림자)
function tint(src, color) {
  const c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  c.lw = src.lw; c.lh = src.lh;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  return c;
}

const shadowCache = new Map();
function shadowOf(s) {
  let c = shadowCache.get(s);
  if (!c) { c = tint(s, '#02101f'); shadowCache.set(s, c); }
  return c;
}

// ----- 그리기 도우미 -----
function mirror(g, fn) { fn(); g.save(); g.scale(-1, 1); fn(); g.restore(); }
function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function outline(g) { g.strokeStyle = 'rgba(8,12,20,0.8)'; g.lineWidth = 0.32; g.stroke(); }
// 앞전은 밝게, 뒷전은 어둡게 (날개 입체감)
function shade(g, y0, y1) {
  const gr = g.createLinearGradient(0, y0, 0, y1);
  gr.addColorStop(0, 'rgba(255,255,255,0.32)');
  gr.addColorStop(0.45, 'rgba(255,255,255,0)');
  gr.addColorStop(0.55, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,0.34)');
  g.fillStyle = gr;
  g.fillRect(-60, y0 - 2, 120, y1 - y0 + 4);
}
// 원통형 동체 음영 (왼쪽 위에서 빛)
function cylShade(g, x0, x1, y0, y1) {
  const gr = g.createLinearGradient(x0, 0, x1, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0.42)');
  gr.addColorStop(0.3, 'rgba(255,255,255,0.34)');
  gr.addColorStop(0.48, 'rgba(255,255,255,0.04)');
  gr.addColorStop(1, 'rgba(0,0,0,0.5)');
  g.fillStyle = gr;
  g.fillRect(x0 - 1, y0, x1 - x0 + 2, y1 - y0);
}
function glass(g, x, y, rx, ry) {
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  const cg = g.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
  cg.addColorStop(0, '#dff5ff'); cg.addColorStop(0.4, '#6fb4dc'); cg.addColorStop(1, '#173550');
  g.fillStyle = cg; g.fill();
  g.strokeStyle = '#1a2028'; g.lineWidth = 0.34; g.stroke();
}
function propBlur(g, x, y, half, alpha) {
  g.fillStyle = `rgba(235,240,245,${alpha})`;
  g.beginPath(); g.ellipse(x, y, half, 0.45, 0, 0, Math.PI * 2); g.fill();
}
function spinner(g, x, y, r, color) {
  g.beginPath(); g.ellipse(x, y, r, r * 1.1, 0, 0, Math.PI * 2);
  g.fillStyle = color; g.fill(); outline(g);
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2); g.fill();
}

// ----- 단발 전투기 (기수 위쪽 기준) -----
function drawFighter(g, s, propWide) {
  const k = s.span || 1;
  const wing = () => {
    g.beginPath(); g.moveTo(0, -5); g.lineTo(2, -5);
    g.bezierCurveTo(7, -5.2, 12, -4.1, 13.2, -1.9);
    g.quadraticCurveTo(13.9, 0.4, 12.2, 1);
    g.bezierCurveTo(8, 2.4, 4, 3.2, 0, 3.4);
    g.closePath();
  };
  const tail = () => {
    g.beginPath(); g.moveTo(0, 8.1); g.lineTo(1, 7.9);
    g.bezierCurveTo(3.4, 7.7, 5.6, 8.3, 5.8, 9.6);
    g.quadraticCurveTo(5.9, 10.9, 4.2, 11);
    g.lineTo(0, 11.3);
    g.closePath();
  };
  mirror(g, () => {
    g.save(); g.scale(k, 1);
    g.fillStyle = '#14171c'; // 기관총
    g.fillRect(4.7, -6.7, 0.55, 2.2); g.fillRect(6.1, -6.4, 0.55, 2);
    wing(); g.fillStyle = s.base; g.fill();
    g.save(); wing(); g.clip();
    g.fillStyle = s.mark; g.fillRect(7.0, -7, 1.2, 12);
    g.fillStyle = s.accent; g.fillRect(8.2, -7, 1.2, 12);
    g.fillStyle = s.mark; g.fillRect(9.4, -7, 1.2, 12);
    g.fillStyle = s.tip; g.fillRect(11.6, -7, 4, 12);
    shade(g, -5.5, 3.6);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.16; // 패널라인
    for (const x of [3.6, 5.6, 11.6]) line(g, x, -7, x, 5);
    g.beginPath(); g.moveTo(2.4, 1.7); g.quadraticCurveTo(8, 1.2, 12.8, -0.3); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 0.35; // 앞전 하이라이트
    g.beginPath(); g.moveTo(2, -4.75); g.bezierCurveTo(7, -4.95, 12, -3.85, 13, -1.9); g.stroke();
    g.restore();
    wing(); outline(g);
    g.restore();

    tail(); g.fillStyle = s.base; g.fill();
    g.save(); tail(); g.clip();
    g.fillStyle = s.tip; g.fillRect(4.4, 7, 3, 5);
    shade(g, 7.7, 11.4);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.16; line(g, 0.8, 10, 5.6, 9.9);
    g.restore();
    tail(); outline(g);
  });

  // 동체
  const fus = () => {
    g.beginPath(); g.moveTo(0, -11.6);
    g.bezierCurveTo(1.9, -11.6, 2.5, -9.5, 2.5, -7);
    g.lineTo(2.4, -1);
    g.bezierCurveTo(2.3, 4, 1.1, 9, 0.55, 12.2);
    g.lineTo(-0.55, 12.2);
    g.bezierCurveTo(-1.1, 9, -2.3, 4, -2.4, -1);
    g.lineTo(-2.5, -7);
    g.bezierCurveTo(-2.5, -9.5, -1.9, -11.6, 0, -11.6);
    g.closePath();
  };
  mirror(g, () => { g.fillStyle = '#101317'; g.fillRect(2.3, -7.1, 0.7, 2.6); }); // 배기관
  fus(); g.fillStyle = s.base; g.fill();
  g.save(); fus(); g.clip();
  g.fillStyle = s.cowl; g.fillRect(-3, -12, 6, 4.6);
  g.fillStyle = s.accent; g.fillRect(-3, -7.4, 6, 0.7);
  g.fillStyle = s.mark; g.fillRect(-3, 5.3, 6, 0.7);
  g.fillStyle = s.accent; g.fillRect(-3, 6, 6, 1.3);
  cylShade(g, -2.6, 2.6, -13, 13);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.16;
  for (const y of [-5, 3.4]) line(g, -3, y, 3, y);
  g.restore();
  fus(); outline(g);

  // 수직꼬리날개
  g.strokeStyle = s.tip; g.lineWidth = 0.75; line(g, 0, 7.4, 0, 12);
  g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.2; line(g, -0.2, 7.4, -0.2, 12);

  // 캐노피
  glass(g, 0, -1.2, 1.55, 3.3);
  g.strokeStyle = 'rgba(26,32,40,0.75)'; g.lineWidth = 0.24;
  line(g, -1.4, -2.4, 1.4, -2.4); line(g, -1.5, 0.1, 1.5, 0.1);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath(); g.ellipse(-0.55, -3.2, 0.28, 0.75, -0.2, 0, Math.PI * 2); g.fill();

  // 프로펠러 (위에서 보면 가로로 번진 선) + 스피너
  propBlur(g, 0, -11.5, propWide ? 6.2 : 4.4, propWide ? 0.55 : 0.32);
  spinner(g, 0, -12, 0.95, s.accent);
}

// ----- 쌍발 폭격기 (기수 위쪽 기준) -----
function drawBomber(g, s) {
  const wing = () => {
    g.beginPath(); g.moveTo(0, -6.5); g.lineTo(3, -6.5);
    g.bezierCurveTo(12, -6.6, 21, -4.6, 23.5, -2.6);
    g.quadraticCurveTo(24.6, -0.5, 22.6, 0.3);
    g.bezierCurveTo(15, 2.6, 8, 4.6, 0, 5);
    g.closePath();
  };
  const tail = () => {
    g.beginPath(); g.moveTo(0, 14.6); g.lineTo(2, 14.4);
    g.bezierCurveTo(5, 14.2, 8.6, 14.6, 9.2, 15.8);
    g.quadraticCurveTo(9.4, 17.6, 7.6, 17.8);
    g.lineTo(0, 18.2);
    g.closePath();
  };
  const nacelle = () => {
    g.beginPath(); g.moveTo(8.5, -11.2);
    g.bezierCurveTo(10.3, -11.2, 10.7, -9.4, 10.7, -7.4);
    g.lineTo(10.5, 1);
    g.quadraticCurveTo(10.2, 4.8, 8.5, 5.4);
    g.quadraticCurveTo(6.8, 4.8, 6.5, 1);
    g.lineTo(6.3, -7.4);
    g.bezierCurveTo(6.3, -9.4, 6.7, -11.2, 8.5, -11.2);
    g.closePath();
  };
  mirror(g, () => {
    wing(); g.fillStyle = s.base; g.fill();
    g.save(); wing(); g.clip();
    g.fillStyle = s.mark; g.fillRect(14.6, -8, 1.4, 14);
    g.fillStyle = s.accent; g.fillRect(16, -8, 1.6, 14);
    g.fillStyle = s.mark; g.fillRect(17.6, -8, 1.4, 14);
    g.fillStyle = s.tip; g.fillRect(21.6, -8, 4, 14);
    shade(g, -7, 5.2);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.18;
    for (const x of [4.6, 12.4, 14.6, 21.6]) line(g, x, -8, x, 6);
    g.beginPath(); g.moveTo(3, 3.2); g.quadraticCurveTo(14, 1.8, 23, -1); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 0.4;
    g.beginPath(); g.moveTo(3, -6.25); g.bezierCurveTo(12, -6.35, 21, -4.35, 23.3, -2.6); g.stroke();
    g.restore();
    wing(); outline(g);

    // 엔진 나셀
    nacelle(); g.fillStyle = s.base; g.fill();
    g.save(); nacelle(); g.clip();
    g.fillStyle = s.cowl; g.fillRect(6, -12, 5, 4);
    g.fillStyle = s.accent; g.fillRect(6, -8, 5, 0.6);
    cylShade(g, 6.3, 10.7, -12, 6);
    g.restore();
    nacelle(); outline(g);
    propBlur(g, 8.5, -11.1, 5.2, 0.5);
    spinner(g, 8.5, -11.5, 0.8, s.accent);

    // 수평꼬리날개 + 쌍수직꼬리
    tail(); g.fillStyle = s.base; g.fill();
    g.save(); tail(); g.clip(); shade(g, 14.2, 18.3); g.restore();
    tail(); outline(g);
    g.beginPath(); g.ellipse(8.6, 16.4, 0.9, 3, 0, 0, Math.PI * 2);
    g.fillStyle = s.tip; g.fill(); outline(g);
  });

  // 동체
  const fus = () => {
    g.beginPath(); g.moveTo(0, -17.6);
    g.bezierCurveTo(2.6, -17.6, 3.4, -14, 3.4, -10);
    g.lineTo(3.3, 2);
    g.bezierCurveTo(3.1, 10, 1.7, 16, 0.9, 20);
    g.lineTo(-0.9, 20);
    g.bezierCurveTo(-1.7, 16, -3.1, 10, -3.3, 2);
    g.lineTo(-3.4, -10);
    g.bezierCurveTo(-3.4, -14, -2.6, -17.6, 0, -17.6);
    g.closePath();
  };
  fus(); g.fillStyle = s.base; g.fill();
  g.save(); fus(); g.clip();
  g.fillStyle = '#7fc4e8'; g.fillRect(-4, -18, 8, 4.4); // 유리 기수
  g.strokeStyle = 'rgba(20,28,36,0.7)'; g.lineWidth = 0.22;
  line(g, 0, -18, 0, -13.6); line(g, -4, -15.6, 4, -15.6); line(g, -4, -13.6, 4, -13.6);
  g.fillStyle = s.mark; g.fillRect(-4, 9, 8, 0.8);
  g.fillStyle = s.accent; g.fillRect(-4, 9.8, 8, 1.5);
  cylShade(g, -3.5, 3.5, -18, 21);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.18;
  for (const y of [-6.5, -1, 6]) line(g, -4, y, 4, y);
  g.restore();
  fus(); outline(g);

  glass(g, 0, -10.2, 2.1, 2.6); // 조종석
  g.strokeStyle = 'rgba(26,32,40,0.75)'; g.lineWidth = 0.24;
  line(g, 0, -12.7, 0, -7.7); line(g, -2, -10.2, 2, -10.2);
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath(); g.ellipse(-0.9, -11.3, 0.3, 0.7, -0.3, 0, Math.PI * 2); g.fill();

  // 상부 포탑
  g.strokeStyle = '#14171c'; g.lineWidth = 0.4;
  line(g, -0.45, 3, -0.45, 7); line(g, 0.45, 3, 0.45, 7);
  glass(g, 0, 2.6, 1.8, 1.8);
}

// ----- 도색 -----
const SCHEME = {
  player: { base: '#c5ced8', cowl: '#c8322b', accent: '#c8322b', mark: '#f4f6f8', tip: '#1d4f91' },
  green:  { base: '#4c7a3f', cowl: '#1d2320', accent: '#e8c33a', mark: '#f2efe2', tip: '#e8c33a', span: 0.9 },
  red:    { base: '#b23a30', cowl: '#f0d14a', accent: '#f0d14a', mark: '#f5f5f5', tip: '#26282c', span: 0.9 },
  tan:    { base: '#b79a62', cowl: '#55391f', accent: '#7d2f25', mark: '#f2efe2', tip: '#7d2f25', span: 0.9 },
  bomber: { base: '#5f7552', cowl: '#20262a', accent: '#e8c33a', mark: '#f2efe2', tip: '#3d4d36' },
};

const SPR = {};
SPR.player = [
  buildSprite(30, 28, g => drawFighter(g, SCHEME.player, true)),
  buildSprite(30, 28, g => drawFighter(g, SCHEME.player, false)),
];
for (const name of ['green', 'red', 'tan']) {
  SPR[name] = buildSprite(26, 24, g => { g.scale(0.85, 0.85); drawFighter(g, SCHEME[name], true); }, true);
  SPR[name + 'Flash'] = tint(SPR[name], '#fff');
}
// 플레이어가 투하하는 폭탄 (탄두가 위쪽)
SPR.bomb = buildSprite(10, 18, g => {
  g.fillStyle = '#2a332a'; // 꼬리날개
  g.beginPath(); g.moveTo(0, 2.5); g.lineTo(3.4, 7.5); g.lineTo(3.4, 8.4); g.lineTo(-3.4, 8.4); g.lineTo(-3.4, 7.5); g.closePath(); g.fill(); outline(g);
  g.beginPath(); g.ellipse(0, -0.8, 2.5, 6, 0, 0, Math.PI * 2);
  g.fillStyle = '#4a5a46'; g.fill();
  g.save(); g.beginPath(); g.ellipse(0, -0.8, 2.5, 6, 0, 0, Math.PI * 2); g.clip();
  g.fillStyle = '#e8c33a'; g.fillRect(-3, -4.6, 6, 1.1);
  g.fillStyle = '#c8322b'; g.fillRect(-3, -7, 6, 1.6);
  cylShade(g, -2.5, 2.5, -7, 6);
  g.restore();
  g.beginPath(); g.ellipse(0, -0.8, 2.5, 6, 0, 0, Math.PI * 2); outline(g);
});
SPR.bomber = buildSprite(52, 42, g => drawBomber(g, SCHEME.bomber), true);
SPR.bomberFlash = tint(SPR.bomber, '#fff');
