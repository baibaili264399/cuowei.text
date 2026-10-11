/* ============================================================
   《错位夜宵》VN 演出引擎
   负责：背景交叉淡入 / CG 特写 / 立绘 / 打字机 / 自动 / 跳过 /
        回想(REPEAT) / 前后翻(◀▶) / 记录(LOG) / 特效 / 存档状态导出
   ============================================================ */
(function (global) {
  'use strict';
  var GAL = global.GAL;
  var $ = GAL.$, $$ = GAL.$$;
  var Sfx = GAL.Sfx, fmt = GAL.fmt;

  var el = {};
  function cache() {
    ['screen-game', 'vn-bg-a', 'vn-bg-b', 'vn-chars', 'vn-cg', 'vn-cg-img',
     'vn-flash', 'vn-glitch', 'vn-glow', 'vn-flashback', 'vn-card', 'vn-card-title', 'vn-card-sub',
     'speaker', 'dialogue-text', 'caret', 'vn-box', 'vn-name',
     'hud-chapter', 'hud-playtime', 'hud-line',
     'vn-place', 'vn-affinity', 'vn-ui', 'vn-choice',
     'modal-log', 'log-body', 'toast-layer'].forEach(function (id) {
      el[id] = document.getElementById(id);
    });
  }

  var state = {
    chapterId: null,
    chapterTitle: '',
    steps: [],
    index: 0,
    fullText: '',
    typing: false,
    typeTimer: null,
    auto: false,
    skip: false,
    timer: null,
    waitTimer: null,
    bgSlot: 0,
    ended: false,
    cardTimer: null,
    choosing: false,
    choice: null,
    choicePick: -1,
    choiceReady: false,
    choiceLock: null,
    nextChapter: null,
    flags: {},
    aff: { tong: 40, song: 15, shuai: 0 },
    affLabel: { tong: '普通朋友', song: '网友', shuai: '未认识' },
    seen: {},
    log: [],
    textTotal: 0
  };

  /* ---------------- 小工具 ---------------- */
  function clearTimers() {
    global.clearTimeout(state.timer);
    global.clearTimeout(state.waitTimer);
    state.timer = state.waitTimer = null;
  }

  function textSteps(list) {
    return (list || state.steps).filter(function (s) { return typeof s.text === 'string'; });
  }

  function progressOf(index) {
    var texts = textSteps();
    var n = 0;
    for (var i = 0; i <= index && i < state.steps.length; i++) {
      if (typeof state.steps[i].text === 'string') n++;
    }
    return { now: Math.min(n, texts.length), total: texts.length };
  }

  function updateProgress() {
    if (!el['hud-line']) return;
    var p = progressOf(state.index);
    el['hud-line'].textContent = p.now + ' / ' + p.total;
  }

  /* ---------------- 素材缓存 / 预加载 ----------------
     开章就把本章用到的图全部拉一遍，玩家读到那一句时基本已经就绪；
     切换背景 / CG 时如果图还没到，会等它到了再切（并显示"读取素材中"），不会先黑一下。 */
  var assets = {};
  var pendingLoads = 0;
  var bgSeq = 0, cgSeq = 0;

  function bumpLoading(delta) {
    pendingLoads = Math.max(0, pendingLoads + delta);
    if (el['screen-game']) el['screen-game'].classList.toggle('is-loading', pendingLoads > 0);
  }

  function ensure(url, cb, forceRetry) {
    if (!url) { if (cb) cb(false); return; }
    var entry = assets[url];
    /* 之前失败过的：这次要用就先作废重来，不能一条命判死 */
    if (entry && entry.status === 'fail' && forceRetry) { delete assets[url]; entry = null; }
    if (entry) {
      if (entry.status === 'loading') { if (cb) entry.cbs.push(cb); }
      else if (cb) cb(entry.status === 'ok');
      return;
    }

    entry = assets[url] = { status: 'loading', cbs: cb ? [cb] : [] };
    var settled = false;

    function settle(ok) {
      if (settled) return;
      settled = true;
      entry.status = ok ? 'ok' : 'fail';
      bumpLoading(-1);
      var list = entry.cbs;
      entry.cbs = [];
      list.forEach(function (fn) { try { fn(ok); } catch (e) { /* ignore */ } });
    }

    var img = new global.Image();
    img.onload = function () { settle(true); };
    img.onerror = function () { settle(false); };
    bumpLoading(1);
    img.src = url;
  }

  function preloadChapter() {
    var wanted = {};
    state.steps.forEach(function (s) {
      if (s.bg) wanted[s.bg] = 1;
      if (s.cg) wanted[s.cg] = 1;
      if (s.char) wanted[s.char] = 1;
    });
    Object.keys(wanted).forEach(function (u) { ensure(u); });
  }

  /* ---------------- 视觉层 ---------------- */
  /* 关键：切图绝不"等网络"——图到了就平滑交叉淡入；
     万一没到，最多等 grace 毫秒就先把图层指过去（浏览器解码完自然会画出来），
     否则一旦请求失败/超时，玩家就会看到"这一页没有照片"。 */
  var SWITCH_GRACE = 1200;

  function setBg(step, instant) {
    var mine = ++bgSeq;
    if (instant) { applyBg(step, true); return; }
    var done = false;
    function go() {
      if (done || mine !== bgSeq) return;
      done = true;
      applyBg(step, false);
    }
    ensure(step.bg, go, true);
    global.setTimeout(go, SWITCH_GRACE);
  }

  function applyBg(step, instant) {
    var layers = [el['vn-bg-a'], el['vn-bg-b']];
    var cur = layers[state.bgSlot];
    var next = layers[1 - state.bgSlot];
    var dur = instant ? 0 : (step.dur || 900);

    /* 关键：清掉挂在这两个图层上的"淡出"定时器。
       否则连续两次切图（<40ms）时，上一次的定时器会把新图层刚点亮的 is-on 又抹掉，
       结果两层都透明 → 画面一片黑，看起来就是"这一页照片没变"。 */
    if (next._hideTimer) { global.clearTimeout(next._hideTimer); next._hideTimer = null; }
    if (cur._hideTimer) { global.clearTimeout(cur._hideTimer); cur._hideTimer = null; }

    next.style.transitionDuration = dur + 'ms';
    cur.style.transitionDuration = dur + 'ms';
    next.style.backgroundImage = 'url("' + step.bg + '")';
    next.style.backgroundPosition = step.pos || '50% 50%';
    next.classList.remove('is-pan');

    /* 触发重排，保证 pan 动画能重新播放 */
    void next.offsetWidth;
    if (!instant && step.pan) next.classList.add('is-pan');

    next.classList.add('is-on');
    if (dur === 0) {
      cur.classList.remove('is-on');
    } else {
      cur._hideTimer = global.setTimeout(function () {
        cur.classList.remove('is-on');
        cur._hideTimer = null;
      }, 60);
    }
    state.bgSlot = 1 - state.bgSlot;
  }

  function setCg(step, instant) {
    var mine = ++cgSeq;
    if (instant) { applyCg(step, true); return; }
    var done = false;
    function go() {
      if (done || mine !== cgSeq) return;
      done = true;
      applyCg(step, false);
    }
    ensure(step.cg, go, true);
    global.setTimeout(go, SWITCH_GRACE);
  }

  function applyCg(step, instant) {
    var node = el['vn-cg'];
    el['vn-cg-img'].src = step.cg;
    node.dataset.mode = step.mode || 'inset';
    node.style.transitionDuration = (instant ? 0 : (step.dur || 600)) + 'ms';
    node.classList.remove('is-zoom');
    void node.offsetWidth;
    node.classList.add('is-on');
    if (!instant && step.zoom) node.classList.add('is-zoom');
    if (!instant) Sfx.click();
  }

  function closeCg(instant) {
    cgSeq++;
    var node = el['vn-cg'];
    node.style.transitionDuration = (instant ? 0 : 420) + 'ms';
    node.classList.remove('is-on', 'is-zoom');
  }

  function setChar(step, instant) {
    var layer = el['vn-chars'];
    if (!step.char) { layer.innerHTML = ''; return; }
    layer.innerHTML = '';
    var img = document.createElement('img');
    img.src = step.char;
    img.className = 'vn-char';
    img.alt = '';
    if (step.pos) img.style.right = step.pos;
    layer.appendChild(img);
    if (!instant) Sfx.click();
  }

  function flash(color, dur) {
    var node = el['vn-flash'];
    node.dataset.color = color || 'white';
    node.style.transitionDuration = '90ms';
    node.classList.add('is-on');
    global.setTimeout(function () {
      node.style.transitionDuration = (dur || 340) + 'ms';
      node.classList.remove('is-on');
    }, 90);
  }

  function shake(power) {
    var stage = el['screen-game'];
    stage.style.setProperty('--shake', (power || 10) + 'px');
    stage.classList.remove('is-shake');
    void stage.offsetWidth;
    stage.classList.add('is-shake');
    global.setTimeout(function () { stage.classList.remove('is-shake'); }, 620);
    if (Sfx && Sfx.error) Sfx.error();
  }

  function setFx(kind, dur) {
    if (kind === 'glitch') {
      var g = el['vn-glitch'];
      g.classList.remove('is-on');
      void g.offsetWidth;
      g.classList.add('is-on');
      global.setTimeout(function () { g.classList.remove('is-on'); }, dur || 900);
    } else if (kind === 'glow') {
      el['vn-glow'].classList.add('is-on');
    } else if (kind === 'glowOff') {
      el['vn-glow'].classList.remove('is-on');
    } else if (kind === 'flashbackOn') {
      el['vn-flashback'].classList.add('is-on');
      el['screen-game'].classList.add('is-flashback');
    } else if (kind === 'flashbackOff') {
      el['vn-flashback'].classList.remove('is-on');
      el['screen-game'].classList.remove('is-flashback');
    }
  }

  function showCard(step, instant) {
    global.clearTimeout(state.cardTimer);   /* 清掉上一次卡片残留的收起定时器，避免刚显示就被关掉 */
    state.cardTimer = null;
    var card = el['vn-card'];
    el['vn-card-title'].textContent = step.card || '';
    el['vn-card-sub'].textContent = step.sub || '';
    card.style.transitionDuration = (instant ? 0 : 420) + 'ms';
    card.classList.add('is-on');
    if (!instant) el['screen-game'].classList.add('is-card');
  }

  function hideCard(instant) {
    global.clearTimeout(state.cardTimer);
    state.cardTimer = null;
    var card = el['vn-card'];
    card.style.transitionDuration = (instant ? 0 : 420) + 'ms';
    card.classList.remove('is-on');
    el['screen-game'].classList.remove('is-card');
  }

  function resetVisual() {
    bgSeq++;                       /* 作废还没回来的背景加载回调 */
    [el['vn-bg-a'], el['vn-bg-b']].forEach(function (l) {
      l.classList.remove('is-on', 'is-pan');
      l.style.backgroundImage = '';
      l.style.transitionDuration = '0ms';
    });
    state.bgSlot = 0;
    closeCg(true);
    el['vn-chars'].innerHTML = '';
    el['vn-chars'].classList.remove('is-on');
    hideChoice();
    if (el['vn-place']) el['vn-place'].classList.remove('is-on');
    if (el['vn-affinity']) el['vn-affinity'].classList.remove('is-on');
    if (el['vn-ui']) { el['vn-ui'].classList.remove('is-on'); el['vn-ui'].innerHTML = ''; }
    el['vn-glitch'].classList.remove('is-on');
    el['vn-glow'].classList.remove('is-on');
    el['vn-flashback'].classList.remove('is-on');
    el['vn-flash'].classList.remove('is-on');
    el['screen-game'].classList.remove('is-flashback', 'is-card', 'is-shake');
    el['speaker'].classList.add('is-hidden');
    el['dialogue-text'].textContent = '';
    el['caret'].classList.remove('is-on');
    hideCard(true);
  }


  /* ============================================================
     工具层（本作要用到的演出件）：
       place    地点标注   { place: '教学楼 · 走廊' }
       affinity 好感浮现   { affinity: { who, value, label } } / { who, online, real, label }
       ui       界面浮层   { ui: { type:'memo'|'chat'|'post'|'note'|'who'|'cast', ... } } / { ui:'off' }
       chars    立绘       { chars: [ { id, src, pos:'left'|'center'|'right' } ] } / { chars: [] }
       choice   选项       { choice: { prompt, options: [ { text, note, goto, flag, aff } ] } }
       label/goto/if       跳转与条件
     ============================================================ */
  var CHAR_MAP = {
    '小郑': 'tong', '桐桐': 'tong', '郑桐': 'tong',
    '小帅': 'shuai',
    '阿松': 'song', '松饼上的灰': 'song'
  };

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function setPlace(step) {
    var host = el['vn-place'];
    if (!host || step.place === undefined) return;
    if (!step.place) { host.classList.remove('is-on'); return; }
    host.textContent = step.place;
    host.classList.add('is-on');
  }

  function setAffinity(step) {
    var host = el['vn-affinity'];
    if (!host || step.affinity === undefined) return;
    global.clearTimeout(state.affTimer);
    var a = step.affinity;
    if (!a) { host.classList.remove('is-on'); return; }
    var html = '<span class="aff-who">' + escHtml(a.who) + '</span>';
    if (a.online !== undefined || a.real !== undefined) {
      html += '<span class="aff-row"><em>线上</em><b>' + escHtml(a.online) + '</b></span>' +
              '<span class="aff-row"><em>现实</em><b>' + escHtml(a.real) + '</b></span>';
    } else {
      html += '<span class="aff-val">' + escHtml(a.value) + '</span>';
    }
    html += '<span class="aff-label">' + escHtml(a.label || '') + '</span>';
    host.innerHTML = html;
    host.classList.add('is-on');
    state.affTimer = global.setTimeout(function () { host.classList.remove('is-on'); }, a.hold || 3200);
  }

  function setChars(step, instant) {
    var layer = el['vn-chars'];
    if (!layer || step.chars === undefined) return;
    var list = step.chars;
    if (!list || !list.length) {
      layer.innerHTML = '';
      layer.classList.remove('is-on');
      return;
    }
    layer.innerHTML = list.map(function (c) {
      return '<img class="vn-char" data-cid="' + escHtml(c.id || '') + '" data-pos="' + (c.pos || 'center') + '" data-style="' + (c.style || 'card') + '" src="' + escHtml(c.src) + '" alt="" />';
    }).join('');
    layer.classList.add('is-on');
    if (!instant) Sfx.click();
  }

  /* 谁在说话，谁的立绘就亮起来（图1／图2 那种感觉） */
  function highlightSpeaker(who) {
    var layer = el['vn-chars'];
    if (!layer) return;
    var nodes = layer.querySelectorAll('.vn-char');
    if (!nodes.length) return;
    var id = CHAR_MAP[who] || '';
    var hit = false;
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].getAttribute('data-cid') === id) hit = true;
    }
    for (var j = 0; j < nodes.length; j++) {
      var n = nodes[j];
      var on = hit && n.getAttribute('data-cid') === id;
      n.classList.toggle('is-speaking', on);
      n.classList.toggle('is-dim', hit && !on);
    }
  }

  function uiHtml(ui) {
    var body = '', cls = 'ui-panel';
    if (ui.type === 'memo') {
      cls = 'ui-phone';
      body = '<div class="ui-memo">' + (ui.lines || []).map(function (l) {
        return l === '' ? '<div class="ui-memo-line is-blank"></div>'
                        : '<div class="ui-memo-line">' + escHtml(l) + '</div>';
      }).join('') + '</div>';
    } else if (ui.type === 'chat') {
      cls = 'ui-phone';
      body = '<div class="ui-chat">' + (ui.msgs || []).map(function (m) {
        return '<div class="ui-msg' + (m.me ? ' is-me' : '') + '">' +
                 (m.who ? '<div class="ui-who">' + escHtml(m.who) + '</div>' : '') +
                 '<div class="ui-bubble">' + escHtml(m.text) + '</div></div>';
      }).join('') + '</div>';
    } else if (ui.type === 'post') {
      cls = 'ui-phone';
      body = '<div class="ui-post">' +
               '<div class="ui-post-user">' + escHtml(ui.user) + '</div>' +
               '<div class="ui-post-time">' + escHtml(ui.time || '') + '</div>' +
               '<div class="ui-post-text">' + escHtml(ui.text) + '</div></div>';
    } else if (ui.type === 'note') {
      body = '<div class="ui-note">' + (ui.lines || []).map(function (l) {
        return '<div class="ui-note-line">' + escHtml(l) + '</div>';
      }).join('') + '</div>';
    } else if (ui.type === 'who') {
      body = '<div class="ui-who-card">' +
               (ui.img ? '<img class="ui-who-img" src="' + escHtml(ui.img) + '" alt="" />' : '') +
               '<div class="ui-who-info">' +
                 '<div class="ui-who-name">' + escHtml(ui.name) + '</div>' +
                 (ui.aff !== undefined ? '<div class="ui-who-aff"><b>' + escHtml(ui.aff) + '</b><em>' + escHtml(ui.label || '') + '</em></div>' : '') +
                 (ui.rel ? '<div class="ui-who-rel">' + escHtml(ui.rel) + '</div>' : '') +
                 (ui.note ? '<div class="ui-who-note">' + escHtml(ui.note) + '</div>' : '') +
               '</div></div>';
    } else if (ui.type === 'cast') {
      body = '<div class="ui-cast">' + (ui.rows || []).map(function (r) {
        return '<div class="ui-cast-row">' +
                 (r.img ? '<img class="ui-cast-img" src="' + escHtml(r.img) + '" alt="" />' : '') +
                 '<div class="ui-cast-main">' +
                   '<div class="ui-cast-name">' + escHtml(r.name) + '</div>' +
                   '<div class="ui-cast-rel">' + escHtml(r.rel || '') + '</div>' +
                 '</div>' +
                 '<div class="ui-cast-aff"><b>' + escHtml(r.aff) + '</b><em>' + escHtml(r.label || '') + '</em></div>' +
               '</div>';
      }).join('') + '</div>';
    }
    return '<div class="' + cls + '">' + (ui.title ? '<div class="ui-bar">' + escHtml(ui.title) + '</div>' : '') + body + '</div>';
  }

  function setUi(step) {
    var host = el['vn-ui'];
    if (!host || step.ui === undefined) return;
    var ui = step.ui;
    if (!ui || ui === 'off') { host.classList.remove('is-on'); host.innerHTML = ''; return; }
    host.setAttribute('data-type', ui.type || 'panel');
    host.innerHTML = uiHtml(ui);
    host.classList.add('is-on');
  }


  /* ---------------- 好感增减 + 弹出提示 ----------------
     { aff: { tong: 1 } }        好感 +1，自动浮现新数值
     { notice: '好感度 +1' }     右上/底部弹一个提示条 */
  var AFF_NAME = { tong: '小郑', song: '阿松', shuai: '小帅' };

  function applyAff(delta) {
    var keys = Object.keys(delta || {});
    if (!keys.length) return;
    keys.forEach(function (k) {
      var cur = typeof state.aff[k] === 'number' ? state.aff[k] : 0;
      state.aff[k] = Math.max(0, Math.min(100, cur + delta[k]));
    });
    var k0 = keys[0];
    setAffinity({ affinity: { who: AFF_NAME[k0] || k0, value: state.aff[k0], label: state.affLabel[k0] || '', hold: 3200 } });
  }
  /* ---------------- 选项 / 跳转 ---------------- */
  function labelIndex(label) {
    for (var i = 0; i < state.steps.length; i++) {
      if (state.steps[i] && state.steps[i].label === label) return i;
    }
    return -1;
  }

  function showChoice(cfg) {
    var host = el['vn-choice'];
    if (!host) return;
    state.choice = cfg;
    state.choosing = true;
    if (el['vn-ui']) el['vn-ui'].classList.remove('is-on');
    var html = cfg.prompt ? '<div class="choice-prompt">' + escHtml(cfg.prompt) + '</div>' : '';
    html += '<div class="choice-list">' + (cfg.options || []).map(function (o, i) {
      return '<button class="choice-btn" type="button" data-choice="' + i + '">' +
             '<span class="choice-key">' + (i + 1) + '</span>' +
             '<span class="choice-body"><span class="choice-text">' + escHtml(o.text) + '</span>' +
             (o.note ? '<span class="choice-note">' + escHtml(o.note) + '</span>' : '') + '</span></button>';
    }).join('') + '</div>';
    if (GAL.Config && GAL.Config.choiceConfirm) {
      html += '<div class="choice-confirm">再点一次确认 · 或按数字键 ' + (cfg.options || []).map(function (o, i) { return i + 1; }).join('/') + '</div>';
    }
    host.innerHTML = html;
    host.classList.add('is-on');

    /* 防误触 1/3：面板刚弹出的 380ms 内不响应（挡住"顺手点屏推进"那一下） */
    state.choicePick = -1;
    state.choiceReady = false;
    if (state.choiceLock) global.clearTimeout(state.choiceLock);
    state.choiceLock = global.setTimeout(function () { state.choiceReady = true; }, 380);

    /* 防误触 2/3：手指划动超过 16px 不算点击（滑动/拖拽不选） */
    var dX = 0, dY = 0;
    host.onpointerdown = function (ev) { dX = ev.clientX || 0; dY = ev.clientY || 0; };
    host.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (!state.choiceReady) return;
      if (ev.clientX !== undefined && (Math.abs((ev.clientX || 0) - dX) > 16 || Math.abs((ev.clientY || 0) - dY) > 16)) return;
      var node = ev.target;
      while (node && node !== host && !(node.getAttribute && node.getAttribute('data-choice') !== null)) node = node.parentNode;
      if (!node || node === host) return;
      var idx = parseInt(node.getAttribute('data-choice'), 10);

      /* 防误触 3/3（可选）：GAL.Config.choiceConfirm = true 时才需要点两次 */
      if (GAL.Config && GAL.Config.choiceConfirm && state.choicePick !== idx) {
        state.choicePick = idx;
        Array.prototype.forEach.call(host.querySelectorAll('.choice-btn'), function (b) {
          b.classList.toggle('is-picked', parseInt(b.getAttribute('data-choice'), 10) === idx);
        });
        var hint = host.querySelector('.choice-confirm');
        if (hint) hint.classList.add('is-on');
        Sfx.click();
        return;
      }
      pickChoice(idx);
    };
  }

  function hideChoice() {
    var host = el['vn-choice'];
    state.choosing = false;
    state.choice = null;
    state.choicePick = -1;
    state.choiceReady = false;
    if (state.choiceLock) { global.clearTimeout(state.choiceLock); state.choiceLock = null; }
    if (host) { host.classList.remove('is-on'); host.innerHTML = ''; }
  }

  function pickChoice(i) {
    if (!state.choosing) return;
    var cfg = state.choice || { options: [] };
    var opt = (cfg.options || [])[i];
    if (!opt) return;
    var from = state.index;
    hideChoice();
    if (opt.flag) state.flags[opt.flag] = true;
    if (opt.aff) applyAff(opt.aff);
    if (opt.notice) GAL.toast(opt.notice, 'ok');
    if (opt.goto) {
      var gi = labelIndex(opt.goto);
      if (gi < 0) { GAL.toast('剧本缺少标记：' + opt.goto, 'error'); return; }
      exec(gi, false);
      return;
    }
    exec(from + 1, false);
  }
  /* ---------------- 执行步骤 ---------------- */
  /* replay=true 表示"只是把状态倒回去"（点上一句 / 读档）：
     只恢复持续性状态（背景 / CG / 立绘 / 辉光 / 闪回滤镜），
     绝不重放一次性演出（章节卡、白闪、震屏、BUG 乱码）——
     否则点一下"上一句"就会闪出"第一章"章节卡和白光。 */
  function applyVisual(step, instant, replay) {
    var oneShot = !!replay;

    if (step.card != null && !oneShot) {
      showCard(step, instant);
      /* 章节卡播完自动收掉 */
      state.cardTimer = global.setTimeout(function () { hideCard(false); }, instant ? 0 : (step.hold || 1800));
    }
    if (step.bg) setBg(step, instant);
    if (step.cg) setCg(step, instant);
    if (step.cgOff) closeCg(instant);
    if (step.char !== undefined) setChar(step, instant);
    if (step.chars !== undefined) setChars(step, instant);
    if (step.place !== undefined) setPlace(step);
    if (step.ui !== undefined) setUi(step);
    if (step.affinity !== undefined && !oneShot) setAffinity(step);
    if (step.aff && !oneShot) applyAff(step.aff);
    if (step.notice && !oneShot) GAL.toast(step.notice, step.noticeKind || 'ok');
    if (step.flash && !oneShot) flash(step.flash, step.dur);
    if (step.shake && !oneShot) shake(step.shake);
    if (step.fx && (!oneShot || step.fx !== 'glitch')) setFx(step.fx, step.dur);
  }

  /* 从 index 开始推进，直到停在需要点击的台词上 */
  function exec(index, instant) {
    clearTimers();
    var guard = 0;
    while (index < state.steps.length) {
      if (guard++ > 500) break;
      var step = state.steps[index];

      if (step.label != null) { index++; continue; }
      if (step['if']) {
        if (state.flags[step['if']]) {
          var ii = labelIndex(step.goto);
          if (ii < 0) { GAL.toast('剧本缺少标记：' + step.goto, 'error'); return false; }
          index = ii; continue;
        }
        index++; continue;
      }
      if (step.goto) {
        var gi = labelIndex(step.goto);
        if (gi < 0) { GAL.toast('剧本缺少标记：' + step.goto, 'error'); return false; }
        index = gi; continue;
      }
      if (step.choice) {
        state.index = index;
        showChoice(step.choice);
        return false;
      }

      if (typeof step.text === 'string') {
        state.index = index;
        renderText(step, instant);
        return true;
      }

      if (step.end) {
        state.index = index;
        showEnd(step.end);
        return false;
      }

      /* 章节卡：先单独停留 hold 毫秒，再接下一句（点击可提前跳过） */
      if (step.card != null && !instant && step.hold) {
        applyVisual(step, false);
        state.index = index;
        state.waitTimer = global.setTimeout(function () { exec(index + 1, false); }, step.hold);
        return false;
      }

      if (typeof step.wait === 'number' && !instant) {
        applyVisual(step, false);
        state.index = index;
        state.waitTimer = global.setTimeout(function () { exec(index + 1, false); }, step.wait);
        return false;
      }

      applyVisual(step, instant);
      index++;
    }
    state.index = state.steps.length;
    showEnd(null);
    return false;
  }

  /* ---------------- 台词 ---------------- */
  /* 没有 who 的台词也要在名牌上给出标注 */
  function labelOf(step) {
    if (step.who) return step.who;
    var kind = step.kind || 'narration';
    if (kind === 'inner' || kind === 'inner-strong') return '主角 · 内心';
    if (kind === 'memory') return '回忆';
    return '旁白';
  }

  function renderText(step, instant) {
    state.fullText = step.text;
    state.ended = false;
    var kind = step.kind || (step.who ? 'say' : 'narration');
    var nameEl = el['speaker'];

    var label = labelOf(step);
    nameEl.textContent = label;
    nameEl.classList.remove('is-hidden');
    nameEl.dataset.kind = kind;

    highlightSpeaker(label);
    var box = el['vn-box'];
    box.dataset.kind = kind;
    box.classList.remove('is-ended');

    if (!state.seen[state.index]) {
      state.seen[state.index] = true;
      state.log.push({ who: step.who || '', kind: kind, text: step.text, index: state.index });
    }

    updateProgress();

    var delay = (instant || state.skip) ? 0 : GAL.textDelay();
    var node = el['dialogue-text'];
    global.clearTimeout(state.typeTimer);
    node.textContent = '';
    el['caret'].classList.remove('is-on');

    if (delay <= 0) {
      node.textContent = step.text;
      state.typing = false;
      el['caret'].classList.add('is-on');
      onLineDone();
      return;
    }

    state.typing = true;
    var i = 0, tick = 0;
    (function step_() {
      if (i >= step.text.length) {
        state.typing = false;
        el['caret'].classList.add('is-on');
        onLineDone();
        return;
      }
      node.textContent += step.text.charAt(i++);
      if (++tick % 4 === 0 && Sfx && Sfx.type) Sfx.type();
      state.typeTimer = global.setTimeout(step_, delay);
    })();
  }

  function finishTyping() {
    global.clearTimeout(state.typeTimer);
    el['dialogue-text'].textContent = state.fullText;
    state.typing = false;
    el['caret'].classList.add('is-on');
    onLineDone(true);
  }

  /* 一句显示完成后：处理 自动 / 跳过 */
  function onLineDone(wasFinish) {
    clearTimeout(state.timer);
    if (state.ended) return;
    if (state.skip) {
      state.timer = global.setTimeout(function () { advance(); }, 90);
    } else if (state.auto && !wasFinish) {
      var wait = 700 + state.fullText.length * 62;
      state.timer = global.setTimeout(function () { advance(); }, wait);
    } else if (state.auto && wasFinish) {
      var w2 = 500 + state.fullText.length * 40;
      state.timer = global.setTimeout(function () { advance(); }, w2);
    }
  }

  /* ---------------- 章节结束 ---------------- */
  function showEnd(info) {
    clearTimers();
    state.ended = true;
    state.typing = false;
    var box = el['vn-box'];
    box.classList.add('is-ended');
    el['caret'].classList.remove('is-on');
    var title = (info && info.title) || '本章结束';
    var sub = (info && info.sub) || '';
    el['speaker'].classList.add('is-hidden');
    state.nextChapter = (info && info.next) || null;
    el['dialogue-text'].textContent = state.nextChapter
      ? '（本章结束 · 点击画面继续）'
      : '（本章结束 · 点击画面返回标题）';
    showCard({ card: title, sub: sub, hold: 2600 }, false);
    el['screen-game'].classList.remove('is-card');   /* 结尾保留提示行 */
    updateProgress();
  }

  /* ---------------- 对外的操作 ---------------- */
  function advance() {
    if (state.ended) {
      if (state.nextChapter) {          /* 剧本里写了 next：直接接下一章 */
        var nx = state.nextChapter;
        state.nextChapter = null;
        start(nx, 0);
        return;
      }
      if (typeof GAL.VN.onFinish === 'function') GAL.VN.onFinish();
      return;
    }
    if (state.choosing) return;
    if (state.typing) { finishTyping(); return; }
    Sfx.click();
    exec(state.index + 1, false);
  }

  function back() {
    var i = state.index - 1;
    while (i >= 0 && typeof state.steps[i].text !== 'string') i--;
    if (i < 0) { GAL.toast('已经是第一句了'); Sfx.error(); return; }
    Sfx.cancel();
    replayTo(i);
    exec(i, false);
  }

  function replayTo(target) {
    resetVisual();
    state.log = [];
    state.seen = {};
    for (var i = 0; i < target && i < state.steps.length; i++) {
      var s = state.steps[i];
      if (typeof s.text === 'string') {
        state.seen[i] = true;
        state.log.push({ who: s.who || '', kind: s.kind || (s.who ? 'say' : 'narration'), text: s.text, index: i });
        continue;
      }
      if (s.end) continue;
      if (typeof s.wait === 'number') continue;
      applyVisual(s, true, true);      /* replay：只恢复状态，不重放一次性演出 */
    }
  }

  function repeat() {
    var step = state.steps[state.index];
    if (!step || typeof step.text !== 'string') { Sfx.error(); return; }
    Sfx.click();
    renderText(step, false);
  }

  function setAuto(on) {
    state.auto = !!on;
    if (state.auto) state.skip = false;
    $$('[data-action="vn-auto"]').forEach(function (b) { b.classList.toggle('is-active', state.auto); });
    $$('[data-action="vn-skip"]').forEach(function (b) { b.classList.toggle('is-active', state.skip); });
    GAL.toast(state.auto ? '自动播放：开' : '自动播放：关');
    if (state.auto && !state.typing) onLineDone(true);
  }

  function setSkip(on) {
    state.skip = !!on;
    if (state.skip) state.auto = false;
    $$('[data-action="vn-auto"]').forEach(function (b) { b.classList.toggle('is-active', state.auto); });
    $$('[data-action="vn-skip"]').forEach(function (b) { b.classList.toggle('is-active', state.skip); });
    GAL.toast(state.skip ? '跳过中……' : '跳过：关');
    if (state.skip) {
      if (state.typing) finishTyping();
      else advance();
    }
  }

  function pause() {
    clearTimers();
  }

  function renderLog() {
    var body = el['log-body'];
    if (!body) return;
    body.textContent = '';
    if (!state.log.length) {
      var empty = document.createElement('p');
      empty.className = 'log-empty';
      empty.textContent = '还没有已读的台词。';
      body.appendChild(empty);
      return;
    }
    state.log.forEach(function (item, i) {
      var row = document.createElement('div');
      row.className = 'log-row';
      row.dataset.kind = item.kind;
      var who = document.createElement('span');
      who.className = 'log-who';
      who.textContent = item.who || '旁白';
      var txt = document.createElement('span');
      txt.className = 'log-text';
      txt.textContent = item.text;
      row.appendChild(who);
      row.appendChild(txt);
      body.appendChild(row);
      if (i === state.log.length - 1) {
        global.setTimeout(function () { row.scrollIntoView({ block: 'nearest' }); }, 30);
      }
    });
    global.setTimeout(function () { body.scrollTop = body.scrollHeight; }, 40);
  }

  /* ---------------- 存档接口 ---------------- */
  function saveState() {
    var step = state.steps[state.index] || {};
    var p = progressOf(state.index);
    return {
      chapterId: state.chapterId,
      chapter: state.chapterTitle,
      step: state.index,
      speaker: step.who || '',
      text: step.text || state.fullText || '',
      kind: step.kind || '',
      line: Math.max(0, p.now - 1),
      total: p.total,
      progress: p.total ? p.now / p.total : 0,
      scene: state.chapterId,
      flags: state.flags
    };
  }

  function start(chapterId, step) {
    cache();
    if (!state.flags) state.flags = {};      /* 中途跳步进来时也要有标记表 */
    var chapters = GAL.Chapters || {};
    var ch = chapters[chapterId] || chapters[(GAL.chapterOrder || [])[0]];
    if (!ch) { GAL.toast('剧本缺失', 'error'); return; }
    if (!chapters[chapterId]) chapterId = ch.id;

    state.chapterId = ch.id;
    state.chapterTitle = ch.title;
    state.steps = ch.steps;
    state.auto = state.skip = false;
    state.ended = false;
    state.log = [];
    state.seen = {};
    $$('[data-action="vn-auto"],[data-action="vn-skip"]').forEach(function (b) { b.classList.remove('is-active'); });

    if (el['hud-chapter']) el['hud-chapter'].textContent = ch.title;

    preloadChapter();              /* 本章素材提前拉，读到那一句时基本已就绪 */

    var target = (typeof step === 'number' && step >= 0 && step < ch.steps.length) ? step : 0;

    /* 从头开一章 = 新一轮：清掉分支标记，好感回到角色表的初值 */
    if (!target) {
      state.flags = {};
      state.aff = { tong: 40, song: 15, shuai: 0 };
      state.affLabel = { tong: '普通朋友', song: '网友', shuai: '未认识' };
      var C0 = GAL.Cast || {};
      ['tong', 'song', 'shuai'].forEach(function (k) {
        if (C0[k]) {
          if (typeof C0[k].aff === 'number') state.aff[k] = C0[k].aff;
          if (C0[k].affLabel) state.affLabel[k] = C0[k].affLabel;
        }
      });
    }
    if (target > 0) {
      replayTo(target);
      exec(target, false);
    } else {
      resetVisual();
      exec(0, false);
    }
    updateProgress();
  }

  var VN = {
    state: state,
    cache: cache,
    start: start,
    advance: advance,
    back: back,
    repeat: repeat,
    setAuto: setAuto,
    setSkip: setSkip,
    toggleAuto: function () { setAuto(!state.auto); },
    toggleSkip: function () { setSkip(!state.skip); },
    pause: pause,
    renderLog: renderLog,
    saveState: saveState,
    onFinish: null,
    isEnded: function () { return state.ended; },
    actions: {
      'vn-repeat': function () { repeat(); },
      'vn-auto': function () { VN.toggleAuto(); },
      'vn-skip': function () { VN.toggleSkip(); },
      'vn-config': function () { GAL.VN.pause(); Sfx.click(); GAL.openSettings && GAL.openSettings(); },
      'vn-log': function () { renderLog(); Sfx.click(); GAL.Modal.open('modal-log'); },
      'vn-back': function () { back(); },
      'vn-forward': function () { advance(); }
    }
  };
  GAL.VN = VN;
  GAL.VN.pick = pickChoice;
  GAL.VN.chars = function (list) { setChars({ chars: list }, false); };
  GAL.VN.restore = function (data) { if (data && data.flags) state.flags = data.flags; };
})(window);
