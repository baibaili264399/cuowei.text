/* 丹丹大冒险 · 1-1  ------------------------------------------------------------
   横版闯关（超级玛丽那一套）：跑、跳、顶砖、问号砖出金币、水管、踩怪、掉坑死、
   旗杆通关、分数／金币／时间／生命。
   贴图：地形与怪物为程序生成（assets/sheet.webp），主角用丹丹的像素图集。
   背景：全部用代码画（渐变天空 + 视差云 / 山 / 草丛），不依赖外部素材。 */
(function () {
'use strict';

var TILE = 40, LW = 1280, LH = 720, ROWS = 18;
var CV = document.getElementById('cv');
var ctx = CV.getContext('2d');
var Q = new URLSearchParams(location.search);

/* ================================================================= 关卡 */
var W = 262;                    // 关卡宽度（格）
var G = [];                     // tiles[y][x]
var L = {
  w: W, flagX: 246, time: 400, dead: false,
  checks: [110, 170]            // 中途旗（存档点）
};

function blank() {
  G = [];
  for (var y = 0; y < ROWS; y++) G.push(new Array(W).fill('.'));
}
function put(x, y, c) { if (x >= 0 && x < W && y >= 0 && y < ROWS) G[y][x] = c; }
function fill(x0, x1, y0, y1, c) {
  for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) put(x, y, c);
}
function bricks(x, y, pat) { for (var i = 0; i < pat.length; i++) if (pat[i] !== '.') put(x + i, y, pat[i]); }
function pipe(x, h) {                       // 水管：2 格宽，坐在地面上
  for (var i = 0; i < h; i++) { put(x, 15 - i, 'p'); put(x + 1, 15 - i, 'p'); }
}
function stairs(x, h, dir) {                // 楼梯：dir=1 上行，-1 下行
  for (var i = 0; i < h; i++) {
    var top = 15 - (dir > 0 ? i : h - 1 - i);
    fill(x + i, x + i, top, 15, '#');
  }
}
function coinRow(x0, x1, y) { for (var x = x0; x <= x1; x++) put(x, y, 'o'); }

var FOES = [];
function foe(x, y, t) { FOES.push({ x: x * TILE, y: y * TILE, t: t || 'g' }); }

function buildLevel() {
  blank(); FOES = [];
  // 地面（两行），中间留 8 处坑
  var runs = [[0, 30], [34, 56], [60, 80], [84, 106], [110, 138], [142, 166], [170, 198], [202, 230], [234, 261]];
  runs.forEach(function (r) { fill(r[0], r[1], 16, 17, '#'); });

  // ① 起步区
  bricks(10, 12, 'B?B?B');
  coinRow(10, 14, 8);
  foe(20, 15, 'g');

  // ② 砖块区
  bricks(38, 12, 'B?BBB');
  bricks(43, 9, 'BBB');
  coinRow(43, 45, 7);
  foe(48, 15, 'g'); foe(53, 15, 'g');

  // ③ 水管区
  pipe(62, 2); pipe(68, 3); pipe(74, 2);
  foe(66, 15, 'g'); foe(71, 15, 'g'); foe(78, 15, 'g');

  // ④ 深坑 + 浮台
  fill(88, 90, 11, 11, '='); fill(95, 97, 10, 10, '=');
  coinRow(88, 90, 9); coinRow(95, 97, 8);
  foe(99, 15, 's');

  // ⑤ 楼梯区
  stairs(114, 4, 1); stairs(120, 4, -1);
  bricks(128, 12, 'B?B');
  foe(126, 15, 'g'); foe(134, 15, 'g');

  // ⑥ 空中平台
  fill(145, 147, 11, 11, '='); fill(151, 153, 9, 9, '='); fill(157, 159, 11, 11, '=');
  coinRow(145, 147, 9); coinRow(151, 153, 7); coinRow(157, 159, 9);
  foe(162, 15, 's'); foe(150, 15, 'g');

  // ⑦ 砖块迷宫
  bricks(174, 12, 'BB?BB'); bricks(176, 9, 'B?B');
  coinRow(174, 178, 7);
  foe(172, 15, 'g'); foe(182, 15, 'g'); foe(190, 15, 'g');

  // ⑧ 石柱区
  fill(210, 210, 13, 15, '='); fill(218, 218, 14, 15, '=');
  coinRow(214, 216, 9);
  foe(206, 15, 'g'); foe(222, 15, 's');

  // ⑨ 冲刺段
  coinRow(236, 240, 12);
  foe(240, 15, 'g');

  // 旗杆
  fill(L.flagX, L.flagX, 6, 15, 'F');
  // 终点管道（通关后从这里进下一关）
  pipe(PIPE.tx, 2);
  // 管道右边堵一堵墙，防止直接跳过管子绕到关卡尽头
  fill(260, 261, 10, 15, '=');
}

/* ================================================================= 资源 */
var IMG = {};
var SHEET = { ground: 0, brick: 1, q: 2, used: 3, pipeCapL: 4, pipeCapR: 5, pipeBodyL: 6, pipeBodyR: 7, coin0: 8, coin1: 9, flag: 10, cloud: 11, bush: 12, goomba0: 13, goomba1: 14, goombaSquash: 15, spiky0: 16, spiky1: 17 };
var CELL = 40, SCOL = 8;

function load() {
  var list = [['sheet', 'assets/sheet.webp'], ['girl', 'assets/girl_face-right.webp'],
           ['lulu', 'assets/lulu.webp'], ['chat', 'assets/chat.webp'], ['boy', 'assets/boy.webp']];
  var done = 0, fillEl = document.getElementById('fill');
  return new Promise(function (res, rej) {
    list.forEach(function (it) {
      var im = new Image();
      im.onload = function () { done++; fillEl.style.width = Math.round(done / list.length * 100) + '%'; if (done === list.length) res(); };
      im.onerror = function () { rej(new Error('图加载失败 ' + it[1])); };
      im.src = it[1]; IMG[it[0]] = im;
    });
  });
}
function cell(c, x, y, w, h) {              // 从图集取一格
  var i = SHEET[c];
  if (i === undefined) return false;
  ctx.drawImage(IMG.sheet, (i % SCOL) * CELL, Math.floor(i / SCOL) * CELL, CELL, CELL, x, y, w, h);
  return true;
}

/* ================================================================= 状态 */
var P = {}, FOESL = [], COINP = [], BUMP = [], CAM = { x: 0 };
var SCORE = 0, COINS = 0, LIVES = 3, STATE = 'ready', STATE_T = 0;
var INTRO = false, INTRO_A = 1;   // 从序章接过来时的开场：黑幕揭开 + 丹丹掉下来
var BOT = Q.has('bot'), SIM = Q.has('sim') ? (+Q.get('sim') || 0) : 0;
var DEATHS = 0, LOGEL = null, BOT_STUCK = 0;
var POPUPS = [];          // 顶砖弹出的小噜噜
var ACHV = { on: false, x: -460, t: 0, text: '噜噜可爱捏' };
var ACHV = { on: false, x: -460, t: 0, text: '噜噜可爱捏' };

var GRAV = 2700, MAXFALL = 1300, RUN = 300, ACC = 1900, FRIC = 2850, AIRACC = 1100;
var JUMP = -1120, CUT = 0.42, STOMP = -720;

function resetPlayer() {
  var spx = Q.has('x') ? (+Q.get('x') || 3) : 3;
  P = { x: spx * TILE, y: 16 * TILE - 66, w: 30, h: 66, vx: 0, vy: 0, onG: false, face: 1,
        anim: 0, dead: false, inv: 0, coyote: 0, jumpBuf: 0, jumpHeld: false, stun: 0,
        hp: Q.has('hp') ? (+Q.get('hp') || 3) : 3 };
}
function spawnFoes() {
  FOESL = FOES.map(function (f) {
    var big = f.t === 's';
    return { t: f.t, x: f.x + 3, y: f.y + (TILE - (big ? 36 : 34)), w: big ? 34 : 30, h: big ? 36 : 34,
             vx: (f.t === 's' ? -110 : -70), vy: 0, dead: false, squash: 0, anim: 0 };
  });
}
function log(s) {
  if (!BOT && !Q.has('log')) return;
  if (!LOGEL) {
    LOGEL = document.createElement('pre');
    LOGEL.style.cssText = 'position:fixed;left:0;top:0;z-index:99;background:#000;color:#7CFC7C;' +
      'font:12px/1.4 monospace;padding:6px;margin:0;white-space:pre;max-width:100%';
    document.body.appendChild(LOGEL);
  }
  LOGEL.textContent += s + '\n';
}

/* ================================================================= 输入 */
var KEY = { left: false, right: false, jump: false };
var JUMPSQ = false;

function setJump(v) {
  if (v && !KEY.jump) JUMPSQ = true;
  KEY.jump = v;
}
window.addEventListener('keydown', function (e) {
  if (['ArrowLeft', 'a', 'A'].indexOf(e.key) >= 0) KEY.left = true;
  if (['ArrowRight', 'd', 'D'].indexOf(e.key) >= 0) KEY.right = true;
  if ([' ', 'ArrowUp', 'w', 'W', 'k', 'K', 'Enter'].indexOf(e.key) >= 0) { setJump(true); e.preventDefault(); }
});
window.addEventListener('keyup', function (e) {
  if (['ArrowLeft', 'a', 'A'].indexOf(e.key) >= 0) KEY.left = false;
  if (['ArrowRight', 'd', 'D'].indexOf(e.key) >= 0) KEY.right = false;
  if ([' ', 'ArrowUp', 'w', 'W', 'k', 'K', 'Enter'].indexOf(e.key) >= 0) setJump(false);
});
function bindTouch(el, on) {
  var f = function (e) { e.preventDefault(); on(true); };
  var g = function (e) { e.preventDefault(); on(false); };
  el.addEventListener('touchstart', f, { passive: false });
  el.addEventListener('touchend', g, { passive: false });
  el.addEventListener('mousedown', f); el.addEventListener('mouseup', g);
}
var isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouch) {
  document.getElementById('touch').style.display = 'block';
  bindTouch(document.getElementById('bL'), function (v) { KEY.left = v; });
  bindTouch(document.getElementById('bR'), function (v) { KEY.right = v; });
  bindTouch(document.getElementById('bJ'), function (v) { setJump(v); });
}

/* ================================================================= 音效 */
var AC = null;
function beep(f, dur, type, vol) {
  try {
    if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = type || 'square'; o.frequency.value = f;
    g.gain.value = vol || 0.06;
    o.connect(g); g.connect(AC.destination);
    var t = AC.currentTime;
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur);
  } catch (e) {}
}

/* ================================================================= 碰撞 */
function solidTile(tx, ty) {
  if (tx < 0 || tx >= W) return true;
  if (ty < 0 || ty >= ROWS) return false;
  var c = G[ty][tx];
  return c === '#' || c === 'B' || c === '?' || c === 'U' || c === '=' || c === 'p';
}
function boxSolid(l, t, r, b) {
  var x0 = Math.floor(l / TILE), x1 = Math.floor((r - 0.001) / TILE);
  var y0 = Math.floor(t / TILE), y1 = Math.floor((b - 0.001) / TILE);
  for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) if (solidTile(x, y)) return true;
  return false;
}

function moveX(dt) {
  P.x += P.vx * dt;
  var l = P.x, r = P.x + P.w, t = P.y, b = P.y + P.h;
  if (!boxSolid(l, t, r, b)) return;
  if (P.vx > 0) {
    P.x = Math.floor(r / TILE) * TILE - P.w - 0.01;
  } else if (P.vx < 0) {
    P.x = (Math.floor(l / TILE) + 1) * TILE + 0.01;
  }
  P.vx = 0;
}
function moveY(dt) {
  P.y += P.vy * dt;
  var l = P.x, r = P.x + P.w, t = P.y, b = P.y + P.h;
  if (!boxSolid(l, t, r, b)) { if (P.vy > 0) P.onG = false; return; }
  if (P.vy > 0) {
    P.y = Math.floor(b / TILE) * TILE - P.h - 0.01;
    P.vy = 0; P.onG = true;
  } else if (P.vy < 0) {
    P.y = (Math.floor(t / TILE) + 1) * TILE + 0.01;
    P.vy = 0;
    hitHead();
  }
}
function hitHead() {
  var ty = Math.floor((P.y - 2) / TILE);
  var x0 = Math.floor((P.x + 4) / TILE), x1 = Math.floor((P.x + P.w - 4) / TILE);
  var hit = false;
  for (var x = x0; x <= x1; x++) {
    if (!solidTile(x, ty)) continue;
    hit = true;
    var c = (ty >= 0 && ty < ROWS) ? G[ty][x] : '.';
    if (c === '?') {
      G[ty][x] = 'U'; COINS++; SCORE += 200; beep(880, .09, 'square', .05);
      BUMP.push({ x: x, y: ty, t: 0 });
      POPUPS.push({ x: x * TILE + TILE / 2, y: ty * TILE, t: 0 });   // 噜噜弹出来
    }
    else if (c === 'B') { G[ty][x] = '.'; SCORE += 50; beep(220, .07, 'square', .05); BUMP.push({ x: x, y: ty, t: 0 }); }
    else if (c === '#' || c === '=' || c === 'p' || c === 'U') { BUMP.push({ x: x, y: ty, t: 0 }); beep(140, .05, 'square', .04); }
  }
  if (hit) beep(300, .05, 'square', .03);
}

/* ================================================================= 更新 */
function update(dt) {
  STATE_T += dt;
  if (INTRO && STATE === 'ready') { STATE = 'intro'; STATE_T = 0; INTRO_A = 1; P.y = -150; }
  if (STATE === 'ready') { if (STATE_T > 1.1) { STATE = 'play'; STATE_T = 0; } return; }
  if (STATE === 'clear' || STATE === 'over') return;
  if (STATE === 'intro') { updateIntro(dt); return; }
  if (STATE === 'ending') { updateEnding(dt); return; }
  if (STATE === 'pipe') { updatePipe(dt); return; }
  if (STATE === 'black') {
    if (!window.__s2go && window.Stage2) { window.__s2go = 1; setTimeout(function () { window.Stage2.start({ cv: CV, ctx: ctx, fit: fit }); }, 620); }
    return;
  }
  if (STATE === 'free') { updateFree(dt); }

  if (P.dead) {
    P.vy += GRAV * dt; P.y += P.vy * dt;
    if (STATE_T > 1.4) {
      if (LIVES > 0) { respawn(); }
      else { STATE = 'over'; STATE_T = 0; }
    }
    return;
  }

  /* --- 水平 --- */
  if (P.stun > 0) { P.stun -= dt; }
  var acc = P.onG ? ACC : AIRACC;
  if (P.stun > 0) { acc = 0; }
  if (KEY.left && !KEY.right) { P.vx -= acc * dt; P.face = -1; }
  else if (KEY.right && !KEY.left) { P.vx += acc * dt; P.face = 1; }
  else {
    var f = (P.onG ? FRIC : FRIC * 0.35) * dt;
    if (P.vx > 0) P.vx = Math.max(0, P.vx - f); else P.vx = Math.min(0, P.vx + f);
  }
  P.vx = Math.max(-RUN, Math.min(RUN, P.vx));

  /* --- 跳 --- */
  P.coyote = P.onG ? 0.09 : Math.max(0, P.coyote - dt);
  if (JUMPSQ) { P.jumpBuf = 0.11; JUMPSQ = false; } else P.jumpBuf = Math.max(0, P.jumpBuf - dt);
  if (P.jumpBuf > 0 && P.coyote > 0) {
    P.vy = JUMP; P.onG = false; P.coyote = 0; P.jumpBuf = 0; P.jumpHeld = true;
    beep(520, .12, 'square', .05);
  }
  // 不分长短按：起跳就是满跳，松手不再减速

  P.vy = Math.min(MAXFALL, P.vy + GRAV * dt);
  P.onG = false;
  moveX(dt); moveY(dt);

  if (P.inv > 0) P.inv -= dt;
  if (P.onG && Math.abs(P.vx) > 20) P.anim += dt * (Math.abs(P.vx) / RUN) * 7; else P.anim = 0;

  /* --- 金币 --- */
  var x0 = Math.floor(P.x / TILE), x1 = Math.floor((P.x + P.w) / TILE);
  var y0 = Math.floor(P.y / TILE), y1 = Math.floor((P.y + P.h) / TILE);
  for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
    if (y >= 0 && y < ROWS && x >= 0 && x < W && G[y][x] === 'o') {
      G[y][x] = '.'; COINS++; SCORE += 200; beep(1046, .08, 'square', .05);
    }
  }

  /* --- 掉坑 / 触旗 --- */
  if (P.y > LH + 120) { die('pit'); }
  if (P.x + P.w / 2 > L.flagX * TILE - 10) { win(); }

  /* --- 怪 --- */
  for (var i = 0; i < FOESL.length; i++) {
    var e = FOESL[i];
    if (e.dead) { e.squash += dt; continue; }
    e.anim += dt;
    e.vy = Math.min(MAXFALL, e.vy + GRAV * dt);
    e.x += e.vx * dt;
    if (boxSolid(e.x, e.y, e.x + e.w, e.y + e.h)) {
      e.x -= e.vx * dt; e.vx = -e.vx;
    }
    e.y += e.vy * dt;
    if (boxSolid(e.x, e.y, e.x + e.w, e.y + e.h)) {
      e.y -= e.vy * dt; e.vy = 0;
    }
    if (e.y > LH + 200) { e.dead = true; e.squash = 99; continue; }
    // 与玩家
    if (overlap(P, e) && !P.dead) {
      var stomping = P.vy > 40 && (P.y + P.h - e.y) < 26;
      if (stomping && e.t !== 's') {
        e.dead = true; e.squash = 0; SCORE += 100; P.vy = STOMP; P.jumpHeld = false;
        beep(320, .09, 'square', .06);
      } else if (P.inv <= 0) {
        hurt(e);
      }
    }
  }

  /* --- 中途存档点 --- */
  for (var c = 0; c < L.checks.length; c++) {
    if (P.x > L.checks[c] * TILE && !L['ck' + c]) { L['ck' + c] = true; }
  }

  /* --- 镜头 / 时间 --- */
  var target = P.x + P.w / 2 - LW * 0.42;
  CAM.x += (target - CAM.x) * Math.min(1, dt * 8);
  CAM.x = Math.max(0, Math.min(W * TILE - LW, CAM.x));

  if (STATE === 'play') { L.time -= dt; if (L.time <= 0) { L.time = 0; die('time'); } }

  for (var b = BUMP.length - 1; b >= 0; b--) { BUMP[b].t += dt; if (BUMP[b].t > 0.22) BUMP.splice(b, 1); }
  for (var pp = POPUPS.length - 1; pp >= 0; pp--) { POPUPS[pp].t += dt; if (POPUPS[pp].t > 0.85) POPUPS.splice(pp, 1); }
}
function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function hurt(e) {
  if (P.dead || P.inv > 0) return;
  P.hp--;
  beep(240, .16, 'sawtooth', .07);
  if (P.hp <= 0) { P.hp = 0; die('hp'); return; }
  P.inv = 1.6;
  P.stun = 0.3;
  P.vy = -540;
  P.vx = (P.x + P.w / 2 < e.x + e.w / 2) ? -330 : 330;   // 从怪身上弹开
  P.face = P.vx > 0 ? 1 : -1;
  P.onG = false;
  log('HURT hp=' + P.hp + ' at x=' + Math.round(P.x / TILE));
}

function die(cause) {
  if (P.dead) return;
  P.dead = true; P.vy = -620; STATE_T = 0; DEATHS++; LIVES--;
  beep(180, .5, 'sawtooth', .07);
  log('DIED(' + (cause || '?') + ') at x=' + Math.round(P.x / TILE) + ' y=' + Math.round(P.y) + ' lives=' + LIVES);
}
function respawn() {
  var sx = 3;
  for (var i = 0; i < L.checks.length; i++) if (L['ck' + i]) sx = L.checks[i] + 1;
  resetPlayer();
  P.x = sx * TILE; P.y = 16 * TILE - 66;
  CAM.x = Math.max(0, Math.min(W * TILE - LW, P.x - LW * 0.42));
  spawnFoes();
  L.time = Math.max(120, L.time);
  STATE = 'play'; STATE_T = 0;
}
function win() {
  if (STATE === 'clear' || STATE === 'ending' || STATE === 'free' ||
      STATE === 'pipe' || STATE === 'black') return;
  startEnding();
}

function winScore() {
  SCORE += Math.floor(L.time) * 10;
  beep(660, .12, 'square', .06);
  setTimeout(function () { beep(880, .12, 'square', .06); }, 130);
  setTimeout(function () { beep(1174, .22, 'square', .06); }, 260);
  log('CLEAR score=' + SCORE + ' coins=' + COINS + ' deaths=' + DEATHS);
}

/* ================================================================= 绘制 */
function drawSky() {
  var g = ctx.createLinearGradient(0, 0, 0, LH);
  g.addColorStop(0, '#5bb0e6');
  g.addColorStop(0.62, '#9fd4ee');
  g.addColorStop(1, '#cfe9f4');
  ctx.fillStyle = g; ctx.fillRect(0, 0, LW, LH);

  // 远山（视差 0.35）
  ctx.save();
  ctx.translate(-(CAM.x * 0.35) % 900, 0);
  ctx.fillStyle = '#6fae6a';
  for (var i = -1; i < 4; i++) {
    var bx = i * 900;
    hill(bx + 90, 640, 300, 160);
    hill(bx + 520, 640, 240, 120);
    ctx.fillStyle = '#6fae6a';
  }
  ctx.restore();

  // 云（视差 0.5）
  ctx.save();
  ctx.translate(-(CAM.x * 0.5) % 760, 0);
  for (var k = -1; k < 4; k++) {
    var cx = k * 760;
    cell('cloud', cx + 120, 70, 120, 120);
    cell('cloud', cx + 380, 150, 96, 96);
    cell('cloud', cx + 600, 60, 100, 100);
  }
  ctx.restore();

  // 草丛（视差 0.8）
  ctx.save();
  ctx.translate(-(CAM.x * 0.8) % 640, 0);
  for (var m = -1; m < 4; m++) {
    var gx = m * 640;
    cell('bush', gx + 60, 600, 110, 110);
    cell('bush', gx + 300, 610, 90, 90);
    cell('bush', gx + 460, 595, 120, 120);
  }
  ctx.restore();
}
function hill(x, baseY, w, h) {
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.quadraticCurveTo(x + w / 2, baseY - h, x + w, baseY);
  ctx.closePath(); ctx.fill();
}

function drawTiles() {
  var x0 = Math.max(0, Math.floor(CAM.x / TILE) - 1);
  var x1 = Math.min(W - 1, Math.ceil((CAM.x + LW) / TILE));
  for (var x = x0; x <= x1; x++) for (var y = 0; y < ROWS; y++) {
    var c = G[y][x]; if (c === '.' || c === 'o') continue;
    var px = x * TILE - CAM.x, py = y * TILE;
    var off = 0;
    for (var b = 0; b < BUMP.length; b++) if (BUMP[b].x === x && BUMP[b].y === y) off = -Math.sin(BUMP[b].t / 0.22 * Math.PI) * 8;

    if (c === '#') { cell('ground', px, py, TILE, TILE); }
    else if (c === 'B') cell('brick', px, py, TILE, TILE);
    else if (c === '?') cell('q', px, py + off, TILE, TILE);
    else if (c === 'U') cell('used', px, py, TILE, TILE);
    else if (c === '=') cell('brick', px, py, TILE, TILE);
    else if (c === 'p') {
      var up = (y > 0 && G[y - 1][x] === 'p');
      var left = (x > 0 && G[y][x - 1] === 'p');
      cell(up ? (left ? 'pipeBodyL' : 'pipeBodyR') : (left ? 'pipeCapL' : 'pipeCapR'), px, py, TILE, TILE);
    } else if (c === 'F') {
      ctx.fillStyle = '#8a6242';
      ctx.fillRect(px + TILE / 2 - 4, py, 8, TILE);
      if (y === 6) { ctx.fillStyle = '#c9a06a'; ctx.fillRect(px + TILE / 2 - 9, py, 18, 8); }
    }
  }
  // 金币（单独画在最上层，带浮动）
  for (var x2 = x0; x2 <= x1; x2++) for (var y2 = 0; y2 < ROWS; y2++) {
    if (G[y2][x2] !== 'o') continue;
    var f = Math.floor(performance.now() / 160) % 2;
    cell(f ? 'coin1' : 'coin0', x2 * TILE - CAM.x, y2 * TILE, TILE, TILE);
  }
}

function drawPopups() {
  for (var i = 0; i < POPUPS.length; i++) {
    var p = POPUPS[i];
    var k = p.t / 0.85;
    var py = p.y - 26 - k * 86;                 // 往上升
    var a = k < 0.15 ? k / 0.15 : (1 - Math.pow((k - 0.15) / 0.85, 1.6));
    var w = 40, h = 62;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, a));
    ctx.drawImage(IMG.lulu, p.x - CAM.x - w / 2, py - h, w, h);   // 必须减镜头偏移
    ctx.restore();
  }
}

function drawFoes() {
  for (var i = 0; i < FOESL.length; i++) {
    var e = FOESL[i];
    if (e.squash > 0.5) continue;
    var px = e.x - CAM.x, py = e.y;
    if (px < -80 || px > LW + 80) continue;
    if (e.dead) { cell('goombaSquash', px - 3, py + 6, TILE, TILE); continue; }
    var f = Math.floor(e.anim * 6) % 2;
    if (e.t === 's') cell(f ? 'spiky1' : 'spiky0', px - 3, py - 4, TILE, TILE);
    else cell(f ? 'goomba1' : 'goomba0', px - 5, py - 6, TILE, TILE);
  }
}

/* 姿势：0/1 正面，2/3 背面，4 侧立，5/6 侧走（左右脚前后交替） */
function poseIdx() {
  if (!P.onG) { P.idx = 4; return 4; }            // 空中：侧立
  if (Math.abs(P.vx) > 20) {
    P.idx = (Math.floor(P.anim) % 2) ? 6 : 5;     // 走路：两帧交替
    return P.idx;
  }
  P.idx = 4; return 4;                            // 站立：侧立
}

function drawPlayer() {
  if (P.inv > 0 && Math.floor(P.inv * 20) % 2 === 0) return;
  var sinkA = (STATE === 'pipe') ? Math.max(0, 1 - EX.sinkT / 0.62) : 1;
  if (sinkA <= 0) return;
  var h = 76, w = h * (125 / 202);
  var px = P.x + P.w / 2 - CAM.x, py = P.y + P.h;
  // 影子
  ctx.save(); ctx.globalAlpha = .2; ctx.fillStyle = '#2a1c14';
  ctx.beginPath(); ctx.ellipse(px, py + 2, 22, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();

  var idx = poseIdx();

  var flip = (P.face < 0);    // 图集已统一为朝右，只有朝左时才镜像
  ctx.save();
  ctx.globalAlpha = sinkA;
  ctx.translate(px, py);
  if (P.dead) ctx.rotate(Math.min(1.2, STATE_T * 2.5));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(IMG.girl, idx * 125, 0, 125, 202, -w / 2, -h, w, h);
  ctx.restore();
}

function drawHUD() {
  ctx.save();
  ctx.font = '700 26px "PingFang SC","Microsoft YaHei",system-ui,sans-serif';
  ctx.fillStyle = 'rgba(18,12,10,.72)';
  ctx.fillRect(0, 0, LW, 54);
  ctx.fillStyle = '#f7efd2';
  ctx.textBaseline = 'middle';
  ctx.fillText('分数 ' + String(SCORE).padStart(6, '0'), 28, 28);
  cell('coin0', 300, 8, 34, 34);
  ctx.fillText('× ' + String(COINS).padStart(2, '0'), 340, 28);
  ctx.fillText('世界 1-1', 560, 28);
  ctx.fillText('时间 ' + String(Math.ceil(L.time)).padStart(3, ' '), 800, 28);
  ctx.fillText('生命', 1000, 28);
  ctx.fillStyle = '#ff8a9a';
  ctx.fillText('♥'.repeat(Math.max(0, P.hp)), 1072, 28);
  ctx.fillStyle = '#f7efd2';
  ctx.fillText('×' + Math.max(0, LIVES), 1186, 28);
  ctx.restore();
}

function drawOverlay() {
  if (STATE === 'intro' && INTRO_A > 0) {
    ctx.fillStyle = 'rgba(4,3,6,' + INTRO_A + ')';
    ctx.fillRect(0, 0, LW, LH);
    return;
  }
  if (STATE === 'ready') {
    ctx.fillStyle = 'rgba(12,10,8,.55)'; ctx.fillRect(0, 0, LW, LH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f7efd2';
    ctx.font = '700 64px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('1-1', LW / 2, LH / 2 - 40);
    ctx.font = '600 26px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(247,239,210,.8)';
    ctx.fillText('方向键 / A D 移动，空格 / W 跳', LW / 2, LH / 2 + 34);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  } else if (STATE === 'clear') {
    ctx.fillStyle = 'rgba(12,10,8,.68)'; ctx.fillRect(0, 0, LW, LH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd76e';
    ctx.font = '700 72px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('过关！', LW / 2, LH / 2 - 60);
    ctx.fillStyle = '#f7efd2';
    ctx.font = '600 30px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('分数 ' + SCORE + '　金币 ' + COINS + '　剩余时间 ' + Math.ceil(L.time), LW / 2, LH / 2 + 20);
    ctx.font = '600 24px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(247,239,210,.7)';
    ctx.fillText('按 R 重新开始', LW / 2, LH / 2 + 80);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  } else if (STATE === 'pipe') {
    ctx.fillStyle = 'rgba(8,6,5,' + EX.fade.toFixed(3) + ')';
    ctx.fillRect(0, 0, LW, LH);
  } else if (STATE === 'black') {
    ctx.fillStyle = '#080605'; ctx.fillRect(0, 0, LW, LH);
  } else if (STATE === 'over') {
    ctx.fillStyle = 'rgba(12,10,8,.75)'; ctx.fillRect(0, 0, LW, LH);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff9b9b';
    ctx.font = '700 68px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('游戏结束', LW / 2, LH / 2 - 20);
    ctx.fillStyle = '#f7efd2';
    ctx.font = '600 24px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('按 R 重新开始', LW / 2, LH / 2 + 60);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
}

function stageBusy() {
  return (window.Stage2 && window.Stage2.isRunning && window.Stage2.isRunning()) ||
         (window.Stage3 && window.Stage3.isRunning && window.Stage3.isRunning()) ||
         (window.Story4 && window.Story4.isRunning && window.Story4.isRunning());
}

function draw() {
  if (stageBusy()) return;
  drawSky();
  ctx.save();
  drawTiles();
  drawPopups();
  drawFoes();
  drawPlayer();
  if (STATE !== 'over' && STATE !== 'intro') drawEndScene();
  if (STATE !== 'intro') drawPipeArrow();
  ctx.restore();
  if (STATE !== 'intro') drawHUD();
  if (STATE === 'ending') drawEndUI();
  drawOverlay();
}

/* ================================================================= 自检机器人 */
function botStep() {
  KEY.left = false; KEY.right = true;
  var feet = P.y + P.h;
  var aheadX = P.x + P.w + 8;
  var wallA = boxSolid(aheadX, P.y + 8, aheadX + 6, feet - 6);
  var wallB = boxSolid(aheadX, feet - 26, aheadX + 6, feet - 2);
  var front = P.x + P.w;
  var g1 = boxSolid(front + 2, feet + 4, front + 10, feet + 30);
  var g2 = boxSolid(front + 44, feet + 4, front + 52, feet + 30);
  var gap = (!g1 || !g2);              // 脚尖前 + 一格半预警
  var danger = false;
  for (var i = 0; i < FOESL.length; i++) {
    var e = FOESL[i];
    if (e.dead) continue;
    if (e.x > P.x && e.x - P.x < 110 && Math.abs((e.y + e.h) - feet) < 60) { danger = true; break; }
  }
  var need = (wallA || wallB || gap || danger);
  if (Q.has('dbg')) {
    var tx = P.x / TILE;
    if (tx > 27 && tx < 35) log('x=' + tx.toFixed(2) + ' onG=' + P.onG + ' vx=' + Math.round(P.vx) +
      ' vy=' + Math.round(P.vy) + ' gap=' + (gap ? 1 : 0) + ' wall=' + ((wallA || wallB) ? 1 : 0) + ' dng=' + (danger ? 1 : 0));
  }
  if (P.onG && Math.abs(P.vx) < 40 && P.vy === 0) { BOT_STUCK += 1 / 60; } else BOT_STUCK = 0;
  if (BOT_STUCK > 0.4) { need = true; BOT_STUCK = 0; }
  if (P.onG) { if (need) setJump(true); else setJump(false); }
  else if (P.vy >= 0) setJump(false);   // 上升途中一直按住，落地前松开
}

/* ================================================================= 启动 */
function fit() {
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var s = Math.min(window.innerWidth / LW, window.innerHeight / LH);
  var cw = Math.round(LW * s), ch = Math.round(LH * s);
  CV.style.width = cw + 'px'; CV.style.height = ch + 'px';
  CV.width = Math.max(1, Math.round(cw * dpr));
  CV.height = Math.max(1, Math.round(ch * dpr));
  ctx.setTransform(CV.width / LW, 0, 0, CV.height / LH, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

window.addEventListener('keydown', function (e) {
  if ((e.key === 'r' || e.key === 'R') && (STATE === 'clear' || STATE === 'over' || STATE === 'black')) restart();
});
function restart() {
  buildLevel(); resetPlayer(); spawnFoes();
  SCORE = 0; COINS = 0; LIVES = 3; DEATHS = 0; L.checksUsed = {};
  L['ck0'] = L['ck1'] = false; L.time = 400;
  CAM.x = 0; STATE = 'ready'; STATE_T = 0;
  POPUPS = [];
  END.t = 0; END.dlg = -1; END.dlgT = 0; END.card = 0; END.boyA = 0;
  EX.boyWalk = 0; EX.boyWalking = false; EX.boyAlpha = 1; EX.sinkT = 0; EX.fade = 0;
  ACHV.on = false; ACHV.x = -460; ACHV.t = 0;
}

function boot() {
  fit();
  window.addEventListener('resize', fit);
  buildLevel(); resetPlayer(); spawnFoes();
  document.getElementById('boot').style.display = 'none';

  if (Q.has('hop')) {                    // 量净跳跃高度
    STATE = 'play';
    var minY = 1e9;
    for (var h = 0; h < 150; h++) {
      if (h >= 5) setJump(true);         // 按住不放，满跳
      update(1 / 60);
      minY = Math.min(minY, P.y);
    }
    var peak = 16 * TILE - P.h - minY;
    log('HOP peak=' + peak.toFixed(1) + 'px = ' + (peak / TILE).toFixed(2) + '格');
    log('砖块顶面离地=' + (640 - 12 * TILE) + 'px（4格），台阶最高=' + 160 + 'px，石柱最高=' + 120 + 'px');
    var paint0 = function () { fit(); draw(); };
    paint0(); [80, 250].forEach(function (ms) { setTimeout(paint0, ms); });
    return;
  }
  if (Q.get('from') === 'prologue') INTRO = true;
  if (Q.has('s4') && window.Story4) {
    window.Story4.start({ cv: CV, ctx: ctx, fit: fit, state: Q.get('s4'), sim: +(Q.get('sim4') || 0) });
    return;
  }
  if (Q.has('s3') && window.Stage3) {
    window.Stage3.start({ cv: CV, ctx: ctx, fit: fit, state: Q.get('s3'), sim: +(Q.get('sim3') || 0) });
    return;
  }
  if (Q.has('s2') && window.Stage2) {          // 直接进第二关，便于验收
    window.Stage2.start({ cv: CV, ctx: ctx, fit: fit, state: Q.get('s2'), sim: +(Q.get('sim2') || 0) });
    return;
  }
  if (Q.has('freeze')) { STATE = 'play'; }
  if (Q.has('hang')) {                 // 截终点演出用：停在演出第 N 秒
    STATE = 'play';
    var want = +Q.get('hang') || 2, guard = 0;
    while (STATE !== 'ending' && guard++ < 4000) { botStep(); update(1 / 60); }
    var el = 0;
    while (el < want && STATE === 'ending') { updateEnding(1 / 60); el += 1 / 60; }
    if (Q.has('free') && STATE === 'ending') { enterFree(); }
    var after = +(Q.get('after') || 0);
    for (var ai = 0; ai < after; ai++) { botStep(); update(1 / 60); }
    if (STATE === 'clear') END.boyA = 1;
    log('HANG t=' + END.t.toFixed(2) + ' dlg=' + END.dlg + ' card=' + END.card.toFixed(2) + ' state=' + STATE);
    var ph = function () { fit(); draw(); };
    ph(); [80, 250, 700].forEach(function (ms) { setTimeout(ph, ms); });
    window.addEventListener('resize', ph);
    return;
  }
  if (SIM > 0) {                       // 无头自检：同步跑 N 帧
    for (var i = 0; i < SIM; i++) {
      if (Q.has('jump')) { if (i % 40 === 0) setJump(true); if (i % 40 === 10) setJump(false); }
      if (BOT) botStep();
      else if (!Q.has('freeze')) { if (Q.get('dir') === 'left') { KEY.left = true; KEY.right = false; } else KEY.right = true; }
      update(1 / 60);
      if (Q.has('pose') && i >= 100 && i <= 126) log('f' + i + ' x=' + (P.x / 40).toFixed(2) + ' y=' + P.y.toFixed(2) + ' onG=' + P.onG + ' idx=' + poseIdx() + ' vy=' + Math.round(P.vy));
      if (i % 600 === 0) log(
      't=' + (i / 60).toFixed(0) + 's x=' + Math.round(P.x / TILE) +
        ' score=' + SCORE + ' coins=' + COINS + ' lives=' + LIVES + ' state=' + STATE);
    }
    if (STATE === 'ending') { var st = fastForwardEnding(); log('ENDING -> ' + st); }
    log('END state=' + STATE + ' x=' + Math.round(P.x / TILE) + '/' + W + ' score=' + SCORE +
        ' coins=' + COINS + ' deaths=' + DEATHS);
    var paint = function () { fit(); draw(); };
    paint();
    [80, 250, 700].forEach(function (ms) { setTimeout(paint, ms); });
    window.addEventListener('resize', paint);
    window.__ready = true;
    return;
  }

  var last = 0;
  function loop(ts) {
    if (stageBusy()) return;
    if (!last) last = ts;
    var dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    update(dt); draw();
    requestAnimationFrame(loop);
  }
  draw();                                        // 先同步画一帧，别等 rAF
  requestAnimationFrame(function (ts) { last = ts; loop(ts); });
  window.__ready = true;
}

load().then(function () {
  try { boot(); } catch (e) {
    var b = document.getElementById('boot');
    b.style.display = 'flex';
    b.innerHTML = '<div style="color:#ff9b9b;white-space:pre-wrap">' + (e.stack || e.message) + '</div>';
  }
}).catch(function (e) {
  var b = document.getElementById('boot');
  b.style.display = 'flex';
  b.innerHTML = '<div style="color:#ff9b9b">' + e.message + '</div>';
});

/* ================================================================
   终点演出：碰到旗杆 → 丹丹与噜噜一起滑下来 → 镜头推向旗杆后面
   → 松松出现 → 两句台词 → 那张聊天截图像「他掏出手机给你看」一样浮出来
   ================================================================ */
var END = {
  t: 0, p0y: 0, luluY: 0, boyA: 0,
  dlg: -1, dlgT: 0, card: 0,
  poleX: 0, groundY: 0, playerX: 0, luluX: 0, boyX: 0
};
var ADVANCE = false;
var LULU_W = 40, LULU_H = 62;
var END_LINES = [
  { who: '松松', text: '这是……噜噜' },
  { who: '松松', text: '丹丹说过这是她最喜欢的角色' }
];

function startEnding() {
  STATE = 'ending'; STATE_T = 0;
  END.t = 0;
  END.poleX = L.flagX * TILE + TILE / 2;
  END.groundY = 16 * TILE;
  END.playerX = END.poleX - 34;              // 贴在杆左边
  END.luluX = END.poleX + 48;                // 噜噜挂在杆右边
  END.boyX = END.poleX + 140;                // 松松站在旗子后面（右侧）
  END.p0y = P.y;
  END.luluY = 6 * TILE;                      // 从杆顶开始
  END.boyA = 0; END.dlg = -1; END.dlgT = 0; END.card = 0;
  P.dead = false; P.vx = 0; P.vy = 0; P.face = 1;
  winScore();
  ACHV.on = true; ACHV.x = -460; ACHV.t = 0;
  beep(660, .12, 'square', .06);
  setTimeout(function () { beep(880, .12, 'square', .06); }, 140);
}

/* 序章交接：黑幕揭开 → 丹丹从上面掉下来 → 落地开跑 */
function updateIntro(dt) {
  var t = STATE_T;   // 进来时 update() 已经累加过，这里别再 +dt（会走快一倍）
  INTRO_A = Math.max(0, 1 - t / 1.05);
  if (t > 0.75) {
    var k = Math.min(1, (t - 0.75) / 0.62);
    var ground = 16 * TILE - P.h;
    P.y = -150 + (ground + 150) * (k * k);
    P.vy = 0;
    if (k >= 1) {
      P.y = ground; P.onG = true;
      STATE = 'play'; STATE_T = 0;
      beep(180, .10, 'square', .06);
      setTimeout(function () { beep(140, .08, 'square', .05); }, 70);
    }
  }
}

function updateEnding(dt) {
  END.t += dt;
  // 成就条：滑进来，停 3 秒，滑出去
  if (ACHV.on) {
    ACHV.t += dt;
    var tx = ACHV.t > 3.4 ? -460 : 30;
    ACHV.x += (tx - ACHV.x) * Math.min(1, dt * (ACHV.t > 3.4 ? 7 : 9));
    if (ACHV.t > 4.3) ACHV.on = false;
  }
  // 成就条：滑进来，停 3 秒，滑出去
  if (ACHV.on) {
    ACHV.t += dt;
    var tx = ACHV.t > 3.4 ? -460 : 30;
    ACHV.x += (tx - ACHV.x) * Math.min(1, dt * (ACHV.t > 3.4 ? 7 : 9));
    if (ACHV.t > 4.3) ACHV.on = false;
  }
  var t = END.t;
  var gy = END.groundY;

  /* ① 0 ~ 0.9s：丹丹抓着杆往下滑，噜噜同时从杆顶滑下来 */
  var e = Math.min(1, t / 0.9);
  e = 1 - (1 - e) * (1 - e);
  P.x = END.playerX;
  P.y = END.p0y + ((gy - P.h) - END.p0y) * e;
  END.luluY = 6 * TILE + ((gy - LULU_H) - 6 * TILE) * e;

  /* ② 0.9 ~ 1.7s：镜头往右推，露出站在旗子后面的松松 */
  if (t > 0.9) {
    var k = Math.min(1, (t - 0.9) / 0.8);
    END.boyA = k;
    var target = END.boyX + 40 - LW * 0.42;
    CAM.x += (target - CAM.x) * Math.min(1, dt * 3.2);
    CAM.x = Math.max(0, Math.min(W * TILE - LW, CAM.x));
  }

  /* ③ 1.7s 起：台词，一句一句 */
  if (t > 1.7 && END.dlg < 0) { END.dlg = 0; END.dlgT = 0; }
  if (END.dlg >= 0 && END.dlg < END_LINES.length) {
    END.dlgT += dt;
    var full = END_LINES[END.dlg].text.length;
    var typing = END.dlgT * 16 < full;
    if ((!typing && (END.dlgT > 2.1 + full * 0.06 || ADVANCE)) || END.dlgT > 6) {
      END.dlg++; END.dlgT = 0; ADVANCE = false;
      beep(520, .05, 'square', .04);
    }
  }

  /* ④ 台词说完：卡片展开 */
  if (END.dlg >= END_LINES.length && END.card < 1) {
    END.card = Math.min(1, END.card + dt * 1.15);
  }
  /* ⑤ 卡片展开完：按键进入结算 */
  if (END.card >= 1 && ADVANCE) {
    ADVANCE = false;
    enterFree();
  }
  if (END.card >= 1) ADVANCE = false;
}

function drawEndScene() {
  var gy = END.groundY;
  // 噜噜（挂在杆上 / 滑下来之后站在地上）
  var hanging = (STATE === 'ready' || STATE === 'play');
  var poleX = L.flagX * TILE + TILE / 2;
  var luluX = END.luluX || (poleX + 48);
  var lx = luluX - CAM.x;
  var ly = hanging ? 6 * TILE : END.luluY;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.drawImage(IMG.lulu, lx - LULU_W / 2, ly, LULU_W, LULU_H);
  ctx.restore();

  // 松松：旗子后面，正面站着
  var isFree = (STATE === 'free' || STATE === 'pipe' || STATE === 'black');
  var boyX = isFree ? EX.boyX : END.boyX;
  var boyA = isFree ? EX.boyAlpha : END.boyA;
  if (boyA > 0) {
    var bx = boyX - CAM.x, bh = 76, bw = 76 * (135 / 202);
    ctx.save();
    ctx.globalAlpha = boyA;
    ctx.globalAlpha *= .25; ctx.fillStyle = '#2a1c14';
    ctx.beginPath(); ctx.ellipse(bx, gy + 2, 20, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = boyA;
    ctx.drawImage(IMG.boy, 0, 0, 135, 202, bx - bw / 2, gy - bh, bw, bh);
    ctx.restore();
  }
}

function drawAchvBar() {
  if (!ACHV.on) return;
  var x = ACHV.x, y = 132, w = 360, h = 92;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
  roundRect(x, y, w, h, 14);
  ctx.fillStyle = 'rgba(28,22,16,.95)'; ctx.fill();
  ctx.restore();
  roundRect(x, y, w, h, 14);
  ctx.strokeStyle = 'rgba(255,214,110,.9)'; ctx.lineWidth = 3; ctx.stroke();
  // 奖杯
  ctx.fillStyle = '#ffd76e';
  ctx.beginPath();
  ctx.moveTo(x + 28, y + 24); ctx.lineTo(x + 58, y + 24);
  ctx.lineTo(x + 54, y + 48); ctx.lineTo(x + 32, y + 48);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(x + 37, y + 48, 12, 11);
  ctx.fillRect(x + 29, y + 59, 28, 7);
  // 文字
  ctx.fillStyle = 'rgba(255,214,110,.55)';
  ctx.font = '600 15px "PingFang SC",system-ui,sans-serif';
  ctx.fillText('完成成就', x + 78, y + 32);
  ctx.fillStyle = '#fff2cc';
  ctx.font = '700 28px "PingFang SC",system-ui,sans-serif';
  ctx.fillText(ACHV.text, x + 78, y + 66);
}

function drawAchvBar() {
  if (!ACHV.on) return;
  var x = ACHV.x, y = 132, w = 360, h = 92;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
  roundRect(x, y, w, h, 14);
  ctx.fillStyle = 'rgba(28,22,16,.95)'; ctx.fill();
  ctx.restore();
  roundRect(x, y, w, h, 14);
  ctx.strokeStyle = 'rgba(255,214,110,.9)'; ctx.lineWidth = 3; ctx.stroke();
  // 奖杯
  ctx.fillStyle = '#ffd76e';
  ctx.beginPath();
  ctx.moveTo(x + 28, y + 24); ctx.lineTo(x + 58, y + 24);
  ctx.lineTo(x + 54, y + 48); ctx.lineTo(x + 32, y + 48);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(x + 37, y + 48, 12, 11);
  ctx.fillRect(x + 29, y + 59, 28, 7);
  // 文字
  ctx.fillStyle = 'rgba(255,214,110,.55)';
  ctx.font = '600 15px "PingFang SC",system-ui,sans-serif';
  ctx.fillText('完成成就', x + 78, y + 32);
  ctx.fillStyle = '#fff2cc';
  ctx.font = '700 28px "PingFang SC",system-ui,sans-serif';
  ctx.fillText(ACHV.text, x + 78, y + 66);
}

function drawEndUI() {
  drawAchvBar();
  drawAchvBar();
  var t = END.t;

  /* 台词框 */
  if (END.dlg >= 0 && END.dlg < END_LINES.length) {
    var line = END_LINES[END.dlg];
    var shown = Math.min(line.text.length, Math.floor(END.dlgT * 16));
    var bx = 110, by = LH - 96, bw = LW - 220, bh = 78;
    roundRect(bx, by, bw, bh, 14);
    ctx.fillStyle = 'rgba(24,18,14,.9)'; ctx.fill();
    ctx.strokeStyle = 'rgba(247,239,210,.8)'; ctx.lineWidth = 3; ctx.stroke();

    // 名字牌（贴在框左侧）
    var nw = 104;
    roundRect(bx + 18, by + (bh - 42) / 2, nw, 42, 9);
    ctx.fillStyle = '#e8b23c'; ctx.fill();
    ctx.fillStyle = '#241a12';
    ctx.font = '700 23px "PingFang SC",system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(line.who, bx + 18 + nw / 2, by + bh / 2 - 1);

    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f7efd2';
    ctx.font = '600 31px "PingFang SC",system-ui,sans-serif';
    ctx.fillText(line.text.slice(0, shown), bx + 18 + nw + 26, by + bh / 2 - 1);
    ctx.textAlign = 'left';
  }

  /* 聊天截图卡片：像手机一样从右侧滑进来 */
  if (END.card > 0) {
    var p = END.card;
    var ease = 1 - Math.pow(1 - p, 3);
    var cw = 300, ch = 300 * (760 / 631);
    var cx = 300 + (1 - ease) * -260;
    var cy = LH / 2 - 46;
    var rot = -0.035 + (1 - ease) * 0.16;

    ctx.save();
    ctx.globalAlpha = Math.min(1, p * 1.6);
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(0.86 + ease * 0.14, 0.86 + ease * 0.14);
    // 投影
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10;
    // 手机白边
    roundRect(-cw / 2, -ch / 2, cw, ch, 18);
    ctx.fillStyle = '#f6f2e6'; ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    // 屏幕（截图）
    ctx.save();
    roundRect(-cw / 2 + 9, -ch / 2 + 9, cw - 18, ch - 18, 12);
    ctx.clip();
    ctx.drawImage(IMG.chat, -cw / 2 + 9, -ch / 2 + 9, cw - 18, ch - 18);
    ctx.restore();
    // 顶部小听筒
    roundRect(-26, -ch / 2 + 3, 52, 6, 3);
    ctx.fillStyle = '#d8d2c2'; ctx.fill();
    ctx.restore();

    // 卡片完成后提示
    if (END.card >= 1) {
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(performance.now() / 320) * 0.15;
      ctx.fillStyle = '#f7efd2';
      ctx.font = '600 20px "PingFang SC",system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.textAlign = 'right';
      ctx.fillText('点一下继续', LW - 40, 92);
      ctx.restore();
    }
  }
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

window.addEventListener('keydown', function () { if (STATE === 'ending') ADVANCE = true; });
CV.addEventListener('pointerdown', function () { if (STATE === 'ending') ADVANCE = true; });

/* 自检用：把终点演出从头推到结束，看能不能落到 clear */
function fastForwardEnding() {
  for (var i = 0; i < 1200 && STATE === 'ending'; i++) {
    ADVANCE = i % 4 === 0;
    updateEnding(1 / 60);
  }
  return STATE;
}

/* ================================================================
   通关之后：不再弹结算，恢复操控
   松松先自己走进管道，玩家再操控丹丹跳上管口走进去 → 黑屏 → 下一关
   ================================================================ */
var PIPE = { tx: 258, ty: 14, tw: 2, th: 2 };
var EX = {
  boyX: 0, boyWalk: 0, boyWalking: false, boyAlpha: 1,
  sinkT: 0, fade: 0
};

function enterFree() {
  STATE = 'free'; STATE_T = 0;
  FOESL = [];                    // 终点区清场，别再被怪撞
  EX.boyX = END.boyX;
  EX.boyWalk = 1.1;              // 停 1.1 秒再走，给玩家反应
  EX.boyWalking = false;
  EX.boyAlpha = 1;
  EX.sinkT = 0; EX.fade = 0;
  ADVANCE = false;
  beep(520, .09, 'square', .05);
}

function updateFree(dt) {
  var pipeCx = (PIPE.tx + 1) * TILE;          // 管道中心 x
  var pipeTop = PIPE.ty * TILE;               // 管口顶面 y

  /* 松松走向管道，到口子上沉下去 */
  if (EX.boyWalk > 0) {
    EX.boyWalk -= dt;
    if (EX.boyWalk <= 0) EX.boyWalking = true;
  } else if (EX.boyWalking) {
    EX.boyX += 110 * dt;
    if (EX.boyX >= pipeCx) {
      EX.boyX = pipeCx;
      EX.boyWalking = false;
    }
  } else if (EX.boyAlpha > 0) {
    EX.boyAlpha -= dt * 1.1;
    if (EX.boyAlpha < 0) EX.boyAlpha = 0;
  }

  /* 玩家站上管口 → 进管道 */
  if (P.onG) {
    var cx = P.x + P.w / 2;
    var onPipeTop = Math.abs((P.y + P.h) - pipeTop) < 12;
    var inPipeX = cx > PIPE.tx * TILE + 8 && cx < (PIPE.tx + PIPE.tw) * TILE - 8;
    if (onPipeTop && inPipeX) enterPipe();
  }
}

function enterPipe() {
  STATE = 'pipe'; STATE_T = 0;
  EX.sinkT = 0; EX.fade = 0;
  P.vx = 0; P.vy = 0;
  beep(300, .12, 'square', .05);
  setTimeout(function () { beep(240, .14, 'square', .05); }, 120);
}

function updatePipe(dt) {
  EX.sinkT += dt;
  /* 前 0.7 秒往下沉（钻进管子里） */
  if (EX.sinkT < 0.7) {
    P.y = PIPE.ty * TILE + EX.sinkT * 150;
    P.x = (PIPE.tx + 1) * TILE - P.w / 2;
  }
  /* 然后淡出到黑 */
  if (EX.sinkT > 0.7) EX.fade = Math.min(1, (EX.sinkT - 0.7) / 0.8);
  if (EX.sinkT > 1.7) { STATE = 'black'; STATE_T = 0; }
}

/* 管口上方的指引箭头 */
function drawPipeArrow() {
  if (STATE !== 'play' && STATE !== 'free') return;
  var cx = (PIPE.tx + 1) * TILE - CAM.x;
  if (cx < -80 || cx > LW + 80) return;
  var bob = Math.sin(performance.now() / 230) * 7;
  var cy = PIPE.ty * TILE - 76 + bob;
  ctx.save();
  ctx.fillStyle = '#ffd76e';
  ctx.strokeStyle = 'rgba(70,44,10,.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 24);            // 尖端朝下
  ctx.lineTo(cx - 19, cy - 4);
  ctx.lineTo(cx - 8, cy - 4);
  ctx.lineTo(cx - 8, cy - 26);
  ctx.lineTo(cx + 8, cy - 26);
  ctx.lineTo(cx + 8, cy - 4);
  ctx.lineTo(cx + 19, cy - 4);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

window.__game = { P: P, L: L, G: G, restart: restart };
})();
