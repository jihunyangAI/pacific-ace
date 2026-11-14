'use strict';
// 스테이지 보스 4종 (스테이지마다 순서대로 등장, 4스테이지 이후에는 더 강해져서 반복).
//  1. 전함        : 주포탑 3기 → 함교
//  2. 하늘 요새   : 엔진 4기 → 조종석 (공중 보스라 부딪히면 격추된다)
//  3. 항공모함    : 포탑 3기 → 함교탑, 전투기를 계속 발진시킨다
//  4. 해상 요새   : 회전하는 포탑 고리 → 중앙 코어의 나선 탄막
// 공통 규칙: 'main' 부위를 모두 부수면 'core'가 노출된다.
function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
function disc(g, x, y, r, color) {
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = color; g.fill(); outline(g);
}

// ===== 스프라이트 =====
const SHIP_MAIN = [[0, 78], [0, 56], [0, -56], [0, -80]]; // 주포탑 4기 (함미 2, 함수 2)
const SHIP_AA = [[-12, -6], [12, -6], [-12, 30], [12, 30]];
const SHIP_CORE = [0, -14];
const SHIP_FUNNELS = [[0, 8], [0, 24]];

// 전함: 길고 날렵한 선체(폭 1 : 길이 7), 티크 갑판, 층층이 쌓인 함교, 연돌 2개,
// 현측 부포, 구명정, 크레인, 함미 캐터펄트와 수상기까지 그린다. (함수가 위쪽)
function drawShip(g) {
  const hull = () => {
    g.beginPath(); g.moveTo(0, -118);
    g.bezierCurveTo(3, -108, 13, -82, 16, -48);
    g.bezierCurveTo(17.6, -20, 17.6, 32, 16.5, 70);
    g.bezierCurveTo(15.5, 96, 11.5, 112, 6, 117);
    g.lineTo(-6, 117);
    g.bezierCurveTo(-11.5, 112, -15.5, 96, -16.5, 70);
    g.bezierCurveTo(-17.6, 32, -17.6, -20, -16, -48);
    g.bezierCurveTo(-13, -82, -3, -108, 0, -118);
    g.closePath();
  };
  const deck = () => { g.save(); g.scale(0.87, 0.982); hull(); g.restore(); };
  const poly = pts => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  const sym = pts => [...pts, ...pts.slice().reverse().map(([x, y]) => [-x, y])];
  const lit = (x0, x1, y0, y1) => { // 왼쪽 위에서 드는 빛
    const lg = g.createLinearGradient(x0, 0, x1, 0);
    lg.addColorStop(0, 'rgba(255,255,255,0.24)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.02)'); lg.addColorStop(1, 'rgba(0,0,0,0.32)');
    g.fillStyle = lg; g.fillRect(x0 - 1, y0, x1 - x0 + 2, y1 - y0);
  };
  const block = (pts, color) => { // 입체 구조물 한 층
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.save(); g.translate(1, 1.4); poly(pts); g.fill(); g.restore(); // 드리운 그림자
    poly(pts); g.fillStyle = color; g.fill();
    g.save(); poly(pts); g.clip();
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    lit(Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys));
    g.restore();
    poly(pts); outline(g);
  };

  // 선체
  hull(); g.fillStyle = '#39424c'; g.fill();
  g.save(); hull(); g.clip(); cylShade(g, -17.6, 17.6, -120, 120); g.restore();
  hull(); outline(g);

  // 갑판: 함수·함미는 강철, 가운데는 티크 판재
  deck(); g.fillStyle = '#56606a'; g.fill();
  g.save(); deck(); g.clip();
  g.fillStyle = '#86704f'; g.fillRect(-16, -90, 32, 184);
  g.strokeStyle = 'rgba(45,30,15,0.28)'; g.lineWidth = 0.13;
  for (let x = -15.6; x <= 15.6; x += 1.2) line(g, x, -90, x, 94);
  g.fillStyle = 'rgba(45,30,15,0.3)'; // 판재 이음매
  for (let y = -88, k = 0; y < 94; y += 4.5, k++)
    for (let x = -15 + (k % 3) * 1.2; x < 15; x += 3.6) g.fillRect(x, y, 1.2, 0.14);
  g.fillStyle = 'rgba(0,0,0,0.16)'; // 연돌 그을음
  g.beginPath(); g.ellipse(0, 36, 6, 14, 0, 0, Math.PI * 2); g.fill();
  lit(-16, 16, -120, 120);
  // 함수: 닻줄, 캡스턴, 파도막이
  g.strokeStyle = 'rgba(15,18,22,0.75)'; g.lineWidth = 0.4;
  line(g, -1, -112, -2.6, -95); line(g, 1, -112, 2.6, -95);
  g.strokeStyle = '#2c333b'; g.lineWidth = 0.7;
  g.beginPath(); g.moveTo(-11, -89); g.lineTo(0, -94); g.lineTo(11, -89); g.stroke();
  g.fillStyle = '#2c333b';
  for (const [x, y] of [[-2.6, -95], [2.6, -95], [0, -103]]) dot(g, x, y, 0.9);
  // 함미: 해치
  for (const [x, y] of [[-6, 100], [3.5, 106], [-3, 111]]) {
    g.fillStyle = '#434c55'; g.fillRect(x, y, 3, 2.2);
    g.strokeStyle = 'rgba(8,12,20,0.5)'; g.lineWidth = 0.15; g.strokeRect(x, y, 3, 2.2);
  }
  g.restore();
  deck(); g.strokeStyle = 'rgba(205,215,225,0.4)'; g.lineWidth = 0.22; g.stroke(); // 난간

  // 주포탑 받침 (바벳)
  for (const [x, y] of SHIP_MAIN) {
    disc(g, x, y, 8.8, '#48525c');
    g.strokeStyle = 'rgba(200,210,220,0.3)'; g.lineWidth = 0.25;
    g.beginPath(); g.arc(x, y, 7.4, 0, Math.PI * 2); g.stroke();
  }

  // 함미 캐터펄트 + 수상기
  g.strokeStyle = '#434c55'; g.lineWidth = 1.8; line(g, 0, 93, 0, 113);
  g.strokeStyle = 'rgba(200,210,220,0.45)'; g.lineWidth = 0.2; line(g, -0.6, 93, -0.6, 113); line(g, 0.6, 93, 0.6, 113);
  g.save(); g.translate(0.5, 101); g.rotate(0.5); g.scale(0.3, 0.3);
  drawFighter(g, SCHEME.tan, false);
  g.restore();
  // 크레인
  mirror(g, () => {
    g.strokeStyle = '#353d46'; g.lineWidth = 0.7; line(g, 9, 48, 3.5, 62);
    g.fillStyle = '#353d46'; dot(g, 9, 48, 1.2);
  });

  // 상부 구조물: 3층으로 쌓는다
  block(sym([[5.5, -40], [9.5, -30], [9.5, 36], [6.5, 46]]), '#65707b');
  // 현측 부포 (연장 포신이 바깥을 향한다)
  mirror(g, () => {
    for (const y of [-27, 8, 19, 41]) {
      g.strokeStyle = '#1d2227'; g.lineWidth = 0.55;
      line(g, 13, y - 0.85, 17, y - 0.85); line(g, 13, y + 0.85, 17, y + 0.85);
      rr(g, 10.2, y - 2.3, 4.6, 4.6, 1.3); g.fillStyle = '#818d98'; g.fill(); outline(g);
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(10.8, y - 1.6, 1.2, 0.5);
    }
    // 구명정
    for (const y of [11.5, 23]) { rr(g, 7.3, y, 2, 5.2, 1); g.fillStyle = '#d6d0be'; g.fill(); outline(g); }
    // 기총좌
    g.fillStyle = '#22272d';
    for (const [x, y] of [[5, -36], [4.2, 43], [8.2, -21], [8.2, 34]]) {
      dot(g, x, y, 1); g.fillRect(x - 0.15, y - 2, 0.3, 2);
    }
  });
  block(sym([[4.5, -33], [7, -26], [7, 30], [5, 38]]), '#7b8792');
  // 함교 날개
  rr(g, -13, -15.4, 26, 2.8, 1); g.fillStyle = '#8d99a4'; g.fill(); outline(g);
  mirror(g, () => disc(g, 12.6, -14, 1.5, '#a5b1bc'));
  disc(g, SHIP_CORE[0], SHIP_CORE[1], 9.2, '#5c6772'); // 함교탑 받침
  // 연돌 2개
  for (const [fx0, fy] of SHIP_FUNNELS) {
    rr(g, fx0 - 4.6, fy - 6.4, 9.2, 12.8, 3); g.fillStyle = '#59636d'; g.fill(); outline(g);
    g.beginPath(); g.ellipse(fx0, fy, 3.6, 5.1, 0, 0, Math.PI * 2); g.fillStyle = '#8b97a2'; g.fill(); outline(g);
    g.beginPath(); g.ellipse(fx0, fy, 2.5, 3.9, 0, 0, Math.PI * 2); g.fillStyle = '#0d0f12'; g.fill();
    g.strokeStyle = 'rgba(160,170,180,0.5)'; g.lineWidth = 0.18;
    line(g, fx0 - 2.2, fy - 1.3, fx0 + 2.2, fy - 1.3); line(g, fx0 - 2.2, fy + 1.3, fx0 + 2.2, fy + 1.3);
  }
  // 후부 마스트
  g.strokeStyle = '#272d34'; g.lineWidth = 0.5; line(g, -7.5, 38, 7.5, 38); line(g, 0, 33.5, 0, 42);
  disc(g, 0, 38, 2.2, '#48525c');
  g.fillStyle = '#c8322b'; dot(g, 0, 38, 0.7);
  // 대공포 받침
  for (const [x, y] of SHIP_AA) disc(g, x, y, 4.4, '#48525c');
}
// 3연장 주포탑 (포신은 +y 방향). 각진 장갑 포탑 + 긴 포신 + 측거의
function drawMainTurret(g) {
  for (const x of [-3.3, 0, 3.3]) {
    const len = x ? 13.5 : 14.5;
    g.fillStyle = '#1b2026'; g.fillRect(x - 0.6, 5, 1.2, len);
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(x - 0.6, 5, 0.35, len);
    g.fillStyle = '#39414a'; g.fillRect(x - 0.95, 5, 1.9, 4);      // 포신 덮개
    g.fillStyle = '#0f1216'; g.fillRect(x - 0.8, 4.4 + len, 1.6, 0.9); // 포구
  }
  const house = () => {
    g.beginPath();
    g.moveTo(-5.6, -6.6); g.lineTo(5.6, -6.6); g.lineTo(6.4, -1.5); g.lineTo(4.6, 6.2);
    g.lineTo(-4.6, 6.2); g.lineTo(-6.4, -1.5);
    g.closePath();
  };
  g.fillStyle = '#56616b'; g.fillRect(-8.4, -4.3, 2.4, 2.6); g.fillRect(6, -4.3, 2.4, 2.6); // 측거의
  house(); g.fillStyle = '#7d8994'; g.fill();
  g.save(); house(); g.clip(); cylShade(g, -6.4, 6.4, -7, 7); g.restore();
  house(); outline(g);
  g.beginPath(); // 윗면 장갑판
  g.moveTo(-3.8, -5); g.lineTo(3.8, -5); g.lineTo(4.4, -1.6); g.lineTo(3.2, 4); g.lineTo(-3.2, 4); g.lineTo(-4.4, -1.6);
  g.closePath();
  g.fillStyle = '#98a4af'; g.fill();
  g.strokeStyle = 'rgba(8,12,20,0.5)'; g.lineWidth = 0.2; g.stroke();
  g.strokeStyle = 'rgba(8,12,20,0.4)'; line(g, -3.6, -1.6, 3.6, -1.6);
  g.fillStyle = '#2a3038'; dot(g, -2, -3.4, 0.55); dot(g, 2, -3.4, 0.55); // 해치
}
function drawAA(g) {
  g.fillStyle = '#20252b'; g.fillRect(-1.4, 1, 0.9, 5.6); g.fillRect(0.5, 1, 0.9, 5.6);
  disc(g, 0, 0, 3, '#9aa6b1');
  g.fillStyle = '#5f6b76'; g.beginPath(); g.arc(0, 0, 1.3, 0, Math.PI * 2); g.fill();
}
// 함교탑(코어): 층층이 쌓인 팔각 탑 + 측거의 + 레이더
function drawCore(g) {
  const oct = r => {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + i * Math.PI / 4;
      i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
  };
  oct(9); g.fillStyle = '#717d88'; g.fill();
  g.save(); oct(9); g.clip(); cylShade(g, -9, 9, -9, 9); g.restore();
  oct(9); outline(g);
  g.strokeStyle = '#131a22'; g.lineWidth = 0.9; // 함교 창 (앞쪽)
  g.beginPath(); g.arc(0, 0, 7.4, Math.PI * 0.22, Math.PI * 0.78); g.stroke();
  oct(6.2); g.fillStyle = '#8f9ba6'; g.fill(); outline(g);
  g.fillStyle = '#39414a'; g.fillRect(-9.6, -1.9, 19.2, 1.5);        // 측거의
  g.fillStyle = '#56616b'; g.fillRect(-10.2, -2.3, 1.6, 2.3); g.fillRect(8.6, -2.3, 1.6, 2.3);
  oct(3.6); g.fillStyle = '#a9b5c0'; g.fill(); outline(g);
  g.strokeStyle = '#20262d'; g.lineWidth = 0.35;                      // 레이더 안테나
  line(g, -3.4, 1.4, 3.4, 1.4); line(g, -2.4, 2.6, 2.4, 2.6); line(g, 0, 0.6, 0, 3.4);
  disc(g, 0, -0.6, 1.5, '#c8322b');
  g.fillStyle = 'rgba(255,255,255,0.6)'; dot(g, -0.45, -1.05, 0.45);
}

// --- 공용 그리기 도우미 ---
function polyPath(g, pts) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); }
function litX(g, x0, x1, y0, y1) { // 왼쪽에서 드는 빛
  const lg = g.createLinearGradient(x0, 0, x1, 0);
  lg.addColorStop(0, 'rgba(255,255,255,0.24)'); lg.addColorStop(0.5, 'rgba(255,255,255,0.02)'); lg.addColorStop(1, 'rgba(0,0,0,0.32)');
  g.fillStyle = lg; g.fillRect(x0 - 1, y0, x1 - x0 + 2, y1 - y0);
}
function blockOn(g, pts, color) { // 그림자를 드리우는 입체 구조물
  g.save(); g.translate(1, 1.4); polyPath(g, pts); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fill(); g.restore();
  polyPath(g, pts); g.fillStyle = color; g.fill();
  g.save(); polyPath(g, pts); g.clip();
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  litX(g, Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys));
  g.restore();
  polyPath(g, pts); outline(g);
}
const boxPts = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// --- 하늘 요새 (기수 위쪽 기준으로 그린 뒤 뒤집는다) ---
// 위장 무늬, 제빙 부츠, 패널 격자, 배기 그을음, 폭탄창, 유리 기수, 꼬리 총좌까지 그린다.
const GIANT = { base: '#5d6a4f', camo: 'rgba(50,64,46,0.82)', dark: '#39443a', accent: '#e8c33a', mark: '#f2efe2' };
const GIANT_ENG = [[24, -12], [50, -5]];
function drawGiant(g) {
  const s = GIANT, T = Math.PI * 2;
  const wing = () => {
    g.beginPath(); g.moveTo(0, -15.5); g.lineTo(6, -15.5);
    g.bezierCurveTo(30, -13, 60, -6.5, 79, -1.5);
    g.quadraticCurveTo(84, 0.5, 83, 4.5);
    g.quadraticCurveTo(82, 8.5, 77, 9);
    g.bezierCurveTo(55, 11.5, 28, 16, 0, 18);
    g.closePath();
  };
  const tail = () => {
    g.beginPath(); g.moveTo(0, 45.5); g.lineTo(3, 45);
    g.bezierCurveTo(12, 44.5, 25, 47, 28, 50.5);
    g.quadraticCurveTo(29.5, 54.5, 25, 55.5);
    g.lineTo(0, 58);
    g.closePath();
  };
  const blot = list => { // 위장 얼룩
    g.fillStyle = s.camo;
    for (const [x, y, rx, ry, a] of list) { g.beginPath(); g.ellipse(x, y, rx, ry, a, 0, T); g.fill(); }
  };
  mirror(g, () => {
    wing(); g.fillStyle = s.base; g.fill();
    g.save(); wing(); g.clip();
    blot([[13, 3, 9, 6, 0.3], [33, -7, 11, 4.5, -0.2], [45, 9, 10, 3.5, 0.1], [61, -1, 10, 4.5, 0.25], [75, 5, 7, 4, 0], [22, 14, 9, 2.6, 0]]);
    g.fillStyle = s.mark; g.fillRect(63, -12, 2.2, 26);
    g.fillStyle = s.accent; g.fillRect(65.2, -12, 3, 26);
    g.fillStyle = s.mark; g.fillRect(68.2, -12, 2.2, 26);
    g.fillStyle = s.accent; g.fillRect(78, -6, 8, 18);
    g.save(); g.translate(39, 2); g.rotate(Math.PI / 4); // 부대 표식
    g.fillStyle = s.mark; g.fillRect(-3.8, -3.8, 7.6, 7.6);
    g.fillStyle = '#1c211c'; g.fillRect(-2.8, -2.8, 5.6, 5.6);
    g.fillStyle = s.accent; g.fillRect(-1.6, -1.6, 3.2, 3.2);
    g.restore();
    for (const [ex, ey] of GIANT_ENG) { // 엔진 뒤로 번진 배기 그을음
      const eg = g.createLinearGradient(0, ey + 6, 0, ey + 27);
      eg.addColorStop(0, 'rgba(10,10,10,0.5)'); eg.addColorStop(1, 'rgba(10,10,10,0)');
      g.fillStyle = eg; g.fillRect(ex - 2.8, ey + 6, 5.6, 22);
    }
    shade(g, -16, 18.5);
    g.strokeStyle = 'rgba(0,0,0,0.26)'; g.lineWidth = 0.2; // 패널 격자
    for (let x = 10; x < 80; x += 7) line(g, x, -17, x, 20);
    line(g, 0, -3, 82, 3);
    g.lineWidth = 0.3; // 플랩·에일러론
    g.beginPath(); g.moveTo(6, 13.2); g.bezierCurveTo(28, 11.6, 55, 7.8, 77, 5.6); g.stroke();
    for (const x of [30, 56]) line(g, x, 7, x, 16);
    g.fillStyle = '#22281f';
    for (const [x, y] of [[14, -6], [31, -3], [58, 1.5], [44, -1]]) dot(g, x, y, 0.65); // 연료 주입구
    g.strokeStyle = '#1a1f1a'; g.lineWidth = 1.5; // 앞전 제빙 부츠
    g.beginPath(); g.moveTo(6, -15.4); g.bezierCurveTo(30, -12.9, 60, -6.4, 79, -1.4); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 0.3;
    g.beginPath(); g.moveTo(6, -14.4); g.bezierCurveTo(30, -11.9, 60, -5.4, 79, -0.5); g.stroke();
    g.restore();
    wing(); outline(g);

    for (const [ex, ey] of GIANT_ENG) { // 날개 위로 이어지는 엔진 나셀
      const nac = () => {
        g.beginPath(); g.moveTo(ex - 3.6, ey - 3); g.lineTo(ex + 3.6, ey - 3); g.lineTo(ex + 3.2, ey + 10);
        g.quadraticCurveTo(ex, ey + 19, ex - 3.2, ey + 10); g.closePath();
      };
      nac(); g.fillStyle = s.dark; g.fill();
      g.save(); nac(); g.clip(); cylShade(g, ex - 3.6, ex + 3.6, ey - 4, ey + 20); g.restore();
      nac(); outline(g);
    }

    tail(); g.fillStyle = s.base; g.fill();
    g.save(); tail(); g.clip();
    blot([[12, 50, 7, 3, 0.1]]);
    g.fillStyle = s.accent; g.fillRect(24.5, 44, 6, 13);
    shade(g, 44.5, 58);
    g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 0.25; line(g, 3, 53.8, 26, 52.3);
    g.restore();
    tail(); outline(g);
  });

  const fus = () => {
    g.beginPath(); g.moveTo(0, -52);
    g.bezierCurveTo(4.8, -52, 6, -46, 6, -40);
    g.lineTo(5.8, 10);
    g.bezierCurveTo(5.4, 30, 3, 48, 1.6, 60);
    g.lineTo(-1.6, 60);
    g.bezierCurveTo(-3, 48, -5.4, 30, -5.8, 10);
    g.lineTo(-6, -40);
    g.bezierCurveTo(-6, -46, -4.8, -52, 0, -52);
    g.closePath();
  };
  fus(); g.fillStyle = s.base; g.fill();
  g.save(); fus(); g.clip();
  blot([[0, -30, 6, 7, 0], [0, 2, 6, 9, 0], [0, 47, 5, 5, 0]]);
  g.fillStyle = '#7fc4e8'; g.fillRect(-7, -53, 14, 7.5); // 유리 기수
  g.strokeStyle = 'rgba(20,28,36,0.75)'; g.lineWidth = 0.25;
  for (const x of [-2.6, 0, 2.6]) line(g, x, -53, x, -45.5);
  line(g, -7, -50, 7, -50); line(g, -7, -47.6, 7, -47.6); line(g, -7, -45.5, 7, -45.5);
  g.fillStyle = s.mark; g.fillRect(-7, 36, 14, 1.2); g.fillRect(-7, 39.8, 14, 1.2);
  g.fillStyle = s.accent; g.fillRect(-7, 37.2, 14, 2.6);
  cylShade(g, -6, 6, -53, 61);
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 0.2;
  for (let y = -40; y < 56; y += 7) line(g, -7, y, 7, y);
  g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 0.25; // 폭탄창 문
  line(g, -1.8, -12, -1.8, 16); line(g, 1.8, -12, 1.8, 16);
  line(g, -1.8, -12, 1.8, -12); line(g, -1.8, 2, 1.8, 2); line(g, -1.8, 16, 1.8, 16);
  g.restore();
  fus(); outline(g);
  g.fillStyle = '#16202a'; g.fillRect(-6.3, 27, 1.1, 3.2); g.fillRect(5.2, 27, 1.1, 3.2); // 측면 총좌 창
  glass(g, 0, -30, 1.7, 1.7);                                                             // 천측창
  g.strokeStyle = s.dark; g.lineWidth = 1.5; line(g, 0, 36, 0, 60.4);                     // 수직꼬리날개
  g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 0.3; line(g, -0.5, 36, -0.5, 60.4);
  glass(g, 0, 59.8, 1.5, 1.8);                                                            // 꼬리 총좌
  for (const y of [-8, 22]) disc(g, 0, y, 4.6, s.dark);                                   // 포탑 받침
}
function drawEngine(g) { // 프로펠러가 +y 방향
  const body = () => rr(g, -3.8, -8.5, 7.6, 16, 3.4);
  body(); g.fillStyle = GIANT.base; g.fill();
  g.save(); body(); g.clip();
  g.fillStyle = '#1d2226'; g.fillRect(-4, 3, 8, 5);
  g.fillStyle = GIANT.accent; g.fillRect(-4, 2.2, 8, 0.8);
  g.fillStyle = 'rgba(0,0,0,0.35)'; // 카울 플랩
  for (let x = -3; x <= 3; x += 1.5) g.fillRect(x - 0.12, -1.6, 0.24, 3.6);
  cylShade(g, -3.8, 3.8, -9, 8);
  g.restore();
  body(); outline(g);
  g.fillStyle = '#0c0e10'; g.beginPath(); g.ellipse(0, 7, 2.4, 0.7, 0, 0, Math.PI * 2); g.fill();
  propBlur(g, 0, 8.4, 9.2, 0.5);
  spinner(g, 0, 8.8, 1, GIANT.accent);
}
function drawCockpit(g) { // 온실형 조종석
  glass(g, 0, 0, 5.6, 6.6);
  g.strokeStyle = 'rgba(26,32,40,0.8)'; g.lineWidth = 0.3;
  line(g, 0, -6.4, 0, 6.4); line(g, -5.4, -1.5, 5.4, -1.5); line(g, -5, 3, 5, 3);
  line(g, -2.8, -5.6, -2.8, 5.6); line(g, 2.8, -5.6, 2.8, 5.6);
  disc(g, 0, 0.6, 1.7, '#c8322b');
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath(); g.ellipse(-2.4, -3.4, 0.6, 1.5, -0.4, 0, Math.PI * 2); g.fill();
}

// --- 항공모함 ---
// 선체 옆으로 튀어나온 포좌, 판재 갑판, 캐터펄트 궤도, 착함 와이어, 함번, 엘리베이터,
// 줄지어 세운 함재기, 층층이 쌓은 함교와 연돌까지 그린다. (함수가 위쪽)
const CARRIER_MAIN = [[-14, -84], [14, 52], [-14, 80]];
const CARRIER_AA = [[14, -74], [-14, -12], [14, 92]];
function drawCarrier(g) {
  const hull = () => {
    g.beginPath(); g.moveTo(0, -120);
    g.bezierCurveTo(5, -114, 13, -98, 14.5, -78);
    g.lineTo(15, 80);
    g.bezierCurveTo(15, 100, 10, 114, 5, 118);
    g.lineTo(-5, 118);
    g.bezierCurveTo(-10, 114, -15, 100, -15, 80);
    g.lineTo(-14.5, -78);
    g.bezierCurveTo(-13, -98, -5, -114, 0, -120);
    g.closePath();
  };
  const deck = () => {
    g.beginPath(); g.moveTo(-9, -116); g.lineTo(9, -116);
    g.quadraticCurveTo(16, -114, 16.5, -104); g.lineTo(17, 104);
    g.quadraticCurveTo(16.5, 114, 10, 116); g.lineTo(-10, 116);
    g.quadraticCurveTo(-16.5, 114, -17, 104); g.lineTo(-16.5, -104);
    g.quadraticCurveTo(-16, -114, -9, -116);
    g.closePath();
  };
  hull(); g.fillStyle = '#39424c'; g.fill();
  g.save(); hull(); g.clip(); cylShade(g, -15, 15, -122, 120); g.restore();
  hull(); outline(g);
  // 현측 포좌 (스폰손)
  mirror(g, () => {
    for (const y of [-52, -30, 20, 66]) {
      rr(g, 14, y - 5, 5.6, 10, 1.6); g.fillStyle = '#4a545e'; g.fill(); outline(g);
      g.strokeStyle = '#1d2227'; g.lineWidth = 0.45;
      for (const dy of [-2.2, 2.2]) { line(g, 17.2, y + dy, 20.6, y + dy); g.fillStyle = '#7d8994'; dot(g, 17, y + dy, 1.1); }
    }
  });
  // 비행갑판
  g.save(); g.translate(1, 1.6); deck(); g.fillStyle = 'rgba(0,0,0,0.32)'; g.fill(); g.restore();
  deck(); g.fillStyle = '#3a4148'; g.fill();
  g.save(); deck(); g.clip();
  g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.12; // 갑판 판재
  for (let x = -16.5; x <= 16.5; x += 1.1) line(g, x, -116, x, 116);
  g.fillStyle = 'rgba(0,0,0,0.2)'; // 착함 구역의 닳은 자국
  g.beginPath(); g.ellipse(0, 66, 7, 44, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(10,10,12,0.35)'; g.lineWidth = 0.4; // 타이어 자국
  for (const [x1, x2] of [[-3, -1.5], [2.4, 1], [-0.6, 0.8], [4, 2.2]]) line(g, x1, 108, x2, 38);
  litX(g, -17, 17, -118, 118);
  // 캐터펄트 궤도 2줄
  for (const x of [-5, 5]) {
    g.strokeStyle = '#1e2328'; g.lineWidth = 1; line(g, x, -112, x, -56);
    g.strokeStyle = 'rgba(190,200,210,0.5)'; g.lineWidth = 0.15; line(g, x - 0.5, -112, x - 0.5, -56); line(g, x + 0.5, -112, x + 0.5, -56);
  }
  g.fillStyle = 'rgba(255,255,255,0.82)'; // 중앙선
  for (let y = -50; y < 110; y += 10) g.fillRect(-0.4, y, 0.8, 5.5);
  g.fillStyle = 'rgba(232,195,58,0.85)';  // 가장자리 노란 선
  g.fillRect(-11.6, -108, 0.5, 218); g.fillRect(11.1, -108, 0.5, 218);
  g.fillStyle = 'rgba(255,255,255,0.75)'; // 함수·함미 끝단 줄무늬
  for (let x = -15; x < 16; x += 3) { g.fillRect(x, -116, 1.5, 3.2); g.fillRect(x, 112.6, 1.5, 3.2); }
  g.strokeStyle = 'rgba(15,15,18,0.8)'; g.lineWidth = 0.3; // 착함 와이어
  for (let y = 62; y <= 102; y += 8) line(g, -16, y, 16, y);
  // 함번 '7'
  g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(-3.4, -100, 6.8, 1.7);
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.7; g.lineCap = 'butt'; line(g, 2.6, -99.2, -1.4, -87); g.lineCap = 'round';
  g.restore();
  deck(); outline(g);
  deck(); g.strokeStyle = 'rgba(200,210,220,0.3)'; g.lineWidth = 0.5; g.setLineDash([0.7, 0.9]); g.stroke(); g.setLineDash([]); // 안전망
  // 엘리베이터
  for (const [x, y] of [[-6, -46], [-6, 26]]) {
    rr(g, x, y, 12, 13, 1); g.fillStyle = '#434b53'; g.fill();
    g.strokeStyle = 'rgba(210,220,230,0.55)'; g.lineWidth = 0.25; g.stroke();
    g.strokeStyle = 'rgba(0,0,0,0.3)'; line(g, x + 1, y + 1, x + 11, y + 12); line(g, x + 11, y + 1, x + 1, y + 12);
  }
  // 줄지어 세운 함재기 + 견인차
  for (const [x, y, a, sc] of [
    [-11, -70, 0.5, 'green'], [-11, -60, 0.5, 'green'], [-11, -22, 0.5, 'tan'], [-11, -12, 0.5, 'green'],
    [-10, 8, 0.5, 'green'], [8, -40, -0.6, 'tan'], [9, -28, -0.6, 'green'], [0, -33, 0.1, 'red'], [-10, 46, 0.4, 'tan'],
  ]) {
    g.save(); g.translate(x + 0.7, y + 0.9); g.rotate(a); g.scale(0.33, 0.33);
    g.globalAlpha = 0.35; g.fillStyle = '#000'; g.beginPath(); g.ellipse(0, 0, 13, 4, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
    g.restore();
    g.save(); g.translate(x, y); g.rotate(a); g.scale(0.33, 0.33);
    drawFighter(g, SCHEME[sc], false);
    g.restore();
  }
  for (const [x, y] of [[-3, 12], [6, 2]]) { g.fillStyle = '#e0b020'; g.fillRect(x, y, 2.2, 1.5); g.strokeStyle = 'rgba(8,12,20,0.7)'; g.lineWidth = 0.2; g.strokeRect(x, y, 2.2, 1.5); }

  // 함교 (우현): 3층 + 연돌 + 마스트 + 크레인
  blockOn(g, [[8.5, -24], [17, -24], [19.5, -18], [19.5, 24], [8.5, 24]], '#65707b');
  blockOn(g, boxPts(10, -18, 8.6, 27), '#7b8792');
  rr(g, 10.4, 9.5, 6.8, 12, 2.2); g.fillStyle = '#59636d'; g.fill(); outline(g);
  g.beginPath(); g.ellipse(13.8, 15.5, 2.6, 4.4, 0, 0, Math.PI * 2); g.fillStyle = '#8b97a2'; g.fill(); outline(g);
  g.beginPath(); g.ellipse(13.8, 15.5, 1.7, 3.3, 0, 0, Math.PI * 2); g.fillStyle = '#0d0f12'; g.fill();
  g.strokeStyle = '#272d34'; g.lineWidth = 0.5; line(g, 8.6, -14, 19.4, -14);
  g.fillStyle = '#272d34'; g.fillRect(17.6, -15.6, 2.4, 3.2); // 레이더
  g.strokeStyle = '#353d46'; g.lineWidth = 0.7; line(g, 13, 25, 9, 38);
  g.fillStyle = '#353d46'; dot(g, 13, 25, 1.2);
  for (const [x, y] of CARRIER_MAIN) disc(g, x, y, 6.4, '#48525c');
  for (const [x, y] of CARRIER_AA) disc(g, x, y, 4.4, '#48525c');
}

// --- 해상 요새 ---
// 방파벽, 사방의 벙커, 침목이 깔린 포탑 궤도, 연결 다리, 볼트 박힌 중앙 허브,
// 연료 탱크·레이더·경고등·부두와 경비정까지 그린다.
function drawFortress(g) {
  const T = Math.PI * 2;
  const oct = r => {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + i * Math.PI / 4;
      i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
  };
  // 부두와 경비정 (동쪽)
  blockOn(g, boxPts(46, -3.6, 15, 7.2), '#5c656e');
  g.fillStyle = '#22272d'; for (const x of [50, 54, 58]) { dot(g, x, -2.6, 0.6); dot(g, x, 2.6, 0.6); }
  g.beginPath(); g.moveTo(56, -14.5); g.quadraticCurveTo(58.6, -11, 58.4, -5.2); g.lineTo(53.6, -5.2); g.quadraticCurveTo(53.4, -11, 56, -14.5); g.closePath();
  g.fillStyle = '#7d8994'; g.fill(); outline(g);
  g.fillStyle = '#c9d2da'; g.fillRect(54.7, -9.6, 2.6, 2.8);

  oct(54); g.fillStyle = '#343c45'; g.fill(); outline(g); // 물에 잠긴 기단
  oct(51); g.fillStyle = '#58626c'; g.fill();              // 방파벽
  g.save(); oct(51); g.clip(); litX(g, -51, 51, -52, 52); g.restore();
  oct(51); outline(g);
  oct(46); g.fillStyle = '#6a747d'; g.fill();              // 안마당
  g.save(); oct(46); g.clip();
  const lg = g.createLinearGradient(-40, -40, 40, 40);
  lg.addColorStop(0, 'rgba(255,255,255,0.18)'); lg.addColorStop(1, 'rgba(0,0,0,0.3)');
  g.fillStyle = lg; g.fillRect(-52, -52, 104, 104);
  g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.22; // 바닥 판
  for (let v = -44; v <= 44; v += 8) { line(g, v, -52, v, 52); line(g, -52, v, 52, v); }
  g.restore();
  oct(46); g.strokeStyle = 'rgba(8,12,20,0.6)'; g.lineWidth = 0.3; g.stroke();

  // 사방의 벙커 (총안 2개씩)
  for (let i = 0; i < 4; i++) {
    g.save(); g.rotate(i * Math.PI / 2 + Math.PI / 2);
    blockOn(g, [[-8, 41.5], [8, 41.5], [6.5, 50.5], [-6.5, 50.5]], '#78838d');
    g.fillStyle = '#12161a'; g.fillRect(-4.6, 47.6, 3.2, 1); g.fillRect(1.4, 47.6, 3.2, 1);
    g.fillStyle = '#4a545e'; g.fillRect(-2.2, 43, 4.4, 2.4);
    g.restore();
  }
  // 위험 표시 띠
  g.lineWidth = 2.2; g.strokeStyle = '#1b1f23';
  g.beginPath(); g.arc(0, 0, 40.4, 0, T); g.stroke();
  g.strokeStyle = '#e0b020'; g.setLineDash([3.6, 3.6]); g.lineCap = 'butt';
  g.beginPath(); g.arc(0, 0, 40.4, 0, T); g.stroke();
  g.setLineDash([]);
  // 포탑이 도는 궤도: 바닥 + 침목 + 레일 2줄
  g.lineWidth = 7.4; g.strokeStyle = '#30373f';
  g.beginPath(); g.arc(0, 0, 34, 0, T); g.stroke();
  g.strokeStyle = 'rgba(125,135,145,0.55)'; g.lineWidth = 0.7;
  for (let i = 0; i < 56; i++) { const a = i / 56 * T; line(g, Math.cos(a) * 31, Math.sin(a) * 31, Math.cos(a) * 37, Math.sin(a) * 37); }
  g.lineCap = 'round';
  g.lineWidth = 0.4; g.strokeStyle = 'rgba(205,215,225,0.75)';
  for (const r of [32.2, 35.8]) { g.beginPath(); g.arc(0, 0, r, 0, T); g.stroke(); }
  // 허브로 이어지는 다리 4개
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4, c = Math.cos(a), sn = Math.sin(a);
    g.strokeStyle = '#444d56'; g.lineWidth = 3.4; line(g, c * 17, sn * 17, c * 30, sn * 30);
    g.strokeStyle = 'rgba(205,215,225,0.4)'; g.lineWidth = 0.25;
    line(g, c * 17 - sn * 1.5, sn * 17 + c * 1.5, c * 30 - sn * 1.5, sn * 30 + c * 1.5);
    line(g, c * 17 + sn * 1.5, sn * 17 - c * 1.5, c * 30 + sn * 1.5, sn * 30 - c * 1.5);
  }
  // 배관
  g.strokeStyle = '#9a6a3a'; g.lineWidth = 0.55;
  for (const a of [0.25, 1.82, 3.4, 4.95]) line(g, Math.cos(a) * 19, Math.sin(a) * 19, Math.cos(a) * 30, Math.sin(a) * 30);
  // 중앙 허브: 볼트 박힌 장갑 링
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.arc(1, 1.4, 19.5, 0, T); g.fill();
  disc(g, 0, 0, 19.5, '#4c565f');
  g.save(); g.beginPath(); g.arc(0, 0, 19.5, 0, T); g.clip(); litX(g, -19.5, 19.5, -20, 20); g.restore();
  disc(g, 0, 0, 15.5, '#69747e');
  g.fillStyle = '#20262c';
  for (let i = 0; i < 16; i++) { const a = i / 16 * T; dot(g, Math.cos(a) * 17.5, Math.sin(a) * 17.5, 0.6); }
  disc(g, 0, 0, 12.5, '#838f9a');
  // 바깥 마당: 연료 탱크, 레이더, 상자
  for (const [a, r] of [[2.05, 43], [2.3, 43]]) {
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    disc(g, x, y, 2.5, '#aab4bd');
    g.fillStyle = 'rgba(255,255,255,0.55)'; dot(g, x - 0.8, y - 0.8, 0.8);
  }
  { const x = Math.cos(-0.72) * 43.5, y = Math.sin(-0.72) * 43.5;
    disc(g, x, y, 2.9, '#56616b');
    g.strokeStyle = '#c9d2da'; g.lineWidth = 0.5; g.beginPath(); g.arc(x, y, 2, 0.4, 2.8); g.stroke(); line(g, x, y, x + 1.6, y - 1.6); }
  for (const [a, r] of [[3.75, 43.5], [3.95, 43.5], [5.4, 43.5]]) {
    g.save(); g.translate(Math.cos(a) * r, Math.sin(a) * r); g.rotate(a);
    g.fillStyle = '#7a6a48'; g.fillRect(-1.3, -1.6, 2.6, 3.2);
    g.strokeStyle = 'rgba(8,12,20,0.7)'; g.lineWidth = 0.2; g.strokeRect(-1.3, -1.6, 2.6, 3.2);
    g.restore();
  }
  // 꼭짓점 경고등
  for (let i = 0; i < 8; i++) {
    const a = Math.PI / 8 + i * Math.PI / 4, x = Math.cos(a) * 48.6, y = Math.sin(a) * 48.6;
    g.fillStyle = 'rgba(255,70,50,0.35)'; dot(g, x, y, 2.2);
    g.fillStyle = '#ff4a3a'; dot(g, x, y, 1);
    g.fillStyle = '#fff'; dot(g, x - 0.3, y - 0.3, 0.35);
  }
}

SPR.ship = buildSprite(40, 240, drawShip);
SPR.giant = buildSprite(170, 124, drawGiant, true);
SPR.carrier = buildSprite(46, 244, drawCarrier);
SPR.fortress = buildSprite(126, 126, drawFortress);
for (const [name, lw, lh, fn] of [
  ['turret', 20, 42, drawMainTurret], ['aa', 10, 14, drawAA], ['core', 22, 22, drawCore],
  ['engine', 20, 22, drawEngine], ['cockpit', 14, 16, drawCockpit],
  ['coreBig', 28, 28, g => { g.scale(1.25, 1.25); drawCore(g); }],
]) {
  SPR[name] = buildSprite(lw, lh, fn);
  SPR[name + 'Flash'] = tint(SPR[name], '#fff');
}

// ===== 보스 정의 =====
const ring = (px, py, n, spd, off = rand(0, Math.PI * 2)) => {
  for (let i = 0; i < n; i++) enemyShot(px, py, off + i * Math.PI * 2 / n, spd);
};
const fan = (px, py, a, n, gap, spd) => {
  for (let i = 0; i < n; i++) enemyShot(px, py, a + (i - (n - 1) / 2) * gap, spd);
};
const BOSS_DEFS = [
  { // 1. 전함
    warn: '대형 전함 접근 중', spr: 'ship', wake: 114, bow: -112, funnels: SHIP_FUNNELS, startY: -135, holdY: 128, swayX: 38, swayY: 8, hw: 15, hh: 108,
    parts: [
      ...SHIP_MAIN.map(([ox, oy], i) => ({ type: 'main', ox, oy, r: 8, hp: 36, fire: 70 + i * 38, spr: 'turret', atk: 'triple', rotate: true })),
      ...SHIP_AA.map(([ox, oy], i) => ({ type: 'aa', ox, oy, r: 4.5, hp: 16, fire: 50 + i * 30, spr: 'aa', atk: 'aimed', rotate: true })),
      { type: 'core', ox: SHIP_CORE[0], oy: SHIP_CORE[1], r: 9, hp: 140, fire: 90, spr: 'core' },
    ],
    core(b, p, px, py, target, d) {
      if (++p.n % 2) ring(px, py, 12 + Math.min(stage, 6) * 2, 1.5 * d);
      else fan(px, py, target, 5, 0.18, 2 * d);
      p.fire = Math.max(40, 78 - stage * 5);
    },
  },
  { // 2. 하늘 요새
    warn: '하늘 요새 접근 중', spr: 'giant', air: true, startY: -70, holdY: 78, swayX: 34, swayY: 8, hw: 60, hh: 45,
    parts: [
      ...[[-50, 5], [-24, 12], [24, 12], [50, 5]].map(([ox, oy], i) =>
        ({ type: 'main', ox, oy, r: 6, hp: 38, fire: 60 + i * 35, spr: 'engine', atk: 'burst' })),
      { type: 'aa', ox: 0, oy: -22, r: 4.5, hp: 18, fire: 80, spr: 'aa', atk: 'fan3', rotate: true },
      { type: 'aa', ox: 0, oy: 8, r: 4.5, hp: 18, fire: 130, spr: 'aa', atk: 'fan3', rotate: true },
      { type: 'core', ox: 0, oy: 42, r: 7, hp: 130, fire: 90, spr: 'cockpit' },
    ],
    core(b, p, px, py, target, d) { // 좌우로 휩쓰는 탄줄기, 가끔 조준 부채꼴
      p.n++;
      if (p.n % 26 === 0) { fan(px, py, target, 7, 0.2, 2 * d); p.fire = 55; return; }
      const a = Math.PI / 2 + Math.sin(p.n * 0.24) * 1.15;
      enemyShot(px, py, a, 2.1 * d);
      p.fire = 7;
    },
  },
  { // 3. 항공모함
    warn: '적 항공모함 접근 중', spr: 'carrier', wake: 120, bow: -114, startY: -140, holdY: 128, swayX: 30, swayY: 8, hw: 15, hh: 110,
    parts: [
      ...CARRIER_MAIN.map(([ox, oy], i) => ({ type: 'main', ox, oy, r: 7, hp: 42, fire: 80 + i * 40, spr: 'turret', atk: 'triple', rotate: true, sc: 0.75 })),
      ...CARRIER_AA.map(([ox, oy], i) => ({ type: 'aa', ox, oy, r: 4.5, hp: 16, fire: 60 + i * 35, spr: 'aa', atk: 'aimed', rotate: true })),
      { type: 'core', ox: 13.5, oy: -2, r: 8, hp: 150, fire: 90, spr: 'core', sc: 0.85 },
    ],
    update(b, tt) { // 함재기 발진: 위로 떠오른 뒤 선회해서 덮쳐 온다
      if (tt % 230 !== 110 || player.dead || enemies.length > 8) return;
      const id = newForm(3);
      for (let i = 0; i < 3; i++) later(i * 14, () => {
        if (!boss || boss.mode !== 'fight') return;
        addEnemy({
          x: boss.x, y: boss.y - 84, vx: (i % 2 ? 1 : -1) * 1.3, vy: -1.6, form: id, score: 150,
          move(e) {
            if (e.t > 24) { e.vy = Math.min(2.5, e.vy + 0.09); e.vx += clamp((player.x - e.x) * 0.0015, -0.05, 0.05); }
            e.x += e.vx; e.y += e.vy;
          },
        });
      });
    },
    core(b, p, px, py, target, d) {
      if (++p.n % 3 === 0) ring(px, py, 16, 1.4 * d);
      else fan(px, py, target, 3 + (p.n % 3) * 2, 0.16, 2.1 * d);
      p.fire = Math.max(38, 70 - stage * 4);
    },
  },
  { // 4. 해상 요새
    warn: '해상 요새 포착', spr: 'fortress', foam: 58, startY: -70, holdY: 108, swayX: 46, swayY: 8, hw: 44, hh: 44, spin: 0.009,
    parts: [
      ...[0, 1, 2, 3, 4, 5].map(i => (i % 2
        ? { type: 'aa', ra: i * Math.PI / 3, rr: 34, r: 4.5, hp: 18, fire: 50 + i * 20, spr: 'aa', atk: 'aimed', rotate: true }
        : { type: 'main', ra: i * Math.PI / 3, rr: 34, r: 8, hp: 48, fire: 70 + i * 22, spr: 'turret', atk: 'triple', rotate: true, sc: 0.8 })),
      { type: 'core', ox: 0, oy: 0, r: 11, hp: 170, fire: 90, spr: 'coreBig' },
    ],
    core(b, p, px, py, target, d) { // 세 갈래 나선 탄막
      p.n++;
      for (let k = 0; k < 3; k++) enemyShot(px, py, p.n * 0.21 + k * Math.PI * 2 / 3, 1.5 * d);
      if (p.n % 34 === 0) ring(px, py, 18, 1.2 * d);
      p.fire = 8;
    },
  },
];

// ===== 보스 로직 =====
let boss = null;
const bossDef = () => BOSS_DEFS[(stage - 1) % BOSS_DEFS.length];
function spawnBoss() {
  const def = bossDef(), N = BOSS_DEFS.length;
  const m = 1 + Math.floor((stage - 1) / N) * 0.5 + ((stage - 1) % N) * 0.1;
  const parts = def.parts.map(pd => ({
    ...pd, ox: pd.ox || 0, oy: pd.oy || 0, hp: Math.round(pd.hp * m),
    ang: Math.PI / 2, hitF: 0, dead: false, n: 0,
  }));
  boss = { def, x: W / 2, y: def.startY, t: 0, t0: 0, mode: 'enter', dieT: 0, alpha: 1, scale: 1, rot: 0, parts };
  boss.maxHp = parts.reduce((s, p) => s + p.hp, 0);
}
const bossCoreOpen = () => boss.parts.every(p => p.type !== 'main' || p.dead);
const bossHp = () => boss.parts.reduce((s, p) => s + p.hp, 0);
function partPos(b, p) {
  if (p.rr) return [b.x + Math.cos(p.ra + b.rot) * p.rr, b.y + Math.sin(p.ra + b.rot) * p.rr];
  return [b.x + p.ox, b.y + p.oy];
}

function damagePart(p, n) {
  const b = boss, [px, py] = partPos(b, p);
  p.hp -= n; p.hitF = 3;
  if (p.hp > 0) return;
  p.hp = 0; p.dead = true;
  if (p.type === 'aa') {
    explode(px, py, 11); Sound.pop(); addShake(5); score += 500;
    if (Math.random() < 0.5) spawnItem(px, py, 'M');
  } else if (p.type === 'main') {
    explode(px, py, 20); Sound.boom(); addShake(12); hitstop = 4; score += 2000;
    for (let i = 1; i <= 3; i++) later(i * 7, () => explode(px + rand(-8, 8), py + rand(-8, 8), 11));
    addText(px, py - 14, '+2000');
    spawnItem(px, py, 'B');
    if (bossCoreOpen()) { addText(b.x, b.y - 12, 'CORE EXPOSED!'); Sound.siren(); }
  } else { // 코어 파괴 → 격침/격추
    b.mode = 'dying'; b.dieT = 210;
    explode(px, py, 26); Sound.boom(); addShake(16); hitstop = 8; flash = 10;
    for (const eb of eBullets) spark(eb.x, eb.y, '#ffd27a', 1.5);
    eBullets.length = 0;
    Sound.music.stop();
  }
}
// 플레이어 탄이 부위에 맞았는지
function bossHitTest(x, y) {
  const b = boss;
  if (!b || b.mode === 'dying') return false;
  const open = bossCoreOpen();
  for (const p of b.parts) {
    if (p.dead || (p.type === 'core' && !open)) continue;
    const [px, py] = partPos(b, p);
    if ((x - px) ** 2 + (y - py) ** 2 < (p.r + 2) ** 2) { damagePart(p, 1); return true; }
  }
  return false;
}
// 폭탄: 폭발 반경 안은 큰 피해, 밖은 작은 피해
function bossBomb(x, y, R) {
  const b = boss;
  if (!b || b.mode === 'dying' || b.y < -60) return;
  const open = bossCoreOpen();
  for (const p of b.parts) {
    if (p.dead || (p.type === 'core' && !open)) continue;
    const [px, py] = partPos(b, p);
    damagePart(p, (x - px) ** 2 + (y - py) ** 2 < R * R ? 30 : 6);
    if (b.mode === 'dying') return;
  }
}

function partAttack(b, p, px, py, target, d) {
  switch (p.atk) {
    case 'triple': {
      const reach = 19 * (p.sc || 1), mx = px + Math.cos(p.ang) * reach, my = py + Math.sin(p.ang) * reach;
      fan(mx, my, p.ang, 3, 0.2, 1.6 * d);
      fx.push({ k: 'flash', x: mx, y: my, r: 9, t: 0, max: 6 });
      Sound.cannon();
      p.fire = Math.max(60, 125 - stage * 8);
      break;
    }
    case 'aimed':
      enemyShot(px, py, target + rand(-0.08, 0.08), 2.2 * d);
      p.fire = rand(60, 100) / d;
      break;
    case 'burst': // 3연발
      enemyShot(px, py + 8, target, 2 * d);
      p.fire = ++p.n % 3 ? 9 : rand(85, 125) / d;
      break;
    case 'fan3':
      fan(px, py, target, 3, 0.25, 1.8 * d);
      p.fire = rand(80, 110) / d;
      break;
  }
}

function updateBoss() {
  const b = boss;
  if (!b) return;
  const def = b.def;
  b.t++;
  if (b.mode === 'dying') {
    b.dieT--;
    if (def.air) { b.y += 0.2; b.scale = 0.55 + 0.45 * b.dieT / 210; b.rot2 = (b.rot2 || 0) + 0.004; }
    else b.y += 0.25;
    if (b.dieT > 50 && b.dieT % 5 === 0) {
      explode(b.x + rand(-def.hw, def.hw), b.y + rand(-def.hh, def.hh), rand(10, 20));
      addShake(6);
      if (b.dieT % 15 === 0) Sound.pop();
    }
    if (b.dieT === 50) { // 대폭발
      for (let i = 0; i < 9; i++)
        explode(b.x + rand(-def.hw, def.hw) * 0.8, b.y - def.hh * 0.9 + i * def.hh * 0.225, rand(22, 32));
      Sound.bigBoom(); addShake(24); flash = 22; hitstop = 6;
    }
    if (b.dieT < 50) b.alpha = Math.max(0, b.dieT / 50);
    if (b.dieT <= 0) { boss = null; stageClear(); }
    return;
  }
  if (def.spin) b.rot += def.spin;
  if (def.funnels && b.t % 9 === 0) // 연돌 연기
    for (const [fx0, fy] of def.funnels) smokePuff(b.x + fx0, b.y + fy, rand(2.5, 4.5));
  if (b.mode === 'enter') {
    b.y += 0.7;
    if (b.y >= def.holdY) { b.mode = 'fight'; b.t0 = b.t; }
  } else {
    const tt = b.t - b.t0;
    b.x = W / 2 + Math.sin(tt * 0.008) * def.swayX;
    b.y = def.holdY + Math.sin(tt * 0.013) * def.swayY;
    if (def.update) def.update(b, tt);
  }

  // 1스테이지 보스는 탄이 느리고 발사 간격이 길다
  const open = bossCoreOpen(), d = stage === 1 ? 0.82 : Math.min(1 + (stage - 1) * 0.1, 1.8);
  for (const p of b.parts) {
    const [px, py] = partPos(b, p);
    if (p.hitF > 0) p.hitF--;
    if (p.dead) { // 부서진 부위는 계속 불탄다
      if ((b.t + Math.round(p.oy + (p.ra || 0) * 7)) % 6 === 0) {
        firePuff(px + rand(-2, 2), py + rand(-2, 2), rand(4, 7)); smokePuff(px, py, rand(5, 9));
      }
      continue;
    }
    if (py < 0 || player.dead) continue;
    // 공중 보스는 몸으로 부딪혀도 격추된다
    if (def.air && player.inv <= 0 && (player.x - px) ** 2 + (player.y - py) ** 2 < (p.r + 4) ** 2) { killPlayer(); continue; }
    const target = aimAt(px, py);
    if (p.rotate) {
      let da = target - p.ang;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      const lim = p.type === 'main' ? 0.035 : 0.1;
      p.ang += clamp(da, -lim, lim);
    }
    if (--p.fire > 0) continue;
    if (p.type !== 'core') partAttack(b, p, px, py, target, d);
    else if (open) def.core(b, p, px, py, target, d);
    else p.fire = 30;
    if (stage === 1) p.fire *= 1.45;
  }
  if (def.air && !player.dead && player.inv <= 0) { // 동체 충돌
    for (let oy = -40; oy <= 40; oy += 16)
      if ((player.x - b.x) ** 2 + (player.y - b.y - oy) ** 2 < 10 * 10) { killPlayer(); break; }
  }
}

// ===== 그리기 =====
function drawBossBody(b) {
  const def = b.def, s = b.scale;
  ctx.save();
  ctx.translate(b.x, b.y); ctx.scale(s, s); if (b.rot2) ctx.rotate(b.rot2); ctx.translate(-b.x, -b.y);
  ctx.globalAlpha = b.alpha;
  drawSprite(SPR[def.spr], b.x, b.y);
  const open = bossCoreOpen();
  for (const p of b.parts) {
    const [px, py] = partPos(b, p);
    if (p.dead) { ctx.fillStyle = 'rgba(15,12,10,0.8)'; circle(px, py, p.r * 0.95); continue; }
    drawSprite(SPR[p.hitF ? p.spr + 'Flash' : p.spr], px, py, p.rotate ? p.ang - Math.PI / 2 : 0, 1, p.sc || 1);
    if (p.type === 'core' && open && b.mode !== 'dying') { // 노출된 코어는 붉게 맥동
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = b.alpha * (0.45 + 0.25 * Math.sin(frame * 0.25));
      glowAt(GLOW.red, px, py, p.r * 1.7 + Math.sin(frame * 0.25) * 3);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = b.alpha;
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
// 바다 층: 해상 보스 본체, 또는 공중 보스의 그림자
function drawBoss() {
  const b = boss;
  if (!b) return;
  const def = b.def, spr = SPR[def.spr];
  if (def.air) {
    ctx.globalAlpha = b.alpha * 0.26;
    drawSprite(shadowOf(spr), b.x + 30, b.y + 46, b.rot2 || 0, 1, 0.72 * b.scale);
    ctx.globalAlpha = 1;
    return;
  }
  ctx.fillStyle = '#eaf6ff';
  if (def.wake) { // 항적 (배 뒤로 퍼지는 물거품)
    for (let i = 0; i < 11; i++) {
      const y = b.y + def.wake + i * 8, w = 5 + i * 3, wob = Math.sin(frame * 0.12 + i) * 1.5;
      ctx.globalAlpha = b.alpha * 0.34 * (1 - i / 11);
      circle(b.x - w + wob, y, 3 + i * 0.5);
      circle(b.x + w - wob, y, 3 + i * 0.5);
      circle(b.x + wob, y - 2, 2.5 + i * 0.3);
    }
  }
  if (def.bow) { // 함수가 가르는 물살
    for (let i = 0; i < 9; i++) {
      const y = b.y + def.bow + 8 + i * 9, w = 2.5 + Math.min(i * 2.2, 15.5), wob = Math.sin(frame * 0.15 + i * 1.3) * 0.8;
      ctx.globalAlpha = b.alpha * 0.4 * (1 - i / 10);
      circle(b.x - w - 1.5 + wob, y, 2.4); circle(b.x + w + 1.5 - wob, y, 2.4);
    }
  }
  if (def.foam) { // 요새 둘레에 부서지는 파도
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2 + frame * 0.004, r = def.foam + Math.sin(frame * 0.07 + i * 1.7) * 2.5;
      ctx.globalAlpha = b.alpha * 0.3;
      circle(b.x + Math.cos(a) * r, b.y + Math.sin(a) * r, 4.5);
    }
  }
  ctx.globalAlpha = b.alpha * 0.3;
  drawSprite(shadowOf(spr), b.x + 4, b.y + 5);
  ctx.globalAlpha = 1;
  drawBossBody(b);
}
// 공중 층: 낮은 구름 위에 그리는 공중 보스 본체
function drawBossAir() { if (boss && boss.def.air) drawBossBody(boss); }

function drawBossBar() {
  const b = boss;
  if (!b || b.mode === 'dying') return;
  const bx = 34, bw = W - 44, by = 15, r = bossHp() / b.maxHp;
  text('BOSS', 4, by + 5.5, 7, '#ff8a7a', 'left');
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx, by, bw, 5);
  ctx.fillStyle = '#e0392b'; ctx.fillRect(bx, by, bw * r, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(bx, by, bw * r, 1.5);
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 0.5; ctx.strokeRect(bx, by, bw, 5);
}
