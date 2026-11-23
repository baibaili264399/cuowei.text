/* ==================================================================
   第三关之后：米线店 → 海边
   店门口：松松请你吃米线，两人先后走进店里（渐隐）
   海边：换成操控松松，丹丹头顶感叹号；走近触发告白 4 句 → 选项「好」
        → 回忆视频铺开、两人被挤到两侧，右上角时钟狂转、
          左上角日历从 8/29 一路撕到 11/27
   ================================================================== */
window.Story4 = (function () {
  'use strict';

  var W = 1280, H = 720;
  var cv, ctx, fitFn, running = false;

  var IMG = {};
  var FILES = {
    shop: 'assets/shop.webp',
    beach: 'assets/beach.webp',
    girl: 'assets/girl_face-right.webp',
    boy: 'assets/boy.webp'
  };

  var st = 'shop', T = 0, bg = 0, fade = 0;
  var A, B;                 // A = 松松(男)，B = 丹丹(女)
  var line = 0, lineT = 0, shown = 0;
  var mode = 'boy';         // 当前玩家操控谁：'boy' / 'girl'
  var exT = -1;
  var held = { l: false, r: false }, keys = {};
  var video = null, vidOk = false, vidT = 0;
  var clockT = 0, calDay = 0, calT = 0, cards = [];
  var fadeOut = 0;
  var FINAL = { t: 0, shown: 0, achvX: -520 };
  var FINAL_LINES = [
    '恭喜你通关了游戏',
    '丹丹，如果你原谅了我',
    '并且愿意继续和我分享日常',
    '请回复：好',
    '',
    '我这个人有一个优点',
    '——想到了就回去做'
  ];
  var FINAL_TEXT = FINAL_LINES.join('\n');
  var achvX = -470;

  /* 米线店对话 */
  var SHOP_LINES = [
    '我记忆里你喜欢吃米线吧',
    '能陪我一起吃碗米线吗',
    '再陪我聊聊'
  ];
  /* 海边告白 */
  var TALK = [
    '丹丹，我想和你和好',
    '但是我们并没有吵架',
    '我会记住你的喜好的，我听你的话',
    '我在改了，我不熬夜了',
    '我整理干净，按时吃饭',
    '我都听你的，我们和好吧。'
  ];
  /* 日历：8/29 → 11/27 */
  var CAL = [];
  (function () {
    var md = [31, 30, 31];
    for (var m = 8; m <= 11; m++) {
      var last = (m === 8 ? 31 : m === 9 ? 30 : m === 10 ? 31 : 27);
      var first = (m === 8 ? 29 : 1);
      for (var d = first; d <= last; d++) CAL.push([m, d]);
    }
  })();

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

  function _rnd(a, b) { return a + Math.random() * (b - a); }

  function makeVideo() {
    if (video) return;
    video = document.createElement('video');
    video.src = 'assets/memory.mp4';
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'auto';
    video.addEventListener('loadeddata', function () { vidOk = true; });
    video.addEventListener('error', function () { vidOk = false; });
    video.load();
  }

  function reset() {
    st = 'shop'; T = 0; bg = 0; fade = 0; line = 0; lineT = 0; shown = 0;
    mode = 'boy'; exT = -1; vidT = 0; clockT = 0; calDay = 0; calT = 0;
    cards = []; achvX = -470;
    A = { x: 520, y: 0, dir: 'down', anim: 0, a: 1 };    // 松松
    B = { x: 1140, y: 0, dir: 'down', anim: 0, a: 1 };   // 丹丹（离门口远一点，要走两三秒）
    makeVideo();
  }

  /* ---------------- 输入 ---------------- */
  function toLocal(e) {
    var r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }

  function onDown(e) {
    var p = toLocal(e);

    if (st === 'choice') {
      if (p.x > W / 2 - 190 && p.x < W / 2 + 190 && p.y > 286 && p.y < 392) startMemory();
      return;
    }
    if (st === 'memory' || st === 'fadeout') return;
    if (st === 'wait') { st = 'final'; T = 0; FINAL.t = 0; FINAL.shown = 0; FINAL.achvX = -560; return; }
    if (st === 'final') return;
    if (st === 'end') return;
    if (st === 'shopTalk' || st === 'beachTalk') { advanceLine(); return; }
    if (st === 'shopWalk' || st === 'shopGo' || st === 'beachCall') {
      if (p.x < W * 0.5) held.l = true; else held.r = true;
    }
  }
  function onUp() { held.l = false; held.r = false; }

  function advanceLine() {
    var arr = (st === 'shopTalk') ? SHOP_LINES : TALK;
    if (line < arr.length - 1) { line++; lineT = 0; return; }
    if (st === 'shopTalk') { st = 'shopWalk'; T = 0; line = 0; }
    else { st = 'choice'; T = 0; }
  }

  function startMemory() {
    st = 'memory'; T = 0; vidT = 0; clockT = 0; calDay = 0; calT = 0; cards = [];
    if (video) {
      try { video.currentTime = 0; video.play().catch(function () {}); } catch (err) {}
    }
  }

  /* ---------------- 更新 ---------------- */
  function update(dt) {
    T += dt; bg += dt;
    if (st === 'shop' && T > 0.6) { st = 'shopTalk'; line = 0; lineT = 0; }

    if (st === 'shopTalk' || st === 'beachTalk') {
      lineT += dt;
      var arr = (st === 'shopTalk') ? SHOP_LINES : TALK;
      shown = Math.min(arr[line].length, Math.floor(lineT * 22));
      if (lineT > 2.6 + arr[line].length * 0.055) advanceLine();
    }

    /* 米线店：松松先走进店里（渐隐） */
    if (st === 'shopWalk') {
      var tx = 700;                      // 店门中心
      A.x += (tx - A.x) * Math.min(1, dt * 2.2);
      if (T > 0.7) A.a = Math.max(0, 1 - (T - 0.7) / 0.9);
      if (A.a <= 0) { st = 'shopGo'; T = 0; }
    }
    /* 然后玩家操控丹丹走进去 */
    if (st === 'shopGo') {
      var v = 0;
      if (held.l || keys['a'] || keys['arrowleft']) v -= 1;
      if (held.r || keys['d'] || keys['arrowright']) v += 1;
      var w1 = 0;
      if (keys['w'] || keys['arrowup']) w1 -= 1;
      if (keys['s'] || keys['arrowdown']) w1 += 1;
      B.x += v * 220 * dt;
      B.y += w1 * 130 * dt;
      B.x = Math.max(200, Math.min(1180, B.x));
      B.y = Math.max(-26, Math.min(30, B.y));
      B.anim += (Math.abs(v) + Math.abs(w1)) * dt * 8;
      faceOf(B, v, w1);
      if (Math.abs(B.x - 700) < 46 && T > 0.5) {   // 走到门口就进去
        B.a = Math.max(0, B.a - dt * 1.6);
        if (B.a <= 0) { st = 'fade'; T = 0; fade = 0; }
      }
    }
    if (st === 'fade') {
      fade = Math.min(1, T / 0.8);
      if (T > 1.1) {
        st = 'beach'; T = 0; fade = 1;
        A = { x: 150, y: 0, dir: 'right', anim: 0, a: 1 };   // 男在最左
        B = { x: 640, y: 0, dir: 'left', anim: 0, a: 1 };    // 女在中间
        exT = 0; mode = 'boy';
      }
    }
    if (st === 'beach') {
      fade = Math.max(0, fade - dt * 1.2);
      if (fade <= 0.01) { st = 'beachCall'; T = 0; }
    }
    if (st === 'beachCall') {
      var v2 = 0;
      if (held.l || keys['a'] || keys['arrowleft']) v2 -= 1;
      if (held.r || keys['d'] || keys['arrowright']) v2 += 1;
      var w2 = 0;
      if (keys['w'] || keys['arrowup']) w2 -= 1;
      if (keys['s'] || keys['arrowdown']) w2 += 1;
      A.x += v2 * 220 * dt;
      A.y += w2 * 130 * dt;
      A.x = Math.max(80, Math.min(1180, A.x));
      A.y = Math.max(-26, Math.min(30, A.y));
      A.anim += (Math.abs(v2) + Math.abs(w2)) * dt * 8;
      faceOf(A, v2, w2);
      if (Math.abs(A.x - B.x) < 92) { st = 'beachTalk'; T = 0; line = 0; lineT = 0; }
    }
    if (exT >= 0) exT += dt;

    /* 回忆段 */
    if (st === 'memory') {
      vidT += dt;
      clockT += dt;
      /* 日历：约 26 秒内撕完 90 张，然后停住 */
      var totalDays = CAL.length;
      var want = Math.min(totalDays, Math.floor(vidT * (totalDays / 20)));   // 20 秒撕完，和视频同时
      while (calDay < want) {
        cards.push({
          m: CAL[calDay][0], d: CAL[calDay][1],
          x: 46 + Math.random() * 40, y: 40,                 // 从日历右侧脱手，别糊在当页上
          vx: 70 + Math.random() * 120, vy: _rnd(-40, 30),
          rot: _rnd(-.3, .3), vr: _rnd(-4, 4), t: 0
        });
        calDay++;
      }
      for (var i = cards.length - 1; i >= 0; i--) {
        var c = cards[i];
        c.t += dt; c.vy += 900 * dt;
        c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
        if (c.t > 1.5) cards.splice(i, 1);
      }
      if (video && !video.paused) {
        if (video.ended) { st = 'fadeout'; T = 0; fadeOut = 0; }
      } else if (vidT > 2.5 && video) {
        try { video.play().catch(function () {}); } catch (e) {}
      }
      if (vidT > 20.4) { st = 'fadeout'; T = 0; fadeOut = 0; }
    }
    /* 画面、视频、日历一起暗下去 */
    if (st === 'fadeout') {
      fadeOut = Math.min(1, T / 1.6);
      if (T > 1.9) { st = 'wait'; T = 0; fadeOut = 1; }
    }
    /* 全黑，等玩家点一下 */
    if (st === 'final') {
      FINAL.t += dt;
      FINAL.shown = Math.floor(Math.max(0, FINAL.t - 0.5) * 16);
      var tx = 30 - 560 * Math.min(1, Math.max(0, (FINAL.t - 0.1) / 0.9));
      FINAL.achvX += (30 - FINAL.achvX) * Math.min(1, dt * 5);
    }
  }

  /* ---------------- 绘制 ---------------- */
  function draw() {
    if (st === 'memory' || st === 'fadeout' || st === 'wait' || st === 'final' || st === 'end') drawMemory();
    else drawScenes();
    if (st === 'fade' || (st === 'beach' && fade > 0)) {
      ctx.fillStyle = 'rgba(4,4,6,' + fade + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawScenes() {
    var isShop = (st === 'shop' || st === 'shopTalk' || st === 'shopWalk' || st === 'shopGo');
    var im = isShop ? IMG.shop : IMG.beach;
    if (im) {
      if (isShop) {
        // 铺满并居中裁切
        var s = Math.max(W / im.width, H / im.height);
        var dw = im.width * s, dh = im.height * s;
        ctx.drawImage(im, (W - dw) / 2, (H - dh) / 2 - 40, dw, dh);
      } else {
        ctx.drawImage(im, 0, 0, W, H);
      }
    }
    var gy = isShop ? 640 : 660;
    // 她
    if (B.a > 0) {
      var gh = isShop ? 150 : 132, gw = gh * (125 / 202);
      var gf = frameOf(B.dir);
      ctx.save();
      ctx.globalAlpha = B.a;
      ctx.translate(B.x, gy + (B.y || 0));
      if (gf.flip) ctx.scale(-1, 1);
      if (IMG.girl) ctx.drawImage(IMG.girl, gf.idx * 125, 0, 125, 202, -gw / 2, -gh, gw, gh);
      ctx.restore();
      if (exT >= 0 && !isShop) drawExclaim(B.x, gy + (B.y || 0) - gh - 24);
    }
    // 他
    if (A.a > 0) {
      var bh = isShop ? 156 : 136, bw = bh * (135 / 202);
      var af = frameOf(A.dir);
      ctx.save();
      ctx.globalAlpha = A.a;
      ctx.translate(A.x, gy + (A.y || 0));
      if (af.flip) ctx.scale(-1, 1);
      if (IMG.boy) ctx.drawImage(IMG.boy, af.idx * 135, 0, 135, 202, -bw / 2, -bh, bw, bh);
      ctx.restore();
    }
    // 对话
    if (st === 'shopTalk' || st === 'beachTalk') {
      var arr = (st === 'shopTalk') ? SHOP_LINES : TALK;
      drawLine(isShop ? '松松' : '松松', arr[line].slice(0, shown));
    } else if (st === 'shopWalk' || st === 'shopGo') {
      drawBubble('走进店里吧');
    } else if (st === 'beachCall') {
      drawBubble('走过去找他（按左右）');
    } else if (st === 'choice') {
      drawChoice();
    }
  }

  /* 侧向优先，其次上下：按下=正面、按上=背面 */
  function faceOf(o, vx, vy) {
    if (vx > 0) o.dir = 'right';
    else if (vx < 0) o.dir = 'left';
    else if (vy > 0) o.dir = 'down';
    else if (vy < 0) o.dir = 'up';
  }

  /* 四方向取帧：往下=正面(0)、往上=背面(2)、左右=侧面(4)，朝左才镜像 */
  function frameOf(dir) {
    if (dir === 'up') return { idx: 2, flip: false };
    if (dir === 'left') return { idx: 4, flip: true };
    if (dir === 'right') return { idx: 4, flip: false };
    return { idx: 0, flip: false };
  }

  function drawLine(who, text) {
    var bx = 110, by = H - 104, bw = W - 220, bh = 84;
    ctx.save();
    roundRect(bx, by, bw, bh, 14);
    ctx.fillStyle = 'rgba(20,14,12,.88)'; ctx.fill();
    ctx.strokeStyle = 'rgba(247,239,210,.75)'; ctx.lineWidth = 3; ctx.stroke();
    var nw = 104;
    roundRect(bx + 18, by + (bh - 42) / 2, nw, 42, 9);
    ctx.fillStyle = '#e8b23c'; ctx.fill();
    ctx.fillStyle = '#241a12';
    ctx.font = '700 23px "PingFang SC",system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(who, bx + 18 + nw / 2, by + bh / 2 - 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f7efd2';
    ctx.font = '600 29px "PingFang SC",system-ui,sans-serif';
    ctx.fillText(text, bx + 18 + nw + 26, by + bh / 2 - 1);
    ctx.restore();
  }

  function drawBubble(txt) {
    ctx.save();
    ctx.globalAlpha = .72 + Math.sin(bg * 3) * .12;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff3d6';
    ctx.font = '600 20px "PingFang SC",system-ui,sans-serif';
    ctx.fillText(txt, W / 2, H - 40);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawChoice() {
    ctx.save();
    ctx.fillStyle = 'rgba(8,6,10,.55)';
    ctx.fillRect(0, 0, W, H);
    var bw = 380, bh = 96, bx = W / 2 - bw / 2, by = 290;
    roundRect(bx, by, bw, bh, 16);
    ctx.fillStyle = 'rgba(30,24,18,.95)'; ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,110,.95)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = '#fff2cc';
    ctx.font = '700 42px "PingFang SC",system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('好', W / 2, by + bh / 2);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  function drawExclaim(x, y) {
    var pop = Math.min(1, exT / 0.35);
    var e = 1 - Math.pow(1 - pop, 3);
    var s = 0.5 + 0.5 * e;
    var bob = Math.sin(bg * 7) * 5;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(s, s);
    ctx.globalAlpha = Math.min(1, exT * 3);
    ctx.fillStyle = '#fff6dd';
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, 20); ctx.lineTo(6, 20); ctx.lineTo(0, 32);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a1c14';
    ctx.font = '900 34px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, -1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  /* ---------------- 回忆段：视频 + 时钟 + 日历 ---------------- */
  function drawMemory() {
    /* 背景还是海边 */
    if (IMG.beach) ctx.drawImage(IMG.beach, 0, 0, W, H);
    ctx.fillStyle = 'rgba(10,8,22,.42)';
    ctx.fillRect(0, 0, W, H);

    /* 视频从两人之间由小长到大 */
    var grow = Math.min(1, vidT / 3.2);
    var ge = 1 - Math.pow(1 - grow, 3);
    var vwMax = 380, vhMax = vwMax * (800 / 360);
    if (vhMax > H - 90) { vhMax = H - 90; vwMax = vhMax * (360 / 800); }
    var vw = vwMax * (0.16 + 0.84 * ge);
    var vh = vhMax * (0.16 + 0.84 * ge);
    var vx = W / 2 - vw / 2, vy = H / 2 - vh / 2;
    ctx.save();
    ctx.globalAlpha = Math.min(1, vidT * 3);
    if (vidOk && video && video.readyState >= 2) {
      ctx.save();
      roundRect(vx - 5, vy - 5, vw + 10, vh + 10, 12);
      ctx.fillStyle = 'rgba(10,8,18,.9)'; ctx.fill();
      ctx.clip();
      ctx.drawImage(video, vx, vy, vw, vh);
      ctx.restore();
    } else {
      roundRect(vx, vy, vw, vh, 10);
      ctx.fillStyle = 'rgba(14,12,22,.9)'; ctx.fill();
    }
    ctx.restore();

    /* 两人被挤到两侧 */
    var gh = 120, gw = gh * (125 / 202);
    if (IMG.girl) ctx.drawImage(IMG.girl, 4 * 125, 0, 125, 202, 150 - gw / 2, H - 150, gw, gh);
    var bh = 124, bw = bh * (135 / 202);
    if (IMG.boy) ctx.drawImage(IMG.boy, 0, 0, 135, 202, W - 150 - bw / 2, H - 155, bw, gh);

    /* 钟从右边滑进来、日历从左边滑进来 */
    var ck = Math.min(1, Math.max(0, (vidT - 1.1) / 0.85));
    var cke = 1 - Math.pow(1 - ck, 3);
    var cal = Math.min(1, Math.max(0, (vidT - 1.35) / 0.85));
    var cale = 1 - Math.pow(1 - cal, 3);
    drawClock(W - 150 + (1 - cke) * (W * 0.5), 118, cke);
    drawCalendar(54 - (1 - cale) * (W * 0.45), 62, cale);

    /* 三者一起暗下去 */
    if (fadeOut > 0) {
      ctx.fillStyle = 'rgba(4,4,8,' + fadeOut + ')';
      ctx.fillRect(0, 0, W, H);
    }
    if (st === 'wait') drawWait();
    if (st === 'final' || st === 'end') drawFinal();
  }

  /* 右上角：疯狂转的钟 */
  function drawClock(cx, cy, alpha) {
    var r = 62;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.fillStyle = 'rgba(20,18,28,.72)';
    ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#e8e2d0'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    // 刻度
    for (var i = 0; i < 12; i++) {
      var a = i * Math.PI / 6;
      ctx.strokeStyle = 'rgba(232,226,208,.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10));
      ctx.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
      ctx.stroke();
    }
    var spin = clockT * 34;                    // 疯狂转
    var hA = spin * 0.5 - Math.PI / 2;
    var mA = spin * 6 - Math.PI / 2;
    ctx.strokeStyle = '#ff7a8a'; ctx.lineWidth = 7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(hA) * r * 0.5, cy + Math.sin(hA) * r * 0.5); ctx.stroke();
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(mA) * r * 0.78, cy + Math.sin(mA) * r * 0.78); ctx.stroke();
    ctx.fillStyle = '#e8e2d0';
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* 左上角：日历一页页撕下来 */
  function drawCalendar(bx, by, alpha) {
    var cw = 132, ch = 152;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    var cur = calDay < CAL.length ? CAL[calDay] : CAL[CAL.length - 1];
    // 底板
    roundRect(bx - 8, by - 34, cw + 16, ch + 42, 12);
    ctx.fillStyle = 'rgba(22,18,26,.85)'; ctx.fill();
    ctx.strokeStyle = 'rgba(232,226,208,.3)'; ctx.lineWidth = 2; ctx.stroke();
    // 装订
    ctx.strokeStyle = '#8f8a7c'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(bx, by - 18); ctx.lineTo(bx + cw, by - 18); ctx.stroke();
    // 当前页
    roundRect(bx, by, cw, ch, 8);
    ctx.fillStyle = '#f4efe2'; ctx.fill();
    ctx.fillStyle = '#c8324a';
    ctx.fillRect(bx, by, cw, 34);
    ctx.fillStyle = '#fff';
    ctx.font = '700 20px "PingFang SC",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cur[0] + ' 月', bx + cw / 2, by + 24);
    ctx.fillStyle = '#2a2028';
    ctx.font = '700 62px "PingFang SC",system-ui,sans-serif';
    ctx.fillText(String(cur[1]), bx + cw / 2, by + 112);
    ctx.textAlign = 'left';
    ctx.restore();

    // 飘落的纸
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var a = Math.max(0, 1 - c.t / 1.5);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(bx + cw / 2 + c.x, by + ch / 2 + c.y);
      ctx.rotate(c.rot);
      roundRect(-34, -44, 68, 88, 5);
      ctx.fillStyle = '#efe9db'; ctx.fill();
      ctx.fillStyle = 'rgba(200,50,74,.85)';
      ctx.fillRect(-34, -44, 68, 16);
      ctx.fillStyle = '#3a3038';
      ctx.font = '700 26px "PingFang SC",system-ui,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.m + '/' + c.d, 0, 22);
      ctx.textAlign = 'left';
      ctx.restore();
    }
  }

  function drawEndCard() {
    ctx.save();
    ctx.fillStyle = 'rgba(6,5,10,.86)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f2e8cf';
    ctx.font = '700 46px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('11 月 27 日', W / 2, H / 2 - 40);
    ctx.font = '600 22px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(242,232,207,.6)';
    ctx.fillText('故事还长', W / 2, H / 2 + 26);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  /* 点一下提示 */
  function drawWait() {
    ctx.save();
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.35 + Math.sin(bg * 2.6) * 0.2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#cfd6e8';
    ctx.font = '600 20px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('点一下屏幕', W / 2, H / 2);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  /* 真·像素字：先在 1/4 画布上写，再关掉平滑放大回来 */
  var pxBuf = null, pxCache = '', pxKey = '';
  function drawPixelText(text, cx, topY, size, color) {
    if (!pxBuf) { pxBuf = document.createElement('canvas'); }
    var w = W, h = H, k = 4;                       // 缩小到 1/4 再放大
    pxBuf.width = Math.ceil(w / k); pxBuf.height = Math.ceil(h / k);
    var bc = pxBuf.getContext('2d');
    bc.clearRect(0, 0, pxBuf.width, pxBuf.height);
    bc.save();
    bc.scale(1 / k, 1 / k);
    bc.textAlign = 'center';
    bc.textBaseline = 'middle';
    var lines = text.split('\n');
    var lh = size * 1.50;
    for (var i = 0; i < lines.length; i++) {
      if (!lines[i]) continue;
      bc.font = '900 ' + size + 'px "PingFang SC","Microsoft YaHei",system-ui,sans-serif';
      bc.fillStyle = color;
      bc.fillText(lines[i], cx, topY + i * lh);
    }
    bc.restore();
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pxBuf, 0, 0, pxBuf.width, pxBuf.height, 0, 0, w, h);
    ctx.restore();
  }

  function drawFinal() {
    ctx.save();
    ctx.fillStyle = '#04040a';
    ctx.fillRect(0, 0, W, H);

    /* 成就：90 天，并且不止 90 天 */
    var ax = FINAL.achvX, ay = 74;
    if (ax > -560) {
      var aw = 470, ah = 104;
      ctx.save();
      ctx.shadowColor = 'rgba(255,214,110,.35)'; ctx.shadowBlur = 26;
      roundRect(ax, ay, aw, ah, 14);
      ctx.fillStyle = 'rgba(26,20,14,.96)'; ctx.fill();
      ctx.restore();
      roundRect(ax, ay, aw, ah, 14);
      ctx.strokeStyle = 'rgba(255,214,110,.95)'; ctx.lineWidth = 4; ctx.stroke();
      // 奖杯
      ctx.fillStyle = '#ffd76e';
      ctx.beginPath();
      ctx.moveTo(ax + 26, ay + 26); ctx.lineTo(ax + 60, ay + 26);
      ctx.lineTo(ax + 56, ay + 54); ctx.lineTo(ax + 30, ay + 54);
      ctx.closePath(); ctx.fill();
      ctx.fillRect(ax + 37, ay + 54, 12, 12);
      ctx.fillRect(ax + 28, ay + 66, 30, 8);
      ctx.fillStyle = 'rgba(255,214,110,.6)';
      ctx.font = '600 16px "PingFang SC",system-ui,sans-serif';
      ctx.fillText('完成成就', ax + 82, ay + 36);
      ctx.fillStyle = '#fff2cc';
      ctx.font = '700 30px "PingFang SC",system-ui,sans-serif';
      ctx.fillText('90 天，并且不止 90 天', ax + 82, ay + 76);
    }

    /* 逐字出现的像素大字 */
    var shown = FINAL_TEXT.slice(0, FINAL.shown);
    if (shown) {
      drawPixelText(shown, W / 2, H * 0.285, 50, '#ffe9a8');
    }

    /* 光标 */
    if (FINAL.shown < FINAL_TEXT.length && Math.floor(FINAL.t * 2) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,233,168,.7)';
      ctx.fillRect(W / 2 - 4, H * 0.215 + 50 * 1.5 * 5, 8, 34);
    }
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
    if (st === 'beachTalk' || st === 'choice' || st === 'beachCall') {
      mode = 'boy';
      A.x = (st === 'beachCall') ? 150 : 560;
      A.dir = 'right'; B.dir = 'left';
      B.x = 640; exT = 1; line = 0; lineT = 0;
      shown = (st === 'beachTalk') ? 99 : 0;
      fade = 0;
    }
    if (st === 'memory' || st === 'end') {
      vidT = 0; calDay = 0; clockT = 2;
    }
    load().then(function () {
      cv.addEventListener('pointerdown', onDown);
      cv.addEventListener('pointerup', onUp);
      cv.addEventListener('pointercancel', onUp);
      window.addEventListener('keydown', function (e) { keys[e.key.toLowerCase()] = true; });
      window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
      if (opts.sim > 0) {
        if (st === 'shopGo' || st === 'beachCall') keys['d'] = true;
        for (var i = 0; i < opts.sim; i++) update(1 / 60);
        var paint = function () { if (fitFn) fitFn(); draw(); };
        paint(); [80, 250, 700, 1400].forEach(function (ms) { setTimeout(paint, ms); });
        window.addEventListener('resize', paint);
        window.__story4Ready = true;
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
      window.__story4Ready = true;
    });
  }

  return {
    start: start,
    isRunning: function () { return running; },
    stop: function () { running = false; },
    state: function () { return { st: st, line: line, vidT: vidT, calDay: calDay }; }
  };
})();
