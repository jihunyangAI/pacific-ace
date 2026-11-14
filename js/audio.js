'use strict';
// Web Audio로 합성하는 효과음 + 칩튠 BGM 시퀀서 (사운드 파일 없음)
const Sound = (() => {
  let ac = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let muted = false, ducked = false;
  const MASTER_VOL = 0.6, MUSIC_VOL = 0.55;

  function unlock() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        const comp = ac.createDynamicsCompressor(); // 폭발음이 겹쳐도 찢어지지 않게
        comp.connect(ac.destination);
        master = ac.createGain(); master.gain.value = MASTER_VOL; master.connect(comp);
        sfxBus = ac.createGain(); sfxBus.connect(master);
        musicBus = ac.createGain(); musicBus.gain.value = MUSIC_VOL; musicBus.connect(master);
        const len = ac.sampleRate;
        noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ac = null; }
    } else if (ac.state === 'suspended') {
      ac.resume();
    }
  }

  // ----- 효과음 -----
  function tone(f1, f2, dur, type = 'square', vol = 0.1, delay = 0) {
    if (!ac) return;
    const t = ac.currentTime + delay;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol = 0.3, freq = 1200, delay = 0) {
    if (!ac) return;
    const t = ac.currentTime + delay;
    const s = ac.createBufferSource();
    s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(80, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(sfxBus);
    s.start(t); s.stop(t + dur + 0.02);
  }

  // ----- BGM -----
  const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const acc = a => (a === '#' ? 1 : a === 'b' ? -1 : 0);
  function midi(tok) {
    const m = /^([A-G])([#b]?)(\d)$/.exec(tok);
    return 12 * (+m[3] + 1) + SEMI[m[1]] + acc(m[2]);
  }
  function chord(name) {
    const m = /^([A-G])([#b]?)(m?)$/.exec(name);
    return { root: 36 + SEMI[m[1]] + acc(m[2]), third: m[3] ? 3 : 4 };
  }
  // 멜로디는 8분음표 단위: 음이름 / '-' 이어서 / '.' 쉼표
  const SONGS = {
    stage: {
      bpm: 150, drum: 'march', bass: [0, 12, 0, 12, 0, 12, 7, 12],
      chords: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'F', 'E', 'C', 'G', 'Am', 'Em', 'F', 'C', 'Dm', 'E'],
      lead: [
        'A4 . C5 E5 A5 - G5 E5', 'A5 - - G5 E5 - C5 -',
        'F5 . A5 C6 A5 - F5 A5', 'G5 - - B5 D6 - B5 G5',
        'A4 . C5 E5 A5 - G5 E5', 'C6 - - B5 A5 - E5 -',
        'F5 - A5 - C6 - A5 F5',  'E5 - G#5 - B5 - E6 -',
        'E6 - - D6 C6 - G5 -',   'D6 - - C6 B5 - G5 -',
        'C6 - - B5 A5 - E5 -',   'B5 - - A5 G5 - E5 -',
        'A5 - F5 A5 C6 - A5 -',  'G5 - E5 G5 C6 - G5 -',
        'F5 - A5 - D6 - - -',    'E6 - D6 B5 G#5 - E5 -',
      ],
    },
    boss: {
      bpm: 172, drum: 'drive', bass: [0, 0, 12, 0, 0, 12, 0, 12],
      chords: ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'C', 'Bb', 'A'],
      lead: [
        'D5 D5 F5 D5 A5 - F5 D5',   'D5 D5 F5 D5 Bb5 - A5 -',
        'Bb4 Bb4 D5 Bb4 F5 - D5 Bb4', 'A4 C#5 E5 A5 G5 E5 C#5 -',
        'D5 D5 F5 D5 A5 - D6 -',    'C6 - G5 E5 C5 E5 G5 -',
        'Bb5 - F5 D5 Bb4 D5 F5 -',  'A5 - E5 C#5 A4 C#5 E5 A5',
      ],
    },
  };
  for (const s of Object.values(SONGS)) {
    const toks = s.lead.join(' ').split(/\s+/);
    s.events = toks.map((tk, i) => {
      if (tk === '-' || tk === '.') return null;
      let len = 1;
      while (toks[(i + len) % toks.length] === '-' && len < toks.length) len++;
      return { m: midi(tk), len };
    });
    s.ch = s.chords.map(chord);
  }
  const ARP = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3];

  function mnote(m, t, dur, type, vol, detune = 0) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
    o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + Math.max(0.012, dur * 0.6));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(musicBus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function mnoise(t, dur, vol, freq) {
    const s = ac.createBufferSource();
    s.buffer = noiseBuf; s.loop = true; s.loopStart = Math.random() * 0.5;
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(musicBus);
    s.start(t); s.stop(t + dur + 0.02);
  }
  function kick(t) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    o.connect(g).connect(musicBus);
    o.start(t); o.stop(t + 0.16);
  }

  let song = null, step = 0, nextT = 0, timer = null;
  function scheduleStep(s, t, sd) {
    const pos = s % 16, bar = Math.floor(s / 16) % song.ch.length, ch = song.ch[bar];
    if (pos % 2 === 0) {
      const ev = song.events[(s / 2) % song.events.length];
      if (ev) {
        const dur = ev.len * 2 * sd * 0.92;
        mnote(ev.m, t, dur, 'square', 0.075);
        mnote(ev.m, t, dur, 'square', 0.035, 9);
      }
      mnote(ch.root + song.bass[pos / 2], t, 2 * sd * 0.8, 'triangle', 0.2);
    }
    const tones = [0, ch.third, 7, 12];
    mnote(ch.root + 24 + tones[ARP[pos]], t, sd * 0.9, 'square', 0.022);

    if (song.drum === 'march') {
      if (pos === 0 || pos === 8) kick(t);
      if (pos === 4 || pos === 12) mnoise(t, 0.11, 0.16, 1500);
      if (bar % 4 === 3 && pos >= 13) mnoise(t, 0.06, 0.09, 1500); // 스네어 롤
      if (pos % 4 === 2) mnoise(t, 0.03, 0.05, 7000);
    } else {
      if (pos % 4 === 0) kick(t);
      if (pos === 4 || pos === 12) mnoise(t, 0.11, 0.17, 1500);
      mnoise(t, 0.025, pos % 2 ? 0.03 : 0.05, 7000);
    }
  }
  function tick() {
    if (!ac || !song) return;
    const sd = 60 / song.bpm / 4;
    if (nextT < ac.currentTime) nextT = ac.currentTime + 0.05; // 탭이 멈췄다 돌아온 경우
    while (nextT < ac.currentTime + 0.12) {
      scheduleStep(step, nextT, sd);
      nextT += sd;
      step = (step + 1) % (song.ch.length * 16);
    }
  }
  function setMusicGain() {
    if (!ac) return;
    musicBus.gain.cancelScheduledValues(ac.currentTime);
    musicBus.gain.setTargetAtTime(song ? MUSIC_VOL * (ducked ? 0.25 : 1) : 0, ac.currentTime, 0.03);
  }
  const music = {
    play(name) {
      if (!ac) return;
      song = SONGS[name]; step = 0; nextT = ac.currentTime + 0.1;
      setMusicGain();
      if (!timer) timer = setInterval(tick, 25);
    },
    stop() {
      song = null;
      if (timer) { clearInterval(timer); timer = null; }
      setMusicGain();
    },
  };

  return {
    unlock, music,
    toggle() { muted = !muted; if (ac) master.gain.value = muted ? 0 : MASTER_VOL; return muted; },
    get muted() { return muted; },
    setPaused(p) { ducked = p; setMusicGain(); },
    shoot() { tone(1200, 600, 0.05, 'square', 0.02); },
    // 소형 폭발: 저음 '퍽' + 노이즈 '펑' + 날카로운 크랙
    pop() {
      noise(0.34, 0.4, 2800);
      tone(180, 45, 0.22, 'sine', 0.4);
      tone(900, 200, 0.05, 'square', 0.05);
    },
    boom() {
      noise(1.0, 0.6, 1500); noise(0.12, 0.4, 7000);
      tone(110, 30, 0.7, 'sine', 0.55);
      noise(0.5, 0.3, 700, 0.18);
    },
    bigBoom() {
      noise(2.4, 0.8, 1800); noise(0.2, 0.5, 8000);
      tone(90, 22, 1.8, 'sine', 0.7);
      for (let i = 1; i <= 4; i++) { noise(0.7, 0.4, 900, i * 0.28); tone(100, 30, 0.5, 'sine', 0.35, i * 0.28); }
    },
    cannon() { noise(0.18, 0.18, 900); tone(140, 60, 0.12, 'sine', 0.2); },
    hit()   { tone(300, 80, 0.2, 'sawtooth', 0.12); noise(0.15, 0.2, 3000); },
    item()  { [660, 880, 1320].forEach((f, i) => tone(f, 0, 0.08, 'square', 0.06, i * 0.06)); },
    warn()  { tone(1000, 0, 0.08, 'square', 0.05); },
    bomb() {
      noise(1.8, 0.8, 2200); noise(0.15, 0.5, 8000);
      tone(100, 24, 1.4, 'sine', 0.7); tone(60, 30, 1.0, 'sawtooth', 0.15);
      noise(0.8, 0.35, 700, 0.25);
    },
    whistle() { tone(1500, 480, 0.62, 'sine', 0.07); }, // 폭탄이 떨어지는 소리
    thunder() { noise(1.8, 0.4, 500); noise(0.3, 0.25, 3000); noise(1.2, 0.25, 300, 0.4); },
    siren() { tone(520, 800, 0.32, 'sawtooth', 0.07); tone(800, 520, 0.32, 'sawtooth', 0.07, 0.32); },
    fanfare() {
      [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [784, 0.54], [1047, 0.66]].forEach(([f, d], i) =>
        tone(f, 0, i === 5 ? 0.7 : 0.14, 'square', 0.08, d));
      [[262, 0], [330, 0.36], [392, 0.66]].forEach(([f, d]) => tone(f, 0, 0.5, 'triangle', 0.15, d));
    },
    gameover() {
      [[440, 0], [349, 0.3], [294, 0.6], [220, 0.9]].forEach(([f, d], i) =>
        tone(f, 0, i === 3 ? 1.1 : 0.32, 'square', 0.07, d + 0.6));
    },
  };
})();
