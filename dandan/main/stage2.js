/* ==================================================================
   第二关：和平精英式肉鸽射击
   流程：登场特效 → 选枪(丹丹) → 选枪(松松，全是98K) → 清完 8 只怪
        → 吃鸡画面 → 空投掉落 → 开箱看聊天 → 成就「故事的开始」
   ================================================================== */
window.Stage2 = (function () {
  'use strict';

  var W = 1280, H = 720;
  var MAP_S = 1.5;                 // 地图放大倍数（镜头拉近）
  var cv, ctx, fitFn;
  var running = false;

  var IMG = {};
  var FILES = {
    map: 'assets/map_field.webp',
    p90: 'assets/gun_p90.webp', groza: 'assets/gun_groza.webp',
    aug: 'assets/gun_aug.webp', kar98k: 'assets/gun_kar98k.webp',
    m0: 'assets/mob_default.webp', m1: 'assets/mob_girl101.webp',
    m2: 'assets/mob_tomato.webp', m3: 'assets/mob_mummy.webp',
    airdrop: 'assets/airdrop.webp', logo: 'assets/win_logo.webp',
    chat: 'assets/chat2.webp',
    girl: 'assets/girl_face-right.webp', boy: 'assets/boy.webp'
  };

  /* ---------------- 枪械参数（参考和平精英的手感） ---------------- */
  var GUNS = {
    p90:    { name: 'P90',    dmg: 35, rate: 0.067, speed: 1050, color: '#8fe1ff', tag: '冲锋枪',   mag: 50, reload: 2.4 },
    groza:  { name: 'GROZA',  dmg: 47, rate: 0.086, speed: 980,  color: '#ffd36e', tag: '突击步枪', mag: 30, reload: 2.6 },
    aug:    { name: 'AUG',    dmg: 43, rate: 0.086, speed: 1000, color: '#9dff9d', tag: '突击步枪', mag: 30, reload: 2.6 },
    kar98k: { name: '98K',    dmg: 79, rate: 1.5,   speed: 1400, color: '#ffe08a', tag: '狙击步枪', mag: 5,  reload: 3.0 }
  };
  var PICK_LIST = ['p90', 'groza', 'aug', 'kar98k'];   // 四方格顺序
  var BOY_LIST = ['kar98k', 'kar98k', 'kar98k', 'kar98k'];

  /* ---------------- 状态 ---------------- */
  var st = 'intro', T = 0;
  var me, bro, cam = { x: 0, y: 0 }, mapW = 1672, mapH = 941;
  var mobs = [], bullets = [], fx = [], parts = [];
  var myGun = 'p90', broGun = 'kar98k';
  var kills = 0, total = 8, hurtFlash = 0;
  var joy = { active: false, dx: 0, dy: 0, id: null, baseX: 110, baseY: H - 110, r: 74 };
  var keys = {};
  var sel = -1, sel2 = -1;
  var dropY = -260, dropT = 0, achvX = -420;
  var box = { x: 0, y: 0, dy: -220, landed: false, bounce: 0 };
  var portal = { x: 0, y: 0, t: 0 };      // t = 出现后的时间，用来做展开动画
  var openT = 0, achvT = 0, blackT = 0;
  var bgT = 0;

  function load() {
    var names = Object.keys(FILES);
    return Promise.all(names.map(function (k) {
      return new Promise(function (res) {
        var im = new Image();
        im.onload = function () { IMG[k] = im; res(); };
        im.onerror = function () { res(); };
        im.src = FILES[k];
      });
    }));
  }

  /* ---------------- 世界/屏幕换算 ---------------- */
  function viewW() { return W / MAP_S; }
  function viewH() { return H / MAP_S; }
  function clampCam() {
    cam.x = Math.max(0, Math.min(mapW - viewW(), cam.x));
    cam.y = Math.max(0, Math.min(mapH - viewH(), cam.y));
  }
  function sx(wx) { return (wx - cam.x) * MAP_S; }
  function sy(wy) { return (wy - cam.y) * MAP_S; }

  /* ---------------- 角色 ---------------- */
  function resetPlay() {
    me = { x: 800, y: 500, hp: 100, face: 1, t: 0, anim: 0, cd: 0, hitT: 0, ammo: 50, reloadT: 0 };
    bro = { x: 866, y: 520, hp: 100, face: 1, t: 0, cd: 0.6, anim: 0, ammo: 5, reloadT: 0 };
    mobs = []; bullets = []; fx = []; parts = [];
  }

  /* 8 方向量化：把朝向吸附到 45° 的整数倍 */
  function step8(dx, dy) {
    if (!dx && !dy) return [0, 0];
    var a = Math.atan2(dy, dx);
    var q = Math.round(a / (Math.PI / 4)) * (Math.PI / 4);
    return [Math.cos(q), Math.sin(q)];
  }

  var pool = [];
  function spawnMobs() {
    mobs = [];
    pool = [0, 1, 2, 3, 0, 1, 2, 3];           // 每种出现两次，排队上场
    spawnNext();
  }
  function spawnNext() {
    if (!pool.length) return;
    var k = pool.shift();
    var a = Math.random() * Math.PI * 2;
    var d = 300 + Math.random() * 130;
    var x = Math.max(70, Math.min(mapW - 70, me.x + Math.cos(a) * d));
    var y = Math.max(90, Math.min(mapH - 70, me.y + Math.sin(a) * d));
    mobs.push({ k: k, x: x, y: y, hp: 2400, mhp: 2400, t: 0, hitT: 0, spd: 38 + Math.random() * 14, face: 1 });
  }
  function tickGun(who, g, dt) {
    if (who.reloadT > 0) { who.reloadT -= dt; if (who.reloadT <= 0) who.ammo = g.mag; return; }
    who.cd -= dt;
    if (who.cd > 0) return;
    if (who.ammo <= 0) { who.reloadT = g.reload; return; }
    if (shoot(who, g)) { who.ammo--; who.cd = g.rate; }
    else who.cd = 0.15;
  }

  /* ---------------- 输入 ---------------- */
  function bindInput() {
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', function (e) { keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  }

  function toLocal(e) {
    var r = cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
  }

  function onDown(e) {
    var p = toLocal(e);
    if (st === 'pick1') { pickAt(p, 1); return; }
    if (st === 'pick2') { pickAt(p, 2); return; }
    if (st === 'win') { startDrop(); return; }
    if (st === 'open') { st = 'achv'; T = 0; achvT = 0; achvX = -420; return; }
    if (st === 'drop' || st === 'achv' || st === 'portal' || st === 'black3') return;
    // 摇杆
    if (p.x < W * 0.55 && p.y > H * 0.45) {
      joy.active = true; joy.id = e.pointerId; joy.baseX = p.x; joy.baseY = p.y;
      joy.dx = 0; joy.dy = 0;
    }
  }
  function onMove(e) {
    if (!joy.active || e.pointerId !== joy.id) return;
    var p = toLocal(e);
    var dx = (p.x - joy.baseX) / joy.r, dy = (p.y - joy.baseY) / joy.r;
    var len = Math.hypot(dx, dy);
    if (len > 1) { dx /= len; dy /= len; }
    joy.dx = dx; joy.dy = dy;
  }
  function onUp(e) {
    if (joy.active && (e.pointerId === joy.id || e.pointerId === undefined)) {
      joy.active = false; joy.dx = 0; joy.dy = 0; joy.id = null;
    }
  }

  function pickAt(p, which) {
    var gx = W / 2 - 300, gy = 250, cw = 260, ch = 150, gap = 30;
    for (var i = 0; i < 4; i++) {
      var cx = gx + (i % 2) * (cw + gap), cy = gy + Math.floor(i / 2) * (ch + gap);
      if (p.x > cx && p.x < cx + cw && p.y > cy && p.y < cy + ch) {
        if (which === 1) { myGun = PICK_LIST[i]; sel = i; st = 'toPick2'; T = 0; }
        else { broGun = 'kar98k'; sel2 = i; st = 'toBattle'; T = 0; }
        return;
      }
    }
  }

  /* ---------------- 更新 ---------------- */
  function update(dt) {
    T += dt;
    bgT += dt;
    if (hurtFlash > 0) hurtFlash -= dt;

    if (st === 'intro') {
      if (T > 2.4) { st = 'pick1'; T = 0; }
    } else if (st === 'toPick2') {
      if (T > 0.45) { st = 'pick2'; T = 0; }
    } else if (st === 'toBattle') {
      if (T > 0.45) { st = 'battle'; T = 0; resetPlay(); spawnMobs(); }
    } else if (st === 'battle') {
      updateBattle(dt);
    } else if (st === 'drop') {
      movePlayer(dt);
      // 空投从天而降
      if (!box.landed) {
        box.dy += 900 * dt;
        if (box.dy >= 0) { box.dy = 0; box.landed = true; box.bounce = 1; }
      } else if (box.bounce > 0) {
        box.bounce -= dt * 2.2;
      }
      if (box.landed && Math.hypot(me.x - box.x, me.y - box.y) < 54) {
        st = 'open'; T = 0; openT = 0; box.bounce = 1;
      }
    } else if (st === 'open') {
      openT += dt;
      if (box.bounce > -0.4) box.bounce -= dt * 2.4;
      if (openT > 2.6) { st = 'achv'; T = 0; achvT = 0; achvX = -420; }   // 看完自动接成就
    } else if (st === 'achv') {
      achvT += dt;
      achvX += (36 - achvX) * Math.min(1, dt * 5);
      if (achvT > 3.4) {                       // 成就停 3 秒后缩回去
        achvX += (-420 - achvX) * Math.min(1, dt * 6);
        if (achvT > 4.2) { st = 'portal'; T = 0; portal.x = box.x + 130; portal.y = box.y; portal.t = 0; }
      }
    } else if (st === 'portal') {
      portal.t += dt;
      movePlayer(dt);
      if (Math.hypot(me.x - portal.x, me.y - portal.y) < 46) { st = 'black3'; T = 0; blackT = 0; }
    } else if (st === 'black3') {
      blackT += dt;
      if (blackT > 1.6 && window.Stage3 && !window.__s3go) {
        window.__s3go = 1;
        stop();
        window.Stage3.start({ cv: cv, ctx: ctx, fit: fitFn });
      }
    }
    // 镜头跟随
    if (me) {
      cam.x += (me.x - viewW() / 2 - cam.x) * Math.min(1, dt * 6);
      cam.y += (me.y - viewH() / 2 - cam.y) * Math.min(1, dt * 6);
      clampCam();
    }
  }

  function movePlayer(dt) {
    var dx = joy.dx, dy = joy.dy;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    var d = step8(dx, dy);
    var spd = 205;
    if (d[0] || d[1]) {
      me.x += d[0] * spd * dt;
      me.y += d[1] * spd * dt;
      me.anim += dt * 9;
      if (d[0] > 0.2) me.face = 1; else if (d[0] < -0.2) me.face = -1;
    }
    me.x = Math.max(40, Math.min(mapW - 40, me.x));
    me.y = Math.max(70, Math.min(mapH - 40, me.y));
    var bx2 = me.x - 56 * me.face, by2 = me.y + 26;
    bro.x += (bx2 - bro.x) * Math.min(1, dt * 3);
    bro.y += (by2 - bro.y) * Math.min(1, dt * 3);
    bro.face = me.face;
  }

  function updateBattle(dt) {
    /* 摇杆 / 键盘 → 8 方向移动 */
    var dx = joy.dx, dy = joy.dy;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    var d = step8(dx, dy);
    var spd = 205;
    if (d[0] || d[1]) {
      me.x += d[0] * spd * dt;
      me.y += d[1] * spd * dt;
      me.anim += dt * 9;
      if (d[0] > 0.2) me.face = 1; else if (d[0] < -0.2) me.face = -1;
    }
    me.x = Math.max(40, Math.min(mapW - 40, me.x));
    me.y = Math.max(70, Math.min(mapH - 40, me.y));

    /* 松松跟随（掉在身后一点） */
    var bx = me.x - 56 * me.face, by = me.y + 26;
    bro.x += (bx - bro.x) * Math.min(1, dt * 3);
    bro.y += (by - bro.y) * Math.min(1, dt * 3);
    bro.face = me.face;

    /* 自动开火 */
    tickGun(me, GUNS[myGun], dt);
    tickGun(bro, GUNS[broGun], dt);

    /* 子弹 */
    for (var i = bullets.length - 1; i >= 0; i--) {
      var b = bullets[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      var dead = b.life <= 0;
      for (var j = 0; j < mobs.length && !dead; j++) {
        var m = mobs[j];
        if (m.hp <= 0) continue;
        if (Math.hypot(m.x - b.x, m.y - b.y) < 26) {
          m.hp -= b.dmg; m.hitT = 0.16; dead = true;
          fx.push({ x: m.x, y: m.y, t: 0, txt: '-' + b.dmg });
          if (m.hp <= 0) {
            kills++;
            for (var q = 0; q < 10; q++) parts.push({ x: m.x, y: m.y, vx: (Math.random() - .5) * 260, vy: (Math.random() - .5) * 260, t: 0, c: '#ffd76e' });
          }
        }
      }
      if (dead) bullets.splice(i, 1);
    }

    /* 怪物：8 方向逼近 */
    var alive = 0;
    for (var k = 0; k < mobs.length; k++) {
      var mb = mobs[k];
      if (mb.hp <= 0) continue;
      alive++;
      mb.t += dt;
      if (mb.hitT > 0) mb.hitT -= dt;
      var ax = me.x - mb.x, ay = me.y - mb.y;
      var dd = Math.hypot(ax, ay) || 1;
      var md = step8(ax / dd, ay / dd);
      if (dd > 34) {
        mb.x += md[0] * mb.spd * dt;
        mb.y += md[1] * mb.spd * dt;
      } else if (me.hitT <= 0) {
        me.hp = Math.max(12, me.hp - 9);
        me.hitT = 0.6; hurtFlash = 0.22;
      }
      if (md[0] > 0.2) mb.face = 1; else if (md[0] < -0.2) mb.face = -1;
    }
    if (me.hitT > 0) me.hitT -= dt;

    /* 特效 */
    for (var f = fx.length - 1; f >= 0; f--) { fx[f].t += dt; if (fx[f].t > 0.7) fx.splice(f, 1); }
    for (var p2 = parts.length - 1; p2 >= 0; p2--) {
      var pt = parts[p2];
      pt.t += dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 320 * dt;
      if (pt.t > 0.7) parts.splice(p2, 1);
    }

    if (alive === 0 && pool.length && (bgT - (window.__lastSpawn || 0)) > 1.3) {
      window.__lastSpawn = bgT;
      spawnNext();
    }
    if (alive === 0 && !pool.length) { st = 'win'; T = 0; }
  }

  function shoot(who, g) {
    var best = null, bd = 1e9;
    for (var i = 0; i < mobs.length; i++) {
      var m = mobs[i];
      if (m.hp <= 0) continue;
      var d = Math.hypot(m.x - who.x, m.y - who.y);
      if (d < bd) { bd = d; best = m; }
    }
    if (!best) return false;
    var ax = best.x - who.x, ay = best.y - who.y;
    var len = Math.hypot(ax, ay) || 1;
    bullets.push({
      x: who.x + ax / len * 20, y: who.y - 16 + ay / len * 20,
      vx: ax / len * g.speed, vy: ay / len * g.speed,
      dmg: g.dmg, life: 1.1, c: g.color
    });
    fx.push({ x: who.x + ax / len * 26, y: who.y - 16, t: 0.28, muzzle: true });
    return true;
  }

  /* ---------------- 绘制 ---------------- */
  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawMap();
    if (st === 'intro') drawIntro();
    else if (st === 'pick1' || st === 'pick2' || st === 'toPick2') {
      drawWorld(true);
      drawPickUI();
    } else if (st === 'battle' || st === 'toBattle') {
      drawWorld(true);
      drawBattleUI();
    } else if (st === 'win') {
      drawWorld(false);
      drawWin();
    } else if (st === 'drop' || st === 'open' || st === 'achv' || st === 'portal') {
      drawWorld(false);
      drawBoxOnMap();
      if (st === 'portal') drawPortal();
      if (st === 'open' || st === 'achv') drawChatFromBox();
      if (st === 'achv') drawAchv();
    } else if (st === 'black3') {
      drawWorld(false);
      drawBlack3();
    }
    drawJoystick();
    if (hurtFlash > 0) {
      ctx.fillStyle = 'rgba(220,40,40,' + (hurtFlash * 1.6) + ')';
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawMap() {
    var sw = viewW(), sh = viewH();
    ctx.drawImage(IMG.map, cam.x, cam.y, sw, sh, 0, 0, W, H);
    // 边缘压暗，像镜头锁定
    var g = ctx.createRadialGradient(W / 2, H / 2, H * 0.34, W / 2, H / 2, H * 0.95);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  function drawActor(who, img, cellW, cellH, h, flip, pose) {
    var x = sx(who.x), y = sy(who.y);
    var w = h * (cellW / cellH);
    ctx.save();
    ctx.globalAlpha = .22; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, y + 4, w * 0.32, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, pose * cellW, 0, cellW, cellH, -w / 2, -h, w, h);
    ctx.restore();
  }

  function drawWorld(withMobs) {
    if (withMobs) {
      // 怪物
      for (var i = 0; i < mobs.length; i++) {
        var m = mobs[i];
        if (m.hp <= 0) continue;
        var img = IMG['m' + m.k];
        var hh = 96;
        var ww = hh * (img.width / img.height);
        var mx = sx(m.x), my = sy(m.y);
        var bob = Math.sin(m.t * 7) * 3;
        ctx.save();
        ctx.globalAlpha = .22; ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(mx, my + 4, ww * 0.3, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        if (m.hitT > 0) { ctx.filter = 'brightness(2.2)'; }
        ctx.drawImage(img, mx - ww / 2, my - hh + bob, ww, hh);
        ctx.filter = 'none';
        // 血条
        if (m.hp < m.mhp) {
          ctx.fillStyle = 'rgba(0,0,0,.55)';
          ctx.fillRect(mx - 26, my - hh - 16, 52, 7);
          ctx.fillStyle = '#ff5b6e';
          ctx.fillRect(mx - 26, my - hh - 16, 52 * Math.max(0, m.hp / m.mhp), 7);
        }
        ctx.restore();
      }
    }
    // 子弹
    for (var b = 0; b < bullets.length; b++) {
      var bu = bullets[b];
      ctx.save();
      ctx.fillStyle = bu.c;
      ctx.shadowColor = bu.c; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.ellipse(sx(bu.x), sy(bu.y), 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // 人物
    if (me) {
      drawActor(me, IMG.girl, 125, 202, 96, me.face < 0, 4);
      if (bro) drawActor(bro, IMG.boy, 135, 202, 100, bro.face < 0, 0);
    }
    // 飘字 / 火花
    for (var f = 0; f < fx.length; f++) {
      var e = fx[f];
      ctx.save();
      if (e.muzzle) {
        ctx.globalAlpha = Math.max(0, 1 - e.t / 0.28) * .9;
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath(); ctx.arc(sx(e.x), sy(e.y), 10, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.globalAlpha = Math.max(0, 1 - e.t / 0.7);
        ctx.fillStyle = '#ffe9a8';
        ctx.font = '700 22px "PingFang SC",system-ui,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(e.txt, sx(e.x), sy(e.y) - 30 - e.t * 40);
        ctx.textAlign = 'left';
      }
      ctx.restore();
    }
    for (var p = 0; p < parts.length; p++) {
      var pt = parts[p];
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - pt.t / 0.7);
      ctx.fillStyle = pt.c;
      ctx.fillRect(sx(pt.x) - 2, sy(pt.y) - 2, 4, 4);
      ctx.restore();
    }
  }

  /* ---------------- 登场特效 ---------------- */
  function drawIntro() {
    var t = T;
    // 唰唰唰：斜向白色速度线
    for (var i = 0; i < 26; i++) {
      var k = (i * 97 % 100) / 100;
      var ph = (t * 1.6 + k) % 1;
      var x0 = -200 + ph * (W + 400);
      var y0 = 100 + k * (H - 200);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 0.55 - ph * 0.55);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2 + k * 3;
      ctx.beginPath();
      ctx.moveTo(x0, y0 - 120);
      ctx.lineTo(x0 + 160, y0 + 30);
      ctx.stroke();
      ctx.restore();
    }
    // 角色落地
    var land = Math.min(1, Math.max(0, (t - 0.25) / 0.9));
    var e = 1 - Math.pow(1 - land, 3);
    var baseY = H / 2 + 60;
    var gy = -80 + (baseY + 80) * e;
    var gw = 176, gh = gw * (202 / 125);
    ctx.save();
    // 光柱
    ctx.globalAlpha = 0.35 * (1 - land * 0.6);
    var lg = ctx.createLinearGradient(W / 2 - 120, 0, W / 2 + 120, 0);
    lg.addColorStop(0, 'rgba(255,240,190,0)');
    lg.addColorStop(0.5, 'rgba(255,240,190,.9)');
    lg.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(W / 2 - 120, 0, 240, baseY + 120);
    ctx.restore();

    if (IMG.girl) ctx.drawImage(IMG.girl, 4 * 125, 0, 125, 202, W / 2 - 96 - gw / 2, gy - gh, gw, gh);
    var bw = 186, bh = bw * (202 / 135);
    if (IMG.boy) ctx.drawImage(IMG.boy, 0, 0, 135, 202, W / 2 + 96 - bw / 2, gy - bh, bw, bh);

    if (land >= 1) {
      var ringT = Math.min(1, (t - 1.15) / 0.6);
      ctx.save();
      ctx.globalAlpha = 1 - ringT;
      ctx.strokeStyle = '#fff0bb'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.ellipse(W / 2, baseY + 8, 220 * (0.4 + ringT), 40 * (0.4 + ringT), 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = Math.min(1, land);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff6d8';
    ctx.font = '700 40px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('第二关 · 和平小镇', W / 2, 120);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  /* ---------------- 选枪 ---------------- */
  function drawPickUI() {
    ctx.save();
    ctx.fillStyle = 'rgba(10,8,6,.62)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff2cc';
    ctx.font = '700 42px "PingFang SC",system-ui,sans-serif';
    var isBoyPick = (st === 'pick2' || st === 'toPick2' || st === 'toBattle');
    ctx.fillText(isBoyPick ? '请选择松松的武器' : '请选择你的枪械', W / 2, 170);
    ctx.font = '600 20px "PingFang SC",system-ui,sans-serif';
    ctx.fillStyle = 'rgba(255,242,204,.55)';
    ctx.fillText('点一张', W / 2, 208);
    ctx.textAlign = 'left';

    var gx = W / 2 - 300, gy = 250, cw = 260, ch = 150, gap = 30;
    var list = isBoyPick ? BOY_LIST : PICK_LIST;
    for (var i = 0; i < 4; i++) {
      var cx = gx + (i % 2) * (cw + gap), cy = gy + Math.floor(i / 2) * (ch + gap);
      var gk = list[i], gun = GUNS[gk];
      roundRect(cx, cy, cw, ch, 14);
      ctx.fillStyle = 'rgba(32,26,20,.92)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,214,110,.75)'; ctx.lineWidth = 3; ctx.stroke();
      var im = IMG[gk];
      if (im) {
        var ih = 74, iw = ih * (im.width / im.height);
        ctx.drawImage(im, cx + 22, cy + ch / 2 - ih / 2 - 8, iw, ih);
      }
      ctx.fillStyle = '#ffe9a8';
      ctx.font = '700 26px "PingFang SC",system-ui,sans-serif';
      ctx.fillText(gun.name, cx + 26, cy + ch - 34);
      ctx.fillStyle = 'rgba(255,233,168,.5)';
      ctx.font = '600 17px "PingFang SC",system-ui,sans-serif';
      ctx.fillText(gun.tag + ' · 伤害' + gun.dmg, cx + 26, cy + ch - 12);
    }
    ctx.restore();
  }

  /* ---------------- 战斗 UI ---------------- */
  function drawBattleUI() {
    ctx.save();
    // 顶部
    ctx.fillStyle = 'rgba(12,10,8,.62)';
    ctx.fillRect(0, 0, W, 62);
    ctx.fillStyle = '#f7efd2';
    ctx.font = '700 24px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('剩余 ' + (total - kills) + ' / ' + total, 34, 40);
    var mg = GUNS[myGun], bg2 = GUNS[broGun];
    ctx.fillText('武器 ' + mg.name + '  ' + (me.reloadT > 0 ? '换弹…' : me.ammo + '/' + mg.mag), 260, 40);
    ctx.fillText('松松 ' + bg2.name + '  ' + (bro.reloadT > 0 ? '换弹…' : bro.ammo + '/' + bg2.mag), 560, 40);
    // 血条
    var hpW = 260;
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(W - 320, 24, hpW, 16);
    ctx.fillStyle = '#ff5b6e';
    ctx.fillRect(W - 320, 24, hpW * Math.max(0, me.hp / 100), 16);
    ctx.fillStyle = '#f7efd2';
    ctx.font = '600 18px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('HP', W - 372, 39);
    ctx.restore();
  }

  function drawJoystick() {
    if (st !== 'battle') return;
    var bx = joy.active ? joy.baseX : joy.baseX, by = joy.active ? joy.baseY : joy.baseY;
    ctx.save();
    ctx.globalAlpha = joy.active ? .5 : .28;
    ctx.strokeStyle = '#fff8e0'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(bx, by, joy.r, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = joy.active ? .78 : .42;
    ctx.fillStyle = '#fff8e0';
    ctx.beginPath();
    ctx.arc(bx + joy.dx * joy.r * 0.62, by + joy.dy * joy.r * 0.62, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = .5;
    ctx.fillStyle = '#f7efd2';
    ctx.font = '600 15px "PingFang SC",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('按住左半屏拖动', bx, H - 28);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  /* ---------------- 吃鸡 / 空投 / 聊天 / 成就 ---------------- */
  function drawWin() {
    ctx.save();
    ctx.fillStyle = 'rgba(8,6,4,.72)'; ctx.fillRect(0, 0, W, H);
    var im = IMG.logo;
    if (im) {
      var w = Math.min(760, W - 160), h = w * (im.height / im.width);
      var sc = 1 + Math.sin(bgT * 2.2) * 0.012;
      ctx.translate(W / 2, H / 2 - 20);
      ctx.scale(sc, sc);
      // 金色光晕
      var g = ctx.createRadialGradient(0, 0, 60, 0, 0, w * 0.7);
      g.addColorStop(0, 'rgba(255,220,120,.35)');
      g.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = g; ctx.fillRect(-w, -w, w * 2, w * 2);
      ctx.drawImage(im, -w / 2, -h / 2, w, h);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,242,204,.62)';
    ctx.font = '600 22px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('点一下继续', W / 2, H - 64);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawDrop() {
    ctx.save();
    ctx.fillStyle = 'rgba(8,6,4,.35)'; ctx.fillRect(0, 0, W, H);
    var bx = W / 2, by = H / 2 + 40 + dropY;
    // 光柱
    ctx.globalAlpha = .55;
    var g = ctx.createLinearGradient(bx, by - 300, bx, by + 60);
    g.addColorStop(0, 'rgba(255,226,140,0)');
    g.addColorStop(0.7, 'rgba(255,226,140,.5)');
    g.addColorStop(1, 'rgba(255,246,210,.85)');
    ctx.fillStyle = g;
    ctx.fillRect(bx - 90, by - 300, 180, 360);
    ctx.globalAlpha = 1;
    var im = IMG.airdrop;
    if (im) {
      var h = 170, w = h * (im.width / im.height);
      ctx.save();
      ctx.shadowColor = 'rgba(255,226,140,.95)';
      ctx.shadowBlur = 34 + Math.sin(bgT * 5) * 10;
      ctx.drawImage(im, bx - w / 2, by - h / 2, w, h);
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff3c8';
    ctx.font = '700 26px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('点它打开', W / 2, H - 70);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawChat() {
    ctx.save();
    ctx.fillStyle = 'rgba(8,6,4,.62)'; ctx.fillRect(0, 0, W, H);
    var im = IMG.chat;
    if (im) {
      var h = Math.min(H - 230, 480), w = h * (im.width / im.height);
      var cx = W / 2, cy = H / 2;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
      roundRect(cx - w / 2 - 10, cy - h / 2 - 10, w + 20, h + 20, 18);
      ctx.fillStyle = '#f6f2e6'; ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      roundRect(cx - w / 2, cy - h / 2, w, h, 12);
      ctx.clip();
      ctx.drawImage(im, cx - w / 2, cy - h / 2, w, h);
      ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,242,204,.6)';
    ctx.font = '600 20px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('点一下继续', W / 2, H - 40);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawAchv() {
    ctx.save();
    var x = achvX, y = H - 116, w = 380, h = 96;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 8;
    roundRect(x, y, w, h, 14);
    ctx.fillStyle = 'rgba(28,22,16,.95)'; ctx.fill();
    ctx.restore();
    roundRect(x, y, w, h, 14);
    ctx.strokeStyle = 'rgba(255,214,110,.9)'; ctx.lineWidth = 3; ctx.stroke();
    // 奖杯
    ctx.fillStyle = '#ffd76e';
    ctx.beginPath();
    ctx.moveTo(x + 30, y + 26); ctx.lineTo(x + 62, y + 26);
    ctx.lineTo(x + 58, y + 52); ctx.lineTo(x + 34, y + 52);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(x + 40, y + 52, 12, 12);
    ctx.fillRect(x + 32, y + 64, 28, 7);
    ctx.fillStyle = 'rgba(255,214,110,.55)';
    ctx.font = '600 16px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('完成成就', x + 82, y + 34);
    ctx.fillStyle = '#fff2cc';
    ctx.font = '700 30px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('故事的开始', x + 82, y + 70);
    ctx.restore();
  }

  function startDrop() {
    st = 'drop'; T = 0; dropT = 0;
    box.x = Math.max(80, Math.min(mapW - 80, me.x + 120));
    box.y = Math.max(90, Math.min(mapH - 60, me.y - 30));
    box.dy = -230; box.landed = false; box.bounce = 0;
    portal.x = box.x + 130; portal.y = box.y;
  }

  /* 地图上的空投箱（世界坐标，跟着镜头走） */
  function drawBoxOnMap() {
    if (st === 'black3' || st === 'portal') { /* 箱子还在，继续画 */ }
    var bx = sx(box.x), by = sy(box.y) + box.dy;
    var im = IMG.airdrop;
    if (!im) return;
    var h = 120, w = h * (im.width / im.height);
    var sq = Math.max(-0.35, Math.min(1, box.bounce));
    var hh = h * (1 + sq * 0.22), ww = w * (1 - sq * 0.14);
    // 光柱
    ctx.save();
    ctx.globalAlpha = .5 + Math.sin(bgT * 6) * .12;
    var g = ctx.createLinearGradient(bx, by - 200, bx, by + 20);
    g.addColorStop(0, 'rgba(255,226,140,0)');
    g.addColorStop(1, 'rgba(255,246,210,.7)');
    ctx.fillStyle = g;
    ctx.fillRect(bx - 55, by - 200, 110, 220);
    ctx.restore();
    // 影子
    ctx.save();
    ctx.globalAlpha = .25; ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(bx, by + 6, ww * 0.36, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.drawImage(im, bx - ww / 2, by - hh + 4, ww, hh);
    // 还没落地时的提示
    if (!box.landed) return;
    if (st === 'drop') {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,246,210,.85)';
      ctx.font = '700 20px "PingFang SC",system-ui,sans-serif';
      ctx.fillText('走过去碰它', bx, by - hh - 14);
      ctx.textAlign = 'left';
      ctx.restore();
    }
  }

  /* 聊天记录从箱子里弹出来 */
  function drawChatFromBox() {
    var im = IMG.chat;
    if (!im) return;
    // 成就弹出后，卡片自己缩走，把画面让给成就和传送门
    var shrink = 1;
    if (st === 'achv' && achvT > 1.3) shrink = Math.max(0, 1 - (achvT - 1.3) / 0.55);
    if (st === 'portal') shrink = 0;
    if (shrink <= 0.01) return;
    var p = Math.min(1, openT / 0.55) * shrink;
    var ease = 1 - Math.pow(1 - p, 3);
    var bx = sx(box.x), by = sy(box.y) - 40;
    var h = Math.min(H - 230, 470) * (0.3 + 0.7 * ease);
    var w = h * (im.width / im.height);
    var cx = bx + (W / 2 - bx) * ease;
    var cy = by + (H / 2 - 20 - by) * ease;
    ctx.save();
    ctx.globalAlpha = Math.min(1, p * 2);
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 12;
    roundRect(cx - w / 2 - 9, cy - h / 2 - 9, w + 18, h + 18, 16);
    ctx.fillStyle = '#f6f2e6'; ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    roundRect(cx - w / 2, cy - h / 2, w, h, 11);
    ctx.save(); ctx.clip();
    ctx.drawImage(im, cx - w / 2, cy - h / 2, w, h);
    ctx.restore();
    ctx.restore();
    if (p >= 1) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.globalAlpha = .6;
      ctx.fillStyle = '#fff2cc';
      ctx.font = '600 18px "PingFang SC",system-ui,sans-serif';
      ctx.fillText('点一下继续', W / 2, H - 26);
      ctx.textAlign = 'left';
      ctx.restore();
    }
  }

  /* 元气骑士式传送门 */
  var portalGlow = null, portalCore = null, portalKey = '';
  function drawPortal() {
    var px = sx(portal.x), py = sy(portal.y);
    var t = bgT;
    var grow = Math.min(1, portal.t / 0.45);          // 撑开，避免突然出现
    var gk = px + ',' + py;
    if (portalKey !== gk) {                            // 渐变只建一次，别每帧建
      portalGlow = ctx.createRadialGradient(px, py - 40, 6, px, py - 40, 110);
      portalGlow.addColorStop(0, 'rgba(150,220,255,.55)');
      portalGlow.addColorStop(0.6, 'rgba(110,150,255,.18)');
      portalGlow.addColorStop(1, 'rgba(110,150,255,0)');
      portalCore = ctx.createRadialGradient(px, py - 46, 2, px, py - 46, 26);
      portalCore.addColorStop(0, 'rgba(255,255,255,.95)');
      portalCore.addColorStop(1, 'rgba(150,220,255,0)');
      portalKey = gk;
    }
    ctx.save();
    ctx.translate(px, py - 46);
    ctx.scale(grow, grow);
    ctx.translate(-px, -(py - 46));
    // 光晕
    ctx.fillStyle = portalGlow;
    ctx.fillRect(px - 130, py - 170, 260, 260);
    // 门框
    ctx.strokeStyle = '#8fd8ff'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(px, py - 46, 44, 60, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(180,235,255,.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(px, py - 46, 36, 52, 0, 0, Math.PI * 2); ctx.stroke();
    // 旋涡
    for (var i = 0; i < 5; i++) {
      var a0 = t * 2.4 + i * 1.25;
      ctx.strokeStyle = 'rgba(200,245,255,' + (0.5 - i * 0.07) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(px, py - 46, 30 - i * 4, 44 - i * 6, a0, a0, a0 + 2.1);
      ctx.stroke();
    }
    // 中心亮芯
    ctx.fillStyle = portalCore;
    ctx.beginPath(); ctx.ellipse(px, py - 46, 26, 36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(200,245,255,.9)';
    ctx.font = '700 20px "PingFang SC",system-ui,sans-serif';
    ctx.fillText('走进传送门', px, py - 132);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawBlack3() {
    // 按要求：不再显示「第三关 / 敬请期待」，纯黑直接交接
    var a = Math.min(1, blackT / 0.6);
    ctx.fillStyle = 'rgba(4,4,6,' + a + ')';
    ctx.fillRect(0, 0, W, H);
  }

  function drawBlack3Old() {
    var a = Math.min(1, blackT / 0.9);
    ctx.fillStyle = 'rgba(4,4,6,' + a + ')';
    ctx.fillRect(0, 0, W, H);
    if (blackT > 1.1) {
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      var f = Math.min(1, (blackT - 1.1) / 0.6);
      ctx.globalAlpha = f;
      ctx.fillStyle = '#f2e8cf';
      ctx.font = '700 64px "PingFang SC",system-ui,sans-serif';
      ctx.fillText('第三关', W / 2, H / 2 - 30);
      ctx.font = '600 24px "PingFang SC",system-ui,sans-serif';
      ctx.fillStyle = 'rgba(242,232,207,.6)';
      ctx.fillText('敬请期待', W / 2, H / 2 + 34);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.restore();
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

  /* ---------------- 启动 ---------------- */
  function start(opts) {
    if (running) return;
    cv = opts.cv; ctx = opts.ctx; fitFn = opts.fit;
    st = opts.state || 'intro'; T = 0; kills = 0; bullets = []; mobs = []; fx = []; parts = [];
    me = { x: 800, y: 500, hp: 100, face: 1, t: 0, anim: 0, cd: 0, hitT: 0, ammo: 50, reloadT: 0 };
    bro = { x: 866, y: 520, hp: 100, face: 1, t: 0, cd: 0.6, anim: 0, ammo: 5, reloadT: 0 };
    cam.x = me.x - viewW() / 2; cam.y = me.y - viewH() / 2; clampCam();
    running = true;
    load().then(function () {
      bindInput();
      if (st === 'battle' || st === 'win') { resetPlay(); spawnMobs(); me.ammo = GUNS[myGun].mag; bro.ammo = GUNS[broGun].mag; }
      if (st === 'drop' || st === 'open' || st === 'achv' || st === 'portal') {
        box.x = me.x + 120; box.y = me.y - 30; box.dy = 0; box.landed = true; box.bounce = 0;
        portal.x = box.x + 130; portal.y = box.y;
        if (st === 'open') openT = 1;
        if (st === 'achv') { openT = 1; achvT = 0.6; achvX = 36; }
        if (st === 'portal') { achvT = 9; achvX = -420; }
      }
      if (st === 'black3') { box.x = me.x + 120; box.y = me.y - 30; box.landed = true; blackT = 1.6; }
      if (opts.sim > 0) {
        if (st === 'battle') resetPlay(), spawnMobs();
        for (var i = 0; i < opts.sim; i++) update(1 / 60);
        var paint = function () { if (fitFn) fitFn(); draw(); };
        paint(); [80, 250, 700].forEach(function (ms) { setTimeout(paint, ms); });
        window.addEventListener('resize', paint);
        window.__stage2Ready = true;
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
      window.__stage2Ready = true;
    });
  }

  function stop() { running = false; }

  return {
    start: start, stop: stop,
    isRunning: function () { return running; },
    state: function () { return { st: st, kills: kills, total: total, hp: me ? me.hp : 0, mobs: mobs.length }; }
  };
})();
