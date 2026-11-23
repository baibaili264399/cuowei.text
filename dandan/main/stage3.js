/* ==================================================================
   第三关：拼图（玩家自己拼）
   中间一块白色空缺区，四周散落 6 块碎片；拖进中间对应位置吸附归位。
   6 块全归位 → 两人停住、松松头顶冒感叹号 → 操控丹丹跨过半屏走向他
   → 拼图让位、聊天记录浮现 → 成就「你的礼物我很喜欢」→ 点击 → 黑屏
   ================================================================== */
window.Stage3 = (function () {
  'use strict';

  var W = 1280, H = 720;
  var cv, ctx, fitFn, running = false;

  var IMG = {};
  var FILES = {
    puzzle: 'assets/puzzle.webp',
    chat: 'assets/chat3.webp',
    girl: 'assets/girl_face-right.webp',
    boy: 'assets/boy.webp'
  };

  /* 目标空缺区：3 列 x 2 行 = 6 块 */
  var TZ = { x: 490, y: 46, w: 300, h: 340 };
  var GC = 3, GR = 2;
  var gw = TZ.w / GC, gh = TZ.h / GR;          // 100 x 170

  var st = 'play', T = 0, bg = 0;
  var frags = [], placedN = 0, canCross = false;
  var drag = null;
  var A, B, exT = -1, chatA = 0, achvX = -470, achvT = 0, blackT = 0, doneT = 0;
  var held = { l: false, r: false };
  var keys = {};

  function load() {
    return Promise.all(Object.keys(FILES).map(function (k) {
      return new Promise(function (res) {
        var im = new Image();
        im.onload = function () { IMG[k] = im; res(); };
        im.onerror = function () { res(); };
        im.src = FILES[k];
      });
    }));
  }

  function resetPuzzle() {
    frags = []; placedN = 0; canCross = false; drag = null;
    var homes = [
      { x: 96, y: 56, a: -0.14 }, { x: 96, y: 268, a: 0.10 }, { x: 96, y: 480, a: -0.07 },
      { x: 1074, y: 56, a: 0.13 }, { x: 1074, y: 268, a: -0.11 }, { x: 1074, y: 480, a: 0.06 }
    ];
    var i = 0;
    for (var r = 0; r < GR; r++) {
      for (var c = 0; c < GC; c++) {
        var h = homes[i];
        frags.push({
          c: c, r: r,
          x: h.x, y: h.y, hx: h.x, hy: h.y, ang: h.a,
          tx: TZ.x + c * gw, ty: TZ.y + r * gh,
          placed: false, ret: false
        });
        i++;
      }
    }
  }

  function reset() {
    st = 'play'; T = 0; bg = 0;
    A = { x: 300, dir: 1, spd: 96, anim: 0 };
    B = { x: 880, dir: -1, spd: 96, anim: 0 };
    exT = -1; chatA = 0; achvX = -470; achvT = 0; blackT = 0; doneT = 0;
    resetPuzzle();
  }

  /* ---------------- 输入 ---------------- */
  function toLocal(e) {
    var r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }

  function hitFrag(p) {
    for (var i = frags.length - 1; i >= 0; i--) {
      var f = frags[i];
      if (f.placed) continue;
      if (p.x > f.x && p.x < f.x + gw && p.y > f.y && p.y < f.y + gh) return i;
    }
    return -1;
  }

  function onDown(e) {
    var p = toLocal(e);
    if (st === 'chat' || st === 'achv') { advance(); return; }
    if (st === 'black' || st === 'next') return;

    var i = hitFrag(p);
    if (i >= 0) {
      var f = frags.splice(i, 1)[0];
      frags.push(f);
      drag = { i: frags.length - 1, ox: p.x - f.x, oy: p.y - f.y };
      f.ret = false; f.ang = 0;
      return;
    }
    if (st === 'call') {
      if (p.x < W * 0.5) held.l = true; else held.r = true;
    }
  }

  function onMove(e) {
    if (!drag) return;
    var p = toLocal(e);
    var f = frags[drag.i];
    f.x = p.x - drag.ox;
    f.y = p.y - drag.oy;
  }

  function onUp() {
    held.l = false; held.r = false;
    if (!drag) return;
    var f = frags[drag.i];
    var cx = f.tx + gw / 2, cy = f.ty + gh / 2;
    var mx = f.x + gw / 2, my = f.y + gh / 2;
    if (Math.hypot(mx - cx, my - cy) < 78) {          // 吸附归位
      f.x = f.tx; f.y = f.ty; f.ang = 0; f.placed = true;
      placedN++;
      if (placedN >= frags.length) onPuzzleDone();
    } else {
      f.ret = true;
    }
    drag = null;
  }

  function onPuzzleDone() {
    canCross = true;
    st = 'done'; T = 0; doneT = 0;
  }

  function advance() {
    if (st === 'chat') { st = 'achv'; T = 0; achvT = 0; achvX = -470; return; }
    if (st === 'achv') { st = 'black'; T = 0; blackT = 0; }
  }

  /* ---------------- 更新 ---------------- */
  function update(dt) {
    T += dt; bg += dt;

    for (var i = 0; i < frags.length; i++) {
      var f = frags[i];
      if (!f.ret) continue;
      f.x += (f.hx - f.x) * Math.min(1, dt * 9);
      f.y += (f.hy - f.y) * Math.min(1, dt * 9);
      if (Math.abs(f.x - f.hx) < 1 && Math.abs(f.y - f.hy) < 1) f.ret = false;
    }

    if (st === 'play') {
      walker(A, 150, 640, dt);
      walker(B, 690, 1140, dt);
    } else if (st === 'done') {
      A.spd *= Math.pow(0.02, dt); B.spd *= Math.pow(0.02, dt);
      walker(A, 150, 640, dt); walker(B, 690, 1140, dt);
      doneT += dt;
      if (doneT > 0.6) { exT = 0; st = 'call'; T = 0; }
    } else if (st === 'call') {
      if (exT >= 0) exT += dt;
      var v = 0;
      if (held.l || keys['a'] || keys['arrowleft']) v -= 1;
      if (held.r || keys['d'] || keys['arrowright']) v += 1;
      A.x += v * 215 * dt;
      var right = canCross ? 1180 : 640;               // 拼好之前过不去
      A.x = Math.max(120, Math.min(right, A.x));
      A.anim += Math.abs(v) * dt * 8;
      if (Math.abs(A.x - B.x) < 76) { st = 'meet'; T = 0; chatA = 0; }
    } else if (st === 'meet') {
      chatA = Math.min(1, chatA + dt * 2.6);
      if (chatA >= 1) { st = 'chat'; T = 0; }
    } else if (st === 'chat') {
      if (T > 3.4) { st = 'achv'; T = 0; achvT = 0; achvX = -470; }
    } else if (st === 'achv') {
      achvT += dt;
      achvX += (34 - achvX) * Math.min(1, dt * 6);
    } else if (st === 'black') {
      blackT += dt;
      if (blackT > 0.7 && window.Story4 && !window.__s4go) {
        window.__s4go = 1;
        running = false;
        window.Story4.start({ cv: cv, ctx: ctx, fit: fitFn });
      }
    }
  }

  function walker(o, lo, hi, dt) {
    o.x += o.dir * o.spd * dt;
    o.anim += dt * (o.spd / 96) * 7;
    if (o.x < lo) { o.x = lo; o.dir = 1; }
    if (o.x > hi) { o.x = hi; o.dir = -1; }
  }

  /* ---------------- 绘制 ---------------- */
  function draw() {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, W, H);
    drawBackdrop();
    drawTargetArea();
    drawFrags();
    drawFloor();
    if (st !== 'meet' && st !== 'chat' && st !== 'achv' && st !== 'black') drawChars();
    if (chatA > 0) drawChat(chatA);
    if (st === 'achv' || (st === 'black' && blackT < 0.4)) drawAchv();
    if (st === 'black' || st === 'next') drawBlack();   // 只有黑，没有字
    drawHint();
  }

  function drawBackdrop() {
    var g = ctx.createRadialGradient(W / 2, 200, 40, W / 2, 240, 520);
    g.addColorStop(0, 'rgba(70,96,150,.20)');
    g.addColorStop(1, 'rgba(10,10,18,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = .055;
    ctx.strokeStyle = '#9fc4ff';
    ctx.lineWidth = 1;
    for (var x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (var y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
  }

  /* 中间的空缺区：留白，等玩家把碎片拖进来 */
  function drawTargetArea() {
    ctx.save();
    ctx.fillStyle = '#efece2';
    ctx.fillRect(TZ.x, TZ.y, TZ.w, TZ.h);
    ctx.strokeStyle = 'rgba(90,74,58,.26)';
    ctx.lineWidth = 2;
    for (var c = 1; c < GC; c++) {
      ctx.beginPath(); ctx.moveTo(TZ.x + c * gw, TZ.y); ctx.lineTo(TZ.x + c * gw, TZ.y + TZ.h); ctx.stroke();
    }
    for (var r = 1; r < GR; r++) {
      ctx.beginPath(); ctx.moveTo(TZ.x, TZ.y + r * gh); ctx.lineTo(TZ.x + TZ.w, TZ.y + r * gh); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(TZ.x - 2, TZ.y - 2, TZ.w + 4, TZ.h + 4);
    if (placedN < frags.length) {
      ctx.fillStyle = 'rgba(210,226,255,.55)';
      ctx.font = '600 15px "PingFang SC",system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('还差 ' + (frags.length - placedN) + ' 块', TZ.x + TZ.w / 2, TZ.y - 12);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  function drawFrags() {
    var im = IMG.puzzle;
    if (!im) return;
    var sw = im.width / GC, sh = im.height / GR;
    for (var i = 0; i < frags.length; i++) {
      var f = frags[i];
      if (!f.placed) continue;
      ctx.drawImage(im, f.c * sw, f.r * sh, sw, sh, f.tx, f.ty, gw, gh);
    }
    for (var j = 0; j < frags.length; j++) {
      var g2 = frags[j];
      if (g2.placed) continue;
      var lifted = (drag && drag.i === j);
      ctx.save();
      ctx.translate(g2.x + gw / 2, g2.y + gh / 2);
      ctx.rotate(g2.ang);
      if (lifted || g2.ret) {
        ctx.shadowColor = 'rgba(0,0,0,.55)';
        ctx.shadowBlur = lifted ? 26 : 12;
        ctx.shadowOffsetY = lifted ? 14 : 6;
      }
      ctx.drawImage(im, g2.c * sw, g2.r * sh, sw, sh, -gw / 2, -gh / 2, gw, gh);
      ctx.restore();
      ctx.save();
      ctx.translate(g2.x + gw / 2, g2.y + gh / 2);
      ctx.rotate(g2.ang);
      ctx.strokeStyle = lifted ? 'rgba(255,226,150,.95)' : 'rgba(210,230,255,.35)';
      ctx.lineWidth = lifted ? 3 : 2;
      ctx.strokeRect(-gw / 2, -gh / 2, gw, gh);
      ctx.restore();
    }
  }

  function drawFloor() {
    ctx.save();
    var g = ctx.createLinearGradient(0, 600, 0, H);
    g.addColorStop(0, 'rgba(60,80,130,.35)');
    g.addColorStop(1, 'rgba(12,12,22,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 600, W, H - 600);
    ctx.strokeStyle = 'rgba(140,180,255,.18)';
    ctx.beginPath(); ctx.moveTo(0, 660); ctx.lineTo(W, 660); ctx.stroke();
    ctx.restore();
  }

  function drawChars() {
    var gy = 676;
    var bh = 124, bw = bh * (135 / 202);
    ctx.save();
    ctx.globalAlpha = .28; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(B.x, gy + 2, 26, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    var bobB = Math.abs(Math.sin(B.anim)) * 3;
    if (IMG.boy) {
      ctx.save();
      if (B.dir < 0) {
        ctx.translate(B.x, gy);
        ctx.scale(-1, 1);
        ctx.drawImage(IMG.boy, 0, 0, 135, 202, -bw / 2, -bh - bobB, bw, bh);
      } else {
        ctx.drawImage(IMG.boy, 0, 0, 135, 202, B.x - bw / 2, gy - bh - bobB, bw, bh);
      }
      ctx.restore();
    }
    var gh2 = 120, gw2 = gh2 * (125 / 202);
    ctx.save();
    ctx.globalAlpha = .28; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(A.x, gy + 2, 24, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    var bobA = Math.abs(Math.sin(A.anim)) * 3;
    if (IMG.girl) {
      var faceL = (A.x > B.x);
      ctx.save();
      ctx.translate(A.x, gy - bobA);
      if (faceL) ctx.scale(-1, 1);
      ctx.drawImage(IMG.girl, 4 * 125, 0, 125, 202, -gw2 / 2, -gh2, gw2, gh2);
      ctx.restore();
    }
    if (exT >= 0) drawExclaim(B.x, gy - bh - 26);
  }

  function drawExclaim(x, y) {
    var pop = Math.min(1, exT / 0.35);
    var e = 1 - Math.pow(1 - pop, 3);
    var s = 0.5 + 0.5 * e;
    var bob = Math.sin(bg * 7) * 5;
    ctx.save();
    ctx.translate(x, y + bob - 26);
    ctx.scale(s, s);
    ctx.globalAlpha = Math.min(1, exT * 3);
    ctx.fillStyle = '#fff6dd';
    ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-7, 24); ctx.lineTo(7, 24); ctx.lineTo(0, 38);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a1c14';
    ctx.font = '900 40px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, -1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  function drawChat(a) {
    var im = IMG.chat;
    if (!im) return;
    var h = 470 * (0.4 + 0.6 * a), w = h * (im.width / im.height);
    var cx = W / 2, cy = TZ.y + TZ.h / 2;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(6,6,12,.58)';
    ctx.fillRect(0, 0, W, H);
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    roundRect(cx - w / 2 - 10, cy - h / 2 - 10, w + 20, h + 20, 16);
    ctx.fillStyle = '#f4f0e6'; ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    roundRect(cx - w / 2, cy - h / 2, w, h, 11);
    ctx.save(); ctx.clip();
    ctx.drawImage(im, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
    ctx.restore();
  }

  function drawAchv() {
    var x = achvX, y = H - 132, w = 400, h = 96;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
    roundRect(x, y, w, h, 14);
    ctx.fillStyle = 'rgba(28,22,16,.96)'; ctx.fill();
    ctx.restore();
    roundRect(x, y, w, h, 14);
    ctx.strokeStyle = 'rgba(255,214,110,.9)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#ffd76e';
    ctx.beginPath();
    ctx.moveTo(x + 28, y + 24); ctx.lineTo(x + 58, y + 24);
    ctx.lineTo(x + 54, y + 48); ctx.lineTo(x + 32, y + 48);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(x + 37, y + 48, 12, 11);
    ctx.fillRect(x + 29, y + 59, 28, 7);
    ctx.fillStyle = 'rgba(255,214,110,.55)';
    ctx.font = '600 15px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('完成成就', x + 80, y + 34);
    ctx.fillStyle = '#fff2cc';
    ctx.font = '700 26px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('你的礼物我很喜欢', x + 80, y + 68);
    ctx.restore();
  }

  function drawBlack() {
    var a = st === 'next' ? 1 : Math.min(1, blackT / 0.8);
    ctx.fillStyle = 'rgba(4,4,8,' + a + ')';
    ctx.fillRect(0, 0, W, H);
    if (st === 'next' || blackT > 1.0) {
      var f = st === 'next' ? 1 : Math.min(1, (blackT - 1.0) / 0.6);
      ctx.save();
      ctx.globalAlpha = f;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f2e8cf';
      ctx.font = '700 54px "PingFang SC",system-ui,sans-serif';
      ctx.fillText('待续', W / 2, H / 2 - 20);
      ctx.font = '600 22px "PingFang SC",system-ui,sans-serif';
      ctx.fillStyle = 'rgba(242,232,207,.55)';
      ctx.fillText('下一个场景还在做', W / 2, H / 2 + 40);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }
  }

  function drawHint() {
    var txt = '';
    if (st === 'play') txt = '把碎片拖进中间的空格';
    else if (st === 'call') txt = '按左右（或点屏幕左/右半边）走向松松';
    else if (st === 'chat' || st === 'achv') txt = '点一下继续';
    if (!txt) return;
    ctx.save();
    ctx.globalAlpha = .62 + Math.sin(bg * 3) * .12;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#cfe2ff';
    ctx.font = '600 19px "PingFang SC",system-ui,sans-serif';
    ctx.fillText(txt, W / 2, H - 26);
    ctx.textAlign = 'left';
    ctx.restore();
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

  /* ---------------- 启动 ---------------- */
  function start(opts) {
    if (running) return;
    cv = opts.cv; ctx = opts.ctx; fitFn = opts.fit;
    reset();
    running = true;
    if (opts.state) st = opts.state;
    if (st === 'chat' || st === 'achv') chatA = 1;
    if (st === 'done' || st === 'call' || st === 'meet' || st === 'chat' || st === 'achv') {
      frags.forEach(function (f) { f.placed = true; f.x = f.tx; f.y = f.ty; f.ang = 0; });
      placedN = frags.length; canCross = true;
      if (exT < 0) exT = 1;
    }
    load().then(function () {
      cv.addEventListener('pointerdown', onDown);
      cv.addEventListener('pointermove', onMove);
      cv.addEventListener('pointerup', onUp);
      cv.addEventListener('pointercancel', onUp);
      window.addEventListener('keydown', function (e) { keys[e.key.toLowerCase()] = true; });
      window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
      if (opts.sim > 0) {
        for (var i = 0; i < opts.sim; i++) {
          if (opts.state === 'call') keys['d'] = i > opts.sim * 0.4;
          update(1 / 60);
        }
        var paint = function () { if (fitFn) fitFn(); draw(); };
        paint(); [80, 250, 700].forEach(function (ms) { setTimeout(paint, ms); });
        window.addEventListener('resize', paint);
        window.__stage3Ready = true;
        return;
      }
      var last = 0;
      function loop(ts) {
        if (!running) return;
        if (!last) last = ts;
        var dt = Math.min(0.05, (ts - last) / 1000); last = ts;
        update(dt);
        draw();
        requestAnimationFrame(loop);
      }
      requestAnimationFrame(loop);
      window.__stage3Ready = true;
    });
  }

  return {
    start: start,
    isRunning: function () { return running; },
    stop: function () { running = false; },
    state: function () { return { st: st, placed: placedN, total: frags.length }; }
  };
})();
