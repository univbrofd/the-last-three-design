/* ============================================================================
   the last three — AppFlow prototype / shell
   Flutter 実装の GetX 状態 + ルーティングを、そのままブラウザで動かす層。
   画面の描画は screens.js (LT3.screens) が持つ。
   ・状態は PartnerStateService / MainController などの写し
   ・データは data/mock.js (assets/mock からの一方向生成物)
   ========================================================================== */
(function (global) {
  'use strict';

  var M = global.LT3_MOCK;
  var LT3 = global.LT3 = global.LT3 || {};

  /* ---- utils ------------------------------------------------------------ */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function h(sel, attrs) { /* 使わない: 文字列 HTML を組む方針 */ }
  LT3.esc = esc;

  /* ---- media (image-slot: 写真枠へドロップした実写を localStorage に残す) --- */
  var MEDIA_KEY = 'lt3.appflow.media';
  /* 同杴してある既定の実写。レポートの「相手の理想像」はここから出る。
     ユーザーが枠に入れた写真（localStorage）があればそれが優先される */
  var MEDIA_DEFAULTS = {
    'report/0': 'assets/ideal/01-night.jpg',   // 夜にだけ灯る人
    'report/1': 'assets/ideal/02-kitchen.jpg', // 台所に立つ人
    'report/2': 'assets/ideal/03-morning.jpg', // 朝がいちばん元気な人
    // Main の 3 枠に載るお題投稿（今日のお題「平日の昼ごはん」）と、自分が出した 1 枚。
    // Unsplash のフリー素材（License: free to use）を assets/posts/ に同梱。
    'partner/azumi/latest': 'assets/posts/lunch-azumi.jpg',  // まかないの残りで。
    'partner/nosuke/latest': 'assets/posts/shop-nosuke.jpg', // 今日も同じ店。
    'partner/mio/latest': 'assets/posts/desk-mio.jpg',       // 退色の見本になる枠
    'me/today': 'assets/posts/lunch-me.jpg',                 // 自分の 1 枚（タブに出る）
  };
  LT3.mediaDefaults = MEDIA_DEFAULTS;
  var media = {};
  try { media = JSON.parse(localStorage.getItem(MEDIA_KEY) || '{}'); } catch (e) { media = {}; }
  function saveMedia() {
    try { localStorage.setItem(MEDIA_KEY, JSON.stringify(media)); } catch (e) { /* quota: 揮発でよい */ }
  }
  LT3.media = {
    get: function (key) { return media[key] || MEDIA_DEFAULTS[key] || ''; },
    set: function (key, url) { media[key] = url; saveMedia(); render(); },
    clear: function () { media = {}; saveMedia(); render(); },
  };

  /* ---- state (Flutter: PartnerStateService / MainController の写し) ------ */
  var state = LT3.state = {
    route: 'splash',
    args: {},
    stack: [],

    tab: 0,                  // MainController.tabIndex
    slotCount: 3,            // 埋まっている枠の数 (3 未満は AI 分析レポートが占める)
    fading: true,            // 3 人目が退色しているか (絆ゲージ途絶の接近)
    countdown: 20892,        // releaseSeconds (Partner.releaseSeconds)

    likes: {},               // 'pairId/likeKey' -> bool
    replies: {},             // pairId -> 送信したリプライ (末尾に積む)
    theme: M.todayTheme,     // TodayTheme (null = 受付終了)
    posted: false,           // 自分が今日のお題を出したか
    myPost: null,            // PartnerPost (出した 1 枚)

    me: M.myProfile,
    basics: JSON.parse(JSON.stringify(M.myProfile.basics)),
    persona: M.persona,

    draft: {},               // 入力欄の値 (再描画で消えないよう state に置く)
    sheet: null,             // 'rename' | 'debug'
    viewer: null,            // 全画面ビューア中の media key
    showAllPosts: false,
    reportIndex: 0,
    busy: {},                // isSaving / isPosting など
    error: {},

    camera: { rec: false, progress: 0 },
    onb: null,               // オンボーディング進行 (screens.js が作る)
  };

  /* ---- 派生 (Flutter の getter 相当) ------------------------------------ */
  LT3.partners = function () {
    return M.partners.slice(0, state.slotCount).map(function (p) {
      var faded = state.fading && p.isFading;
      return Object.assign({}, p, { isFading: faded });
    });
  };
  LT3.partnerById = function (id) {
    return LT3.partners().filter(function (p) { return p.id === id; })[0] || null;
  };
  LT3.entriesFor = function (id) {
    var base = (M.timelines[id] || []).slice();
    return base.concat(state.replies[id] || []);
  };
  LT3.isLiked = function (pairId, key) {
    var k = pairId + '/' + key;
    if (state.likes[k] != null) return state.likes[k];
    var e = (M.timelines[pairId] || []).filter(function (x) { return x.likeKey === key; })[0];
    return !!(e && e.liked);
  };
  LT3.toggleLike = function (pairId, key) {
    state.likes[pairId + '/' + key] = !LT3.isLiked(pairId, key);
    render();
  };

  /* ---- routing (GetX: Get.toNamed / Get.back / Get.offAllNamed) --------- */
  function go(route, args) {
    state.stack.push({ route: state.route, args: state.args });
    state.route = route;
    state.args = args || {};
    afterRoute();
  }
  function replace(route, args) {
    state.route = route;
    state.args = args || {};
    afterRoute();
  }
  function offAll(route, args) {
    state.stack = [];
    replace(route, args);
  }
  function back() {
    var prev = state.stack.pop();
    if (!prev) return;
    state.route = prev.route;
    state.args = prev.args;
    afterRoute();
  }
  function afterRoute() {
    clearTimers();
    state.error = {};
    state.sheet = null;
    state.viewer = null;
    var s = LT3.screens[state.route];
    if (s && s.enter) s.enter(state);
    render();
    var el = document.getElementById('screen');
    if (el) el.scrollTop = 0;
  }
  LT3.go = go; LT3.replace = replace; LT3.offAll = offAll; LT3.back = back;

  /* ---- timers (Timer.periodic の写し。route を出るとき必ず止める) ------- */
  var timers = [];
  function every(ms, fn) { var id = setInterval(fn, ms); timers.push(id); return id; }
  function after(ms, fn) { var id = setTimeout(fn, ms); timers.push(id); return id; }
  function clearTimers() {
    timers.forEach(function (id) { clearInterval(id); clearTimeout(id); });
    timers = [];
  }
  LT3.every = every; LT3.after = after; LT3.clearTimers = clearTimers;

  /* ---- 共通パーツ ------------------------------------------------------- */

  /// WdPhotoSlot。mediaUrl があれば実写、無ければ design 準拠の枠 + ラベル。
  /// key を持たせると画像をドロップして差し込める (プロトタイプ専用の仕掛け)。
  LT3.photo = function (key, opt) {
    opt = opt || {};
    var url = (key ? LT3.media.get(key) : '') || opt.src || '';
    var cls = 'slot';
    if (opt.faded) cls += ' is-faded';
    var inner = url
      ? '<img src="' + esc(url) + '" alt="">'
      : '<div class="ph">' + esc(opt.label || '') + '</div>';
    return '<div class="' + cls + '"' + (key ? ' data-slot="' + esc(key) + '"' : '') + '>' +
      inner + (opt.grain ? '<div class="grain"></div>' : '') +
      (!url && key ? '<div class="drop-hint">DROP PHOTO</div>' : '') + '</div>';
  };

  /// WdInitialAvatar。アイコン写真が無ければ頭文字 1 文字 (灯り色 = 絆が生きている印)。
  LT3.avatar = function (initial, opt) {
    opt = opt || {};
    var size = opt.size || 28;
    var fs = opt.fontSize || size / 2;
    var url = opt.key ? LT3.media.get(opt.key) : '';
    return '<div class="avatar' + (opt.lit === false ? ' is-dim' : '') + '" style="width:' + size + 'px;height:' + size + 'px"' +
      (opt.key ? ' data-slot="' + esc(opt.key) + '"' : '') + '>' +
      (url ? '<img src="' + esc(url) + '" alt="">'
           : '<span style="font-size:' + fs + 'px">' + esc(initial) + '</span>') + '</div>';
  };

  /// アイコン一式 = Material Symbols Rounded (Kaiwa の唯一のアイコン体系)。
  /// 手描き SVG は置かない。FILL 軸が状態を持つ: 1 = 選択中 / 0 = 待機・メタ。
  /// サイズはトークンの 18 / 22 / 26 / 32。当たり判定 44 は呼ぶ側の器が持つ。
  var GLYPH = {
    home:    ['home', 26],
    person:  ['person', 26],
    camera:  ['photo_camera', 26],
    photo:   ['image', 22],
    plane:   ['send', 22],
    back:    ['arrow_back_ios_new', 22],
    chevron: ['chevron_right', 22],
    close:   ['close', 22],
    swap:    ['cameraswitch', 22],
    reply:   ['reply', 22],
    edit:    ['edit_square', 18],
    heart:   ['favorite', 22],
    down:    ['expand_more', 22],
  };
  function iconSvg(name, color, size, filled) {
    var g = GLYPH[name];
    if (!g) return '';
    var px = size || g[1];
    return '<span class="msr" aria-hidden="true" style="font-size:' + px + 'px;color:' + (color || 'currentColor') +
      ";font-variation-settings:'FILL' " + (filled ? 1 : 0) + ",'wght' 400,'GRAD' 0,'opsz' " + px + '">' + g[0] + '</span>';
  }
  LT3.iconSvg = iconSvg;
  LT3.iconNames = Object.keys(GLYPH);
  LT3.icon = {};
  LT3.iconFill = {};
  LT3.iconNames.forEach(function (name) {
    LT3.icon[name] = function (color, size) { return iconSvg(name, color, size); };
    LT3.iconFill[name] = function (color, size) { return iconSvg(name, color, size, true); };
  });
  LT3.icon.heartFill = function (color, size) { return iconSvg('heart', color, size, true); };

  /// ロゴマーク「三つの灯り」。灯り 3 点 + 囲みのヘアライン。
  /// 灯りは Kaiwa green 1 色。消えている灯りは輪郭だけ = 空き枠の表し方と同じ。
  LT3.mark = function (opt) {
    opt = opt || {};
    var size = opt.size || 64;
    var lit = opt.lit == null ? 3 : opt.lit;
    var hair = Math.max(0.36, 24 / size); // 実寸 1px のヘアライン
    var pts = [[12, 5.8], [6.63, 15.1], [17.37, 15.1]];
    var body = opt.ring === false ? ''
      : '<circle cx="12" cy="12" r="10.6" fill="none" stroke="' + (opt.ringColor || '#DFE3E6') +
        '" stroke-width="' + hair + '"/>';
    pts.forEach(function (p, i) {
      var on = i < lit;
      var st = opt.stagger ? ' class="lightup" style="animation-delay:' + (812 + i * 196) + 'ms"' : '';
      body += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.25"' +
        (on ? ' fill="' + (opt.color || '#0EAE63') + '"'
            : ' fill="none" stroke="#C7CCD1" stroke-width="' + hair + '"') + st + '/>';
    });
    return '<svg class="mark" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' + body + '</svg>';
  };

  /// ワードマーク。M PLUS Rounded 1c 800 の小文字組みで、"three" だけ Kaiwa green。
  LT3.wordmark = function (opt) {
    opt = opt || {};
    return '<div class="wordmark" style="font-size:' + (opt.size || 32) + 'px">the last <i>three</i></div>';
  };

  /* ---- render ----------------------------------------------------------- */
  function render() {
    var screen = document.getElementById('screen');
    if (!screen) return;
    var s = LT3.screens[state.route];
    var html = s ? s.view(state) : '<div class="lt3-view"></div>';
    if (state.viewer != null) {
      html += '<div class="viewer lt3-tap" data-act="closeViewer">' + LT3.photo(state.viewer, { label: '' }) + '</div>';
    }
    if (state.sheet) html += sheetHtml(state.sheet);
    screen.innerHTML = html;
    restoreInputs(screen);
    if (s && s.after) s.after(state, screen);
    renderPanel();
  }
  LT3.render = render;

  function sheetHtml(kind) {
    var s = LT3.screens[state.route];
    var body = (s && s.sheet) ? s.sheet(state, kind) : '';
    return '<div class="sheet-mask" data-act="closeSheet"><div class="sheet-panel" data-stop="1">' + body + '</div></div>';
  }

  /* 入力欄は再描画で値が飛ぶので state.draft から書き戻し、フォーカスも復元する */
  var focusKey = null;
  function restoreInputs(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-model]'), function (el) {
      var k = el.getAttribute('data-model');
      el.value = state.draft[k] || '';
      if (k === focusKey) {
        el.focus();
        try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* number 型など */ }
      }
    });
  }

  /* ---- events ----------------------------------------------------------- */
  function actionsOf() {
    var s = LT3.screens[state.route];
    return (s && s.actions) || {};
  }

  document.addEventListener('click', function (e) {
    var slot = e.target.closest && e.target.closest('[data-slot]');
    var el = e.target.closest && e.target.closest('[data-act]');
    if (el) {
      var stop = e.target.closest('[data-stop]');
      var act = el.getAttribute('data-act');
      var arg = el.getAttribute('data-arg');
      if (act === 'closeSheet' && stop) return;
      var fn = actionsOf()[act] || globalActions[act];
      if (fn) { e.preventDefault(); fn(arg, el, e); return; }
    }
    if (slot) pickFile(slot.getAttribute('data-slot'));
  });

  document.addEventListener('input', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-model');
    if (!k) return;
    state.draft[k] = e.target.value;
    focusKey = k;
    var live = e.target.getAttribute('data-live');
    if (live) {
      var fn = actionsOf()[live];
      if (fn) fn(e.target.value, e.target, e);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var submit = e.target.getAttribute && e.target.getAttribute('data-submit');
    if (!submit) return;
    e.preventDefault();
    var fn = actionsOf()[submit];
    if (fn) fn(e.target.value, e.target, e);
  });

  document.addEventListener('focusin', function (e) {
    var k = e.target.getAttribute && e.target.getAttribute('data-model');
    if (k) focusKey = k;
  });

  var globalActions = {
    back: function () { back(); },
    closeSheet: function () { state.sheet = null; render(); },
    closeViewer: function () { state.viewer = null; render(); },
    openViewer: function (key) { state.viewer = key; render(); },
    go: function (route) { go(route); },
  };

  /* 写真枠に実写を入れる (クリックで選択 / ドラッグ&ドロップ) */
  function pickFile(key) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function () { LT3.media.set(key, r.result); };
      r.readAsDataURL(f);
    };
    input.click();
  }
  document.addEventListener('dragover', function (e) {
    var slot = e.target.closest && e.target.closest('[data-slot]');
    if (!slot) return;
    e.preventDefault();
    slot.classList.add('is-over');
  });
  document.addEventListener('dragleave', function (e) {
    var slot = e.target.closest && e.target.closest('[data-slot]');
    if (slot) slot.classList.remove('is-over');
  });
  document.addEventListener('drop', function (e) {
    var slot = e.target.closest && e.target.closest('[data-slot]');
    if (!slot) return;
    e.preventDefault();
    slot.classList.remove('is-over');
    var f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () { LT3.media.set(slot.getAttribute('data-slot'), r.result); };
    r.readAsDataURL(f);
  });

  /* ---- 状態パネル (プロトタイプ専用。Flutter 実装には無い) -------------- */
  var ROUTES = [
    ['splash', 'Splash'], ['login', 'Login'], ['onboarding', 'Onboarding'],
    ['main', 'Main'], ['pair', 'PairTimeline'], ['partner', 'PartnerProfile'],
    ['camera', 'Camera'], ['compose', 'Compose'], ['persona', 'Persona'],
    ['profileEdit', 'ProfileEdit'],
  ];
  function renderPanel() {
    var el = document.getElementById('panel');
    if (!el) return;
    var firstId = (M.partners[0] || {}).id;
    var fadingId = (M.partners[2] || {}).id;
    function btns(items) {
      return '<div class="btns">' + items.map(function (i) {
        return '<button data-panel="' + i[0] + '" data-arg="' + (i[2] == null ? '' : i[2]) + '"' +
          (i[3] ? ' aria-pressed="true"' : '') + '>' + esc(i[1]) + '</button>';
      }).join('') + '</div>';
    }
    el.innerHTML =
      '<h2>PROTOTYPE STATE</h2>' +
      '<div class="grp"><div class="lbl">SCREEN</div>' + btns(ROUTES.map(function (r) {
        return ['route', r[1], r[0], state.route === r[0]];
      })) + '</div>' +
      '<div class="grp"><div class="lbl">SLOTS</div>' + btns([0, 1, 2, 3].map(function (n) {
        return ['slots', n + ' 枠', n, state.slotCount === n];
      })) + '</div>' +
      '<div class="grp"><div class="lbl">BOND</div>' + btns([
        ['fading', '退色あり', '1', state.fading],
        ['fading', '全部 灯り', '0', !state.fading],
      ]) + '</div>' +
      '<div class="grp"><div class="lbl">TODAY\'S THEME</div>' + btns([
        ['theme', '受付中', 'open', !!state.theme && !state.posted],
        ['theme', '投稿済み', 'posted', state.posted],
        ['theme', '受付終了', 'closed', !state.theme],
      ]) + '</div>' +
      '<div class="grp"><div class="lbl">COMPANION</div>' + btns([
        ['persona', 'あり', '1', !!state.persona],
        ['persona', 'なし', '0', !state.persona],
      ]) + '</div>' +
      '<div class="grp"><div class="lbl">PHOTOS</div>' + btns([['clearMedia', '入れた写真を消す', '']]) + '</div>' +
      '<div class="hint">写真枠はクリック / ドラッグ&ドロップで実写を差し込めます (localStorage に残ります)。' +
      'ペア画面は ' + esc(firstId) + '、退色は ' + esc(fadingId) + ' の枠で確認できます。</div>';
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-panel]');
    if (!b) return;
    var kind = b.getAttribute('data-panel');
    var arg = b.getAttribute('data-arg');
    if (kind === 'route') {
      if (arg === 'pair' || arg === 'partner') { state.args = { id: M.partners[0].id }; }
      state.stack = [{ route: 'main', args: {} }];
      replace(arg, state.args);
      return;
    }
    if (kind === 'slots') { state.slotCount = Number(arg); render(); return; }
    if (kind === 'fading') { state.fading = arg === '1'; render(); return; }
    if (kind === 'theme') {
      if (arg === 'open') { state.theme = M.todayTheme; state.posted = false; state.myPost = null; }
      if (arg === 'posted') {
        state.theme = M.todayTheme; state.posted = true;
        state.myPost = { theme: M.todayTheme.theme, meta: M.todayTheme.composeMeta, caption: '', mediaUrl: 'me/today' };
      }
      if (arg === 'closed') { state.theme = null; }
      render(); return;
    }
    if (kind === 'persona') { state.persona = arg === '1' ? M.persona : null; render(); return; }
    if (kind === 'clearMedia') { LT3.media.clear(); return; }
  });

  /* ---- boot ------------------------------------------------------------- */
  /* ?route=main&id=azumi&slots=2&fading=0&theme=posted で任意の状態から開ける
     (スクショ・レビュー用。指定が無ければ splash から通しで動く) */
  LT3.boot = function () {
    var q = new URLSearchParams(location.search);
    if (q.has('slots')) state.slotCount = Number(q.get('slots'));
    if (q.has('fading')) state.fading = q.get('fading') !== '0';
    if (q.has('theme')) {
      var t = q.get('theme');
      if (t === 'closed') state.theme = null;
      if (t === 'posted') {
        state.posted = true;
        state.myPost = { theme: M.todayTheme.theme, meta: M.todayTheme.composeMeta, caption: '', mediaUrl: 'me/today' };
      }
    }
    if (q.has('persona') && q.get('persona') === '0') state.persona = null;
    if (q.has('tab')) state.tab = Number(q.get('tab'));
    var route = q.get('route');
    if (route && LT3.screens[route]) {
      state.stack = [{ route: 'main', args: {} }];
      state.route = route;
      state.args = { id: q.get('id') || M.partners[0].id, index: Number(q.get('index') || 0) };
    }
    afterRoute();
  };
})(window);
