(() => {
  'use strict';
  const C = window.COURSE, SPR = window.SPRITES;
  const app = document.getElementById('app');
  const KEY = 'pixel-cyber-v1';
  const MAXHP = 20, HURT = 3;

  let S = { name: '', code: '', pid: '', grade: 3, done: {}, cert: null, mute: false };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  // 每部裝置一個隨機代號，後台用嚟分開同名嘅玩家（唔係個人資料）
  if (!/^[0-9a-f]{6}$/.test(S.pid || '')) { S.pid = Math.random().toString(16).slice(2, 8).padEnd(6, '0'); save(); }

  /* ---------- 上報（只送課堂代號、名、關卡、星數；失敗會排隊重送） ---------- */

  const QK = 'pixel-cyber-q';
  const readQ = () => { try { return JSON.parse(localStorage.getItem(QK) || '[]'); } catch (e) { return []; } };
  const writeQ = q => { try { localStorage.setItem(QK, JSON.stringify(q.slice(-100))); } catch (e) {} };
  let sending = false;
  function flush() {
    const q = readQ();
    if (!window.REPORT_URL || sending || !q.length) return;
    sending = true;
    fetch(window.REPORT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: q[0] })
      .then(() => { writeQ(readQ().slice(1)); sending = false; flush(); })
      .catch(() => { sending = false; });
  }
  function report(event, data) {
    if (!window.REPORT_URL || !S.code) return;
    const q = readQ(); q.push(JSON.stringify(Object.assign({ code: S.code, pid: S.pid, name: S.name, grade: S.grade >= 5 ? 'P5-P6' : 'P3-P4', event }, data)));
    writeQ(q); flush();
  }
  // 用 JSONP 驗證課堂代號（可以跨網域讀到結果）；網絡有問題會回傳 null
  function checkCode(code, cb) {
    const name = 'cb' + Date.now(); let fin = false;
    const sc = document.createElement('script');
    const end = r => { if (fin) return; fin = true; delete window[name]; sc.remove(); cb(r); };
    window[name] = end;
    sc.src = window.REPORT_URL + '?action=check&code=' + encodeURIComponent(code) + '&callback=' + name;
    sc.onerror = () => end(null);
    setTimeout(() => end(null), 6000);
    document.head.append(sc);
  }
  addEventListener('online', flush);
  setTimeout(flush, 1500);

  const PAL = { k: '#05050f', w: '#ffffff', b: '#3b82f6', c: '#67e8f9', y: '#facc15', r: '#ef4444', g: '#22c55e', p: '#7c3aed', o: '#fb923c', G: '#9ca3af', d: '#111827' };

  const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const eligible = s => (s.min || 3) <= S.grade;

  function sprite(name, scale) {
    const rows = SPR[name], w = Math.max(...rows.map(r => r.length));
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = rows.length;
    const x = cv.getContext('2d');
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== '.') { x.fillStyle = PAL[ch] || '#fff'; x.fillRect(i, j, 1, 1); } }));
    cv.className = 'spr';
    cv.style.width = w * scale + 'px';
    cv.style.height = rows.length * scale + 'px';
    return cv;
  }

  window.PixelSprite = sprite;
  SPR.shard = ['...yy...', '..yyyy..', '.yywwyy.', '.yyywyy.', '..yyyy..', '...yy...'];
  SPR.key = ['..yyyy......', '.yyyyyy.....', 'yyy..yyy....', 'yy....yy....', 'yyy..yyy....', '.yyyyyy.....', '..yyyy......', '...yy.......', '...yy.......', '...yyyy.....', '...yy.......', '...yyyy.....'];

  const A = window.Audio8;
  let voice = 520;

  /* ---------- battle animation ---------- */

  const play = (el, cls, ms) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };
  const pop = (slot, cls, text, color, ms) => {
    const e = h('div', cls, text); if (color) e.style.color = color;
    slot.append(e); setTimeout(() => e.remove(), ms);
  };
  function attackAnim(ctx) {
    const g = ctx.slots && ctx.slots.guide, m = ctx.slots && ctx.slots.mon;
    if (!g || !m) return;
    play(g, 'dash', 450);
    setTimeout(() => {
      A.sfx('hit'); pop(m, 'slash', '', null, 400); play(m, 'hit', 520); pop(m, 'dmg', '-1', '#facc15', 900);
      if (ctx.mTotal) { ctx.mLeft = Math.max(0, ctx.mLeft - 1); ctx.mfill.style.width = ctx.mLeft / ctx.mTotal * 100 + '%'; }
    }, 200);
  }
  function counterAnim(ctx, txt) {
    const g = ctx.slots && ctx.slots.guide, m = ctx.slots && ctx.slots.mon;
    if (!g || !m) return;
    play(m, 'lunge', 450);
    setTimeout(() => { play(g, 'hit', 520); pop(g, 'dmg', txt, '#f87171', 900); }, 200);
  }
  function defeat(ctx, cb) {
    setSpeaker(ctx, null);
    ctx.box.innerHTML = ''; ctx.box.onclick = null; onAdvance = null;
    A.sfx('boom'); ctx.slots.mon.classList.add('die');
    setTimeout(cb, 1200);
  }
  Audio8.setMute(S.mute, S.noMusic);

  let onAdvance = null;
  document.addEventListener('keydown', e => {
    if (!onAdvance) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'z') { e.preventDefault(); onAdvance(); }
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...document.querySelectorAll('.opts .opt:not(:disabled), .cards .card')];
    if (!items.length) return;
    e.preventDefault();
    const i = items.indexOf(document.activeElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
  });

  function typeInto(el, text, done) {
    let i = 0, fin = false;
    const finish = () => { if (fin) return; fin = true; clearInterval(id); el.textContent = text; done && done(); };
    const id = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      if (i % 2 === 0) A.talk(voice);
      if (i >= text.length) finish();
    }, 28);
    return { skip: finish };
  }

  /* ---------- screens ---------- */

  function showTitle() {
    onAdvance = null;
    A.music('hub');
    app.innerHTML = '';
    const s = h('div', 'screen title');
    s.append(h('h1', '', '網絡安全\n小勇者'));
    s.firstChild.style.whiteSpace = 'pre-line';
    const sp = h('div', 'sprs');
    sp.append(sprite('guide', 8), sprite('slime', 6), sprite('phish', 6));
    s.append(sp);
    const lab = h('label', '', '請輸入你的名字');
    const inp = h('input'); inp.maxLength = 8; // 唔預填：共用裝置時，下一位同學唔會見到上一位嘅名
    lab.append(inp); s.append(lab, h('p', 'limit', '名字最多 8 個字'));
    let codeInp = null;
    const msg = h('p', 'hint'); msg.style.color = '#f87171';
    if (window.REPORT_URL) {
      const l2 = h('label', '', '課堂代號');
      codeInp = h('input'); codeInp.maxLength = 4; codeInp.style.width = '110px'; codeInp.style.textTransform = 'uppercase';
      l2.append(codeInp); s.append(l2);
    }
    const gr = h('div', 'grades'); gr.append(h('span', '', '年級'));
    const bs = [[3, 'P3-P4'], [5, 'P5-P6']].map(([g, t]) => {
      const b = h('button', S.grade === g ? 'on' : '', t);
      b.onclick = () => { S.grade = g; bs.forEach(x => x.classList.remove('on')); b.classList.add('on'); A.sfx('move'); };
      gr.append(b); return b;
    });
    s.append(gr);
    const go = h('button', '', '♥ 開始冒險');
    go.onclick = () => {
      const name = inp.value.trim().slice(0, 8) || '小勇者';
      const begin = () => { S.name = name; save(); report('start'); A.sfx('select'); if (S.seen && Object.keys(S.done).length) showHub(); else prologue(); };
      if (!codeInp) return begin();
      const code = codeInp.value.replace(/\s/g, '').toUpperCase();
      if (!code) { S.code = ''; return begin(); } // 唔填 = 唔上報
      if (!/^[A-Z0-9]{4}$/.test(code)) { msg.textContent = '請輸入 4 位課堂代號'; return; }
      msg.textContent = '檢查課堂代號…'; go.disabled = true;
      checkCode(code, r => {
        go.disabled = false;
        if (r && !r.ok) { msg.textContent = '課堂代號不正確，或者課堂已經結束。請問老師。'; return; }
        S.code = code; msg.textContent = ''; begin(); // r 係 null（網絡問題）都照玩，紀錄會排隊補送
      });
    };
    s.append(go, msg);
    app.append(s);
  }

  function stars(n) {
    const w = h('div', 'stars');
    for (let i = 0; i < 3; i++) { const c = sprite('star', 2); if (i >= n) c.style.opacity = '.2'; w.append(c); }
    return w;
  }

  function showHub() {
    onAdvance = null;
    A.music('hub');
    app.innerHTML = '';
    const s = h('div', 'screen');
    const bar = h('div', 'bar');
    bar.append(h('span', 'ttl', S.name + ' 的冒險地圖（' + (S.grade >= 5 ? 'P5-P6' : 'P3-P4') + '）'));
    const got = C.levels.filter(l => S.done[l.id] > 0).length;
    const sh = h('div', 'shards');
    for (let i = 0; i < C.levels.length; i++) { const c = sprite('shard', 3); if (i >= got) c.style.opacity = '.2'; sh.append(c); }
    sh.append(h('span', 'hint', '安全之鑰碎片 ' + got + ' / ' + C.levels.length + (got === C.levels.length ? '　黑客熊在最終關等你！' : '')));
    s.append(bar, sh);
    const allDone = C.levels.every(l => S.done[l.id] > 0);
    const NODES = Maps.nodes;
    const wm = h('div', 'worldmap');
    const mc = Maps.world({ done: S.done, levels: C.levels, allDone });
    mc.className = 'wmcv'; wm.append(mc);
    const open = i => i === 0 || (i < C.levels.length ? S.done[C.levels[i - 1].id] > 0 : allDone);
    const curI = (() => { const i = C.levels.findIndex(l => !(S.done[l.id] > 0)); return i < 0 ? C.levels.length : i; })();
    NODES.forEach((p, i) => {
      const L = C.levels[i], unlocked = open(i);
      const b = h('button', 'pin' + (unlocked ? '' : ' locked'));
      b.style.left = p.x / 240 * 100 + '%'; b.style.top = p.y / 160 * 100 + '%';
      const n = L ? (S.done[L.id] || 0) : 0;
      const label = !unlocked ? '？？？' : L ? '第' + L.id + '關 ' + (L.short || L.title) + (n ? ' ' + '★'.repeat(n) : '') : '最終關 ' + C.boss.name;
      const tag = h('span', 'tag');
      if (!unlocked) tag.textContent = label;
      else tag.append(h('span', '', L ? '第' + L.id + '關' : '最終關'), h('span', 'nm', ' ' + (L ? L.short || L.title : C.boss.name)), h('span', '', n ? ' ' + '★'.repeat(n) : ''));
      b.append(tag);
      b.setAttribute('aria-label', label);
      if (unlocked) b.onclick = () => { A.sfx('select'); if (L) playLevel(i); else playBoss(); };
      wm.append(b);
    });
    const mk = sprite('guide', 3); mk.classList.add('marker');
    mk.style.left = (NODES[curI].x - 17) / 240 * 100 + '%'; mk.style.top = NODES[curI].y / 160 * 100 + '%';
    wm.append(mk);
    s.append(wm);
    const tools = h('div', 'tools');
    if (S.cert) { const b = h('button', '', '查看我的證書'); b.onclick = () => showCert(); tools.append(b); }
    const dex = h('button', '', '知識圖鑑'); dex.onclick = () => { A.sfx('select'); showCodex(); };
    const pro = h('button', '', '重看序章'); pro.onclick = () => { A.sfx('select'); prologue(); };
    tools.append(dex, pro);
    const mute = h('button', '', S.mute ? '音效：關' : '音效：開');
    mute.onclick = () => { S.mute = !S.mute; save(); A.setMute(S.mute, S.noMusic); mute.textContent = S.mute ? '音效：關' : '音效：開'; };
    const mm = h('button', '', S.noMusic ? '音樂：關' : '音樂：開');
    mm.onclick = () => { S.noMusic = !S.noMusic; save(); A.setMute(S.mute, S.noMusic); mm.textContent = S.noMusic ? '音樂：關' : '音樂：開'; };
    const reset = h('button', '', '重新開始');
    let armed = 0;
    reset.onclick = () => {
      if (!armed) {
        armed = setTimeout(() => { armed = 0; reset.textContent = '重新開始'; }, 4000);
        reset.textContent = '再按一次，清除所有進度'; reset.style.color = '#f87171'; reset.style.borderColor = '#f87171';
        return;
      }
      clearTimeout(armed);
      S = { name: '', code: S.code, pid: S.pid, grade: S.grade, done: {}, cert: null, mute: S.mute, noMusic: S.noMusic }; save(); showTitle();
    };
    tools.append(mute, mm, reset);
    s.append(tools);
    app.append(s);
  }

  /* ---------- battle frame ---------- */

  function buildFrame(ctx, title, monKey, monName, showHp) {
    onAdvance = null;
    app.innerHTML = '';
    const s = h('div', 'screen');
    const bar = h('div', 'bar');
    ctx.ttl = h('span', 'ttl', title);
    bar.append(ctx.ttl);
    const hpw = h('div', 'hpwrap');
    if (showHp) {
      ctx.hpText = h('span', '', 'HP ' + ctx.hp + '/' + MAXHP);
      const hb = h('div', 'hpbar'); ctx.hpFill = h('i'); ctx.hpFill.style.width = '100%'; hb.append(ctx.hpFill);
      hpw.append(ctx.hpText, hb);
    } else {
      ctx.hpText = h('span', '', '');
      hpw.append(ctx.hpText);
    }
    const back = h('button', '', '離開'); back.onclick = () => { onAdvance = null; showHub(); };
    bar.append(hpw, back);
    const stage = h('div', 'stage');
    if (ctx.bg) { stage.style.backgroundImage = 'url(' + Maps.backdrop(ctx.bg) + ')'; stage.classList.add('bgd'); }
    ctx.slots = {};
    [['guide', 'guide', 6, S.name || '小勇者'], ['mon', monKey, 8, monName]].forEach(([k, spr, sc, nm]) => {
      const sl = h('div', 'slot'); sl.append(sprite(spr, sc), h('div', 'nm', nm));
      if (k === 'mon' && ctx.mTotal) { const mb = h('div', 'mhp'); ctx.mfill = h('i'); mb.append(ctx.mfill); sl.append(mb); }
      stage.append(sl); ctx.slots[k] = sl;
    });
    ctx.names = { guide: S.name || '小勇者', mon: monName, me: S.name || '小勇者' };
    ctx.box = h('div', 'box');
    ctx.stage = stage;
    s.append(bar, stage, ctx.box);
    app.append(s);
    ctx.root = s;
  }

  function setSpeaker(ctx, who) {
    if (who === 'me') who = 'guide';
    voice = who === 'guide' ? 560 : who === 'mon' ? (ctx.voice || 300) : 440;
    Object.entries(ctx.slots).forEach(([k, el]) => { el.classList.toggle('dim', who !== k && who != null); el.classList.toggle('talk', who === k); });
  }

  function updateHp(ctx) {
    if (!ctx.hpFill) return;
    ctx.hpText.textContent = 'HP ' + Math.max(ctx.hp, 0) + '/' + MAXHP;
    ctx.hpFill.style.width = Math.max(ctx.hp, 0) / MAXHP * 100 + '%';
  }

  function result(ctx, ok) {
    if (ok) { ctx.right++; A.sfx('ok'); attackAnim(ctx); return; }
    ctx.wrong++;
    A.sfx('bad');
    const loses = ctx.hpFill && !ctx.noHurt;
    if (loses) {
      ctx.hp -= HURT; updateHp(ctx);
      if (ctx.hp <= 0) ctx.dead = true;
    }
    counterAnim(ctx, loses ? '-' + HURT : '✘');
    ctx.root.classList.remove('shake'); void ctx.root.offsetWidth; ctx.root.classList.add('shake');
  }

  /* ---------- step runners ---------- */

  function say(ctx, who, text, cb) {
    setSpeaker(ctx, who);
    const b = ctx.box; b.innerHTML = '';
    b.append(h('div', 'spk', ctx.names[who] || ''));
    const t = h('div', 'txt'); const more = h('div', 'more', '');
    b.append(t, more);
    let done = false;
    const ty = typeInto(t, text, () => { done = true; more.textContent = '▼'; });
    const adv = () => { if (!done) { ty.skip(); return; } onAdvance = null; b.onclick = null; cb(); };
    onAdvance = adv; b.onclick = adv;
  }

  function ask(ctx, who, q, opts, cb, layout) {
    setSpeaker(ctx, who);
    const b = ctx.box; b.innerHTML = ''; b.onclick = null;
    b.append(h('div', 'spk', ctx.names[who] || ''));
    const t = h('div', 'txt'); b.append(t);
    const list = h('div', 'opts' + (layout === 'two' ? ' two' : ''));
    const fb = h('div', 'fb'); const more = h('div', 'more', '');
    let shown = false;
    const showOpts = () => {
      if (shown) return; shown = true; onAdvance = null; b.onclick = null;
      b.insertBefore(list, fb.parentNode ? fb : null);
      const first = list.querySelector('.opt'); if (first) first.focus({ preventScroll: true });
    };
    const ty = typeInto(t, q, showOpts);
    onAdvance = () => ty.skip(); b.onclick = () => ty.skip();
    opts.forEach(o => {
      const btn = h('button', 'opt', o.t);
      btn.onclick = () => {
        if (btn.disabled) return;
        [...list.children].forEach(x => x.disabled = true);
        btn.classList.add(o.ok ? 'right' : 'wrong');
        if (!o.ok) { const c = opts.findIndex(z => z.ok); if (c >= 0) list.children[c].classList.add('right'); }
        result(ctx, o.ok);
        fb.className = 'fb ' + (o.ok ? 'good' : 'bad');
        fb.textContent = (o.ok ? '✔ 答對了！' : '✘ 不對喔。') + (o.why ? '\n' + o.why : '');
        b.append(fb, more); more.textContent = '▼';
        const adv = () => { onAdvance = null; b.onclick = null; cb(); };
        setTimeout(() => { onAdvance = adv; b.onclick = adv; }, 250);
      };
      list.append(btn);
    });
  }

  /* ---------- dodge mini-game ---------- */

  const BSPR = { slime: ['drop'], phish: ['hook'], ghost: ['foot'], troll: ['bub'], robot: ['bolt'], boss: ['drop', 'hook', 'foot', 'bub', 'bolt'] };
  const bcache = {};
  const bimg = n => bcache[n] || (bcache[n] = sprite(n, 1));
  let tipShown = false;

  function dodge(ctx, s, next) {
    setSpeaker(ctx, 'mon');
    const b = ctx.box; b.innerHTML = ''; b.onclick = null; onAdvance = null;
    const W = 360, H = 200, DUR = s.dur || 8, theme = s.theme || 'boss';
    const hi = S.grade >= 5;
    const wrap = h('div', 'dodge');
    const info = h('div', 'dinfo', '躲開攻擊！　（方向鍵 / WASD，或用手指拖動紅心）');
    const cv = h('canvas', 'arena'); cv.width = W; cv.height = H;
    const skip = h('button', '', '跳過');
    wrap.append(info, cv, skip); b.append(wrap);
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const heart = sprite('heart', 1);
    const P = { x: W / 2, y: H - 34 };
    const keys = {};
    const kd = e => { const k = e.key.toLowerCase(); if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) { keys[k] = true; e.preventDefault(); } };
    const ku = e => { delete keys[e.key.toLowerCase()]; };
    const pm = e => {
      const r = cv.getBoundingClientRect();
      P.x = (e.clientX - r.left) * W / r.width; P.y = (e.clientY - r.top) * H / r.height;
      if (e.pointerType === 'touch') P.y -= 36; // 紅心放在手指上方，唔會被手指遮住
    };
    A.music('dodge');
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
    cv.addEventListener('pointermove', pm); cv.addEventListener('pointerdown', pm);
    const bullets = [];
    let t = 0, spawn = 0.4, inv = 0, last = performance.now(), raf = 0, over = false, hits = 0;
    const sp = hi ? 1.25 : 1, gap = hi ? 0.42 : 0.6;

    const fin = (skipped) => {
      if (over) return; over = true;
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku);
      if (!cv.isConnected) return;
      info.textContent = ctx.dead ? '被擊倒了……' : skipped ? '已跳過。' : hits === 0 ? '完美閃避！' : '撐過去了！被擊中 ' + hits + ' 次。';
      A.sfx(skipped ? 'skip' : 'ok');
      if (ctx.song) A.music(ctx.song, ctx.trans || 0);
      setTimeout(() => { if (cv.isConnected) next(); }, 900);
    };
    skip.onclick = () => fin(true);

    const spawnOne = () => {
      const kind = theme === 'boss' ? ['slime', 'phish', 'ghost', 'troll', 'robot'][Math.floor(Math.random() * 5)] : theme;
      const name = BSPR[kind][0];
      const o = { img: bimg(name), sc: 4, kind, seed: Math.random() * 6, x: 0, y: 0, vx: 0, vy: 0, sway: 0 };
      o.w = o.img.width * o.sc; o.h = o.img.height * o.sc;
      const side = Math.random() < 0.5 ? 1 : -1;
      if (kind === 'slime') { o.x = Math.random() * (W - o.w); o.y = -o.h; o.vy = (90 + Math.random() * 50) * sp; }
      else if (kind === 'phish') { o.x = 20 + Math.random() * (W - 40 - o.w); o.y = -o.h; o.vy = (70 + Math.random() * 40) * sp; o.sway = 50; }
      else if (kind === 'ghost') { o.y = 10 + Math.random() * (H - 50); o.x = side > 0 ? -o.w : W; o.vx = side * (100 + Math.random() * 50) * sp; }
      else { if (Math.random() < 0.5) { o.x = Math.random() * (W - o.w); o.y = -o.h; o.vy = (100 + Math.random() * 40) * sp; } else { o.y = 10 + Math.random() * (H - 50); o.x = side > 0 ? -o.w : W; o.vx = side * (110 + Math.random() * 40) * sp; } }
      bullets.push(o);
    };

    const frame = now => {
      if (over) return;
      if (!cv.isConnected) { fin(true); return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      t += dt; spawn -= dt; inv = Math.max(0, inv - dt);
      const v = 150 * dt;
      if (keys.arrowleft || keys.a) P.x -= v; if (keys.arrowright || keys.d) P.x += v;
      if (keys.arrowup || keys.w) P.y -= v; if (keys.arrowdown || keys.s) P.y += v;
      P.x = Math.max(8, Math.min(W - 8, P.x)); P.y = Math.max(8, Math.min(H - 8, P.y));
      if (t < DUR - 1 && spawn <= 0) { spawnOne(); spawn = gap * (0.7 + Math.random() * 0.6); }
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      for (let i = bullets.length - 1; i >= 0; i--) {
        const o = bullets[i];
        o.x += o.vx * dt + (o.sway ? Math.cos(t * 3 + o.seed) * o.sway * dt : 0); o.y += o.vy * dt;
        if (o.y > H + 20 || o.x < -40 || o.x > W + 40) { bullets.splice(i, 1); continue; }
        g.drawImage(o.img, o.x, o.y, o.w, o.h);
        if (!inv && Math.abs(o.x + o.w / 2 - P.x) < o.w / 2 - 2 + 4 && Math.abs(o.y + o.h / 2 - P.y) < o.h / 2 - 2 + 4) {
          inv = 1; hits++;
          ctx.hp -= 2; updateHp(ctx); A.sfx('hurt');
          play(ctx.slots.guide, 'hit', 520); pop(ctx.slots.guide, 'dmg', '-2', '#f87171', 900);
          ctx.root.classList.remove('shake'); void ctx.root.offsetWidth; ctx.root.classList.add('shake');
          if (ctx.hp <= 0) { ctx.dead = true; fin(false); return; }
        }
      }
      if (!(inv > 0 && Math.floor(inv * 10) % 2 === 0)) g.drawImage(heart, P.x - 8, P.y - 7, 16, 14);
      g.fillStyle = '#facc15'; g.fillRect(0, 0, W * Math.max(0, 1 - t / DUR), 4);
      if (t >= DUR) { fin(false); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  }

  function scene(host, name, opt, cb) {
    onAdvance = null;
    const sc = Scenes.play(host, name, opt, () => { onAdvance = null; cb(); });
    onAdvance = sc.skip;
  }
  function encounter(mon, text, cb) {
    onAdvance = null; app.innerHTML = '';
    const s = h('div', 'screen enc'); app.append(s);
    scene(s, 'encounter', { mon, text }, cb);
  }

  function stepBox(ctx) {
    setSpeaker(ctx, null);
    const b = ctx.box; b.innerHTML = ''; b.onclick = null; onAdvance = null;
    b.append(h('div', 'spk', ''), h('div', 'txt'));
    return b;
  }
  function tapNext(b, next) {
    b.append(h('div', 'more', '▼'));
    setTimeout(() => { const adv = () => { onAdvance = null; b.onclick = null; next(); }; onAdvance = adv; b.onclick = adv; }, 300);
  }

  const RUN = {
    say: (ctx, s, next) => say(ctx, s.who, s.x, next),
    dodge: (ctx, s, next) => {
      const go = () => say(ctx, 'mon', s.x, () => dodge(ctx, s, next));
      if (tipShown) return go();
      tipShown = true;
      say(ctx, null, '小心！要躲開攻擊了。移動小紅心，避開所有東西。被擊中會扣 2 點 HP。', go);
    },
    ask: (ctx, s, next) => {
      const opts = shuffle(s.o.map(o => ({ t: o[0], ok: !!o[1], why: o[2] })));
      ask(ctx, null, s.x, opts, next);
    },
    sort: (ctx, s, next) => {
      const items = shuffle(s.i);
      let k = 0;
      const one = () => {
        if (k >= items.length) return next();
        const it = items[k++];
        const opts = [{ t: s.l, ok: it[1] === 0, why: it[2] }, { t: s.r, ok: it[1] === 1, why: it[2] }];
        ask(ctx, null, s.x + '（' + k + '/' + items.length + '）\n\n「' + it[0] + '」', opts, () => ctx.dead ? gameOver(ctx, ctx.li) : one(), 'two');
      };
      one();
    },
    build: (ctx, s, next) => {
      const b = stepBox(ctx);
      const nm = (S.name || '').toLowerCase();
      const rules = [
        ['至少 10 個字元', p => p.length >= 10],
        ['有大寫字母', p => /[A-Z]/.test(p)],
        ['有小寫字母', p => /[a-z]/.test(p)],
        ['有數字', p => /\d/.test(p)],
        ['有符號（! ? # $ …）', p => /[!-\/:-@\[-`{-~]/.test(p)],
        ['沒有 123、password 或你的名字', p => !(/123|password|qwerty|abc|0000|1111/i.test(p) || (nm.length >= 2 && p.toLowerCase().includes(nm)))]
      ];
      const wrap = h('div', 'build');
      const inp = h('input'); inp.maxLength = 24; inp.placeholder = '在這裏造一個密碼'; inp.autocomplete = 'off'; inp.spellcheck = false;
      const meter = h('div', 'meter'); const segs = rules.map(() => meter.appendChild(h('i')));
      const ul = h('ul', 'checks'); const lis = rules.map(r => ul.appendChild(h('li', '', r[0])));
      const go = h('button', '', '用這個密碼攻擊！'); go.disabled = true;
      const upd = () => {
        const p = inp.value; let n = 0;
        rules.forEach((r, i) => { const ok = p.length > 0 && r[1](p); lis[i].classList.toggle('ok', ok); if (ok) n++; });
        segs.forEach((e, i) => e.classList.toggle('on', i < n));
        meter.className = 'meter' + (n >= 6 ? ' hi' : n >= 4 ? ' mid' : '');
        go.disabled = n < 6;
        go.textContent = n < 6 ? '還差 ' + (6 - n) + ' 項條件，才能攻擊' : '用這個密碼攻擊！';
      };
      inp.oninput = upd;
      inp.onkeydown = e => { if (e.key === 'Enter' && !go.disabled) go.click(); };
      go.onclick = () => {
        if (go.disabled) return;
        go.disabled = true; inp.disabled = true;
        result(ctx, true);
        const fb = h('div', 'fb good', '✔ 好強的密碼！史萊姆猜不到。\n記住：這只是練習，真正的密碼不要告訴別人，也不要重複使用。');
        b.append(fb); tapNext(b, next);
      };
      wrap.append(inp, meter, ul, h('div', 'note', s.warn || ''), h('p', 'hint', s.tip || ''), go);
      typeInto(b.querySelector('.txt'), s.x, () => { b.append(wrap); inp.focus({ preventScroll: true }); });
    },
    spot: (ctx, s, next) => {
      const b = stepBox(ctx);
      const total = s.parts.filter(p => p[1]).length; let found = 0;
      const post = h('div', 'post'); const note = h('div', 'fb');
      s.parts.forEach(p => {
        const sp = h('button', 'seg', p[0]);
        sp.onclick = () => {
          if (sp.dataset.d || ctx.dead) return; sp.dataset.d = 1;
          if (p[1]) {
            sp.classList.add('found'); found++; result(ctx, true);
            note.className = 'fb good'; note.textContent = '✔ 找到了！' + p[2] + '（' + found + ' / ' + total + '）';
            if (found === total) { note.textContent += '\n全部找到了！'; tapNext(b, next); }
          } else {
            sp.classList.add('miss'); result(ctx, false);
            note.className = 'fb bad'; note.textContent = '✘ 這裏沒有問題，再找找其他地方。';
            if (ctx.dead) setTimeout(() => gameOver(ctx, ctx.li), 800);
          }
        };
        post.append(sp);
      });
      typeInto(b.querySelector('.txt'), s.x, () => { b.append(post, note); });
    },
    match: (ctx, s, next) => {
      const b = stepBox(ctx);
      const grid = h('div', 'match'), colL = h('div'), colR = h('div'); grid.append(colL, colR);
      const note = h('div', 'fb'); let sel = null, left = s.p.length;
      s.p.forEach((p, i) => {
        const bl = h('button', 'mt', p[0]); bl.dataset.i = i;
        bl.onclick = () => {
          if (bl.classList.contains('done') || ctx.dead) return;
          if (sel) sel.classList.remove('sel');
          sel = bl; bl.classList.add('sel'); A.sfx('move');
        };
        colL.append(bl);
      });
      shuffle(s.p.map((p, i) => [p[1], i])).forEach(([txt, i]) => {
        const br = h('button', 'mt', txt);
        br.onclick = () => {
          if (br.classList.contains('done') || ctx.dead) return;
          if (!sel) { note.className = 'fb'; note.textContent = '先點左邊的一項。'; return; }
          if (+sel.dataset.i === i) {
            sel.classList.remove('sel'); sel.classList.add('done'); br.classList.add('done'); sel = null;
            result(ctx, true); note.className = 'fb good'; note.textContent = '✔ 配對成功！';
            if (--left === 0) { note.textContent = '✔ 全部配對成功！'; tapNext(b, next); }
          } else {
            result(ctx, false); play(br, 'no', 350);
            note.className = 'fb bad'; note.textContent = '✘ 不是這一對，再想想。';
            if (ctx.dead) setTimeout(() => gameOver(ctx, ctx.li), 800);
          }
        };
        colR.append(br);
      });
      typeInto(b.querySelector('.txt'), s.x, () => { b.append(grid, note); });
    },
    cards: (ctx, s, next) => {
      setSpeaker(ctx, null);
      const b = ctx.box; b.innerHTML = ''; b.onclick = null; onAdvance = null;
      b.append(h('div', 'spk', ''));
      const t = h('div', 'txt'); b.append(t);
      const grid = h('div', 'cards'); const more = h('div', 'more', '');
      let opened = 0;
      s.c.forEach(c => {
        const btn = h('button', 'card', c[0]);
        btn.onclick = () => {
          if (btn.classList.contains('open')) return;
          btn.classList.add('open'); btn.textContent = c[0] + '\n' + c[1]; btn.style.whiteSpace = 'pre-line';
          A.sfx('flip'); opened++;
          if (opened === s.c.length) {
            more.textContent = '▼'; b.append(more);
            const adv = () => { onAdvance = null; b.onclick = null; next(); };
            setTimeout(() => { onAdvance = adv; b.onclick = adv; }, 250);
          }
        };
        grid.append(btn);
      });
      typeInto(t, s.x, () => { b.append(grid); });
    }
  };

  /* ---------- level flow ---------- */

  function playLevel(li, quick) {
    const L = C.levels[li];
    if (!quick) return encounter(L.mon, '* ' + L.monName + ' 擋住了去路！', () => playLevel(li, true));
    const ctx = { hp: MAXHP, wrong: 0, right: 0, dead: false, li, song: 'level', bg: ['castle', 'pond', 'forest', 'plaza', 'house'][L.id - 1], trans: [0, 2, -2, 3, -3][L.id - 1] || 0, voice: [240, 330, 420, 280, 360][L.id - 1] || 300 };
    A.music(ctx.song, ctx.trans);
    const steps = L.steps.filter(eligible);
    ctx.mTotal = ctx.mLeft = steps.reduce((n, s) => n + (s.t === 'ask' || s.t === 'build' ? 1 : s.t === 'sort' ? s.i.length : s.t === 'match' ? s.p.length : s.t === 'spot' ? s.parts.filter(p => p[1]).length : 0), 0);
    buildFrame(ctx, '第 ' + L.id + ' 關　' + L.title, L.mon, L.monName, true);
    let i = 0;
    const next = () => {
      if (ctx.dead) return gameOver(ctx, li);
      if (i >= steps.length) return finishLevel(ctx, li);
      const s = steps[i++];
      RUN[s.t](ctx, s, () => ctx.dead ? gameOver(ctx, li) : next());
    };
    ctx.retry = () => playLevel(li);
    next();
  }

  function gameOver(ctx, li) {
    if (C.levels[li]) report('fail', { level: C.levels[li].id });
    onAdvance = null;
    setSpeaker(ctx, null);
    const b = ctx.box; b.innerHTML = ''; b.onclick = null;
    const r = h('div', 'result');
    r.append(h('div', 'big', 'HP 用完了……'), h('p', '', '不要放棄！錯誤是學習的好機會，再來一次吧。'));
    const again = h('button', '', '♥ 再試一次'); again.onclick = () => playLevel(li, true);
    const back = h('button', '', '回到地圖'); back.onclick = showHub;
    const tl = h('div', 'tools'); tl.append(again, back);
    r.append(tl); b.append(r);
    A.jingle('lose');
  }

  function finishLevel(ctx, li) {
    if (!ctx.defeated) { ctx.defeated = true; return defeat(ctx, () => finishLevel(ctx, li)); }
    const L = C.levels[li];
    const st = ctx.wrong === 0 ? 3 : ctx.wrong <= 2 ? 2 : 1;
    S.done[L.id] = Math.max(S.done[L.id] || 0, st); save();
    setSpeaker(ctx, null);
    const b = ctx.box; b.innerHTML = ''; b.onclick = null;
    const r = h('div', 'result');
    const got = C.levels.filter(l => S.done[l.id] > 0).length;
    if (!ctx.shardShown) { ctx.shardShown = true; return scene(b, 'shard', { n: got, total: C.levels.length }, () => finishLevel(ctx, li)); }
    report('level', { level: L.id, stars: st, wrong: ctx.wrong });
    const shr =h('div', 'shards'); shr.append(sprite('shard', 4), h('span', '', '得到「安全之鑰」碎片！　' + got + ' / ' + C.levels.length));
    r.append(h('div', 'big', '關卡完成！'), stars(st), shr, h('p', '', '答錯 ' + ctx.wrong + ' 次。' + (st < 3 ? '想拿滿星，可以再挑戰一次。' : '完美！')));
    const tl = h('div', 'tools');
    const back = h('button', '', '回到地圖'); back.onclick = showHub; tl.append(back);
    if (st < 3) { const again = h('button', '', '再挑戰'); again.onclick = () => playLevel(li, true); tl.append(again); }
    r.append(tl); b.append(r);
    A.jingle('level');
  }

  function playBoss(quick) {
    if (!quick) return encounter('boss', '* ' + C.boss.name + ' 現身了！', () => playBoss(true));
    const ctx = { hp: MAXHP, wrong: 0, right: 0, dead: false, noHurt: true, bg: 'lair', song: 'boss', trans: 0, voice: 160 };
    A.music('boss');
    const qs = shuffle(C.pool.filter(eligible)).slice(0, C.boss.n);
    ctx.mTotal = ctx.mLeft = qs.length;
    buildFrame(ctx, '最終關　' + C.boss.name, 'boss', C.boss.name, true);
    const intro = C.boss.intro.slice();
    let qi = 0;
    const nextQ = () => {
      if (ctx.dead) return bossEnd(ctx);
      if (qi >= qs.length) return bossEnd(ctx);
      if ((qi === 3 || qi === 6) && ctx.dodged !== qi) {
        ctx.dodged = qi;
        return say(ctx, 'mon', '先嚐嚐我的攻擊！', () => dodge(ctx, { theme: 'boss', dur: 8 }, nextQ));
      }
      const q = qs[qi++];
      ctx.ttl.textContent = '最終關　第 ' + qi + ' / ' + qs.length + ' 題';
      const opts = shuffle(q.o.map(o => ({ t: o[0], ok: !!o[1], why: o[2] })));
      ask(ctx, 'mon', q.x, opts, nextQ);
    };
    const nextIntro = () => {
      if (!intro.length) return nextQ();
      const [who, x] = intro.shift();
      say(ctx, who, x, nextIntro);
    };
    nextIntro();
  }

  function bossEnd(ctx) {
    const n = C.boss.n, ok = !ctx.dead && ctx.right >= C.boss.pass;
    if (ok && !ctx.defeated) { ctx.defeated = true; return defeat(ctx, () => bossEnd(ctx)); }
    report('boss', { pass: ok, right: ctx.right, total: n });
    setSpeaker(ctx, ok ? 'guide' : 'mon');
    const b = ctx.box; b.innerHTML = ''; b.onclick = null; onAdvance = null;
    const r = h('div', 'result');
    r.append(h('div', 'big', ok ? '你打敗了黑客熊！' : '黑客熊還很強……'),
      h('p', '', ctx.dead ? 'HP 用完了，下次小心閃避！' : '答對 ' + ctx.right + ' / ' + n + ' 題（需要 ' + C.boss.pass + ' 題以上）'));
    const tl = h('div', 'tools');
    if (ok) {
      if (!S.cert) S.cert = { code: Math.random().toString(16).slice(2, 10).toUpperCase(), date: new Date().toLocaleDateString('zh-HK'), name: S.name || '小勇者', grade: S.grade >= 5 ? 'P5-P6' : 'P3-P4' };
      save();
      if (!S.certSent) { S.certSent = true; save(); report('cert', { certCode: S.cert.code }); }
      const c = h('button', '', '♥ 繼續'); c.onclick = epilogue; tl.append(c);
      A.jingle('win');
    } else {
      const again = h('button', '', '再挑戰'); again.onclick = () => playBoss(true);
      const back = h('button', '', '回去複習'); back.onclick = showHub;
      tl.append(again, back);
    }
    r.append(tl); b.append(r);
  }

  /* ---------- story & codex ---------- */

  function cutscene(lines, title, done) {
    const ctx = { hp: 0, voice: 160, bg: 'kingdom' };
    buildFrame(ctx, title, 'boss', '黑客熊', false);
    const skip = ctx.root.querySelector('.bar button');
    skip.textContent = '跳過'; skip.onclick = () => { onAdvance = null; done(); };
    const q = lines.slice();
    const nx = () => {
      if (!q.length) return done();
      const l = q.shift();
      if (!Array.isArray(l)) {
        ctx.stage.style.display = 'none';
        return scene(ctx.box, l.scene, {}, () => { ctx.stage.style.display = ''; nx(); });
      }
      const [who, txt, key, nm] = l;
      if (key) {
        const sl = ctx.slots.mon; sl.innerHTML = '';
        sl.append(sprite(key, key === 'key' ? 7 : 8), h('div', 'nm', nm)); ctx.names.mon = nm;
      }
      say(ctx, who, txt.replace('{name}', S.name || '小勇者'), nx);
    };
    nx();
  }
  function prologue() {
    A.music('hub');
    cutscene(C.story.prologue, '序章　安全之鑰', () => { S.seen = true; save(); showHub(); });
  }
  function epilogue() {
    A.music('hub');
    cutscene(C.story.epilogue, '終章　和平回來了', showCert);
  }

  function showCodex() {
    onAdvance = null; app.innerHTML = '';
    const s = h('div', 'screen');
    s.append(h('div', 'bar', '知識圖鑑　（通關後解鎖）'));
    C.levels.forEach(L => {
      const open = S.done[L.id] > 0;
      const d = h('div', 'dex' + (open ? '' : ' lock'));
      d.append(h('h3', '', '第 ' + L.id + ' 關　' + L.title));
      if (open) { const ul = h('ul'); L.tips.forEach(t => ul.append(h('li', '', t))); d.append(ul); }
      else d.append(h('div', '', '？？？　通關後解鎖'));
      s.append(d);
    });
    const back = h('button', '', '回到地圖'); back.onclick = showHub;
    const tl = h('div', 'tools'); tl.append(back); s.append(tl);
    app.append(s);
  }

  /* ---------- certificate ---------- */

  function showCert() {
    onAdvance = null;
    A.music('hub');
    app.innerHTML = '';
    const s = h('div', 'screen cert');
    const cv = h('canvas'); cv.width = 640; cv.height = 440;
    s.append(cv);
    const lab = h('label', 'certname', '證書上的名字');
    const nameInp = h('input'); nameInp.maxLength = 8; nameInp.value = S.cert.name;
    nameInp.oninput = () => { S.cert.name = nameInp.value.trim().slice(0, 8) || '小勇者'; save(); draw(); };
    lab.append(nameInp); s.append(lab, h('p', 'limit', '名字最多 8 個字'));
    const tl = h('div', 'tools');
    const dl = h('button', '', '下載證書圖片');
    dl.onclick = () => { const a = document.createElement('a'); a.download = '網絡安全小勇者證書.png'; a.href = cv.toDataURL('image/png'); a.click(); };
    const back = h('button', '', '回到地圖'); back.onclick = showHub;
    tl.append(dl, back); s.append(tl);
    app.append(s);
    const draw = () => {
      const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
      x.fillStyle = '#000'; x.fillRect(0, 0, 640, 440);
      x.strokeStyle = '#fff'; x.lineWidth = 8; x.strokeRect(14, 14, 612, 412);
      x.lineWidth = 3; x.strokeRect(30, 30, 580, 380);
      const F = "'DotGothic16','PingFang HK','Microsoft JhengHei',monospace";
      x.textAlign = 'center'; x.fillStyle = '#facc15'; x.font = '38px ' + F; x.fillText('網絡安全小勇者', 320, 100);
      x.fillStyle = '#fff'; x.font = '22px ' + F; x.fillText('證　書', 320, 140);
      x.font = '20px ' + F; x.fillText('茲證明', 320, 195);
      x.fillStyle = '#4ade80'; x.font = '36px ' + F; x.fillText(S.cert.name, 320, 245);
      x.fillStyle = '#fff'; x.font = '18px ' + F;
      x.fillText('已完成網絡安全課程（' + S.cert.grade + '），', 320, 290);
      x.fillText('並成功打敗黑客熊，成為網絡小英雄！', 320, 318);
      x.fillStyle = '#9ca3af'; x.font = '14px ' + F;
      x.fillText('日期：' + S.cert.date + '　　編號：' + S.cert.code, 320, 385);
      const g = sprite('guide', 5); x.drawImage(g, 50, 330, 60, 60);
      const st = sprite('star', 4); for (let i = 0; i < 3; i++) x.drawImage(st, 470 + i * 46, 340, 36, 28);
    };
    draw();
    if (document.fonts && document.fonts.load) document.fonts.load("20px 'DotGothic16'", '網絡').then(draw).catch(() => {});
  }

  showTitle();
})();
