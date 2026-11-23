/* 记忆巡游 · 序章  ------------------------------------------------------------
   单场景线性叙事。所有坐标都在 720x960 的逻辑画布内。
   角色图集：7 格（down0 down1 up0 up1 side0 side1 side2）
   女主侧身帧朝左，男主侧身帧朝右 —— SIDE_ART_FACES 决定镜像方向。         */

(function () {
'use strict';

var LW = 1440, LH = 720;                  // 横屏画布
/* 场景画在中间竖幅里：内部坐标仍是 720x960，所有站位/数值不用改 */
var SPW = 720, SPH = 960;
var COL_SCALE = 0.834, COL_W = SPW * COL_SCALE, COL_H = SPH * COL_SCALE;
var COL_X = (LW - COL_W) / 2, COL_Y = (LH - COL_H) / 2;
var cv = document.getElementById('cv');
var ctx = cv.getContext('2d');
var q = new URLSearchParams(location.search);

/* ---------------------------------------------------------------- 资源 */
var ASSETS = {
  bg_street:   'assets/bg_street.webp',
  bg_hospital: 'assets/bg_hospital.webp',
  truck:       'assets/truck.webp',
  god:         'assets/god.webp',
  fx_hit:      'assets/fx_hit.webp',
  girl:        'assets/girl.webp',
  boy:         'assets/boy.webp',
  device:      'assets/device.webp',
  boy_head:    'assets/boy_head.webp'
};
var IMG = {};
var META = {
  girl: { cellW: 125, cellH: 202, n: 7 },
  boy:  { cellW: 135, cellH: 202, n: 7 }
};
var FRAME = { down0: 0, down1: 1, up0: 2, up1: 3, side0: 4, side1: 5, side2: 6 };
var SIDE_ART_FACES = { girl: 'left', boy: 'right' };

var CH = 150;                       // 角色显示高度
/* 马路（横版 1440x720） */
var GIRL_P = { x: 960, y: 296 };    // 丹丹：站在公交站长椅前
var BOY_P  = { x: 420, y: 620 };    // 松松：这边的人行道
var CROSS  = { x: 420, y: 430 };    // 横穿到的位置（马路中间）
var Y_ROAD = 523;                   // 货车底部贴地
/* 病房 */
var H_GIRL = { x: 505, y: 480 };
var H_BOY  = { x: 900, y: 505 };
var GOD_P  = { x: 884, y: 402, scale: 0.70 };   // 浮在床右侧，别挡住床上的人
var DEV_P  = { x: 602, y: 404, scale: 0.62 };   // 悬在丹丹和床之间，别压在监护仪上
var BED_P  = { x: 655, y: 322, rot: -0.12, h: 78 };   // 躺在床上只露头

/* ---------------------------------------------------------------- 状态 */
var S = {
  scene: 'street',
  fade: 1, dim: 0, white: 0, vignette: 0,
  actors: [],
  truck: null, fx: null, god: null, device: null, bed: null,
  dlg: null, ui: 'boot', shake: 0, t: 0,
  hint: 0
};

function actor(who, x, y, facing) {
  return { who: who, x: x, y: y, facing: facing || 'down',
           moving: false, walkStep: 0, phase: 0, alpha: 1, rot: 0, scale: 1, h: CH };
}
function findActor(who) { for (var i = 0; i < S.actors.length; i++) if (S.actors[i].who === who) return S.actors[i]; return null; }

/* ---------------------------------------------------------------- 加载 */
function load() {
  var keys = Object.keys(ASSETS), done = 0;
  var fill = document.getElementById('fill');
  return new Promise(function (res, rej) {
    keys.forEach(function (k) {
      var im = new Image();
      im.onload = function () {
        done++; fill.style.width = Math.round(done / keys.length * 100) + '%';
        if (done === keys.length) res();
      };
      im.onerror = function () { rej(new Error('图片加载失败: ' + ASSETS[k])); };
      im.src = ASSETS[k];
      IMG[k] = im;
    });
  });
}

/* ---------------------------------------------------------------- 尺寸 */
function fit() {
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  var s = Math.min(window.innerWidth / LW, window.innerHeight / LH);
  var cw = Math.round(LW * s), ch = Math.round(LH * s);
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  cv.width = Math.max(1, Math.round(cw * dpr));
  cv.height = Math.max(1, Math.round(ch * dpr));
  ctx.setTransform(cv.width / LW, 0, 0, cv.height / LH, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

/* ---------------------------------------------------------------- 绘制 */
function coverDraw(c, img) {
  var sc = Math.max(SPW / img.width, SPH / img.height);
  var w = img.width * sc, h = img.height * sc;
  c.drawImage(img, (SPW - w) / 2, (SPH - h) / 2, w, h);
}

/* 两侧延展：把场景缩到 120x60 再拉满画布 = 廉价模糊，不用 ctx.filter（iPhone 也稳） */
var backdropCache = {};
function drawBackdrop(c, img) {
  var low = backdropCache[img.src];
  if (!low) {
    low = document.createElement('canvas');
    low.width = 64; low.height = 32;
    var lc = low.getContext('2d');
    var s = Math.max(low.width / img.width, low.height / img.height);
    var w = img.width * s, h = img.height * s;
    lc.drawImage(img, (low.width - w) / 2, (low.height - h) / 2, w, h);
    backdropCache[img.src] = low;
  }
  c.save();
  c.drawImage(low, 0, 0, LW, LH);
  c.fillStyle = 'rgba(10,8,16,0.7)';
  c.fillRect(0, 0, LW, LH);
  c.restore();
}

/* 竖幅两侧压暗，让中间的清晰区看起来是刻意的聚焦 */
function sideShade(c) {
  var w = 200, wrap = 130, a = 0.8;
  // 竖幅外侧：从接缝往外淡出
  var g1 = c.createLinearGradient(COL_X, 0, COL_X - w, 0);
  g1.addColorStop(0, 'rgba(6,5,10,' + a + ')');
  g1.addColorStop(1, 'rgba(6,5,10,0)');
  c.fillStyle = g1; c.fillRect(COL_X - w, 0, w, LH);
  var g2 = c.createLinearGradient(COL_X + COL_W, 0, COL_X + COL_W + w, 0);
  g2.addColorStop(0, 'rgba(6,5,10,' + a + ')');
  g2.addColorStop(1, 'rgba(6,5,10,0)');
  c.fillStyle = g2; c.fillRect(COL_X + COL_W, 0, w, LH);
  // 竖幅内侧：同样从接缝往里淡出，让接缝不出现硬边
  var i1 = c.createLinearGradient(COL_X, 0, COL_X + wrap, 0);
  i1.addColorStop(0, 'rgba(6,5,10,' + a + ')');
  i1.addColorStop(1, 'rgba(6,5,10,0)');
  c.fillStyle = i1; c.fillRect(COL_X, 0, wrap, LH);
  var i2 = c.createLinearGradient(COL_X + COL_W, 0, COL_X + COL_W - wrap, 0);
  i2.addColorStop(0, 'rgba(6,5,10,' + a + ')');
  i2.addColorStop(1, 'rgba(6,5,10,0)');
  c.fillStyle = i2; c.fillRect(COL_X + COL_W - wrap, 0, wrap, LH);
}

function shadow(c, x, y, w) {
  c.save(); c.globalAlpha = 0.22; c.fillStyle = '#241a12';
  c.beginPath(); c.ellipse(x, y, w * 0.34, 7, 0, 0, Math.PI * 2); c.fill(); c.restore();
}

function drawActor(c, a) {
  var m = META[a.who], img = IMG[a.who];
  var idx, flip = false;
  if (a.moving && (a.facing === 'left' || a.facing === 'right')) {
    idx = a.walkStep ? FRAME.side2 : FRAME.side1;
    flip = (a.facing === (SIDE_ART_FACES[a.who] === 'left' ? 'right' : 'left'));
  } else if (a.moving && a.facing === 'up') {
    idx = a.walkStep ? FRAME.up1 : FRAME.up0;
  } else if (a.moving && a.facing === 'down') {
    idx = a.walkStep ? FRAME.down1 : FRAME.down0;
  } else {
    idx = FRAME.down0;
  }
  var h = a.h, w = h * (m.cellW / m.cellH);
  if (a.alpha > 0) shadow(c, a.x, a.y, w);
  c.save();
  c.globalAlpha = a.alpha;
  c.translate(a.x, a.y);
  if (a.rot) c.rotate(a.rot);
  if (flip) c.scale(-1, 1);
  if (a.scale !== 1) c.scale(a.scale, a.scale);
  c.drawImage(img, idx * m.cellW, 0, m.cellW, m.cellH, -w / 2, -h, w, h);
  c.restore();
}

function glow(c, x, y, r, rgb, a) {
  var g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
  g.addColorStop(0.45, 'rgba(' + rgb + ',' + (a * 0.45) + ')');
  g.addColorStop(1, 'rgba(' + rgb + ',0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}

function wrapText(c, text, maxW) {
  var lines = [], cur = '';
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (ch === '\n') { lines.push(cur); cur = ''; continue; }
    if (c.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; }
    else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}

var FONT = '"PingFang SC","Microsoft YaHei","Hiragino Sans GB",system-ui,sans-serif';

function drawDialogue(c) {
  var d = S.dlg; if (!d) return;
  // 横屏：台词条横跨整个画布底部
  var x = 90, y = 452, w = LW - 180, h = 196;
  c.save();
  c.fillStyle = 'rgba(18,13,24,0.5)';
  roundRect(c, x + 6, y + 9, w, h, 22); c.fill();
  c.fillStyle = 'rgba(248,238,214,0.97)';
  roundRect(c, x, y, w, h, 22); c.fill();
  c.strokeStyle = '#4a3426'; c.lineWidth = 5;
  roundRect(c, x, y, w, h, 22); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 2;
  roundRect(c, x + 7, y + 7, w - 14, h - 14, 16); c.stroke();

  // 名牌
  if (d.name) {
    c.font = '700 26px ' + FONT;
    var nw = c.measureText(d.name).width + 50;
    var nx = x + 34, ny = y - 34;
    c.fillStyle = '#3f6b46';
    roundRect(c, nx, ny, nw, 52, 13); c.fill();
    c.strokeStyle = '#9fc487'; c.lineWidth = 3;
    roundRect(c, nx, ny, nw, 52, 13); c.stroke();
    c.fillStyle = '#f6eed6'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(d.name, nx + nw / 2, ny + 28);
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  }

  // 正文（打字机）
  var shown = d.text.slice(0, Math.floor(d.shown));
  c.font = '600 32px ' + FONT;
  c.fillStyle = '#3a2b20';
  var lines = wrapText(c, shown, w - 96);
  var ty = y + 70;
  for (var i = 0; i < lines.length && i < 3; i++) {
    c.fillText(lines[i], x + 46, ty + i * 48);
  }
  // 继续提示
  if (d.done) {
    var blink = 0.45 + 0.55 * Math.abs(Math.sin(S.t * 3.2));
    c.globalAlpha = blink;
    c.fillStyle = '#4a3426';
    var ax = x + w - 52, ay = y + h - 36;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + 18, ay); c.lineTo(ax + 9, ay + 14); c.closePath(); c.fill();
    c.globalAlpha = 1;
  }
  c.restore();
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

function drawTitle(c) {
  c.save();
  c.globalAlpha = 0.62; c.fillStyle = '#0d0b12';
  c.fillRect(0, 0, LW, LH);
  c.globalAlpha = 1;

  c.textAlign = 'center';
  c.fillStyle = 'rgba(0,0,0,0.55)';
  c.font = '700 86px ' + FONT;
  c.fillText('记忆巡游', LW / 2 + 4, 268 + 4);
  c.fillStyle = '#f6eed6';
  c.fillText('记忆巡游', LW / 2, 268);

  c.font = '600 26px ' + FONT;
  c.fillStyle = 'rgba(246,238,214,0.72)';
  c.fillText('序 章', LW / 2, 330);

  // 开始按钮
  var bw = 268, bh = 92, bx = LW / 2 - bw / 2, by = 424;
  c.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(c, bx + 5, by + 7, bw, bh, 16); c.fill();
  var g = c.createLinearGradient(0, by, 0, by + bh);
  g.addColorStop(0, '#4b7d52'); g.addColorStop(1, '#31583a');
  c.fillStyle = g;
  roundRect(c, bx, by, bw, bh, 16); c.fill();
  c.strokeStyle = '#a8c98c'; c.lineWidth = 4;
  roundRect(c, bx, by, bw, bh, 16); c.stroke();
  c.fillStyle = '#f8f2dd';
  c.font = '700 38px ' + FONT;
  c.textBaseline = 'middle';
  c.fillText('开始', LW / 2, by + bh / 2 + 1);
  c.textBaseline = 'alphabetic';

  var a = 0.35 + 0.35 * Math.abs(Math.sin(S.t * 2.2));
  c.globalAlpha = a;
  c.font = '600 22px ' + FONT;
  c.fillStyle = '#e8dcc0';
  c.fillText('点一下开始', LW / 2, 566);
  c.globalAlpha = 1;
  c.restore();
}

function drawEndCard(c) {
  c.save();
  c.fillStyle = '#0d0b12'; c.fillRect(0, 0, LW, LH);
  glow(c, LW / 2, 330, 420, '255,236,190', 0.10);
  c.textAlign = 'center';
  c.fillStyle = '#f6eed6'; c.font = '700 56px ' + FONT;
  c.fillText('序章 · 完', LW / 2, 336);
  c.fillStyle = 'rgba(246,238,214,0.62)'; c.font = '600 22px ' + FONT;
  c.fillText('第一章 · 平安', LW / 2, 414);
  c.fillStyle = 'rgba(246,238,214,0.38)'; c.font = '600 22px ' + FONT;
  c.fillText('（待续）', LW / 2, 458);
  c.restore();
}

function draw(c) {
  c.clearRect(0, 0, LW, LH);
  c.fillStyle = '#0d0b12'; c.fillRect(0, 0, LW, LH);

  c.save();
  if (S.shake > 0) {
    c.translate((Math.random() - 0.5) * S.shake * 2, (Math.random() - 0.5) * S.shake * 2);
  }

  if (S.scene === 'street') c.drawImage(IMG.bg_street, 0, 0, LW, LH);
  else if (S.scene === 'hospital') c.drawImage(IMG.bg_hospital, 0, 0, LW, LH);

  if (S.bed) {
    var bd = S.bed, bm = IMG.boy_head;
    var bh = bd.h, bw = bh * (bm.width / bm.height);
    var asleep = !bd.awake;
    c.save();
    c.globalAlpha = bd.alpha;
    c.translate(bd.x, bd.y + Math.sin(S.t * (asleep ? 1.15 : 2.1)) * (asleep ? 2.2 : 0.8));
    c.rotate(bd.rot + (bd.awake ? (bd.rot2 || 0) : 0));
    c.drawImage(bm, -bw / 2, -bh, bw, bh);
    c.restore();
  }

  // 角色按 y 排序（标题画面不画人，免得头挡标题）
  var list = S.actors.slice().sort(function (a, b) { return a.y - b.y; });
  if (S.ui !== 'title') {
    for (var i = 0; i < list.length; i++) drawActor(c, list[i]);
  }

  if (S.truck) {
    var t = S.truck, m = IMG.truck;
    c.save(); c.globalAlpha = t.alpha;
    c.drawImage(m, t.x - m.width / 2, t.y - m.height + 22);
    c.restore();
  }

  if (S.god) {
    var gd = S.god, gm = IMG.god;
    c.save(); c.globalAlpha = gd.alpha;
    var w = gm.width * gd.scale, h = gm.height * gd.scale;
    c.globalCompositeOperation = 'lighter';
    glow(c, gd.x, gd.y - h * 0.45, h * 0.62, '255,244,206', 0.30 * gd.alpha);
    c.globalCompositeOperation = 'source-over';
    c.drawImage(gm, gd.x - w / 2, gd.y - h, w, h);
    c.restore();
  }

  if (S.device) {
    var dv = S.device, dm = IMG.device;
    c.save(); c.globalAlpha = dv.alpha;
    var dw = dm.width * dv.scale, dh = dm.height * dv.scale;
    c.globalCompositeOperation = 'lighter';
    glow(c, dv.x, dv.y - dh / 2, dh * 0.95, '210,255,200', 0.26 * dv.alpha);
    c.globalCompositeOperation = 'source-over';
    c.drawImage(dm, dv.x - dw / 2, dv.y - dh - Math.sin(S.t * 2) * 5, dw, dh);
    c.restore();
  }

  if (S.fx) {
    var f = S.fx, fm = IMG.fx_hit;
    c.save(); c.globalAlpha = f.alpha;
    c.translate(f.x, f.y); c.scale(f.scale, f.scale);
    c.drawImage(fm, -fm.width / 2, -fm.height / 2);
    c.restore();
  }

  c.restore();

  if (S.dim > 0) { c.fillStyle = 'rgba(8,6,14,' + S.dim + ')'; c.fillRect(0, 0, LW, LH); }

  if (S.vignette > 0) {
    var vg = c.createRadialGradient(LW / 2, LH / 2, LH * 0.30, LW / 2, LH / 2, LH * 0.92);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,' + S.vignette + ')');
    c.fillStyle = vg; c.fillRect(0, 0, LW, LH);
  }

  if (S.white > 0) { c.fillStyle = 'rgba(255,252,240,' + S.white + ')'; c.fillRect(0, 0, LW, LH); }

  if (S.ui === 'title') drawTitle(c);
  else if (S.ui === 'end') drawEndCard(c);
  else if (S.ui === 'use') drawUseBtn(c);
  else { drawDialogue(c); }

  if (S.fade > 0) { c.fillStyle = 'rgba(9,7,14,' + S.fade + ')'; c.fillRect(0, 0, LW, LH); }
}

/* 「使用」按钮：神明把装置交给丹丹之后，由玩家决定 */
var USE_BTN = { x: 0, y: 0, w: 300, h: 88 };
function drawUseBtn(c) {
  USE_BTN.x = LW / 2 - USE_BTN.w / 2;
  USE_BTN.y = LH * 0.60;
  c.save();
  c.fillStyle = 'rgba(8,6,12,.45)';
  c.fillRect(0, 0, LW, LH);
  c.textAlign = 'center';
  c.fillStyle = 'rgba(232,220,192,.75)';
  c.font = '600 ' + Math.round(LH * 0.032) + 'px "PingFang SC",system-ui,sans-serif';
  c.fillText('丹丹把手伸向那个装置', LW / 2, USE_BTN.y - LH * 0.10);
  var b = USE_BTN, pulse = 0.5 + 0.5 * Math.sin(S.t * 3);
  c.beginPath();
  var r = 16;
  c.moveTo(b.x + r, b.y); c.arcTo(b.x + b.w, b.y, b.x + b.w, b.y + b.h, r);
  c.arcTo(b.x + b.w, b.y + b.h, b.x, b.y + b.h, r);
  c.arcTo(b.x, b.y + b.h, b.x, b.y, r); c.arcTo(b.x, b.y, b.x + b.w, b.y, r);
  c.closePath();
  c.fillStyle = 'rgba(30,24,18,.94)'; c.fill();
  c.strokeStyle = 'rgba(255,214,110,' + (0.55 + 0.35 * pulse) + ')';
  c.lineWidth = 4; c.stroke();
  c.fillStyle = '#fff2cc';
  c.font = '700 ' + Math.round(LH * 0.052) + 'px "PingFang SC",system-ui,sans-serif';
  c.textBaseline = 'middle';
  c.fillText('使 用', LW / 2, b.y + b.h / 2);
  c.textBaseline = 'alphabetic';
  c.textAlign = 'left';
  c.restore();
}

/* ---------------------------------------------------------------- 缓动 */
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

var tweens = [];
function tween(dur, fn, ease) {
  return new Promise(function (res) {
    tweens.push({ t: 0, dur: Math.max(0.0001, dur), fn: fn, ease: ease || easeOut, res: res });
  });
}
var simWaits = [];
function wait(sec) {
  if (!AUTO) return new Promise(function (r) { setTimeout(r, sec * 1000); });
  return new Promise(function (r) { simWaits.push({ t: SIMT + sec, res: r }); });
}

/* ---------------------------------------------------------------- 对话 */
var TYPE_SPEED = 34;
function say(name, text) {
  LOG((name || '旁白') + '｜' + text);
  return new Promise(function (res) {
    S.dlg = { name: name, text: text, shown: 0, done: false, res: res };
  });
}
function advanceDialogue() {
  var d = S.dlg; if (!d) return false;
  if (!d.done) { d.shown = d.text.length; d.done = true; return true; }
  S.dlg = null; d.res(); return true;
}

/* ---------------------------------------------------------------- 输入 */
function onDown(e) {
  if (e && e.cancelable) e.preventDefault();
  if (S.ui === 'boot') return;
  if (S.ui === 'title') { S.ui = 'none'; S.tapResolve && S.tapResolve(); return; }
  if (S.ui === 'end') { return; }
  if (S.ui === 'use') {
    var r2 = cv.getBoundingClientRect();
    var mx = (e.clientX - r2.left) / r2.width * LW;
    var my = (e.clientY - r2.top) / r2.height * LH;
    var b2 = USE_BTN;
    if (mx > b2.x && mx < b2.x + b2.w && my > b2.y && my < b2.y + b2.h) {
      S.ui = 'none';
      if (S.useResolve) { var u = S.useResolve; S.useResolve = null; u(); }
    }
    return;
  }
  if (advanceDialogue()) return;
  if (S.tapResolve) { var r = S.tapResolve; S.tapResolve = null; r(); }
}
cv.addEventListener('pointerdown', onDown, { passive: false });
window.addEventListener('keydown', function (e) {
  if (e.key === ' ' || e.key === 'Enter') onDown();
});

/* ---------------------------------------------------------------- 主循环 */
/* 自检快放：模拟时钟 + 胶片抽样（只在 ?auto=1 时启用） */
var AUTO = false, SIMT = 0, FIXED = 0, nextCap = 0.6, CAP_EVERY = 1.4;
var film = null, filmN = 0, filmMax = 40, FILM_SCALE = 0.25;

function captureFrame() {
  if (filmN >= filmMax) return;
  var fw = Math.round(LW * FILM_SCALE), fh = Math.round(LH * FILM_SCALE);
  if (!film) {
    film = document.createElement('canvas');
    film.width = fw * 5 + 12; film.height = Math.ceil(filmMax / 5) * (fh + 6) + 6;
    var fc0 = film.getContext('2d');
    fc0.fillStyle = '#141119'; fc0.fillRect(0, 0, film.width, film.height);
  }
  var fc = film.getContext('2d');
  var i = filmN++;
  fc.drawImage(cv, 6 + (i % 5) * fw, 6 + Math.floor(i / 5) * (fh + 6), fw, fh);
  fc.fillStyle = '#9d96ad'; fc.font = '10px monospace';
  fc.fillText(SIMT.toFixed(1) + 's', 8 + (i % 5) * fw, 16 + Math.floor(i / 5) * (fh + 6));
}
function paintFilm() {
  if (!film) return;
  cv.width = film.width; cv.height = film.height;
  cv.style.width = film.width + 'px'; cv.style.height = film.height + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(film, 0, 0);
}
function showFilm() { MODE = 'film'; paintFilm(); }

var last = 0;
function loop() {
  var now = performance.now();
  if (!last) last = now;
  var dt = FIXED || Math.min(0.05, (now - last) / 1000);
  last = now;
  if (MODE === 'film') { paintFilm(); return; }
  if (AUTO && SIMT > 46) { showFilm(); return; }
  if (AUTO) {
    SIMT += dt;
    if (SIMT >= nextCap) { nextCap += CAP_EVERY; captureFrame(); }
  }
  update(dt);
  draw(ctx);
  if (AUTO) setTimeout(loop, 0); else requestAnimationFrame(loop);
}function update(dt) {
  S.t += dt;
  // 打字机
  if (S.dlg && !S.dlg.done) {
    S.dlg.shown += dt * TYPE_SPEED;
    if (S.dlg.shown >= S.dlg.text.length) { S.dlg.shown = S.dlg.text.length; S.dlg.done = true; }
  }
  // 补间
  for (var i = tweens.length - 1; i >= 0; i--) {
    var tw = tweens[i];
    tw.t += dt;
    var p = Math.min(1, tw.t / tw.dur);
    tw.fn(tw.ease(p), p);
    if (p >= 1) { tweens.splice(i, 1); tw.res(); }
  }
  // 走路相位
  for (var j = 0; j < S.actors.length; j++) {
    var a = S.actors[j];
    if (a.moving) { a.phase += dt; if (a.phase > 0.17) { a.phase = 0; a.walkStep = a.walkStep ? 0 : 1; } }
    else { a.walkStep = 0; }
  }
  if (S.shake > 0) S.shake = Math.max(0, S.shake - dt * 60);
  if (AUTO) {
    for (var k = simWaits.length - 1; k >= 0; k--) {
      if (SIMT >= simWaits[k].t) { var w = simWaits.splice(k, 1)[0]; w.res(); }
    }
    if (S.dlg && S.dlg.done) advanceDialogue();
  }
}

/* ---------------------------------------------------------------- 动作原语 */
function walkTo(a, tx, ty, dur, facing) {
  var sx = a.x, sy = a.y;
  a.moving = true;
  if (facing) a.facing = facing;
  else a.facing = (Math.abs(tx - sx) > Math.abs(ty - sy)) ? (tx > sx ? 'right' : 'left') : (ty > sy ? 'down' : 'up');
  return tween(dur, function (p) {
    a.x = sx + (tx - sx) * p;
    a.y = sy + (ty - sy) * p;
  }, function (t) { return t; }).then(function () { a.moving = false; a.facing = 'down'; });
}

/* ---------------------------------------------------------------- 剧本 */
var BOY = null, GIRL = null;
var LOGEL = null;
function LOG(m) {
  if (!q.has('log')) return;
  if (!LOGEL) {
    LOGEL = document.createElement('pre');
    LOGEL.style.cssText = 'position:fixed;left:0;top:0;z-index:200;background:#000;color:#0f0;' +
      'font:12px/1.45 monospace;padding:6px;margin:0;white-space:pre;max-width:100%;max-height:100%;overflow:auto';
    document.body.appendChild(LOGEL);
  }
  LOGEL.textContent += m + '\n';
}

async function prologue() {
  LOG('== PROLOGUE START ==');
  // 标题 → 街景
  S.fade = 1;
  await tween(1.1, function (p) { S.fade = 1 - p; }, easeInOut);
  await wait(0.35);

  await say('松松', '丹丹——！');
  await say('丹丹', '你别跑！这边没斑马线');

  // 男走向女（横穿马路）
  BOY.facing = 'up';
  await walkTo(BOY, CROSS.x, CROSS.y, 1.8, 'up');
  BOY.facing = 'up';
  await wait(0.1);

  // 大运从右边来，车头正好压到他身上
  S.truck = { x: 1030, y: Y_ROAD, alpha: 1 };
  var hitX = BOY.x + 236;
  var dur = (1030 - hitX) / 900;
  await tween(dur, function (p) { S.truck.x = 1030 + (hitX - 1030) * p; }, function (t) { return t; });

  // 撞击
  S.shake = 26;
  S.white = 0.85;
  S.fx = { x: BOY.x + 90, y: BOY.y - 60, alpha: 0.8, scale: 0.85 };
  tween(0.22, function (p) { S.white = 0.85 * (1 - p); });
  tween(0.85, function (p) { S.truck.x = hitX - 540 * p; S.truck.alpha = 1 - p * 0.9; });
  S.actors.splice(S.actors.indexOf(BOY), 1);
  var ghost = actor('boy', BOY.x, BOY.y, 'up');
  S.actors.push(ghost);
  tween(1.0, function (p) {
    ghost.x = BOY.x - 210 * p;
    ghost.y = BOY.y - 250 * p + 60 * p * p;
    ghost.rot = -2.2 * p;
    ghost.alpha = 1 - p * 0.9;
    S.fx.alpha = 0.95 * (1 - p);
    S.fx.scale = 0.85 + p * 0.7;
  }, easeOut);
  await wait(0.55);
  await tween(0.9, function (p) { S.fade = p; }, easeInOut);
  S.scene = 'black';
  S.actors = []; S.truck = null; S.fx = null;
  await wait(0.9);

  // 病房
  S.scene = 'hospital';
  LOG('== WARD ==');
  S.vignette = 0.5;
  GIRL = actor('girl', H_GIRL.x, H_GIRL.y, 'right');
  S.actors = [GIRL];
  S.bed = { x: BED_P.x, y: BED_P.y, rot: BED_P.rot, rot2: 0.08, h: BED_P.h, alpha: 1, awake: false };
  S.dim = 0.12;
  await tween(1.6, function (p) { S.fade = 1 - p; }, easeInOut);
  await wait(0.7);

  await say('丹丹', '（小声）你醒醒……');
  await wait(0.2);

  // 醒来：白光 → 男主出现在床边
  await tween(0.45, function (p) { S.white = p; }, easeInOut);
  S.bed.awake = true;      // 醒了但起不来，全程躺床
  await tween(0.7, function (p) { S.white = 1 - p; }, easeInOut);
  await wait(0.35);

  await say('松松', '……这是哪儿？');
  await say('丹丹', '医院。你被一辆大运撞了，睡了三天。');
  await say('松松', '……');
  await say('松松', '你是谁？');
  await wait(0.35);
  await say('丹丹', '……');
  await say('松松', '对不起。我什么都想不起来。');
  await wait(0.25);
  await say(null, '他没有说谎。他看着我的眼神，和看一张病床没有区别。');

  // 神明降临
  S.dim = 0.42;
  S.god = { x: GOD_P.x, y: GOD_P.y + 46, alpha: 0, scale: GOD_P.scale };
  await tween(0.9, function (p) { S.god.alpha = p; S.god.y = GOD_P.y + 46 - 46 * p; }, easeOut);
  await wait(0.3);
  LOG('== GOD ==');

  await say('神明', '他的记忆，丢在那辆卡车下面了。');
  await say('丹丹', '……你是谁？');
  await say('神明', '我专门收拾这种烂摊子。');
  await say('神明', '用这个，走进他的记忆里，一件一件捡回来。');

  // 装置落到丹丹手边
  S.device = { x: DEV_P.x, y: DEV_P.y - 60, alpha: 0, scale: DEV_P.scale * 0.8 };
  await tween(0.8, function (p) {
    S.device.alpha = p; S.device.y = DEV_P.y - 60 + 60 * p; S.device.scale = DEV_P.scale * (0.8 + 0.2 * p);
  }, easeOut);
  LOG('== DEVICE ==');
  await say('丹丹', '捡齐了，他就想起来了？');
  await say('神明', '捡齐了，他就会想起——你是谁。');
  await wait(0.4);

  LOG('== USE CHOICE ==');
  S.ui = 'use';
  await new Promise(function (res) { S.useResolve = res; });
  LOG('== USE -> 进正片 ==');

  var girl = S.actors[0];
  var gx0 = girl.x, gy0 = girl.y;

  await tween(0.9, function (p) { S.vignette = 0.5 + 0.45 * p; S.dim = 0.42 + 0.28 * p; }, easeInOut);
  await tween(1.1, function (p) {
    girl.x = gx0 + (LW * 0.14 - gx0) * p;
    girl.y = gy0 + (LH * 0.20 - gy0) * p;
  }, easeInOut);
  await tween(0.7, function (p) { S.fade = p; }, easeInOut);
  location.href = '../main/index.html?from=prologue';
}

/* ---------------------------------------------------------------- 静态分镜（供截图自检） */
function setupShot(name) {
  S.dlg = null; S.ui = 'none'; S.fade = 0; S.dim = 0; S.white = 0; S.shake = 0; S.vignette = 0.35;
  S.actors = []; S.truck = null; S.god = null; S.device = null; S.scene = 'street'; S.fx = null;
  var g, b, t;
  switch (name) {
    case 'title':
      S.ui = 'title'; S.scene = 'street'; break;
    case 'meet':
      S.actors = [actor('girl', GIRL_P.x, GIRL_P.y, 'down'), actor('boy', BOY_P.x, BOY_P.y, 'up')]; break;
    case 'run':
      S.actors = [actor('girl', GIRL_P.x, GIRL_P.y, 'down'), actor('boy', CROSS.x, CROSS.y + 40, 'up')];
      S.actors[1].moving = true; break;
    case 'hit':
      t = actor('boy', 220, Y_ROAD - 210, 'up'); t.rot = -1.6; t.alpha = 0.6;
      S.actors = [actor('girl', GIRL_P.x, GIRL_P.y, 'down'), t];
      S.truck = { x: 656, y: Y_ROAD, alpha: 1 };
      S.fx = { x: 420, y: Y_ROAD - 70, alpha: 0.95, scale: 1.0 };
      S.white = 0.16; break;
    case 'ward':
      S.scene = 'hospital'; S.vignette = 0.5; S.dim = 0.12;
      S.actors = [actor('girl', H_GIRL.x, H_GIRL.y, 'right')];
      S.bed = { x: BED_P.x, y: BED_P.y, rot: BED_P.rot, rot2: 0.08, h: BED_P.h, alpha: 1, awake: false }; break;
    case 'talk':
      S.scene = 'hospital'; S.vignette = 0.5; S.dim = 0.12;
      S.actors = [actor('girl', H_GIRL.x, H_GIRL.y, 'right')];
      S.bed = { x: BED_P.x, y: BED_P.y, rot: BED_P.rot, rot2: 0.08, h: BED_P.h, alpha: 1, awake: true };
      S.dlg = { name: '丹丹', text: '医院。你被一辆大运撞了，睡了三天。', shown: 99, done: true, res: function () {} };
      break;
    case 'god':
      S.scene = 'hospital'; S.vignette = 0.5; S.dim = 0.42;
      S.actors = [actor('girl', H_GIRL.x, H_GIRL.y, 'right')];
      S.bed = { x: BED_P.x, y: BED_P.y, rot: BED_P.rot, rot2: 0.08, h: BED_P.h, alpha: 1, awake: true };
      S.god = { x: GOD_P.x, y: GOD_P.y, alpha: 1, scale: GOD_P.scale };
      S.dlg = { name: '神明', text: '用这个，走进他的记忆里，一件一件捡回来。', shown: 99, done: true, res: function () {} };
      break;
    case 'device':
      S.scene = 'hospital'; S.vignette = 0.5; S.dim = 0.42;
      S.actors = [actor('girl', H_GIRL.x, H_GIRL.y, 'right')];
      S.bed = { x: BED_P.x, y: BED_P.y, rot: BED_P.rot, rot2: 0.08, h: BED_P.h, alpha: 1, awake: true };
      S.god = { x: GOD_P.x, y: GOD_P.y, alpha: 1, scale: GOD_P.scale };
      S.device = { x: DEV_P.x, y: DEV_P.y, alpha: 1, scale: DEV_P.scale };
      break;
    case 'end': S.ui = 'end'; break;
  }
}

function gridOverlay(c) {
  c.save();
  c.strokeStyle = 'rgba(255,60,60,0.55)'; c.lineWidth = 1;
  c.font = '11px monospace'; c.fillStyle = 'rgba(255,80,80,0.9)';
  for (var x = 0; x <= LW; x += 40) {
    c.beginPath(); c.moveTo(x, 0); c.lineTo(x, LH); c.stroke();
    if (x % 80 === 0) c.fillText(x, x + 2, 12);
  }
  for (var y = 0; y <= LH; y += 40) {
    c.beginPath(); c.moveTo(0, y); c.lineTo(LW, y); c.stroke();
    if (y % 80 === 0) c.fillText(y, 2, y - 3);
  }
  c.restore();
}

function buildSheet() {
  var names = ['title', 'meet', 'run', 'hit', 'ward', 'talk', 'god', 'device', 'end'];
  var sc = 0.30, cw = Math.round(LW * sc), chh = Math.round(LH * sc);
  var cols = 5, rows = Math.ceil(names.length / cols);
  var W = cols * (cw + 10) + 10, H = rows * (chh + 34) + 10;
  var buf = document.createElement('canvas');
  buf.width = W; buf.height = H;
  var bc = buf.getContext('2d');
  bc.fillStyle = '#15121c'; bc.fillRect(0, 0, W, H);
  var off = document.createElement('canvas'); off.width = LW; off.height = LH;
  var oc = off.getContext('2d');
  for (var i = 0; i < names.length; i++) {
    setupShot(names[i]);
    S.t = 1.1;
    draw(oc);
    if (q.has('grid')) gridOverlay(oc);
    var cx = 10 + (i % cols) * (cw + 10), cy = 10 + Math.floor(i / cols) * (chh + 34);
    bc.drawImage(off, cx, cy, cw, chh);
    bc.fillStyle = '#e8dcc0'; bc.font = '13px monospace';
    bc.fillText(names[i], cx + 3, cy + chh + 17);
  }
  return buf;
}

/* ---------------------------------------------------------------- 启动 */
var MODE = 'game', sheetBuf = null;

function sizeSheet() {
  cv.width = sheetBuf.width; cv.height = sheetBuf.height;
  cv.style.width = sheetBuf.width + 'px'; cv.style.height = sheetBuf.height + 'px';
}

/* 静态分镜一次重绘（headless 截图时 resize 会清空画布，所以补几次重绘） */
function paintOnce() {
  if (MODE === 'sheet') {
    if (!sheetBuf) return;
    sizeSheet();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.drawImage(sheetBuf, 0, 0);
    return;
  }
  fit();
  draw(ctx);
  if (MODE === 'shot' && q.has('grid')) gridOverlay(ctx);
}

function boot() {
  if (q.has('sheet')) {
    MODE = 'sheet';
    sheetBuf = buildSheet();
    document.getElementById('boot').style.display = 'none';
    paintOnce();
    [60, 200, 500, 1000].forEach(function (ms) { setTimeout(paintOnce, ms); });
    window.addEventListener('resize', paintOnce);
    return;
  }
  if (q.has('shot')) {
    MODE = 'shot';
    setupShot(q.get('shot'));
    S.t = 1.1;
    document.getElementById('boot').style.display = 'none';
    paintOnce();
    [60, 200, 500, 1000].forEach(function (ms) { setTimeout(paintOnce, ms); });
    window.addEventListener('resize', paintOnce);
    if (q.has('diag')) setTimeout(diag, 400);
    return;
  }

  MODE = 'game';
  fit();
  window.addEventListener('resize', fit);
  GIRL = actor('girl', GIRL_P.x, GIRL_P.y, 'down');
  BOY = actor('boy', BOY_P.x, BOY_P.y, 'up');
  S.actors = [GIRL, BOY];
  S.vignette = 0.35;
  S.ui = 'title';

  if (q.has('auto')) {           // 自检用：不点开始，自动播完全程（模拟时钟）
    document.getElementById('boot').style.display = 'none';
AUTO = true; FIXED = 1 / 30;
    S.ui = 'none';
    loop();
    prologue().catch(function (e) { fatal('auto: ' + (e && e.message)); });
    return;
  }

  document.getElementById('boot').style.display = 'none';
  S.fade = 0;                     // 标题不能被开场黑场盖住（黑屏 bug 修复）
  draw(ctx);                      // 先同步画一帧，不等 rAF
  requestAnimationFrame(function (ts) { last = ts; loop(ts); });
  var started = false;
  function startOnce() {
    if (started) return; started = true;
    S.ui = 'none';
    prologue().catch(function (e) {
      fatal('prologue: ' + (e && e.message));
    });
  }
  cv.addEventListener('pointerdown', startOnce);
  window.addEventListener('keydown', startOnce);
}

function fatal(msg) {
  var b = document.getElementById('boot');
  b.style.display = 'flex';
  b.innerHTML = '<div style="color:#ff9b9b;max-width:90vw;white-space:pre-wrap;text-align:left">' +
    msg + '</div>';
  window.__err.push(msg);
}
window.addEventListener('unhandledrejection', function (e) {
  fatal('rejection: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason));
});

function diag() {
  // 画布探针：证明 canvas 是否可见、drawImage 是否能画 webp
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#ff00ff'; ctx.fillRect(4, 4, 70, 70);
  try { ctx.drawImage(IMG.boy, 0, 0, 135, 202, 90, 4, 135, 202); } catch (e) { window.__err.push('probe1:' + e.message); }
  try { ctx.drawImage(IMG.bg_hospital, 4, 210, 200, 260); } catch (e) { window.__err.push('probe2:' + e.message); }
  ctx.restore();
  var d = document.createElement('div');
  d.style.cssText = 'position:fixed;right:0;top:120px;z-index:99;background:#000;color:#0f0;' +
    'font:12px/1.5 monospace;padding:8px;white-space:pre;max-width:100%';
  d.textContent = [
    'search=' + location.search,
    'sizes=' + Object.keys(IMG).map(function (k) { return k + ':' + IMG[k].width + 'x' + IMG[k].height + '(' + (IMG[k].complete ? 'c' : 'x') + ')'; }).join(' '),
    'cw=' + cv.width + ' ch=' + cv.height + ' css=' + cv.style.width + 'x' + cv.style.height,
    'ctx=' + (!!ctx) + ' scene=' + S.scene + ' ui=' + S.ui + ' actors=' + S.actors.length,
    'err=' + (window.__err || []).join(' | ')
  ].join('\n');
  document.body.appendChild(d);
}

load().then(function () {
  try {
    boot();
    if (q.has('diag')) diag();
    window.__ready = true;
  } catch (e) {
    fatal('boot: ' + (e.stack || e.message));
    if (q.has('diag')) diag();
  }
}).catch(function (e) {
  fatal('load: ' + (e.stack || e.message));
});

window.__game = { S: S, setupShot: setupShot, draw: draw, LW: LW, LH: LH };
})();
