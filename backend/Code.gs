// 網絡安全小勇者：學生紀錄後台（Google Apps Script，資料存喺綁定嘅 Google Sheet）
// 學生端只會 POST 班別學號、關卡、星數；老師睇紀錄要輸入 ADMIN_PASS。

const SHEET = 'records';
const EVENTS = ['start', 'level', 'boss', 'cert', 'fail'];
const LEVEL_NAMES = ['密碼城堡', '釣魚池塘', '個人資料森林', '禮儀廣場', 'AI 小屋']; // 同遊戲關卡次序一致

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    sh = ss.insertSheet(SHEET);
    sh.appendRow(['時間', '學生', '年級', '事件', '關卡', '星數', '答錯', '答對', '題數', '通過', '證書編號']);
    sh.setFrozenRows(1);
  }
  return sh;
}

const num_ = v => { const n = Number(v); return isFinite(n) ? Math.max(0, Math.min(999, Math.round(n))) : ''; };

// 學生遊戲 POST 到呢度（公開，所以只收格式正確嘅資料）
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const sid = String(d.sid || '').toUpperCase();
    if (!/^[0-9A-Z]{2,8}$/.test(sid) || EVENTS.indexOf(d.event) < 0) return ok_('bad');
    const grade = d.grade === 'P5-P6' ? 'P5-P6' : 'P3-P4';
    const pass = d.pass === true ? 'Y' : d.pass === false ? 'N' : '';
    const code = /^[0-9A-F]{8}$/.test(String(d.code || '')) ? d.code : '';
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet_().appendRow([new Date(), sid, grade, d.event, num_(d.level), num_(d.stars), num_(d.wrong), num_(d.right), num_(d.total), pass, code]);
    } finally { lock.releaseLock(); }
    return ok_('ok');
  } catch (err) { return ok_('err'); }
}

const ok_ = s => ContentService.createTextOutput(s);

// 老師後台頁
function doGet() {
  return HtmlService.createHtmlOutputFromFile('admin').setTitle('網絡安全小勇者｜老師後台');
}

// 由 admin.html 經 google.script.run 呼叫；回傳 JSON 字串（Date 唔可以直接傳）
function getData(pass) {
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_PASS');
  if (!real || pass !== real) throw new Error('密碼不正確');
  const rows = sheet_().getDataRange().getValues().slice(1);
  const map = {};
  rows.forEach(r => {
    const ts = +new Date(r[0]), sid = r[1], ev = r[3];
    const s = map[sid] || (map[sid] = { sid: sid, grade: r[2], levels: {}, boss: null, cert: false, fails: 0, first: ts, last: ts });
    s.grade = r[2]; s.first = Math.min(s.first, ts); s.last = Math.max(s.last, ts);
    if (ev === 'level') {
      const l = s.levels[r[4]] || (s.levels[r[4]] = { stars: 0, tries: 0, wrong: 0 });
      l.stars = Math.max(l.stars, Number(r[5]) || 0); l.tries++; l.wrong += Number(r[6]) || 0;
    } else if (ev === 'boss') {
      const b = s.boss || (s.boss = { tries: 0, pass: false, best: 0, total: Number(r[8]) || 0 });
      b.tries++; b.pass = b.pass || r[9] === 'Y'; b.best = Math.max(b.best, Number(r[7]) || 0);
    } else if (ev === 'cert') s.cert = true;
    else if (ev === 'fail') s.fails++;
  });
  return JSON.stringify({ students: Object.keys(map).sort().map(k => map[k]), levelNames: LEVEL_NAMES, generated: Date.now() });
}
