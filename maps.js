// 戰鬥背景同世界地圖：全部用 canvas 程式繪畫（像素方塊），無圖片檔。
window.Maps = (() => {
  'use strict';
  const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
  const R = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const E = (g, c, cx, cy, rx, ry) => {
    g.fillStyle = c;
    for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(1 - (y / ry) * (y / ry))); g.fillRect(Math.round(cx - w), Math.round(cy + y), 2 * w, 1); }
  };
  const tri = (g, c, cx, by, w, h) => { for (let r = 0; r < h; r++) { const ww = Math.round(w * (r + 1) / h); R(g, c, cx - ww / 2, by - h + r, ww, 1); } };
  const alpha = (g, a, fn) => { g.globalAlpha = a; fn(); g.globalAlpha = 1; };

  /* ---------- 戰鬥背景（192 x 72，地面由 y=48 起） ---------- */

  const BD = {
    castle(g) {
      R(g, '#1e1b4b', 0, 0, 192, 72);
      for (let y = 0; y < 48; y += 8) { R(g, '#2e2a6b', 0, y, 192, 1); for (let x = (y / 8 % 2) * 8; x < 192; x += 16) R(g, '#2e2a6b', x, y, 1, 8); }
      R(g, '#0f0e2a', 0, 48, 192, 24);
      for (let y = 48; y < 72; y += 8) for (let x = ((y - 48) / 8 % 2) * 16; x < 192; x += 32) R(g, '#17164a', x, y, 16, 8);
      R(g, '#0b0a1d', 76, 20, 40, 28); R(g, '#0b0a1d', 80, 17, 32, 3); R(g, '#0b0a1d', 84, 14, 24, 3);
      R(g, '#facc15', 92, 30, 8, 7); R(g, '#facc15', 93, 26, 6, 1); R(g, '#facc15', 92, 27, 2, 3); R(g, '#facc15', 98, 27, 2, 3); R(g, '#0b0a1d', 95, 32, 2, 3);
      [28, 164].forEach(x => {
        alpha(g, 0.14, () => E(g, '#fb923c', x + 1, 24, 16, 14));
        R(g, '#78350f', x, 26, 3, 12); R(g, '#fb923c', x - 1, 19, 5, 7); R(g, '#facc15', x, 21, 3, 4);
      });
    },
    pond(g) {
      ['#172554', '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#fdba74'].forEach((c, i) => R(g, c, 0, i * 6, 192, 6));
      E(g, '#fde68a', 140, 40, 9, 9);
      R(g, '#14532d', 0, 38, 192, 5); E(g, '#14532d', 30, 38, 24, 5); E(g, '#14532d', 170, 38, 22, 4);
      R(g, '#1e40af', 0, 43, 192, 10);
      for (let i = 0; i < 24; i++) R(g, '#60a5fa', rnd(i) * 180, 44 + rnd(i + 50) * 8, 6, 1);
      E(g, '#16a34a', 40, 49, 6, 2); E(g, '#16a34a', 150, 47, 5, 2); R(g, '#f9a8d4', 39, 47, 2, 2);
      R(g, '#78350f', 0, 52, 192, 20);
      for (let x = 0; x < 192; x += 16) R(g, '#451a03', x, 52, 1, 20);
      R(g, '#92400e', 0, 52, 192, 2); R(g, '#451a03', 0, 62, 192, 1);
      [8, 16, 176, 184].forEach(x => { R(g, '#166534', x, 28, 2, 24); R(g, '#92400e', x - 1, 24, 4, 6); });
      R(g, '#e5e7eb', 152, 0, 1, 30); R(g, '#e5e7eb', 150, 30, 4, 1); R(g, '#e5e7eb', 150, 28, 1, 2);
    },
    forest(g) {
      R(g, '#052e16', 0, 0, 192, 72);
      alpha(g, 0.15, () => E(g, '#fef9c3', 150, 18, 18, 18)); E(g, '#fef9c3', 150, 18, 9, 9);
      [8, 30, 52, 74, 118, 140, 166, 186].forEach((x, i) => {
        R(g, '#3f2a14', x - 2, 32, 4, 20);
        for (let k = 0; k < 4; k++) { const w = 10 + k * 4; R(g, k % 2 ? '#166534' : '#14532d', x - w / 2, 12 + k * 6 + (i % 2) * 2, w, 6); }
      });
      R(g, '#14301c', 0, 48, 192, 24); R(g, '#5b4a2e', 40, 48, 112, 24); R(g, '#6b5a3a', 40, 48, 112, 2);
      for (let i = 0; i < 8; i++) { const x = 60 + i * 10, y = 54 + (i % 2) * 6; R(g, '#2a2013', x, y, 3, 4); R(g, '#2a2013', x + 4, y + (i % 2 ? -1 : 1), 3, 4); }
      for (let i = 0; i < 14; i++) R(g, '#fde047', rnd(i + 9) * 188, 8 + rnd(i + 70) * 52, 2, 2);
    },
    house(g) {
      R(g, '#0f172a', 0, 0, 192, 72);
      for (let x = 0; x < 192; x += 12) R(g, '#16213a', x, 0, 1, 48);
      for (let y = 0; y < 48; y += 12) R(g, '#16213a', 0, y, 192, 1);
      R(g, '#1e293b', 0, 48, 192, 24);
      for (let x = 0; x < 192; x += 16) R(g, '#334155', x, 48, 1, 24);
      for (let y = 48; y < 72; y += 8) R(g, '#334155', 0, y, 192, 1);
      R(g, '#475569', 76, 8, 40, 26); R(g, '#1e3a8a', 79, 11, 34, 20); R(g, '#475569', 95, 11, 2, 20); R(g, '#475569', 79, 21, 34, 2);
      R(g, '#fff', 84, 15, 2, 2); R(g, '#fff', 104, 25, 2, 2); R(g, '#fff', 108, 14, 2, 2);
      [[12, 14], [152, 16]].forEach(([x, y], k) => {
        R(g, '#475569', x, y, 28, 18); R(g, '#020617', x + 2, y + 2, 24, 12);
        for (let r = 0; r < 3; r++) R(g, '#22c55e', x + 4, y + 4 + r * 3, 8 + ((r + k) % 3) * 4, 1);
        R(g, '#475569', x + 12, y + 18, 4, 4);
      });
      for (let i = 0; i < 6; i++) { const x = 30 + i * 24, y = 38 + (i % 2) * 4; R(g, '#0ea5e9', x, y, 10, 1); R(g, '#0ea5e9', x + 10, y, 1, 6); R(g, '#0ea5e9', x + 9, y + 6, 3, 3); }
    },
    lair(g) {
      R(g, '#1a0510', 0, 0, 192, 72);
      E(g, '#7f1d1d', 96, 22, 20, 20); E(g, '#991b1b', 96, 22, 16, 16);
      E(g, '#0a0408', 96, 24, 11, 10); E(g, '#0a0408', 85, 14, 4, 4); E(g, '#0a0408', 107, 14, 4, 4);
      R(g, '#ef4444', 91, 22, 3, 2); R(g, '#ef4444', 99, 22, 3, 2);
      [6, 164].forEach((x, k) => {
        R(g, '#111827', x, 10, 22, 40); R(g, '#1f2937', x, 10, 22, 2);
        for (let r = 0; r < 6; r++) { R(g, rnd(r + k * 9) > 0.5 ? '#ef4444' : '#22c55e', x + 3, 15 + r * 6, 3, 2); R(g, rnd(r + k * 9 + 4) > 0.5 ? '#ef4444' : '#22c55e', x + 13, 15 + r * 6, 3, 2); }
      });
      R(g, '#2a0a1f', 0, 48, 192, 24);
      alpha(g, 0.25, () => E(g, '#ef4444', 96, 50, 70, 8));
      for (let i = 0; i < 4; i++) { const x = 20 + i * 44; R(g, '#7f1d1d', x, 52, 8, 1); R(g, '#7f1d1d', x + 8, 52, 1, 5); R(g, '#7f1d1d', x + 8, 57, 10, 1); }
      alpha(g, 0.5, () => { for (let i = 0; i < 18; i++) R(g, '#ef4444', 30 + rnd(i + 5) * 130, 6 + rnd(i + 25) * 44, 2, 2); });
    },
    kingdom(g) {
      R(g, '#050520', 0, 0, 192, 72);
      for (let i = 0; i < 40; i++) R(g, '#fff', rnd(i) * 192, rnd(i + 100) * 34, 1, 1);
      R(g, '#0f1535', 0, 52, 192, 20);
      [[10, 34, 18], [40, 42, 14], [80, 46, 30], [140, 36, 18], [168, 44, 14]].forEach(([x, y, w]) => {
        R(g, '#0f1535', x, y, w, 30); for (let i = 0; i < w; i += 6) R(g, '#0f1535', x + i, y - 3, 3, 3);
        R(g, '#facc15', x + w / 2 - 1, y + 6, 2, 3);
      });
    }
  };
  const bdCache = {};
  function backdrop(name) {
    if (bdCache[name]) return bdCache[name];
    const [c, g] = mk(192, 72); (BD[name] || BD.kingdom)(g);
    return (bdCache[name] = c.toDataURL());
  }

  /* ---------- 世界地圖（240 x 160） ---------- */

  const NODES = [{ x: 34, y: 116 }, { x: 96, y: 114 }, { x: 160, y: 98 }, { x: 118, y: 62 }, { x: 196, y: 42 }];
  const MON = ['slime', 'phish', 'ghost', 'robot', 'boss'];

  const castleB = (g, x, y) => {
    R(g, '#6b7280', x - 12, y - 6, 24, 16); R(g, '#6b7280', x - 15, y - 14, 8, 24); R(g, '#6b7280', x + 7, y - 14, 8, 24);
    [x - 15, x - 10, x + 7, x + 12].forEach(mx => R(g, '#9ca3af', mx, y - 17, 3, 3));
    R(g, '#1e1b4b', x - 3, y + 2, 6, 8); R(g, '#1e1b4b', x - 2, y, 4, 2);
    R(g, '#e5e7eb', x, y - 16, 1, 10); R(g, '#ef4444', x + 1, y - 16, 5, 3);
    R(g, '#facc15', x - 12, y - 9, 2, 3); R(g, '#facc15', x + 10, y - 9, 2, 3);
  };
  const dockB = (g, x, y) => {
    R(g, '#92400e', x - 16, y + 2, 32, 6); R(g, '#451a03', x - 16, y + 8, 2, 5); R(g, '#451a03', x + 14, y + 8, 2, 5);
    R(g, '#78350f', x - 7, y - 8, 14, 10); R(g, '#b45309', x - 9, y - 11, 18, 3); R(g, '#1c1917', x - 2, y - 3, 4, 5);
    R(g, '#d1d5db', x + 11, y - 12, 1, 14); R(g, '#e5e7eb', x + 11, y - 12, 6, 1);
  };
  const forestB = (g, x, y) => {
    E(g, '#4a3a1f', x, y + 4, 13, 7);
    R(g, '#2a2013', x - 8, y + 4, 2, 3); R(g, '#2a2013', x - 4, y + 7, 2, 3); R(g, '#2a2013', x + 4, y + 5, 2, 3); R(g, '#2a2013', x + 8, y + 8, 2, 3);
    R(g, '#78350f', x, y - 8, 2, 12); R(g, '#a16207', x - 5, y - 8, 12, 4);
  };
  const houseB = (g, x, y) => {
    R(g, '#94a3b8', x - 10, y - 6, 20, 15);
    R(g, '#dc2626', x - 12, y - 8, 24, 3); R(g, '#dc2626', x - 9, y - 11, 18, 3); R(g, '#dc2626', x - 6, y - 14, 12, 3); R(g, '#dc2626', x - 3, y - 17, 6, 3);
    R(g, '#1e293b', x - 2, y + 2, 5, 7); R(g, '#67e8f9', x - 8, y - 3, 4, 4); R(g, '#67e8f9', x + 4, y - 3, 4, 4);
    R(g, '#e5e7eb', x + 6, y - 25, 1, 8); R(g, '#ef4444', x + 5, y - 27, 3, 2);
  };
  const fortressB = (g, x, y) => {
    alpha(g, 0.2, () => E(g, '#ef4444', x, y, 30, 22));
    R(g, '#1f2937', x - 16, y - 6, 32, 16); R(g, '#111827', x - 20, y - 16, 10, 26); R(g, '#111827', x + 10, y - 16, 10, 26); R(g, '#111827', x - 6, y - 20, 12, 30);
    R(g, '#7f1d1d', x - 20, y - 19, 10, 3); R(g, '#7f1d1d', x + 10, y - 19, 10, 3); R(g, '#7f1d1d', x - 6, y - 23, 12, 3);
    R(g, '#ef4444', x - 17, y - 10, 3, 4); R(g, '#ef4444', x + 14, y - 10, 3, 4); R(g, '#ef4444', x - 2, y - 14, 4, 5);
    R(g, '#000', x - 4, y + 2, 8, 8);
  };
  const BUILD = [castleB, dockB, forestB, houseB, fortressB];

  function world(o) {
    const done = o.done || {}, lv = o.levels || [];
    const ok = i => i === 0 ? true : i < 4 ? done[lv[i - 1].id] > 0 : o.allDone;
    const [c, g] = mk(240, 160);
    R(g, '#14532d', 0, 0, 240, 160);
    for (let i = 0; i < 700; i++) R(g, ['#166534', '#15803d', '#0f4423'][i % 3], rnd(i) * 238, rnd(i + 900) * 158, 2, 1);
    for (let i = 0; i < 50; i++) R(g, ['#f9a8d4', '#fde047', '#fff'][i % 3], rnd(i + 2000) * 236, rnd(i + 3000) * 156, 2, 2);
    // 山
    tri(g, '#4b5563', 22, 52, 40, 30); tri(g, '#e5e7eb', 22, 28, 12, 6); tri(g, '#6b7280', 56, 50, 32, 22); tri(g, '#e5e7eb', 56, 31, 8, 4);
    tri(g, '#4b5563', 12, 70, 26, 18);
    // 魔王區
    E(g, '#2e1065', 196, 42, 40, 32); E(g, '#3b0764', 196, 42, 30, 24);
    for (let i = 0; i < 6; i++) { const x = 168 + i * 9, y = 62 + (i % 2) * 4; R(g, '#7f1d1d', x, y, 6, 1); R(g, '#7f1d1d', x + 6, y, 1, 4); }
    // 池塘
    E(g, '#1e40af', 96, 134, 38, 16); E(g, '#1d4ed8', 96, 134, 34, 13);
    for (let i = 0; i < 10; i++) R(g, '#60a5fa', 68 + rnd(i + 40) * 56, 124 + rnd(i + 60) * 20, 5, 1);
    E(g, '#16a34a', 76, 138, 5, 2); E(g, '#16a34a', 118, 142, 5, 2);
    // 樹林
    const tree = (x, y, dk) => { R(g, '#3f2a14', x - 1, y, 3, 5); E(g, dk ? '#0b3d1f' : '#14532d', x, y - 3, 6, 6); E(g, dk ? '#14532d' : '#166534', x - 1, y - 5, 4, 3); };
    const near = (x, y, r) => NODES.some(n => (n.x - x) ** 2 + (n.y - y) ** 2 < r * r);
    for (let k = 0; k < 22; k++) { const a = k / 22 * Math.PI * 2; tree(160 + Math.cos(a) * 44, 100 + Math.sin(a) * 30, true); }
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2 + 0.2; tree(160 + Math.cos(a) * 28, 100 + Math.sin(a) * 19, true); }
    for (let i = 0; i < 34; i++) {
      const x = 6 + rnd(i + 500) * 228, y = 10 + rnd(i + 600) * 146;
      if (near(x, y, 26) || (x - 196) ** 2 + (y - 42) ** 2 < 42 * 42 || (y > 116 && x > 54 && x < 140) || (x - 160) ** 2 + (y - 100) ** 2 < 40 * 40) continue;
      tree(x, y);
    }
    // 路
    for (let i = 0; i < 4; i++) {
      const a = NODES[i], b = NODES[i + 1], col = (i < 4 && ok(i + 1)) ? '#facc15' : '#d6b98c';
      const n = Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 5);
      for (let k = 1; k < n; k++) { const t = k / n; R(g, col, a.x + (b.x - a.x) * t - 1, b.y * t + a.y * (1 - t) - 1 + Math.round(Math.sin(k * 0.9)), 3, 3); }
    }
    // 建築、怪獸、鎖
    BUILD.forEach((fn, i) => {
      const n = NODES[i]; fn(g, n.x, n.y);
      if (!ok(i)) alpha(g, 0.5, () => R(g, '#000', n.x - 20, n.y - 28, 40, 44));
      const sp = window.PixelSprite(ok(i) ? MON[i] : 'lock', 1);
      g.drawImage(sp, Math.round(n.x - sp.width / 2), Math.round(n.y - 26 - sp.height / 2));
    });
    return c;
  }

  return { backdrop, world, nodes: NODES };
})();
