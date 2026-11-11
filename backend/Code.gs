// 網絡安全小勇者：課堂紀錄後台（Google Apps Script，資料存喺綁定嘅 Google Sheet）
// 老師喺後台「開新課堂」得到一個課堂代號（唔記班別）；學生輸入「課堂代號」先會上報，玩家以佢喺遊戲輸入嘅名顯示。
// 老師睇紀錄、開／結束課堂都要 ADMIN_PASS。

const REC = 'records', SES = 'sessions';
const REC_HEAD = ['時間', '課堂代號', '玩家', '裝置', '年級', '事件', '關卡', '星數', '答錯', '答對', '題數', '通過', '證書編號'];
const SES_HEAD = ['課堂代號', '開始時間', '狀態', '備註'];
const EVENTS = ['start', 'level', 'boss', 'cert', 'fail'];
const LEVEL_NAMES = ['密碼城堡', '釣魚池塘', '個人資料森林', '禮儀廣場', 'AI 小屋']; // 同遊戲關卡次序一致
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 冇 I O 0 1，免得學生睇錯

// 連接 Google Sheet：獨立 Apps Script 專案要喺「指令碼屬性」設 SHEET_ID；
// 由 Sheet 嘅「擴充功能 → Apps Script」開嘅專案就唔使（自動連接）。
function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  const ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('未連接 Google Sheet：請喺指令碼屬性加 SHEET_ID（Sheet 網址 /d/ 同 /edit 中間嗰串）');
  return ss;
}

// 喺編輯器揀 setup 按「執行」一次：授權、檢查連接、建立 records／sessions 工作表
function setup() {
  records_(); sessions_();
  return ss_().getName();
}

// 攞工作表；如果欄位同而家版本唔同（舊版），改名保留，另開新表
function sheet_(name, head) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (sh && sh.getRange(1, 1, 1, head.length).getValues()[0].join() !== head.join()) {
    sh.setName(name + '_舊版_' + Utilities.formatDate(new Date(), 'Asia/Hong_Kong', 'yyyyMMdd_HHmm'));
    sh = null;
  }
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); }
  return sh;
}
const records_ = () => sheet_(REC, REC_HEAD);
const sessions_ = () => sheet_(SES, SES_HEAD);

const num_ = v => { const n = Number(v); return isFinite(n) ? Math.max(0, Math.min(999, Math.round(n))) : ''; };
const text_ = s => ContentService.createTextOutput(s);

// 搵返一個課堂（openOnly = 只接受仍然開放嘅）
function findSession_(code, openOnly) {
  code = String(code || '').toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)) return null;
  const rows = sessions_().getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === code) return openOnly && rows[i][2] !== 'open' ? null : { code: code, status: rows[i][2] };
  }
  return null;
}

// 學生遊戲 POST 到呢度（公開）：只收「課堂仍然開放」而且格式正確嘅資料
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    // 名：去控制字元、最多 8 字；以 = + - @ 開頭會被 Sheet 當公式，所以加 ' 前綴
    let name = String(d.name || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 8);
    if (!name) name = '小勇者';
    if (/^[=+\-@]/.test(name)) name = "'" + name;
    const pid = String(d.pid || '');
    if (EVENTS.indexOf(d.event) < 0 || !/^[0-9a-f]{6}$/.test(pid)) return text_('bad');
    const ses = findSession_(d.code, true);
    if (!ses) return text_('closed');
    const grade = d.grade === 'P5-P6' ? 'P5-P6' : 'P3-P4';
    const pass = d.pass === true ? 'Y' : d.pass === false ? 'N' : '';
    const cert = /^[0-9A-F]{8}$/.test(String(d.certCode || '')) ? d.certCode : '';
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      records_().appendRow([new Date(), ses.code, name, pid, grade, d.event, num_(d.level), num_(d.stars), num_(d.wrong), num_(d.right), num_(d.total), pass, cert]);
    } finally { lock.releaseLock(); }
    return text_('ok');
  } catch (err) { return text_('err'); }
}

// GET：?action=check&code=XXXX&callback=fn → JSONP（遊戲用嚟驗證課堂代號）；否則出老師後台頁
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'check' && /^[A-Za-z_][A-Za-z0-9_]{0,40}$/.test(p.callback || '')) {
    return ContentService.createTextOutput(p.callback + '(' + JSON.stringify({ ok: !!findSession_(p.code, true) }) + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return HtmlService.createHtmlOutputFromFile('admin').setTitle('網絡安全小勇者｜老師後台');
}

function auth_(pass) {
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_PASS');
  if (!real || pass !== real) throw new Error('密碼不正確');
}

// 老師開新課堂，回傳代號
function createSession(pass, note) {
  auth_(pass);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    let code;
    do { code = ''; for (let i = 0; i < 4; i++) code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length)); }
    while (findSession_(code, false));
    sessions_().appendRow([code, new Date(), 'open', String(note || '').slice(0, 40)]);
    return code;
  } finally { lock.releaseLock(); }
}

// 結束／重開課堂（結束後學生再輸入呢個代號會被拒絕）
function setSessionStatus(pass, code, status) {
  auth_(pass);
  if (status !== 'open' && status !== 'closed') throw new Error('狀態唔啱');
  const sh = sessions_(), rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) if (rows[i][0] === code) { sh.getRange(i + 1, 3).setValue(status); return 'ok'; }
  throw new Error('搵唔到呢個課堂');
}

// 由 admin.html 經 google.script.run 呼叫；回傳 JSON 字串（Date 唔可以直接傳）
function getData(pass) {
  auth_(pass);
  const sess = sessions_().getDataRange().getValues().slice(1).map(r => ({ code: r[0], created: +new Date(r[1]), status: r[2], note: r[3] || '' }));
  const map = {};
  records_().getDataRange().getValues().slice(1).forEach(r => {
    const ts = +new Date(r[0]), key = r[1] + '|' + r[3] + '|' + r[2], ev = r[5];
    const s = map[key] || (map[key] = { code: r[1], name: String(r[2]), grade: r[4], levels: {}, boss: null, cert: false, fails: 0, last: ts });
    s.grade = r[4]; s.last = Math.max(s.last, ts);
    if (ev === 'level') {
      const l = s.levels[r[6]] || (s.levels[r[6]] = { stars: 0, tries: 0, wrong: 0 });
      l.stars = Math.max(l.stars, Number(r[7]) || 0); l.tries++; l.wrong += Number(r[8]) || 0;
    } else if (ev === 'boss') {
      const b = s.boss || (s.boss = { tries: 0, pass: false, best: 0, total: Number(r[10]) || 0 });
      b.tries++; b.pass = b.pass || r[11] === 'Y'; b.best = Math.max(b.best, Number(r[9]) || 0);
    } else if (ev === 'cert') s.cert = true;
    else if (ev === 'fail') s.fails++;
  });
  return JSON.stringify({ sessions: sess.reverse(), students: Object.keys(map).map(k => map[k]), levelNames: LEVEL_NAMES, generated: Date.now() });
}

// 一鍵自我測試：喺編輯器揀 selfTest 按「執行」。會開一個測試課堂、模擬學生上報、檢查統計，
// 最後刪走測試資料（records／sessions 入面 code 對應嘅行）。結果睇「執行記錄」或回傳文字。
function selfTest() {
  const pass = PropertiesService.getScriptProperties().getProperty('ADMIN_PASS');
  const log = [];
  const check = (cond, msg) => { log.push((cond ? '✔ ' : '✘ ') + msg); if (!cond) throw new Error(log.join('\n')); };
  const code = createSession(pass, '自動測試');
  try {
    const post = o => doPost({ postData: { contents: JSON.stringify(Object.assign({ code: code, pid: 'abc123', name: '自動測試', grade: 'P3-P4' }, o)) } }).getContent();
    check(/^[A-Z0-9]{4}$/.test(code), '開課堂，代號 ' + code);
    check(findSession_(code, true) !== null, '代號驗證（遊戲用）通過');
    check(post({ event: 'start' }) === 'ok', '上報 start');
    check(post({ event: 'level', level: 1, stars: 3, wrong: 0 }) === 'ok', '上報 level');
    check(post({ event: 'boss', pass: true, right: 8, total: 8 }) === 'ok', '上報 boss');
    check(post({ code: 'ZZZZ', event: 'start' }) === 'closed', '假代號被拒絕');
    const mine = JSON.parse(getData(pass)).students.filter(s => s.code === code);
    check(mine.length === 1 && mine[0].levels[1] && mine[0].levels[1].stars === 3 && mine[0].boss && mine[0].boss.pass, '後台統計正確');
    setSessionStatus(pass, code, 'closed');
    check(findSession_(code, true) === null && post({ event: 'start' }) === 'closed', '結束課堂後拒收');
    log.push('全部通過');
  } finally {
    [records_(), sessions_()].forEach(sh => {
      const rows = sh.getDataRange().getValues();
      for (let i = rows.length - 1; i >= 1; i--) if (rows[i][0] === code || rows[i][1] === code) sh.deleteRow(i + 1);
    });
    Logger.log(log.join('\n'));
  }
  return log.join('\n');
}
