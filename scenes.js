// 過場動畫：用 canvas 即時繪畫，無圖片檔。由 game.js 透過 Scenes.play() 呼叫。
window.Scenes = (() => {
  'use strict';
  const W = 480, H = 240;
  const FONT = "20px 'DotGothic16','PingFang HK','Microsoft JhengHei',monospace";
  const COL = ['#facc15', '#ef4444', '#67e8f9', '#22c55e', '#fb923c', '#c084fc'];

  const cache = {};
  const img = n => cache[n] || (cache[n] = window.PixelSprite(n, 1));
  const draw = (g, n, cx, cy, s, maxH) => {
    const c = img(n); if (maxH) s = Math.min(s, maxH / c.height);
    const w = c.width * s, h = c.height * s;
    g.drawImage(c, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h);
  };
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const ease = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;
  const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, p) => { const x = hex(a), y = hex(b); return 'rgb(' + x.map((v, i) => Math.round(v + (y[i] - v) * p)).join(',') + ')'; };
  const cue = (st, k, t, at, fn) => { if (t >= at && !st[k]) { st[k] = 1; fn(); } };
  const sfx = n => window.Audio8 && window.Audio8.sfx(n);

  const STARS = Array.from({ length: 50 }, (_, i) => [rnd(i) * W, rnd(i + 100) * H * 0.7, 1 + Math.floor(rnd(i + 200) * 2)]);
  const TOWERS = [[30, 150, 44, 60], [100, 170, 34, 40], [190, 180, 100, 30], [330, 155, 46, 55], [400, 172, 40, 38]];

  function sky(g, t, col, stars) {
    g.fillStyle = col; g.fillRect(0, 0, W, H);
    if (stars === false) return;
    g.fillStyle = '#fff';
    STARS.forEach((s, i) => { if (Math.sin(t * 3 + i * 1.7) > -0.4) g.fillRect(s[0], s[1], s[2] * 2, s[2] * 2); });
  }
  function castle(g, col) {
    g.fillStyle = col || '#0f1535';
    g.fillRect(0, 205, W, 35);
    TOWERS.forEach(([x, y, w, h]) => {
      g.fillRect(x, y, w, h + 40);
      for (let i = 0; i < w; i += 16) g.fillRect(x + i, y - 8, 8, 8);
    });
    g.fillStyle = '#facc15';
    TOWERS.forEach(([x, y, w]) => g.fillRect(x + w / 2 - 3, y + 14, 6, 8));
  }
  function glow(g, x, y, r, a) {
    g.fillStyle = '#facc15';
    g.globalAlpha = a; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.globalAlpha = a * 1.2; g.beginPath(); g.arc(x, y, r * 0.6, 0, 7); g.fill();
    g.globalAlpha = 1;
  }
  const flash = (g, a) => { if (a > 0) { g.fillStyle = 'rgba(255,255,255,' + Math.min(1, a) + ')'; g.fillRect(0, 0, W, H); } };
  const text = (g, s, y, col) => { g.font = FONT; g.textAlign = 'center'; g.fillStyle = '#000'; g.fillText(s, W / 2 + 2, y + 2); g.fillStyle = col || '#fff'; g.fillText(s, W / 2, y); };

  const KEY_AT = [150, 100];
  const CORNERS = [[50, 50], [430, 50], [50, 190], [240, 56], [430, 190]];

  const SCENES = {
    // 夜晚的王國，安全之鑰發光
    night: {
      dur: 5,
      draw(g, t) {
        sky(g, t, '#050520'); castle(g);
        glow(g, W / 2, 100, 62 + Math.sin(t * 3) * 8, 0.16);
        draw(g, 'key', W / 2, 100 + Math.sin(t * 2) * 6, 6);
        g.fillStyle = '#fde68a';
        for (let i = 0; i < 8; i++) {
          const a = t * 1.5 + i * 0.8, r = 55 + (i % 3) * 12;
          g.fillRect(W / 2 + Math.cos(a) * r, 100 + Math.sin(a) * r * 0.7, 3, 3);
        }
      }
    },

    // 黑客熊登場，打碎鑰匙，五塊碎片飛向五個怪獸
    shatter: {
      dur: 7,
      draw(g, t, o, st) {
        sky(g, t, t < 1.2 ? '#050520' : '#160716'); castle(g, '#0b0a1d');
        cue(st, 'a', t, 1.2, () => sfx('boom'));
        cue(st, 'b', t, 2.8, () => sfx('hurt'));
        cue(st, 'c', t, 3.8, () => sfx('select'));
        if (t < 2.8) {
          const sh = t > 2.0 ? (Math.random() - 0.5) * 6 : 0;
          glow(g, KEY_AT[0], KEY_AT[1], 55 + Math.sin(t * 3) * 6, 0.14);
          draw(g, 'key', KEY_AT[0] + sh, KEY_AT[1] + Math.sin(t * 2) * 5, 6);
        }
        const bx = t < 1.2 ? W + 80 : lerp(W + 80, 340, ease((t - 1.2) / 0.8));
        draw(g, 'boss', bx, 130 + (t > 2 ? Math.sin(t * 12) * 3 : 0), 6, 130);
        if (t >= 2.8) {
          const p = ease((t - 2.8) / 0.9);
          CORNERS.forEach((c, i) => {
            if (t < 3.8) draw(g, 'shard', lerp(KEY_AT[0], c[0], p), lerp(KEY_AT[1], c[1], p), 5);
            else {
              const m = ['slime', 'phish', 'ghost', 'troll', 'robot'][i], k = ease((t - 3.8) / 0.5);
              draw(g, m, c[0], c[1] + (i > 1 ? 4 : 10), 4 * k, 70);
              draw(g, 'shard', c[0], c[1] - 34 + Math.sin(t * 3 + i) * 3, 3);
            }
          });
        }
        flash(g, t >= 1.2 && t < 1.6 ? 1 - (t - 1.2) * 2.5 : t >= 2.8 && t < 3.3 ? 1 - (t - 2.8) * 2 : 0);
      }
    },

    // 碎片飛回，合成鑰匙，天亮
    gather: {
      dur: 7,
      draw(g, t, o, st) {
        const p = ease((t - 2.0) / 2.5);
        const gr = g.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, mix('#050520', '#38bdf8', p)); gr.addColorStop(1, mix('#160716', '#fb923c', p));
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        if (p < 0.6) { g.fillStyle = '#fff'; STARS.forEach((s, i) => { if (Math.sin(t * 3 + i) > -0.4) g.fillRect(s[0], s[1], s[2] * 2, s[2] * 2); }); }
        g.fillStyle = '#fde047'; g.beginPath(); g.arc(W / 2, lerp(270, 200, p), 46, 0, 7); g.fill();
        castle(g, mix('#0f1535', '#4338ca', p));
        cue(st, 'a', t, 0.3, () => sfx('select'));
        cue(st, 'b', t, 2.0, () => sfx('ok'));
        if (t < 2.0) {
          const k = ease((t - 0.3) / 1.7);
          CORNERS.forEach(c => draw(g, 'shard', lerp(c[0], W / 2, k), lerp(c[1], 100, k), 5));
        } else {
          glow(g, W / 2, 100, 70 + Math.sin(t * 4) * 8, 0.2);
          draw(g, 'key', W / 2, 100 + Math.sin(t * 2) * 5, 7);
          g.fillStyle = '#fef9c3';
          for (let i = 0; i < 24; i++) {
            const y = H - ((t * 40 + rnd(i + 50) * H) % H);
            g.fillRect(rnd(i) * W, y, 3, 3);
          }
        }
        flash(g, t >= 2.0 && t < 2.7 ? 1 - (t - 2.0) / 0.7 : 0);
      }
    },

    // 煙花慶祝
    fireworks: {
      dur: 7,
      draw(g, t, o, st) {
        sky(g, t, '#050520'); castle(g, '#0b0f2a');
        draw(g, 'guide', 160, 178 + Math.sin(t * 4) * 3, 5);
        draw(g, 'boss', 330, 170 + Math.sin(t * 4 + 1) * 3, 4, 70);
        for (let i = 0; i < 10; i++) {
          const bt = 0.3 + i * 0.6, a = t - bt;
          const bx = 80 + rnd(i + 300) * (W - 160), by = 40 + rnd(i + 400) * 80;
          if (a >= 0) cue(st, 'f' + i, t, bt, () => sfx('hit'));
          g.fillStyle = COL[i % 6];
          if (a >= -0.4 && a < 0) g.fillRect(bx, lerp(H - 60, by, (a + 0.4) / 0.4), 4, 8);
          if (a >= 0 && a < 1.3) {
            g.globalAlpha = 1 - a / 1.3;
            for (let k = 0; k < 14; k++) {
              const ang = k / 14 * Math.PI * 2, r = a * 62;
              g.fillRect(bx + Math.cos(ang) * r, by + Math.sin(ang) * r + 30 * a * a, 4, 4);
            }
            g.globalAlpha = 1;
          }
        }
      }
    },

    // 遇敵：愛心閃爍，怪獸放大登場
    encounter: {
      dur: o => 2.6 + (o.text || '').length * 0.05,
      draw(g, t, o, st) {
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        cue(st, 'a', t, 0, () => sfx('hurt'));
        cue(st, 'b', t, 1.0, () => sfx('boom'));
        if (t < 0.6) { if (Math.floor(t / 0.1) % 2 === 0) draw(g, 'heart', W / 2, H / 2, 5); }
        else if (t < 1.0) draw(g, 'heart', lerp(W / 2, 60, ease((t - 0.6) / 0.4)), lerp(H / 2, 205, ease((t - 0.6) / 0.4)), lerp(5, 2, ease((t - 0.6) / 0.4)));
        else {
          draw(g, 'heart', 60, 205, 2);
          draw(g, o.mon, W / 2, 95 + Math.sin(t * 4) * 3, lerp(2, 8, ease((t - 1.0) / 0.5)), 130);
        }
        if (t >= 1.5) text(g, (o.text || '').slice(0, Math.floor((t - 1.5) * 20)), 215);
      }
    },

    // 得到碎片
    shard: {
      dur: 2.6,
      draw(g, t, o, st) {
        g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
        cue(st, 'a', t, 0.7, () => sfx('ok'));
        const y = lerp(-20, 95, ease(t / 0.7));
        if (t >= 0.7) glow(g, W / 2, 95, 50 + Math.sin(t * 6) * 5, 0.2);
        draw(g, 'shard', W / 2, y, 9);
        if (t >= 0.7) {
          g.fillStyle = '#fde68a';
          for (let i = 0; i < 10; i++) {
            const a = t * 3 + i * 0.63, r = 45 + ((t - 0.7) * 40 + i * 6) % 40;
            g.fillRect(W / 2 + Math.cos(a) * r, 95 + Math.sin(a) * r, 4, 4);
          }
          text(g, '得到「安全之鑰」碎片！　' + o.n + ' / ' + (o.total || 5), 205, '#facc15');
        }
        flash(g, t >= 0.7 && t < 0.95 ? 1 - (t - 0.7) / 0.25 : 0);
      }
    }
  };

  function play(host, name, opt, done) {
    opt = opt || {};
    const sc = SCENES[name];
    const dur = typeof sc.dur === 'function' ? sc.dur(opt) : sc.dur;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.className = 'arena scene';
    const hint = document.createElement('div'); hint.className = 'hint'; hint.style.textAlign = 'center';
    hint.textContent = '（按空白鍵或點擊畫面跳過）';
    host.innerHTML = ''; host.onclick = null; host.append(cv, hint);
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const st = {}; let t = 0, last = performance.now(), raf = 0, over = false;
    const fin = skipped => { if (over) return; over = true; cancelAnimationFrame(raf); if (cv.isConnected && done) done(!!skipped); };
    const frame = now => {
      if (over) return;
      if (!cv.isConnected) { over = true; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
      g.globalAlpha = 1;
      sc.draw(g, t, opt, st);
      const left = dur - t;
      if (t < 0.4) { g.fillStyle = 'rgba(0,0,0,' + (1 - t / 0.4) + ')'; g.fillRect(0, 0, W, H); }
      if (left < 0.4) { g.fillStyle = 'rgba(0,0,0,' + Math.min(1, 1 - left / 0.4) + ')'; g.fillRect(0, 0, W, H); }
      if (t >= dur) { fin(false); return; }
      raf = requestAnimationFrame(frame);
    };
    cv.onclick = () => fin(true);
    raf = requestAnimationFrame(frame);
    return { skip: () => fin(true) };
  }

  return { play, _scenes: SCENES };
})();
