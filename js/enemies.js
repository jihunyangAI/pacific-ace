'use strict';
// 추가 적기 스프라이트. 기수 위쪽 기준으로 그리고 buildSprite에서 뒤집는다.
// 도형 하나: 밑색 → 안쪽 디테일(클립) → 외곽선
function part(g, path, base, detail) {
  path(); g.fillStyle = base; g.fill();
  if (detail) { g.save(); path(); g.clip(); detail(); g.restore(); }
  path(); outline(g);
}
function panel(g) { g.strokeStyle = 'rgba(0,0,0,0.28)'; g.lineWidth = 0.16; }

// 쌍동 중전투기: 가운데 조종석 포드 + 엔진 붐 2개 + 붐을 잇는 꼬리날개
function drawTwinBoom(g, s) {
  const wing = () => {
    g.beginPath(); g.moveTo(0, -3.2); g.lineTo(6, -3.4);
    g.bezierCurveTo(11, -3.2, 15, -2.4, 15.6, -0.6);
    g.quadraticCurveTo(15.8, 1.2, 14, 1.5);
    g.bezierCurveTo(9, 2.6, 5, 3.4, 0, 3.6);
    g.closePath();
  };
  const boom = () => {
    g.beginPath(); g.moveTo(6.6, -9.6);
    g.bezierCurveTo(8.1, -9.6, 8.4, -8, 8.4, -6);
    g.bezierCurveTo(8.3, 0, 7.5, 6, 7.2, 12);
    g.lineTo(6, 12);
    g.bezierCurveTo(5.7, 6, 4.9, 0, 4.8, -6);
    g.bezierCurveTo(4.8, -8, 5.1, -9.6, 6.6, -9.6);
    g.closePath();
  };
  const tailplane = () => { g.beginPath(); g.rect(-7.6, 9.4, 15.2, 2.3); };
  part(g, tailplane, s.base, () => {
    g.fillStyle = s.accent; g.fillRect(-1.2, 9, 2.4, 3);
    shade(g, 9.2, 11.9);
    panel(g); line(g, -8, 10.9, 8, 10.9);
  });
  mirror(g, () => {
    g.fillStyle = '#14171c'; g.fillRect(10.2, -4.8, 0.55, 2);
    part(g, wing, s.base, () => {
      g.fillStyle = s.mark; g.fillRect(10.4, -5, 1, 9);
      g.fillStyle = s.accent; g.fillRect(11.4, -5, 1.3, 9);
      g.fillStyle = s.tip; g.fillRect(13.6, -5, 3, 9);
      shade(g, -3.6, 3.8);
      panel(g); for (const x of [2.6, 9.6, 13.6]) line(g, x, -5, x, 5);
      g.beginPath(); g.moveTo(1, 2); g.quadraticCurveTo(9, 1.6, 15, 0.2); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 0.35;
      g.beginPath(); g.moveTo(6, -3.15); g.bezierCurveTo(11, -2.95, 15, -2.2, 15.4, -0.6); g.stroke();
    });
    part(g, boom, s.base, () => {
      g.fillStyle = s.cowl; g.fillRect(4, -10, 5, 3.6);
      g.fillStyle = s.accent; g.fillRect(4, -6.4, 5, 0.6);
      g.fillStyle = '#1a1d20'; g.fillRect(6.2, -4.6, 0.8, 5); // 과급기 그을음
      cylShade(g, 4.8, 8.4, -10, 13);
      panel(g); for (const y of [-2, 4, 8]) line(g, 4, y, 9, y);
    });
    g.beginPath(); g.ellipse(6.6, 11, 0.85, 2.4, 0, 0, Math.PI * 2); // 수직꼬리
    g.fillStyle = s.tip; g.fill(); outline(g);
    propBlur(g, 6.6, -9.6, 4.6, 0.5);
    spinner(g, 6.6, -10, 0.8, s.accent);
  });
  const pod = () => {
    g.beginPath(); g.moveTo(0, -11);
    g.bezierCurveTo(1.9, -11, 2.4, -8, 2.4, -5);
    g.bezierCurveTo(2.4, 0, 1.6, 4, 0, 5.4);
    g.bezierCurveTo(-1.6, 4, -2.4, 0, -2.4, -5);
    g.bezierCurveTo(-2.4, -8, -1.9, -11, 0, -11);
    g.closePath();
  };
  part(g, pod, s.base, () => {
    g.fillStyle = s.cowl; g.fillRect(-3, -11.5, 6, 2.6);
    cylShade(g, -2.4, 2.4, -12, 6);
    panel(g); line(g, -3, -6.6, 3, -6.6);
  });
  g.fillStyle = '#14171c'; // 기수 기관포
  for (const x of [-0.9, -0.25, 0.4]) g.fillRect(x, -12.4, 0.45, 1.8);
  glass(g, 0, -2.6, 1.6, 3);
  g.strokeStyle = 'rgba(26,32,40,0.75)'; g.lineWidth = 0.24; line(g, -1.5, -2.6, 1.5, -2.6);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath(); g.ellipse(-0.6, -4.2, 0.28, 0.7, -0.2, 0, Math.PI * 2); g.fill();
}

// 전익기: 꼬리 없는 부메랑형 날개, 뒤쪽 추진 프로펠러
function drawFlyingWing(g, s) {
  const wing = () => {
    g.beginPath(); g.moveTo(0, -7.4);
    g.bezierCurveTo(4, -6.4, 11, -0.6, 14.6, 3.6);
    g.quadraticCurveTo(15.4, 5.6, 13.6, 6);
    g.bezierCurveTo(9, 4.2, 5, 2.6, 2.4, 3);
    g.lineTo(0, 4.6);
    g.closePath();
  };
  mirror(g, () => {
    propBlur(g, 4.4, 4.2, 3.2, 0.45);
    part(g, wing, s.base, () => {
      g.save(); g.rotate(0.72); // 후퇴각에 맞춘 띠
      g.fillStyle = s.mark; g.fillRect(5.2, -12, 0.9, 20);
      g.fillStyle = s.accent; g.fillRect(6.1, -12, 1.4, 20);
      g.restore();
      g.fillStyle = s.tip;
      g.beginPath(); g.moveTo(11.4, -1); g.lineTo(16, 3); g.lineTo(16, 7); g.lineTo(11.4, 6); g.fill();
      const gr = g.createLinearGradient(2, -6, 8, 6);
      gr.addColorStop(0, 'rgba(255,255,255,0.34)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.36)');
      g.fillStyle = gr; g.fillRect(-1, -8, 18, 16);
      panel(g);
      g.beginPath(); g.moveTo(3, 2.2); g.bezierCurveTo(6, 2, 10, 3.4, 13.8, 5.2); g.stroke(); // 엘러본
      line(g, 4.6, -4.4, 4.6, 3); line(g, 9.4, -0.4, 9.4, 4);
      g.strokeStyle = 'rgba(255,255,255,0.42)'; g.lineWidth = 0.35;
      g.beginPath(); g.moveTo(0.6, -7.1); g.bezierCurveTo(4, -6.1, 11, -0.4, 14.4, 3.6); g.stroke();
    });
    g.fillStyle = '#14171c'; g.fillRect(3.2, -6, 0.5, 2);
    g.fillStyle = '#23272c'; // 엔진 덮개
    g.beginPath(); g.ellipse(4.4, 1.6, 0.95, 2.4, 0, 0, Math.PI * 2); g.fill(); outline(g);
  });
  const pod = () => { g.beginPath(); g.ellipse(0, -1.6, 2, 6.6, 0, 0, Math.PI * 2); };
  part(g, pod, s.base, () => {
    g.fillStyle = s.cowl; g.fillRect(-3, -9, 6, 2.6);
    g.fillStyle = s.accent; g.fillRect(-3, 2.6, 6, 0.8);
    cylShade(g, -2, 2, -9, 6);
  });
  glass(g, 0, -2.4, 1.35, 2.9);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath(); g.ellipse(-0.5, -3.8, 0.25, 0.7, -0.2, 0, Math.PI * 2); g.fill();
}

// 수상 전투기: 날개 아래 커다란 플로트 2개
function drawFloatplane(g, s) {
  const float = () => {
    g.beginPath(); g.moveTo(7.4, -10.4);
    g.bezierCurveTo(8.8, -9.6, 9, -6, 9, -2);
    g.bezierCurveTo(9, 2, 8.4, 5.4, 7.4, 7.2);
    g.bezierCurveTo(6.4, 5.4, 5.8, 2, 5.8, -2);
    g.bezierCurveTo(5.8, -6, 6, -9.6, 7.4, -10.4);
    g.closePath();
  };
  mirror(g, () => part(g, float, s.float, () => {
    g.fillStyle = s.accent; g.fillRect(5, -11, 5, 2.2);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(5, 1.2, 5, 0.5); // 단차
    cylShade(g, 5.8, 9, -11, 8);
  }));
  drawFighter(g, s, true);
}

// 에이스기: 앞에 작은 귀날개, 뒤에 후퇴익과 추진 프로펠러가 달린 엔테형
function drawCanard(g, s) {
  const wing = () => {
    g.beginPath(); g.moveTo(0, -0.6); g.lineTo(2, -0.4);
    g.bezierCurveTo(6, 1, 11.6, 4.6, 13.4, 6.6);
    g.lineTo(13.6, 9.6);
    g.bezierCurveTo(9, 8.4, 5, 8.2, 0, 8.6);
    g.closePath();
  };
  const canard = () => {
    g.beginPath(); g.moveTo(0, -10); g.lineTo(1.6, -10);
    g.bezierCurveTo(3.6, -9.8, 5.6, -9, 5.8, -8);
    g.quadraticCurveTo(5.8, -7, 4.6, -7);
    g.lineTo(0, -7.2);
    g.closePath();
  };
  propBlur(g, 0, 11.6, 5.4, 0.5);
  mirror(g, () => {
    g.fillStyle = '#14171c'; g.fillRect(3.6, -1.6, 0.55, 2.4); g.fillRect(5, -0.8, 0.55, 2.2);
    part(g, wing, s.base, () => {
      g.save(); g.rotate(0.52);
      g.fillStyle = s.accent; g.fillRect(8.4, -8, 1.5, 22);
      g.fillStyle = s.mark; g.fillRect(10.3, -8, 0.6, 22);
      g.restore();
      shade(g, -0.8, 9.8);
      panel(g);
      g.beginPath(); g.moveTo(2, 6.6); g.quadraticCurveTo(8, 6.4, 13.4, 8); g.stroke();
      line(g, 4.4, -1, 4.4, 9); line(g, 9, 2, 9, 9);
      g.strokeStyle = 'rgba(255,255,255,0.42)'; g.lineWidth = 0.35;
      g.beginPath(); g.moveTo(2, -0.2); g.bezierCurveTo(6, 1.2, 11.6, 4.8, 13.3, 6.6); g.stroke();
    });
    g.beginPath(); g.ellipse(13.4, 8, 0.75, 2.6, 0, 0, Math.PI * 2); // 날개 끝 수직핀
    g.fillStyle = s.tip; g.fill(); outline(g);
    part(g, canard, s.base, () => {
      g.fillStyle = s.tip; g.fillRect(4, -11, 3, 5);
      shade(g, -10.2, -6.8);
    });
  });
  const fus = () => {
    g.beginPath(); g.moveTo(0, -13.4);
    g.bezierCurveTo(1.2, -13.2, 2, -10, 2.2, -6);
    g.bezierCurveTo(2.6, 0, 2.6, 6, 1.5, 11);
    g.lineTo(-1.5, 11);
    g.bezierCurveTo(-2.6, 6, -2.6, 0, -2.2, -6);
    g.bezierCurveTo(-2, -10, -1.2, -13.2, 0, -13.4);
    g.closePath();
  };
  part(g, fus, s.base, () => {
    g.fillStyle = s.accent; g.fillRect(-3, -14, 6, 2.6);
    g.fillStyle = s.mark; g.fillRect(-3, 3.2, 6, 0.5);
    g.fillStyle = s.accent; g.fillRect(-3, 3.7, 6, 1.4);
    g.fillStyle = s.cowl; g.fillRect(-3, 7.6, 6, 4);
    cylShade(g, -2.6, 2.6, -14, 12);
    panel(g); line(g, -3, -5.4, 3, -5.4); line(g, -3, 7.6, 3, 7.6);
  });
  spinner(g, 0, 11.4, 0.9, s.tip);
  glass(g, 0, -3, 1.5, 3.4);
  g.strokeStyle = 'rgba(26,32,40,0.75)'; g.lineWidth = 0.24;
  line(g, -1.4, -4.2, 1.4, -4.2); line(g, -1.5, -1.6, 1.5, -1.6);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath(); g.ellipse(-0.5, -5, 0.26, 0.75, -0.2, 0, Math.PI * 2); g.fill();
}

// 로켓 요격기: 짧은 동체에 후퇴익, 꼬리에서 불꽃
function drawDart(g, s) {
  const wing = () => {
    g.beginPath(); g.moveTo(0, -2.6); g.lineTo(1.4, -2.4);
    g.lineTo(8.2, 3.4); g.quadraticCurveTo(8.8, 5.4, 7.6, 5.6);
    g.bezierCurveTo(5, 4.6, 3, 4.2, 0, 4.4);
    g.closePath();
  };
  const fl = g.createRadialGradient(0, 8.4, 0, 0, 8.4, 3.2); // 분사 불꽃
  fl.addColorStop(0, 'rgba(255,250,210,0.95)'); fl.addColorStop(0.4, 'rgba(255,160,50,0.7)'); fl.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = fl; g.beginPath(); g.ellipse(0, 8.6, 1.5, 3.2, 0, 0, Math.PI * 2); g.fill();
  mirror(g, () => part(g, wing, s.base, () => {
    g.fillStyle = s.tip;
    g.beginPath(); g.moveTo(5.4, 0); g.lineTo(10, 4); g.lineTo(10, 7); g.lineTo(5.4, 6); g.fill();
    g.save(); g.rotate(0.7); g.fillStyle = s.accent; g.fillRect(3.2, -6, 0.9, 14); g.restore();
    shade(g, -2.8, 5.8);
    panel(g); g.beginPath(); g.moveTo(1.6, 3.2); g.quadraticCurveTo(5, 3.2, 7.8, 4.6); g.stroke();
  }));
  const fus = () => {
    g.beginPath(); g.moveTo(0, -8.6);
    g.bezierCurveTo(1.7, -8, 2.1, -4, 2.1, -1);
    g.bezierCurveTo(2.1, 3, 1.5, 6, 1, 7.6);
    g.lineTo(-1, 7.6);
    g.bezierCurveTo(-1.5, 6, -2.1, 3, -2.1, -1);
    g.bezierCurveTo(-2.1, -4, -1.7, -8, 0, -8.6);
    g.closePath();
  };
  part(g, fus, s.base, () => {
    g.fillStyle = s.cowl; g.fillRect(-3, -9, 6, 2.8);
    g.fillStyle = s.accent; g.fillRect(-3, 4.6, 6, 1);
    cylShade(g, -2.1, 2.1, -9, 8);
  });
  g.strokeStyle = s.tip; g.lineWidth = 0.7; line(g, 0, 3.4, 0, 7.8); // 수직꼬리
  glass(g, 0, -2.6, 1.2, 2.5);
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.beginPath(); g.ellipse(-0.4, -3.6, 0.22, 0.6, -0.2, 0, Math.PI * 2); g.fill();
}

Object.assign(SCHEME, {
  twin:  { base: '#6f7f8c', cowl: '#22272c', accent: '#d8482e', mark: '#f2efe2', tip: '#2f3c48' },
  wing:  { base: '#3f5a78', cowl: '#1c2733', accent: '#f08a2c', mark: '#f2efe2', tip: '#f08a2c' },
  float: { base: '#d9dde0', cowl: '#22324a', accent: '#e07a2a', mark: '#22324a', tip: '#22324a', float: '#b9c2c9', span: 0.92 },
  ace:   { base: '#2a2733', cowl: '#15131b', accent: '#c22a3a', mark: '#f0e6c8', tip: '#e2b53a' },
  dart:  { base: '#d8b23a', cowl: '#22262a', accent: '#22262a', mark: '#f5f5f5', tip: '#b3352a' },
});
for (const [name, lw, lh, draw] of [
  ['twin', 36, 30, drawTwinBoom], ['wing', 34, 20, drawFlyingWing], ['float', 28, 26, drawFloatplane],
  ['ace', 32, 30, drawCanard], ['dart', 20, 22, drawDart],
]) {
  SPR[name] = buildSprite(lw, lh, g => { g.scale(0.9, 0.9); draw(g, SCHEME[name]); }, true);
  SPR[name + 'Flash'] = tint(SPR[name], '#fff');
}
