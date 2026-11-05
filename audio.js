window.Audio8 = (() => {
  'use strict';
  let ac, mus, fx, noiseBuf, timer = null, song = null, cur = null, want = null;
  let step = 0, nextT = 0, muteFx = false, muteMus = false;
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const MUS_VOL = 0.09, FX_VOL = 0.16;

  const midi = (s, trans) => {
    const m = /^([A-G])([#b]?)(\d)$/.exec(s);
    if (!m) return 0;
    return NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12 + (trans || 0);
  };
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);

  // "C4:2 - E4" -> array of per-step events; a held note stores its length on the first step
  function parse(str, trans, drum) {
    const ev = [];
    (str || '').trim().split(/\s+/).filter(Boolean).forEach(tok => {
      if (tok === '-') { ev.push(null); return; }
      const [name, len] = tok.split(':');
      const n = +len || 1;
      ev.push(drum ? { d: name } : { f: hz(midi(name, trans)), len: n });
      for (let i = 1; i < n; i++) ev.push(null);
    });
    return ev;
  }

  const SONGS = {
    hub: { bpm: 100,
      lead: 'E5 - G5 - E5 - D5 - C5 - E5 - G5 - - - A4 - C5 - E5 - D5 - G4 - B4 - D5 - - -',
      bass: 'C3 - G3 - C3 - G3 - C3 - G3 - C3 - G3 - A2 - E3 - A2 - E3 - G2 - D3 - G2 - D3 -',
      drum: '' },
    level: { bpm: 112,
      lead: 'A4 C5 E5 C5 A4 C5 E5 - F4 A4 C5 A4 F4 A4 C5 - G4 B4 D5 B4 G4 B4 D5 - E4 G#4 B4 G#4 E4 G#4 B4 -',
      bass: 'A2 - A2 - E3 - E3 - F2 - F2 - C3 - C3 - G2 - G2 - D3 - D3 - E2 - E2 - B2 - B2 -',
      drum: 'k - h - h - h - k - h - h - h - k - h - h - h - k - h - h - h -' },
    dodge: { bpm: 148,
      lead: 'D5 F5 A5 F5 D5 F5 A5 F5 C5 E5 G5 E5 C5 E5 G5 E5 Bb4 D5 F5 D5 Bb4 D5 F5 D5 A4 C#5 E5 C#5 A4 C#5 E5 -',
      bass: 'D3 D3 D3 D3 D3 D3 D3 D3 C3 C3 C3 C3 C3 C3 C3 C3 Bb2 Bb2 Bb2 Bb2 Bb2 Bb2 Bb2 Bb2 A2 A2 A2 A2 A2 A2 A2 A2',
      drum: 'k h s h k h s h k h s h k h s h k h s h k h s h k h s h k h s h' },
    boss: { bpm: 138,
      lead: 'E5 - E5 G5 B5 - A5 G5 F#5 - F#5 A5 C6 - B5 A5 G5 - G5 B5 D6 - C6 B5 B5 A5 G5 F#5 E5 - - -',
      bass: 'E2 E2 E3 E2 E2 E2 E3 E2 F#2 F#2 F#3 F#2 F#2 F#2 F#3 F#2 G2 G2 G3 G2 G2 G2 G3 G2 B2 B2 B3 B2 B2 B2 B3 B2',
      drum: 'k h s h k k s h k h s h k k s h k h s h k k s h k h s h k k s h' }
  };
  const JINGLES = {
    win: { bpm: 200, lead: 'C5 E5 G5 C6 - G5 E5 C6:5 - - E6:4', bass: 'C3 - C3 - G2 - C3:5' },
    level: { bpm: 200, lead: 'C5 G5 C6:4', bass: 'C3 - C3:3' },
    lose: { bpm: 120, lead: 'E4 D#4 D4 C#4:4', bass: 'C3:3 - G2:4' }
  };

  function ensure() {
    if (ac) return true;
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      mus = ac.createGain(); mus.gain.value = muteMus ? 0 : MUS_VOL; mus.connect(ac.destination);
      fx = ac.createGain(); fx.gain.value = muteFx ? 0 : FX_VOL; fx.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return true;
    } catch (e) { return false; }
  }

  function tone(dest, f, t, d, type, vol, f2) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.setValueAtTime(vol * 0.8, t + d * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + d + 0.02);
  }
  function noise(dest, t, d, vol, hp) {
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp || 1000;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t); s.stop(t + d + 0.02);
  }

  function hit(dest, e, t, sd, lead) {
    if (!e) return;
    if (e.d) {
      if (e.d === 'k') tone(dest, 160, t, 0.12, 'sine', 1, 40);
      else if (e.d === 'h') noise(dest, t, 0.04, 0.3, 7000);
      else if (e.d === 's') { noise(dest, t, 0.12, 0.55, 1800); tone(dest, 200, t, 0.08, 'triangle', 0.4, 120); }
      return;
    }
    tone(dest, e.f, t, e.len * sd * 0.95, lead ? 'square' : 'triangle', lead ? 0.45 : 0.9);
  }

  function tick() {
    if (!song) return;
    while (nextT < ac.currentTime + 0.2) {
      const sd = 60 / song.bpm / 2;
      hit(mus, song.lead[step % song.lead.length], nextT, sd, true);
      hit(mus, song.bass[step % song.bass.length], nextT, sd, false);
      if (song.drum.length) hit(mus, song.drum[step % song.drum.length], nextT, sd);
      nextT += sd; step++;
    }
  }

  function start(name, trans) {
    stop();
    const d = SONGS[name]; if (!d) return;
    song = { bpm: d.bpm, lead: parse(d.lead, trans), bass: parse(d.bass, trans), drum: parse(d.drum, 0, true) };
    cur = { name, trans };
    step = 0; nextT = ac.currentTime + 0.05;
    timer = setInterval(tick, 50);
  }
  function stop() { clearInterval(timer); timer = null; song = null; cur = null; }

  function running() { return ac && ac.state === 'running'; }

  const api = {
    unlock() {
      if (!ensure()) return;
      const go = () => { if (want && !cur && !muteMus) start(want.name, want.trans); };
      if (ac.state === 'suspended') ac.resume().then(go).catch(() => {}); else go();
    },
    music(name, trans) {
      trans = trans || 0;
      want = { name, trans };
      if (!running() || muteMus) return;
      if (cur && cur.name === name && cur.trans === trans) return;
      start(name, trans);
    },
    stop() { want = null; stop(); },
    jingle(name) {
      stop();
      if (!ensure() || muteMus) return;
      const go = () => {
        const j = JINGLES[name]; if (!j) return;
        const sd = 60 / j.bpm / 2, t0 = ac.currentTime + 0.05;
        parse(j.lead, 0).forEach((e, i) => hit(mus, e, t0 + i * sd, sd, true));
        parse(j.bass, 0).forEach((e, i) => hit(mus, e, t0 + i * sd, sd, false));
      };
      if (ac.state === 'suspended') ac.resume().then(go).catch(() => {}); else go();
    },
    talk(p) {
      if (!running() || muteFx) return;
      tone(fx, p * (0.94 + Math.random() * 0.12), ac.currentTime, 0.045, 'square', 0.5);
    },
    sfx(name) {
      if (!running() || muteFx) return;
      const t = ac.currentTime;
      switch (name) {
        case 'move': tone(fx, 700, t, 0.04, 'square', 0.4); break;
        case 'select': tone(fx, 880, t, 0.06, 'square', 0.5); tone(fx, 1320, t + 0.06, 0.09, 'square', 0.5); break;
        case 'flip': tone(fx, 600, t, 0.07, 'square', 0.45, 1000); break;
        case 'ok': [1047, 1319, 1568].forEach((f, i) => tone(fx, f, t + i * 0.06, 0.1, 'square', 0.5)); break;
        case 'bad': tone(fx, 140, t, 0.28, 'sawtooth', 0.6, 70); noise(fx, t, 0.12, 0.3, 400); break;
        case 'hurt': noise(fx, t, 0.16, 0.6, 600); tone(fx, 110, t, 0.18, 'square', 0.6, 50); break;
        case 'skip': tone(fx, 500, t, 0.08, 'square', 0.4); break;
        case 'hit': tone(fx, 1200, t, 0.12, 'square', 0.5, 200); noise(fx, t, 0.09, 0.45, 2500); break;
        case 'boom': noise(fx, t, 0.5, 0.7, 300); tone(fx, 220, t, 0.5, 'sawtooth', 0.6, 40); break;
      }
    },
    setMute(fxOff, musOff) {
      muteFx = !!fxOff; muteMus = !!musOff;
      if (!ac) return;
      fx.gain.value = muteFx ? 0 : FX_VOL;
      mus.gain.value = muteMus ? 0 : MUS_VOL;
      if (muteMus) stop(); else if (want && !cur && running()) start(want.name, want.trans);
    }
  };

  const unlock = () => api.unlock();
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
  // iOS Safari 只認 click / touchend 為解鎖音訊的手勢，pointerdown 不夠
  document.addEventListener('touchend', unlock);
  document.addEventListener('click', unlock);
  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) ac.suspend(); else ac.resume();
  });
  return api;
})();
