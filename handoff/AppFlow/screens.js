/* ============================================================================
   the last three — AppFlow prototype / screens
   1 画面 = 1 エントリ。view() が HTML を返し、actions が Controller のメソッドに当たる。
   数値・文言は lib/feature 以下の実装から取っている (勝手に足さない・言い換えない)。
   ========================================================================== */
(function (global) {
  'use strict';

  var LT3 = global.LT3;
  var M = global.LT3_MOCK;
  var esc = LT3.esc;
  var photo = LT3.photo;
  var avatar = LT3.avatar;
  var icon = LT3.icon;

  var C = { // Kaiwa のセマンティックトークン（CSS 変数が正。アイコンの color にだけ直値で渡す）
    primary: '#0EAE63', onPrimary: '#FFFFFF', text1: '#14181C',
    text2: '#59626B', text3: '#A4ABB2',
    tabInactive: '#79828B', camDisabled: '#A4ABB2',
    onPhoto: 'rgba(255,255,255,.78)',   // インク scrim の上
    accentOnPhoto: '#9CE3BE',            // green-200（インク scrim の上のアクセント）
    accentOnDark: '#63D298',             // green-300（黒地の上）
    onDark: '#FFFFFF',
  };

  /// 11px 大文字のアイブロウ。Kaiwa で ALL CAPS が許される唯一の文字なので
  /// これより小さい指定が来ても 11px に丸める。
  function meta(text, opt) {
    opt = opt || {};
    var size = Math.max(11, opt.size || 11);
    var st = 'font-size:' + size + 'px;letter-spacing:' + (size * (opt.ls == null ? 0.12 : opt.ls)) + 'px';
    if (opt.color) st += ';color:' + opt.color;
    if (opt.lh) st += ';line-height:' + opt.lh;
    return '<div class="meta" style="' + st + '">' + esc(text) + '</div>';
  }

  LT3.screens = {};

  /* ======================================================================
     1 · SplashView — 1400ms の入場を見せてから 2200ms で次へ
     ====================================================================== */
  LT3.screens.splash = {
    enter: function () { LT3.after(2200, function () { LT3.replace('login'); }); },
    view: function () {
      // ローディングの 3 点はマークそのもの。灯りが 1 つずつ点いてロゴになる
      return '<div class="lt3-view splash lt3-safe-top lt3-safe-bottom">' +
        '<div class="mark-wrap">' + LT3.mark({ size: 108, stagger: true }) + '</div>' +
        LT3.wordmark({ size: 30 }) +
      '</div>';
    },
    actions: {},
  };

  /* ======================================================================
     2 · LoginView
     ====================================================================== */
  LT3.screens.login = {
    view: function (s) {
      var body = s.busy.login
        ? '<div class="loading"><div class="spinner"></div></div>'
        : '<div style="width:100%">' +
            '<div class="auth-btn filled lt3-tap" data-act="apple"> Appleで続ける</div>' +
            '<div class="auth-btn outline lt3-tap" data-act="google">Googleで続ける</div>' +
          '</div>';
      return '<div class="lt3-view login">' +
        '<div class="spacer-3"></div>' +
        '<div class="lockup">' + LT3.mark({ size: 52 }) + LT3.wordmark({ size: 34 }) + '</div>' +
        '<div class="sub">同時に向き合えるのは、3人まで。</div>' +
        '<div class="spacer-4"></div>' +
        (s.error.login ? '<div class="err">' + esc(s.error.login) + '</div>' : '') +
        body +
        '<div class="terms">ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます</div>' +
      '</div>';
    },
    actions: {
      apple: function () { signIn(); },
      google: function () { signIn(); },
    },
  };
  function signIn() {
    LT3.state.busy.login = true;
    LT3.render();
    LT3.after(800, function () {
      LT3.state.busy.login = false;
      LT3.offAll('onboarding');
    });
  }

  /* ======================================================================
     3 · OnboardingChatView — 登録ヒアリングのビデオ通話
     phase: intro → gender → ideal → companion → self → profiling → done
     ====================================================================== */

  // BasicProfileStep の写し (lib/model/BasicProfileStep.dart)
  var BASICS_STEPS = [
    { id: 'name', question: 'はじめに、なんと呼べばいいですか。', hint: '呼ばれたい名前', input: 'text' },
    { id: 'birthday', question: '生まれた日を教えてください。年齢は相手に見えますが、日付は見えません。', hint: '生年月日を選ぶ', input: 'date' },
    { id: 'area', question: 'いま、どのあたりに住んでいますか。', hint: '例: 東京 · 世田谷', input: 'text' },
    { id: 'height', question: '身長は何センチですか。', hint: '例: 170', input: 'number' },
    { id: 'build', question: '体つきは、どれに近いですか。', hint: '体格を選ぶ', input: 'choice',
      options: ['細い', '普通', 'ガッチリ', 'グラマー', '太ってる'] },
    { id: 'siblingCount', question: '何人きょうだいですか。', hint: '人数を選ぶ', input: 'choice',
      options: ['ひとりっ子', '2人', '3人', '4人', '5人'] },
    { id: 'siblingOrder', question: 'その中で、上から何番目ですか。', hint: '順番を選ぶ', input: 'choice' },
    { id: 'avatar', question: '顔写真を 1 枚だけ。あとからでも変えられます。', hint: '写真を選ぶ', input: 'photo', skippable: true },
  ];
  var SEGMENT_COUNT = 5;
  var TYPE_INTERVAL = 42;
  // intro は View の中心に置くので、意味の単位で改行を打ってから流す（\n は pre-wrap で出る）
  var INTRO_TEXT = 'あなたの理想の相手を\n1 体の相棒として生成します。';

  function onb() { return LT3.state.onb; }

  LT3.screens.onboarding = {
    enter: function (s) {
      s.onb = {
        phase: 'intro',
        caption: '', full: '', typing: false, captionDone: false, speaking: false, climax: false,
        options: [], basicsOptions: [], picked: [], isMulti: false, maxPick: 1, allowFree: false,
        genderIndex: 0, myGender: null, targetGender: null,
        qIndex: 0, basicsIndex: 0, heldTurn: null, siblingCount: 0,
        elapsed: 0, companionForming: false, companionRevealed: false,
        error: '', done: false, saving: false, uploading: false, avatarUrl: '',
      };
      s.draft.onb = '';
      LT3.every(1000, function () { onb().elapsed += 1; paintClock(); });
      var phase = new URLSearchParams(location.search).get('phase');
      if (phase) { jumpTo(phase); return; }
      speak(INTRO_TEXT);
    },
    view: function (s) {
      var o = s.onb;
      if (!o) return '<div class="lt3-view"></div>';
      var mid = centered(o);
      var scrimH = o.climax ? 420 : (showOptions(o) ? 400 : 340);
      // 人のシルエットは置かない。生成に入ってからはカード（モザイク → 写真）だけ
      var figure = '';
      if (o.done) figure = crystalHtml(s, o);
      else if (o.phase === 'companion') figure = companionHtml(s, o);
      return '<div class="lt3-view onb' + (mid ? ' centered' : '') + '">' +
        '<div class="glow"></div>' + figure +
        '<div class="scrim-top"></div><div class="scrim-bottom" style="height:' + scrimH + 'px"></div>' +
        header(o) + (mid ? centerStage(s, o) : bottom(s, o)) +
      '</div>';
    },
    actions: {
      skipTyping: function () {
        var o = onb();
        if (o.captionDone) return;
        LT3.clearTimers();
        LT3.every(1000, function () { onb().elapsed += 1; paintClock(); });
        o.caption = o.full; o.speaking = false; o.captionDone = true; o.typing = false;
        LT3.render();
      },
      beginGender: function () {
        var o = onb();
        if (o.phase !== 'intro' || o.typing) return;
        o.phase = 'gender'; o.genderIndex = 0; askGender();
      },
      continueToSelf: function () {
        var o = onb();
        if (o.phase !== 'companion') return;
        o.phase = 'self';
        renderBasics();
      },
      pick: function (i) {
        var o = onb();
        i = Number(i);
        if (o.typing) return;
        if (o.phase === 'gender') { pickGender(o.basicsOptions[i]); return; }
        if (o.phase === 'self') { pickBasicsChoice(o.basicsOptions[i]); return; }
        if (!o.isMulti) { sendOptions([o.options[i]]); return; }
        var at = o.picked.indexOf(i);
        if (at >= 0) o.picked.splice(at, 1);
        else if (o.picked.length < o.maxPick) o.picked.push(i);
        LT3.render();
      },
      submitPicked: function () {
        var o = onb();
        if (!o.picked.length || o.typing) return;
        var order = o.picked.slice().sort(function (a, b) { return a - b; });
        sendOptions(order.map(function (i) { return o.options[i]; }));
      },
      submitText: function () {
        var o = onb();
        var text = (LT3.state.draft.onb || '').trim();
        if (!text || !acceptsText(o)) return;
        LT3.state.draft.onb = '';
        if (o.phase === 'self') { submitBasicsText(text); return; }
        clearOptions(o);
        renderAi(nextTurn());
      },
      pickBirthday: function () {
        var o = onb();
        if (currentStep(o) !== 'birthday') return;
        advanceBasics();
      },
      pickAvatar: function () {
        var o = onb();
        o.uploading = true; LT3.render();
        LT3.after(600, function () {
          o.uploading = false; o.avatarUrl = 'me/avatar';
          advanceBasics();
        });
      },
      skipAvatar: function () { advanceBasics(); },
      goHome: function () {
        var o = onb();
        if (o.saving) return;
        o.saving = true; LT3.render();
        LT3.after(500, function () { LT3.offAll('main'); });
      },
    },
  };

  /// ?route=onboarding&phase=… で任意のシーンから開く (スクショ・レビュー用)。
  /// 字幕は送り終えた状態にする。通しで動かすときは phase を付けない。
  function jumpTo(phase) {
    var o = onb();
    o.answered = 0;
    if (phase === 'intro') { speak(INTRO_TEXT); }
    else if (phase === 'gender') { o.phase = 'gender'; askGender(); }
    else if (phase === 'ideal') { o.phase = 'ideal'; renderAi(nextTurn()); }
    else if (phase === 'climax') {
      o.phase = 'profiling'; o.answered = 6;
      o.qIndex = M.battery.questions.map(function (q) { return q.highlight; }).indexOf(true);
      if (o.qIndex < 0) o.qIndex = M.battery.questions.length - 1;
      renderAi(nextTurn());
    } else if (phase === 'companion') { o.phase = 'ideal'; o.answered = 8; enterCompanion(); }
    else if (phase === 'self') { o.phase = 'self'; renderBasics(); }
    else if (phase === 'done') { o.done = true; o.companionRevealed = true; speak(M.battery.closing); }
    else { speak('こんにちは。'); }
    finishTyping();
  }
  function finishTyping() {
    var o = onb();
    LT3.clearTimers();
    LT3.every(1000, function () { onb().elapsed += 1; paintClock(); });
    o.caption = o.full; o.speaking = false; o.captionDone = true; o.typing = false;
    if (o.phase === 'companion') { o.companionForming = true; }
    LT3.render();
  }

  function figureStage(o) {
    if (o.done) return 'crystal';
    switch (o.phase) {
      case 'intro': case 'gender': return 's0';
      case 'ideal': return o.answered >= 5 ? 's3' : (o.answered >= 2 ? 's2' : 's1');
      case 'companion': return 's3';
      case 'self': return 's2';
      default: return o.climax ? 's3' : 's2';
    }
  }
  function segment(o) {
    if (o.done) return SEGMENT_COUNT;
    switch (o.phase) {
      case 'intro': case 'gender': return 1;
      case 'ideal': return 2;
      case 'companion': return 3;
      case 'self': return 4;
      default: return o.climax ? 5 : 4;
    }
  }
  function subjectLabel(o) {
    if (o.done) return 'AI';
    switch (o.phase) {
      case 'intro': case 'gender': return 'CONNECTING';
      case 'ideal': return 'ABOUT THEM';
      case 'companion': return 'THEIR FORM';
      default: return 'ABOUT YOU';
    }
  }
  function isCeremony(o) { return o.phase === 'intro' || o.phase === 'companion'; }
  function showOptions(o) {
    if (o.done || isCeremony(o) || !o.captionDone) return false;
    return usesLabelChoice(o) ? o.basicsOptions.length > 0 : o.options.length > 0;
  }
  function usesLabelChoice(o) { return o.phase === 'self' || o.phase === 'gender'; }
  function acceptsText(o) {
    if (o.done || o.typing || isCeremony(o)) return false;
    if (o.phase === 'self') {
      var kind = stepOf(currentStep(o)).input;
      return kind === 'text' || kind === 'number';
    }
    return o.allowFree;
  }
  function currentStep(o) { return (BASICS_STEPS[o.basicsIndex] || {}).id; }
  function stepOf(id) {
    return BASICS_STEPS.filter(function (s) { return s.id === id; })[0] || {};
  }

  function header(o) {
    var lit = o.caption ? segment(o) : 0;
    var bars = '';
    for (var i = 0; i < SEGMENT_COUNT; i++) bars += '<i class="' + (i < lit ? 'lit' : '') + '"></i>';
    return '<div class="header"><div class="top">' +
      meta('COUNSELING · ' + clock(o.elapsed) + ' / 05:00') +
      meta(o.done ? 'DONE' : 'Q' + segment(o) + ' / ' + SEGMENT_COUNT, { color: lit === 0 ? C.text3 : C.primary }) +
      '</div><div class="bars">' + bars + '</div></div>';
  }
  function clock(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }
  function paintClock() {
    var el = document.querySelector('.onb .header .row .meta');
    if (el) el.textContent = 'COUNSELING · ' + clock(onb().elapsed) + ' / 05:00';
  }

  function captionLabel(o) {
    if (o.climax) {
      return '<div class="label-row"><i class="breathe" style="width:5px;height:5px;border-radius:50%;background:' + C.primary + '"></i>' +
        meta('THE ONE THAT MATTERS', { color: C.primary }) + '</div>';
    }
    if (o.speaking) {
      var bars = '';
      for (var i = 0; i < 6; i++) {
        bars += '<i style="animation-duration:' + (0.7 + (i % 4) * 0.2) + 's;animation-delay:' + ((i % 3) * 0.1) + 's"></i>';
      }
      return '<div class="label-row"><div class="level">' + bars + '</div>' + meta('SPEAKING') + '</div>';
    }
    if (o.companionForming) {
      return '<div class="label-row"><i class="breathe" style="width:5px;height:5px;border-radius:50%;background:' + C.primary + '"></i>' +
        meta('FORMING THEIR SHAPE', { color: C.primary }) + '</div>';
    }
    return meta(subjectLabel(o));
  }

  /// 写真生成（companion）に入るまではシートを使わず、字幕を View の中心に置く
  function centered(o) { return !o.done && o.phase !== 'companion'; }

  /// 中心 = 字幕 / 下辺 = ボタン・選択肢・入力
  function centerStage(s, o) {
    var foot = '';
    if (o.error) foot += '<div class="err">' + esc(o.error) + '</div>';
    if (o.phase === 'intro' && o.captionDone && !o.typing) {
      foot += '<div class="action lt3-tap" data-act="beginGender">はじめる</div>';
    }
    foot += choicesHtml(o) + inputArea(o);
    var sub = (o.climax && o.captionDone) ? '<div class="caption-sub">' + esc(M.battery.highlightSub) + '</div>' : '';
    return '<div class="center-block" data-act="skipTyping">' + captionLabel(o) +
      '<div class="caption' + (o.climax ? ' climax' : '') + '">' + esc(o.caption) + '</div>' + sub + '</div>' +
      (foot ? '<div class="foot">' + foot + '</div>' : '');
  }

  function choicesHtml(o) {
    if (!showOptions(o)) return '';
    var labels = usesLabelChoice(o) ? o.basicsOptions : o.options.map(function (x) { return x.label; });
    // 複数選べる問いは、上限をいつでも読めるようにしておく
    var html = (o.isMulti && o.maxPick > 1)
      ? '<div class="pick-hint">' + (o.picked.length
          ? o.picked.length + ' / ' + o.maxPick + ' 選択'
          : o.maxPick + 'つまで選べます') + '</div>'
      : '';
    html += '<div class="chips">' + labels.map(function (label, i) {
      var on = !usesLabelChoice(o) && o.picked.indexOf(i) >= 0;
      return '<div class="chip lt3-tap' + (on ? ' on' : '') + '" data-act="pick" data-arg="' + i + '">' + esc(label) + '</div>';
    }).join('') + '</div>';
    if (o.isMulti && o.picked.length) {
      html += '<div class="action lt3-tap" data-act="submitPicked" style="margin-top:8px">これで送る（' + o.picked.length + '）</div>';
    }
    return html;
  }

  function bottom(s, o) {
    var card = s.persona;
    var html = '<div class="bottom">';
    if (card && (o.done || o.companionRevealed)) {
      html += '<div class="persona-line">' +
        meta(o.done ? 'YOUR COMPANION · 05:00' : (card.epithet || ''), { color: C.primary }) +
        '<div class="nm">' + esc(card.name || '') + '</div></div>';
    }
    html += '<div class="caption-block" data-act="skipTyping">' + captionLabel(o) +
      '<div class="caption' + (o.climax ? ' climax' : '') + '">' + esc(o.caption) + '</div>';
    if (o.climax && o.captionDone) {
      html += '<div class="caption-sub">' + esc(M.battery.highlightSub) + '</div>';
    }
    html += '</div>';
    if (o.error) html += '<div class="err">' + esc(o.error) + '</div>';

    if (o.done) {
      html += '<div class="slot-dots"><i></i><i></i><i></i>' + meta('3 枠 · すべて空き') + '</div>' +
        '<div class="start lt3-tap' + (o.saving ? ' busy' : '') + '" data-act="goHome">待機をはじめる</div>';
    } else {
      if (o.phase === 'intro' && o.captionDone && !o.typing) {
        html += '<div class="action lt3-tap" data-act="beginGender">はじめる</div>';
      }
      if (o.phase === 'companion' && o.captionDone && !o.typing) {
        html += '<div class="action lt3-tap" data-act="continueToSelf">つづける</div>';
      }
      if (showOptions(o)) {
        html += choicesHtml(o);
      }
      html += inputArea(o);
    }
    return html + '</div>';
  }

  function inputArea(o) {
    var step = o.phase === 'self' ? stepOf(currentStep(o)) : {};
    if (step.input === 'date') {
      return '<div class="action lt3-tap" data-act="pickBirthday" style="margin-top:12px">' + esc(step.hint) + '</div>';
    }
    if (step.input === 'photo') {
      return '<div class="avatar-row">' +
        '<div class="pic">' + photo('me/avatar', { label: '未設定' }) + '</div>' +
        '<div style="flex:1"><div class="action lt3-tap" data-act="pickAvatar" style="margin-top:0">' +
          (o.uploading ? '送信中…' : (o.avatarUrl ? '別の写真を選ぶ' : '写真を選ぶ')) + '</div></div>' +
        '<div class="later lt3-tap" data-act="skipAvatar">あとで</div>' +
      '</div>';
    }
    if (step.input === 'choice') return '';
    if (!acceptsText(o)) return '';
    var hint = step.hint || '打って答える';
    var type = step.input === 'number' ? 'number' : 'text';
    return '<div class="input-row">' +
      '<div class="box"><input type="' + type + '" data-model="onb" data-submit="submitText" placeholder="' + esc(hint) + '"></div>' +
      '<div class="send lt3-tap" data-act="submitText">' + icon.plane(C.onPrimary) + '</div>' +
    '</div>';
  }

  /// 相棒の像は全画面。生成中はモザイク + 進行、文字はシート側が持つ
  function companionHtml(s, o) {
    var forming = !o.done && !o.companionRevealed;
    return '<div class="stage">' + photo('persona/figure', { label: '' }) +
      (forming ? mosaicHtml() + '<div class="gen"><div class="pill">生成中</div><div class="bar"><i></i></div></div>' : '') +
    '</div>';
  }
  /// 生成中のモザイク。並びは決め打ちなので再描画しても模様が跳ばない
  function mosaicHtml() {
    var COLS = 10, ROWS = 14, out = '';
    for (var i = 0; i < COLS * ROWS; i++) {
      var t = ((i * 37) % 100) / 100;
      out += '<i style="background:rgba(20,24,28,' + (0.06 + t * 0.16).toFixed(3) +
        ');animation-delay:' + ((i % 11) * 0.18).toFixed(2) + 's"></i>';
    }
    return '<div class="mosaic" style="--cols:' + COLS + '">' + out + '</div>';
  }
  function crystalHtml(s, o) {
    return '<div class="stage">' + photo('persona/figure', { label: '' }) + '</div>';
  }

  /* ---- 進行 (OnboardingChatController の写し) --------------------------- */
  function speak(text) {
    var o = onb();
    o.full = text; o.caption = ''; o.captionDone = false; o.speaking = true; o.typing = false;
    LT3.render();
    var i = 0;
    var id = setInterval(function () {
      i += 1;
      if (i >= o.full.length) {
        o.caption = o.full; o.speaking = false; o.captionDone = true;
        clearInterval(id);
        LT3.render();
        return;
      }
      o.caption = o.full.substring(0, i);
      var el = document.querySelector('.onb .caption');
      if (el) el.textContent = o.caption;
    }, TYPE_INTERVAL);
    LT3.every.timers; // noop: 下の push でまとめて管理する
    pushTimer(id);
  }
  function pushTimer(id) {
    // LT3.every/after が持つ配列に相乗りできないので、route 離脱時の掃除だけ担保する
    var old = LT3.clearTimers;
    if (!speak._patched) {
      speak._extra = [];
      LT3.clearTimers = function () { speak._extra.forEach(clearInterval); speak._extra = []; old(); };
      speak._patched = true;
    }
    speak._extra.push(id);
  }

  function clearOptions(o) { o.options = []; o.picked = []; o.isMulti = false; }

  function askGender() {
    var o = onb();
    o.allowFree = false;
    clearOptions(o);
    o.basicsOptions = ['男性', '女性'];
    speak(o.genderIndex === 0 ? 'はじめに。あなたは、どちらですか。' : 'そばにいてほしいのは、どちらですか。');
  }
  function pickGender(label) {
    var o = onb();
    o.basicsOptions = [];
    if (o.genderIndex === 0) { o.myGender = label; o.genderIndex = 1; askGender(); return; }
    o.targetGender = label;
    o.phase = 'ideal';
    o.answered = 0;
    renderAi(nextTurn());
  }

  /// battery を頭から 1 問ずつ配る (Flutter: OnboardingProfilingUsecase._nextTurn)
  function nextTurn() {
    var o = onb();
    var q = M.battery.questions[o.qIndex];
    if (!q) return { complete: true, text: M.battery.closing };
    o.qIndex += 1;
    return { question: q };
  }
  function sendOptions(chosen) {
    var o = onb();
    o.answered = (o.answered || 0) + 1;
    clearOptions(o);
    renderAi(nextTurn());
  }
  function renderAi(turn) {
    var o = onb();
    o.error = '';
    // 理想の相手 (partnerWish) を聞き終えた瞬間、次の問いは相棒生成と本人パートの後に回す
    if (o.phase === 'ideal' && !turn.complete && turn.question.domain !== 'partnerWish') {
      o.heldTurn = turn;
      enterCompanion();
      return;
    }
    if (turn.complete) {
      o.done = true; o.climax = false; clearOptions(o);
      speak(turn.text);
      return;
    }
    var q = turn.question;
    o.options = q.options;
    o.isMulti = q.input === 'multi';
    o.allowFree = q.allowFree !== false;
    o.climax = !!q.highlight;
    o.maxPick = o.isMulti ? q.maxPick : 1;
    o.picked = [];
    speak(q.text);
  }
  function enterCompanion() {
    var o = onb();
    o.phase = 'companion';
    clearOptions(o);
    o.allowFree = false; o.climax = false;
    o.companionForming = true;
    LT3.after(2600, function () {
      var oo = onb();
      if (!oo) return;
      oo.companionForming = false;
      oo.companionRevealed = !!LT3.state.persona;
      LT3.render();
    });
    speak('ここまでの答えから、あなたの理想の相手をかたちにしています。できあがるまでのあいだに、あなたのことを聞かせてください。');
  }

  /* ---- 基本情報 (OnboardingBasicsUsecase の写し) ------------------------ */
  function renderBasics() {
    var o = onb();
    var step = BASICS_STEPS[o.basicsIndex];
    if (!step) { o.phase = 'profiling'; resumeProfiling(); return; }
    o.basicsOptions = optionsFor(step, o);
    o.climax = false;
    speak(step.question);
  }
  function optionsFor(step, o) {
    if (step.input !== 'choice') return [];
    if (step.id === 'siblingOrder') {
      var out = [];
      for (var i = 1; i <= o.siblingCount; i++) {
        out.push(i === 1 ? '1番目（いちばん上）' : (i === o.siblingCount ? i + '番目（いちばん下）' : i + '番目'));
      }
      return out;
    }
    return step.options || [];
  }
  function submitBasicsText(text) {
    var o = onb();
    var step = BASICS_STEPS[o.basicsIndex];
    if (step.id === 'height') {
      var cm = parseInt(String(text).replace(/[^0-9]/g, ''), 10);
      if (!cm || cm < 100 || cm > 250) { o.error = '100〜250 の数字で入れてください'; LT3.render(); return; }
      LT3.state.basics.heightCm = cm;
    }
    if (step.id === 'name') {
      if (text.length > 20) { o.error = '20 文字までにしてください'; LT3.render(); return; }
      LT3.state.basics.name = text;
    }
    if (step.id === 'area') {
      if (text.length > 30) { o.error = '30 文字までにしてください'; LT3.render(); return; }
      LT3.state.basics.area = text;
    }
    advanceBasics();
  }
  function pickBasicsChoice(label) {
    var o = onb();
    var step = BASICS_STEPS[o.basicsIndex];
    o.basicsOptions = [];
    if (step.id === 'siblingCount') {
      o.siblingCount = label === 'ひとりっ子' ? 1 : parseInt(label, 10);
      LT3.state.basics.siblingCount = o.siblingCount;
      LT3.state.basics.siblingOrder = o.siblingCount === 1 ? 1 : 0;
    }
    if (step.id === 'build') LT3.state.basics.build = label;
    if (step.id === 'siblingOrder') LT3.state.basics.siblingOrder = parseInt(label, 10);
    advanceBasics();
  }
  function advanceBasics() {
    var o = onb();
    o.error = '';
    o.basicsIndex += 1;
    // ひとりっ子は順番を聞かずに飛ばす
    while ((BASICS_STEPS[o.basicsIndex] || {}).id === 'siblingOrder' && o.siblingCount === 1) o.basicsIndex += 1;
    if (!BASICS_STEPS[o.basicsIndex]) { o.phase = 'profiling'; resumeProfiling(); return; }
    renderBasics();
  }
  function resumeProfiling() {
    var o = onb();
    o.basicsOptions = [];
    var held = o.heldTurn;
    o.heldTurn = null;
    renderAi(held || nextTurn());
  }

  /* ======================================================================
     4 · MainView (tab 0 = 3 枠 / tab 1 = MY PROFILE)
     ====================================================================== */
  LT3.screens.main = {
    view: function (s) {
      var body = s.tab === 0 ? slotsHtml(s) : myProfileHtml(s);
      return '<div class="lt3-view main">' + body + tabBar(s) + '</div>' + debugBtn();
    },
    actions: Object.assign({
      goHome: function () { LT3.state.tab = 0; LT3.render(); },
      goMyProfile: function () { LT3.state.tab = 1; LT3.render(); },
      openPartner: function (id) { LT3.go('pair', { id: id }); },
      openPartnerProfile: function (id) { LT3.go('partner', { id: id }); },
      openCamera: function () {
        var s = LT3.state;
        if (!s.theme || s.posted) return;
        LT3.go('camera');
      },
      openMyPost: function () { LT3.state.viewer = 'me/today'; LT3.render(); },
      // 投稿全体（または「続きを読む」）を押すと拡大。名前が帯のすぐ下に来る位置まで送る
      expandPost: function (arg) {
        var s = LT3.state;
        var i = Number(arg);
        s.feedOpen = s.feedOpen === i ? null : i;
        s.feedScrollTo = i;
        LT3.render();
      },
      openDebug: function () { LT3.state.sheet = 'debug'; LT3.render(); },
      openPersona: function () { LT3.go('persona'); },
      openEdit: function () { LT3.go('profileEdit'); },
    }),
    sheet: function (s, kind) {
      if (kind !== 'debug') return '';
      return '<div class="grip"></div>' + meta('DEBUG', { size: 9.5 }) +
        '<div style="height:14px"></div>' +
        '<div class="row-item lt3-tap" data-act="resetOnboarding">オンボーディングからやり直す</div>';
    },
    // 枠は上へ詰め、その下をタイムラインが下へ無限に流れる。
    // 底が近づいたら次の巡回ぶんを継ぎ足す (再描画はしない = スクロール位置が飛ばない)。
    after: function (s, screen) {
      var slots = screen.querySelector('.slots');
      var stream = screen.querySelector('.feed .stream');
      if (!slots || !stream) return;
      if (s.feedScrollTo != null) {
        var target = stream.querySelector('.post[data-arg="' + s.feedScrollTo + '"]');
        var head = screen.querySelector('.feed .fhd');
        s.feedScrollTo = null;
        if (target) {
          // 帯は sticky。送ったあとの帯の下辺 = スクロール領域の上辺 + 上の余白 + 帯の高さ
          var pad = parseFloat(getComputedStyle(slots).paddingTop) || 0;
          var line = slots.getBoundingClientRect().top + pad + (head ? head.offsetHeight : 0);
          slots.scrollTop += target.getBoundingClientRect().top - line;
        }
      }
      var grow = function () {
        if (s.feedCount >= FEED_MAX) return;
        if (slots.scrollTop + slots.clientHeight < slots.scrollHeight - 400) return;
        var start = s.feedCount;
        s.feedCount = start + FEED_STEP;
        var html = '';
        for (var i = start; i < s.feedCount; i++) html += feedPost(i);
        stream.insertAdjacentHTML('beforeend', html);
        var cnt = screen.querySelector('.feed .fhd .cnt');
        if (cnt) cnt.textContent = '× ' + s.feedCount;
      };
      slots.addEventListener('scroll', grow, { passive: true });
      grow();
    },
  };
  LT3.screens.main.actions.resetOnboarding = function () { LT3.offAll('onboarding'); };

  // 枠は上へ詰める。空き枠には何も置かず、その分タイムラインが上がってくる。
  function slotsHtml(s) {
    var partners = LT3.partners();
    return '<div class="slots">' + partners.map(slotCard).join('') + feedHtml(s) + '</div>';
  }

  function slotCard(p) {
    var key = 'partner/' + p.id + '/latest';
    var hasPhoto = !!LT3.media.get(key);
    if (!hasPhoto && !p.caption) {
      // お題投稿がまだ届いていない枠 = 相手が誰かだけ置く
      return '<div class="slot-card lt3-tap" data-act="openPartner" data-arg="' + esc(p.id) + '">' +
        '<div class="identity">' +
          '<div data-act="openPartnerProfile" data-arg="' + esc(p.id) + '">' +
            avatar(p.initial, { size: 72, key: 'partner/' + p.id + '/avatar', lit: !p.isFading }) + '</div>' +
          '<div class="nm">' + esc(p.name) + '</div>' +
        '</div></div>';
    }
    return '<div class="slot-card lt3-tap" data-act="openPartner" data-arg="' + esc(p.id) + '">' +
      photo(key, { label: p.name + ' の投稿', faded: p.isFading }) +
      '<div class="scrim-top"></div><div class="scrim-bottom"></div>' +
      '<div class="who" data-act="openPartnerProfile" data-arg="' + esc(p.id) + '">' +
        '<div class="nm">' + esc(p.name) + '</div></div>' +
      '<div class="center">' + meta(p.postMeta, { size: 9.5, color: C.onPhoto }) +
        '<div class="cap">' + esc(p.caption) + '</div></div>' +
    '</div>';
  }

  function isWanted(outcome) { return outcome === 'mutual' || outcome === 'theirIdeal'; }

  /* ---- MainFeed ---------------------------------------------------------
     枠の下を流れる、AI の思考ログ。自分の投稿ではなく「候補を照らし合わせた結果」で、
     1 件 = 見立て 1 本 + 候補の理想像 + 合致の点。下へ無限に続く。 */
  var FEED_STEP = 6;   // 継ぎ足す単位
  var FEED_MAX = 96;

  /// 1 件 = 人 1 人。2 段構成で、上が「この人はどういう人か」、
  /// 下が「この人が求めている相手」（写真にインクの膜をかけて重ねる）。
  var FEED_PEOPLE = [
    { name: '夜にだけ灯る人', meta: '29 · 中野',
      intro: '昼は事務、夜は古い映画を 1 本。人見知りですが、決めたことは続けます。台所に立つ時間が好き。休みの日は昼まで寝て、夕方から動きます。人の輪の真ん中は苦手ですが、少人数なら長く話せます。',
      ideal: '返事を急かさない人。同じ映画を黙って最後まで見られる人がいいです。毎日でなくていいので、返事はきちんとほしいです。家で過ごす時間を面倒がらない人だと、続くと思います。' },
    { name: '台所に立つ人', meta: '33 · 三鷹',
      intro: '週末はだいたい仕込み。声は大きくないほうで、うるさい店より家で話す時間が長いです。外食は月に数回。器を集めています。急な予定変更にはあまり強くありません。',
      ideal: '食べたものの感想をきちんと言う人。予定を前もって決められる人が合います。一緒に台所に立たなくても、食べる時間を合わせてくれれば十分です。' },
    { name: '朝がいちばん元気な人', meta: '27 · 大井町',
      intro: '5 時起き、走ってから仕事。休みの日ほど早く起きます。用事は先に片づける性格。夜は 22 時を過ぎると使いものになりません。予定は前の週には決めておきたいほうです。',
      ideal: '朝に付き合わなくても、起きる時間を笑わない人。連絡はこまめが好きです。朝の連絡に返せなくても構いません。ただ、約束の時間は守ってほしいです。' },
    { name: 'まだ像を結ばない人', meta: '31 · 高円寺',
      intro: '登録したばかりで、書いてあることがまだ少ない人です。写真も 1 枚だけ。プロフィールは数行で、分析に使える手がかりがまだ足りていません。',
      ideal: '求める形はまだ書かれていません。次の巡回でもう一度見ます。書き足されたら、あらためて照らし合わせます。' },
    { name: '同じ路線の人', meta: '30 · 阿佐ヶ谷',
      intro: '通勤で毎日同じ電車。本は月に 3 冊。休みの日は歩いて店を探します。喫茶店で 2 時間くらい平気で過ごします。荷物は少なめ、歩くのは速いほうです。',
      ideal: '待ち合わせに遅れない人。無理に話さなくても平気でいられる関係がいいです。沈黙が続いても気にしない人だと、用事がなくても連絡できます。' },
    { name: '週末だけ遠出する人', meta: '28 · 川崎',
      intro: '平日は家、土日は車で遠くへ。運転は苦になりません。写真は撮りっぱなし。年に何度か長い休みを取って、車で寝ます。人混みは避けます。',
      ideal: '助手席で寝ていてもいい人。行き先を一緒に決めてくれる人が好きです。朝が早い日でも文句を言わない人だと、遠くまで行けます。' },
    { name: '早く寝る人', meta: '34 · 蒲田',
      intro: '22 時には寝ます。仕事は現場で体力勝負。無口ですが、聞くのは得意です。朝は 5 時前に家を出ます。休みは体を休めることに使います。',
      ideal: '夜更かしを求めない人。短くても毎日連絡がある関係が続きやすいです。生活の時間が近ければ、夜に長く話せなくても平気です。' },
    { name: '本の話ができる人', meta: '26 · 本郷',
      intro: '大学の図書館で働いています。小説と、たまに詩。人の話を最後まで聞きます。積んである本が 40 冊ほど。声は小さいですが、書く言葉は多いほうです。',
      ideal: '読んだものの話ができる人。すぐに返せなくても怒らない人がいいです。長い文章を送っても引かない人だと、会えない期間があっても平気でいられます。' },
    { name: '犬と暮らす人', meta: '32 · 世田谷',
      intro: '朝晩の散歩が生活の芯。料理は簡単なものだけ。友だちは少なく、長いです。13 歳の犬がいます。旅行は年に一度あるかどうかです。',
      ideal: '動物が平気な人。予定を急に変えない人だと、こちらも安心できます。家に来ることを嫌がらず、犬の予定が先になる日を責めない人だと助かります。' },
    { name: '声の低い人', meta: '35 · 白金',
      intro: '話すのは仕事だけで十分な性格。休みは家で音楽。長電話は苦手です。レコードを 300 枚ほど。休みの日はほとんど家にいます。',
      ideal: '文字でやり取りできる人。会うときはきちんと時間を取る人が好きです。音を出していても気にしない人で、返事の短さを冷たいと取らない人がいいです。' },
    { name: '甘いものが苦手な人', meta: '29 · 浅草',
      intro: '酒場より喫茶店。将棋を指します。曲がったことが好きではありません。朝は珈琲だけ。将棋は 20 年続けています。',
      ideal: '嘘をつかない人。約束の時間に来る人であれば、あとは合わせられます。言いにくいことも、あとで言われるより先に言ってほしいです。' },
    { name: 'ひとりの時間が要る人', meta: '31 · 国立',
      intro: '週の半分は誰にも会いません。絵を描きます。心配はしていません。月に一度は展示を見に行きます。話すのは嫌いではありません。',
      ideal: '毎日連絡を求めない人。会えば長く話せる関係がちょうどいいです。距離を測れる人で、会わない週があっても関係が薄くならないと思える人がいいです。' },
  ];

  function feedHtml(s) {
    if (!s.feedCount) s.feedCount = 12;
    // 見てきた候補を重なりの円で見せ、人数を添える（継ぎ足しで更新）
    var faces = [0, 1, 2].map(function (n) {
      var u = LT3.media.get('report/' + n);
      return '<i class="fc">' + (u ? '<img src="' + esc(u) + '" alt="">' : '') + '</i>';
    }).join('');
    var items = '';
    for (var i = 0; i < s.feedCount; i++) items += feedPost(i);
    return '<div class="feed">' +
      '<div class="fhd"><i class="dot breathe"></i>' + meta('ANALYZING', { size: 9.5, color: C.primary }) +
        '<span class="faces">' + faces + '</span><span class="cnt">× ' + s.feedCount + '</span>' +
        '<span class="dn">' + icon.down(C.tabInactive, 18) + '</span></div>' +
      '<div class="stream">' + items + '</div>' +
      '<div class="more">' + meta('巡回中', { size: 9.5 }) + '</div>' +
    '</div>';
  }

  /// 1 件 = 名前・時刻 / この人の紹介 / 理想の相手（写真の上に重ねる）/ 合致の点。
  /// たたむ前はどちらの本文も 2 行で切れる。たたむと全文が出て、写真は縦長になる。
  function feedPost(i) {
    var reports = M.matchReports;
    var index = i % reports.length;
    var rep = reports[index];
    var who = FEED_PEOPLE[i % FEED_PEOPLE.length];
    var open = LT3.state.feedOpen === i;
    var hit = rep.lines.filter(function (l) { return l.hit; }).length;
    var dots = rep.lines.map(function (l) { return '<i class="' + (l.hit ? 'on' : '') + '"></i>'; }).join('');
    return '<div class="post lt3-tap' + (open ? ' open' : '') + '" data-act="expandPost" data-arg="' + i + '">' +
      '<div class="ln"><span class="nm">' + esc(who.name) + '</span>' +
        '<span class="mt">' + esc(who.meta) + '</span>' +
        '<span class="tm">· ' + esc(feedAgo(i)) + '</span></div>' +
      '<div class="tx">' + esc(who.intro) + '</div>' +
      '<div class="rd">' + (open ? '閉じる' : '続きを読む') + '</div>' +
      '<div class="pic">' + photo('report/' + (i % 3), { label: '' }) +
        '<div class="ov">' + meta('理想の相手', { size: 9.5, color: C.onPhoto }) +
          '<div class="t">' + esc(who.ideal) + '</div></div></div>' +
      '<div class="ft">' + dots + '<em>' + hit + ' / ' + rep.lines.length + '</em></div>' +
    '</div>';
  }

  /// 1 日までは相対、それより前は日付（Kaiwa の時刻表記）。
  function feedAgo(i) {
    var m = i * 23 + (i % 4) * 7;
    if (m < 1) return 'いま';
    if (m < 60) return m + '分前';
    var h = Math.floor(m / 60);
    if (h < 24) return h + '時間前';
    var d = Math.floor(h / 24);
    if (d === 1) return '昨日';
    var dt = new Date(Date.now() - d * 86400000);
    return (dt.getMonth() + 1) + '/' + dt.getDate();
  }

  function tabBar(s) {
    // お題があるときだけカメラを一段持ち上げ、真下にお題そのものを置く。
    // お題がないときは薄い非活性のまま列に収まる
    var themeText = (s.theme && s.theme.theme) || (s.myPost && s.myPost.theme) || '';
    var camera;
    if (s.myPost) {
      camera = '<div class="cam mine lt3-tap" data-act="openMyPost">' + photo('me/today', { label: '' }) + '</div>';
    } else {
      var active = !!s.theme && !s.posted;
      camera = '<div class="cam' + (active ? ' on' : ' off') + ' lt3-tap" data-act="openCamera">' +
        (active ? LT3.iconFill.camera(C.onPrimary) : icon.camera(C.camDisabled)) + '</div>';
    }
    camera = '<div class="cam-slot' + (themeText ? ' raised' : '') + '">' + camera +
      (themeText ? '<div class="theme-label">' + esc(themeText) + '</div>' : '') + '</div>';
    // FILL 軸が選択状態を持つ（選択中 = 塗り・緑 / 待機 = 線・グレー）
    return '<div class="tabbar"><div class="inner">' +
      '<div class="tab lt3-tap" data-act="goHome">' +
        (s.tab === 0 ? LT3.iconFill.home(C.primary) : icon.home(C.tabInactive)) + '</div>' +
      camera +
      '<div class="tab lt3-tap" data-act="goMyProfile">' +
        (s.tab === 1 ? LT3.iconFill.person(C.primary) : icon.person(C.tabInactive)) + '</div>' +
    '</div></div>';
  }

  function debugBtn() { return '<div class="dbg lt3-tap" data-act="openDebug"><i>D</i></div>'; }

  /* ======================================================================
     5 · MyProfileView (Main の tab 1 に埋まる)
     ====================================================================== */
  var SELF_DOMAINS = [
    ['rhythm', '生活リズム'], ['history', '来歴'], ['communication', 'コミュニケーション'],
    ['loveView', '恋愛観'], ['future', '未来観'],
  ];

  function myProfileHtml(s) {
    var me = s.me, b = s.basics;
    var facts = (me.note && me.note.facts) || [];
    function factsOf(domain) { return facts.filter(function (f) { return f.domain === domain; }); }
    // 頭は写真。円アバターをやめ、埋まった枠と同じ作法 (スクリムに沈む名前) に揃える
    var url = LT3.media.get('me/avatar');
    var html = '<div class="myprof">';
    html += '<div class="hero" data-slot="me/avatar">' +
      (url ? '<img src="' + esc(url) + '" alt="">'
           : '<div class="ph"><span>' + esc((me.name || '?').substring(0, 1)) + '</span></div>') +
      '<div class="scrim-top"></div><div class="veil"></div>' +
      '<div class="cap"><div class="nm">' + esc(me.name) + '</div>' +
        '<div class="mt">' + esc([me.meta, b.gender === 'female' ? '女性' : '男性'].filter(Boolean).join(' · ')) + '</div></div>' +
      (url ? '' : '<div class="drop-hint">DROP PHOTO</div>') + '</div>';
    html += '<div class="pad">';
    // 基本情報 (申告値。性別と年齢は変えられない)
    html += '<div class="card-box">' +
      '<div class="hd">' + meta('基本情報', { size: 9.5, color: C.primary }) +
      '<div class="lt3-tap" data-act="openEdit">' + meta('編集', { ls: 0, color: C.primary }) + '</div></div>' +
      kv('身長', (b.heightCm / 100).toFixed(2) + 'm') +
      kv('体つき', b.build) +
      kv('きょうだい', b.siblingCount === 1 ? 'ひとりっ子' : b.siblingCount + '人の' + b.siblingOrder + 'ばんめ') +
      kv('住まい', b.area || '—') + '</div>';
    if (me.view) {
      html += '<div style="height:18px"></div><div class="view-card">' + meta('恋愛観', { size: 9.5, color: C.primary }) +
        '<div class="t">' + esc(me.view) + '</div></div>';
    }
    SELF_DOMAINS.forEach(function (d) {
      var rows = factsOf(d[0]);
      if (!rows.length) return;
      html += '<div style="height:18px"></div><div class="sec-label">' + esc(d[1]) + '</div><div style="height:8px"></div>' +
        '<div class="card-box">' + rows.map(function (f) { return kv(f.k, f.v); }).join('') + '</div>';
    });
    // 理想の相手 (自分にだけ見える)
    var wishes = factsOf('partnerWish');
    html += '<div style="height:26px"></div><div class="sec-label">理想の相手</div><div style="height:4px"></div>' +
      meta('ここはあなただけに見えています。', { ls: 0, color: C.text3 });
    if (s.persona) {
      html += '<div class="companion-card lt3-tap" data-act="openPersona">' +
        '<div class="pic">' + photo('persona/figure', { label: '' }) + '</div>' +
        '<div style="flex:1">' + meta(s.persona.worldLabel, { size: 9.5, color: C.primary }) +
        '<div class="nm">「' + esc(s.persona.epithet) + '」 ' + esc(s.persona.name) + '</div></div>' +
        icon.chevron(C.text3) + '</div>';
    }
    if (wishes.length) {
      html += '<div style="height:12px"></div><div class="card-box">' +
        wishes.map(function (f) { return kv(f.k, f.v); }).join('') + '</div>';
    }
    return html + '</div></div>';
  }
  function kv(k, v) {
    return '<div class="kv"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div></div>';
  }

  /* ======================================================================
     7 · ProfileEditView
     ====================================================================== */
  var BUILD_OPTIONS = ['細い', '普通', 'ガッチリ', 'グラマー', '太ってる'];
  LT3.screens.profileEdit = {
    enter: function (s) {
      s.draft.pname = s.basics.name;
      s.draft.parea = s.basics.area;
      s.draft.pheight = s.basics.heightCm ? String(s.basics.heightCm) : '';
    },
    view: function (s) {
      var b = s.basics;
      var sibOptions = [1, 2, 3, 4, 5].map(function (n) { return n === 1 ? 'ひとりっ子' : n + '人'; });
      var sibSelected = b.siblingCount <= 0 ? '' : (b.siblingCount === 1 ? 'ひとりっ子' : b.siblingCount + '人');
      var orderOptions = [];
      for (var i = 1; i <= b.siblingCount; i++) orderOptions.push(i + '番目');
      return '<div class="lt3-view pedit">' +
        '<div class="hd">基本情報を編集<div class="close lt3-tap" data-act="back">' + meta('閉じる', { ls: 0 }) + '</div></div>' +
        '<div class="list">' +
          '<div class="pic" data-slot="me/avatar">' +
            (LT3.media.get('me/avatar') ? '<img src="' + esc(LT3.media.get('me/avatar')) + '">'
              : '<span>' + esc((b.name || '?').substring(0, 1)) + '</span>') + '</div>' +
          '<div class="pick lt3-tap" data-act="pickAvatar">' + (s.busy.avatar ? '送っています…' : '写真を変える') + '</div>' +
          field('名前', 'pname', '呼ばれたい名前') +
          field('住まい', 'parea', '例: 東京 · 世田谷') +
          field('身長 (cm)', 'pheight', '例: 170', 'number') +
          chips('体つき', BUILD_OPTIONS, b.build, 'setBuild') +
          chips('きょうだい', sibOptions, sibSelected, 'setSiblings') +
          (b.siblingCount > 1 ? chips('上から何番目', orderOptions, b.siblingOrder > 0 ? b.siblingOrder + '番目' : '', 'setOrder') : '') +
          '<div class="ro">' + meta('変更できない項目', { size: 9.5, color: C.text3 }) +
            '<div class="r"><div>性別</div><div class="v">' + (b.gender === 'female' ? '女性' : '男性') + '</div></div>' +
            '<div class="r"><div>年齢</div><div class="v">' + esc(b.age) + '歳</div></div>' +
          '</div>' +
          (s.error.pedit ? '<div class="err">' + esc(s.error.pedit) + '</div>' : '') +
          '<div class="save lt3-tap' + (s.busy.pedit ? ' busy' : '') + '" data-act="save">' +
            (s.busy.pedit ? '保存しています…' : '保存する') + '</div>' +
        '</div></div>';
    },
    actions: {
      setBuild: function (v) { LT3.state.basics.build = v; LT3.render(); },
      setSiblings: function (v) {
        var b = LT3.state.basics;
        b.siblingCount = v === 'ひとりっ子' ? 1 : parseInt(v, 10);
        b.siblingOrder = b.siblingCount === 1 ? 1 : (b.siblingOrder > b.siblingCount ? b.siblingCount : b.siblingOrder);
        LT3.render();
      },
      setOrder: function (v) { LT3.state.basics.siblingOrder = parseInt(v, 10); LT3.render(); },
      pickAvatar: function () {
        LT3.state.busy.avatar = true; LT3.render();
        LT3.after(500, function () { LT3.state.busy.avatar = false; LT3.render(); });
      },
      save: function () {
        var s = LT3.state, b = s.basics;
        var name = (s.draft.pname || '').trim();
        var cm = parseInt(String(s.draft.pheight || '').replace(/[^0-9]/g, ''), 10);
        if (!name) { s.error.pedit = '名前を入れてください'; LT3.render(); return; }
        if (!cm || cm < 100 || cm > 250) { s.error.pedit = '身長は 100〜250 で入れてください'; LT3.render(); return; }
        b.name = name; b.area = (s.draft.parea || '').trim(); b.heightCm = cm;
        s.me = Object.assign({}, s.me, { name: name, meta: b.age + '歳 · ' + b.area });
        s.error.pedit = ''; s.busy.pedit = true; LT3.render();
        LT3.after(500, function () { LT3.state.busy.pedit = false; LT3.back(); });
      },
    },
  };
  function field(label, model, hint, type) {
    return '<div class="field">' + meta(label, { size: 9.5, color: C.primary }) +
      '<input type="' + (type || 'text') + '" data-model="' + model + '" placeholder="' + esc(hint) + '"></div>';
  }
  function chips(label, options, selected, act) {
    return '<div class="field" style="margin-top:20px">' + meta(label, { size: 9.5, color: C.primary }) +
      '<div class="chips">' + options.map(function (o) {
        return '<div class="c lt3-tap' + (o === selected ? ' on' : '') + '" data-act="' + act + '" data-arg="' + esc(o) + '">' + esc(o) + '</div>';
      }).join('') + '</div></div>';
  }

  /* ======================================================================
     8 · PersonaView — 相棒の全画面表示と改名
     ====================================================================== */
  LT3.screens.persona = {
    view: function (s) {
      var card = s.persona;
      if (!card) return '<div class="lt3-view persona"><div class="stage" style="display:flex;align-items:center;justify-content:center">' +
        '<div style="font-size:13px;color:' + C.text2 + '">相棒はまだいません</div></div></div>';
      return '<div class="lt3-view persona">' +
        '<div class="hd">' + meta(card.format) + '<div class="close lt3-tap" data-act="back">×</div></div>' +
        '<div class="stage">' + photo('persona/figure', { label: '立ち絵' }) + '</div>' +
        '<div class="foot">' + meta(card.worldLabel, { size: 9.5, color: C.primary }) +
          '<div class="nm lt3-tap" data-act="openRename">「' + esc(card.epithet) + '」 ' + esc(card.name) +
            icon.edit(C.text3) + '</div>' +
          '<div class="attrs">' + card.attributes.map(function (a) {
            return '<i>' + esc(a.label + ' ' + a.value) + '</i>';
          }).join('') + '</div>' +
          (card.flavor ? '<div class="flavor">' + esc(card.flavor) + '</div>' : '') +
          (card.reason ? '<div class="reason">' + esc(card.reason) + '</div>' : '') +
          '<div class="again lt3-tap' + (s.busy.persona ? ' busy' : '') + '" data-act="regenerate">' +
            (s.busy.persona ? '描いています…' : 'もう一度描く') + '</div>' +
        '</div></div>';
    },
    actions: {
      openRename: function () {
        LT3.state.draft.pername = LT3.state.persona.name;
        LT3.state.sheet = 'rename';
        LT3.render();
      },
      regenerate: function () {
        LT3.state.busy.persona = true; LT3.render();
        LT3.after(1200, function () { LT3.state.busy.persona = false; LT3.render(); });
      },
      submitRename: function () {
        var s = LT3.state;
        var name = (s.draft.pername || '').trim();
        if (!name || name.length > 20) { s.error.rename = '名前は 1〜20 字で入れてください'; LT3.render(); return; }
        s.persona = Object.assign({}, s.persona, { name: name, nameLocked: true });
        s.error.rename = ''; s.sheet = null; LT3.render();
      },
    },
    sheet: function (s, kind) {
      if (kind !== 'rename') return '';
      return '<div class="t">名前を付け直す</div>' +
        '<div class="s">姿はそのままです。呼びたい名前にしてください。</div>' +
        '<input data-model="pername" data-submit="submitRename" placeholder="' + esc(s.persona.name) + '">' +
        (s.error.rename ? '<div class="err">' + esc(s.error.rename) + '</div>' : '') +
        '<div class="ok lt3-tap" data-act="submitRename">この名前にする</div>';
    },
  };

  /* ======================================================================
     9 · PairTimelineView — ふたりだけのタイムライン
     ====================================================================== */
  LT3.screens.pair = {
    enter: function (s) {
      s.draft.reply = '';
      if (!LT3.partnerById(s.args.id)) return;
      LT3.every(1000, function () {
        if (LT3.state.countdown > 0) LT3.state.countdown -= 1;
        var el = document.querySelector('.pair .countdown .num');
        if (el) el.textContent = fmtCountdown(LT3.state.countdown);
      });
    },
    view: function (s) {
      var p = LT3.partnerById(s.args.id);
      if (!p) return '<div class="lt3-view pair"></div>';
      var fading = p.isFading;
      var entries = LT3.entriesFor(p.id);
      var list = entries.length
        ? '<div class="list">' + entries.map(function (e) { return entryHtml(p, e, fading); }).join('') + '</div>'
        : '<div class="empty"><span>まだ発信はありません</span></div>';
      return '<div class="lt3-view pair">' +
        '<div class="hd">' +
          '<div class="btn lt3-tap" data-act="back">' + icon.back(C.text1) + '</div>' +
          '<div class="nm">' + esc(p.name) + '</div>' +
          '<div class="btn lt3-tap" data-act="openProfile" data-arg="' + esc(p.id) + '">' +
            avatar(p.initial, { size: 34, fontSize: 16, key: 'partner/' + p.id + '/avatar', lit: !fading }) + '</div>' +
        '</div>' +
        (fading ? countdownBlock(s) : '') + list +
        (fading ? fadingFoot() : inputBar()) +
      '</div>';
    },
    actions: {
      openProfile: function (id) { LT3.go('partner', { id: id }); },
      like: function (arg) {
        var parts = arg.split('|');
        LT3.toggleLike(parts[0], parts[1]);
      },
      focusInput: function () {
        var el = document.querySelector('.pair .input input');
        if (el) el.focus();
      },
      postImage: function () {
        var s = LT3.state;
        if (s.posted || !s.theme) return;
        LT3.go('camera');
      },
      send: function () {
        var s = LT3.state;
        var text = (s.draft.reply || '').trim();
        if (!text) return;
        var id = s.args.id;
        s.replies[id] = (s.replies[id] || []).concat([{ type: 'message', author: 'me', text: text }]);
        s.draft.reply = '';
        LT3.render();
        var list = document.querySelector('.pair .list');
        if (list) list.scrollTop = list.scrollHeight;
      },
      rescue: function () {
        var s = LT3.state;
        var id = s.args.id;
        s.replies[id] = (s.replies[id] || []).concat([{ type: 'message', author: 'me', text: 'ごめん、返事が遅くなった。' }]);
        s.fading = false;
        LT3.render();
      },
      release: function () { LT3.back(); },
    },
  };

  function fmtCountdown(sec) {
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    function p(n) { return String(n).padStart(2, '0'); }
    return p(h) + ':' + p(m) + ':' + p(s);
  }
  function countdownBlock(s) {
    return '<div class="countdown">' +
      '<div class="breathe">' + meta('AUTO-RELEASE IN') + '</div>' +
      '<div class="num">' + fmtCountdown(s.countdown) + '</div>' +
      '<div class="sub">72 時間、どちらからも反応がありません。</div></div>';
  }
  function entryHtml(p, e, fading) {
    if (e.type === 'divider') {
      return '<div class="divider"><div class="ln"></div>' + meta(e.label, { size: 9.5 }) + '<div class="ln"></div></div>';
    }
    if (e.type === 'message') {
      var mine = e.author === 'me';
      return '<div class="bubble ' + (mine ? 'mine' : 'theirs') + '">' + esc(e.text) + '</div>';
    }
    var isMine = e.author === 'me';
    var key = 'timeline/' + p.id + '/' + (e.likeKey || (isMine ? 'me' : 'them') + '-' + (e.meta || ''));
    // 相手のお題投稿だけが退色する (自分の投稿は色を保つ)
    var faded = fading && !isMine;
    var showChip = !!e.caption || !LT3.media.get(key);
    var chip = showChip
      ? '<div class="chip">' + meta(e.meta, { size: 9.5, ls: 0.12, color: C.onPhoto }) +
        (e.caption ? '<div class="cap">' + esc(e.caption) + '</div>' : '') + '</div>'
      : '';
    var card = '<div class="photo ' + (isMine ? 'mine' : 'theirs') + '">' +
      photo(key, { label: showChip ? '' : e.placeholder, faded: faded, grain: faded }) + chip + '</div>';
    if (isMine || !e.likeKey) return card;
    var liked = LT3.isLiked(p.id, e.likeKey);
    return '<div>' + card +
      '<div class="likes" style="margin-top:6px">' +
        '<div class="b lt3-tap' + (liked ? ' on' : '') + '" data-act="like" data-arg="' + esc(p.id + '|' + e.likeKey) + '">' +
          (liked ? LT3.icon.heartFill(C.primary, 20) : icon.heart(C.text2, 20)) + (liked ? 'いいね済み' : 'いいね') + '</div>' +
        '<div class="b lt3-tap" data-act="focusInput">' + icon.reply(C.text2, 20) + 'リプライ</div>' +
      '</div></div>';
  }
  function inputBar() {
    return '<div class="input">' +
      '<div class="rnd ghost lt3-tap" data-act="postImage">' + icon.photo(C.text2) + '</div>' +
      '<div class="box"><input data-model="reply" data-submit="send" placeholder="リプライを送る"></div>' +
      '<div class="rnd gold lt3-tap" data-act="send">' + icon.plane(C.onPrimary) + '</div>' +
    '</div>';
  }
  function fadingFoot() {
    return '<div class="fading-foot">' +
      '<div class="keep lt3-tap" data-act="rescue">リプライして繋ぎ止める</div>' +
      '<div class="let-go lt3-tap" data-act="release">この枠を手放す</div>' +
      meta('自分から手放す・放置して解除 → 14 日間の待機', { ls: 0 }) +
    '</div>';
  }

  /* ======================================================================
     10 · PartnerProfileView
     ====================================================================== */
  LT3.screens.partner = {
    enter: function (s) { s.showAllPosts = false; },
    view: function (s) {
      var p = LT3.partnerById(s.args.id);
      if (!p) return '<div class="lt3-view pprof"></div>';
      var posts = s.showAllPosts ? p.posts : p.posts.slice(0, 2);
      var facts = '';
      for (var i = 0; i < p.facts.length; i += 2) {
        facts += factCard(p.facts[i]) + (p.facts[i + 1] ? factCard(p.facts[i + 1]) : '<div></div>');
      }
      return '<div class="lt3-view pprof">' +
        '<div class="hd"><div class="btn lt3-tap" data-act="back">' + icon.back(C.text1) + '</div>' +
          meta('PROFILE') + '<div style="width:44px"></div></div>' +
        '<div class="body">' +
          '<div class="identity">' + avatar(p.initial, { size: 64, fontSize: 28, key: 'partner/' + p.id + '/avatar', lit: !p.isFading }) +
            '<div style="flex:1"><div class="nm">' + esc(p.name) + '</div>' +
            '<div class="mt">' + esc(p.age + '歳 · ' + p.area) + '</div></div></div>' +
          '<div style="height:20px"></div>' +
          '<div class="view-card">' + meta('恋愛観', { size: 9.5, color: C.primary }) +
            '<div class="t">' + esc(p.view) + '</div></div>' +
          '<div style="height:20px"></div><div class="facts">' + facts + '</div>' +
          '<div style="height:20px"></div>' +
          '<div class="posts-head">' + meta('POSTS — これまでのお題') +
            meta(p.posts.length + ' 投稿', { ls: 0, color: C.primary }) + '</div>' +
          posts.map(function (post, i) { return postCard(p, post, i); }).join('') +
          (!s.showAllPosts && p.posts.length > 2
            ? '<div class="more lt3-tap" data-act="expand">すべて見る（' + p.posts.length + '）</div>' : '') +
        '</div></div>';
    },
    actions: {
      expand: function () { LT3.state.showAllPosts = true; LT3.render(); },
    },
  };
  function factCard(f) {
    return '<div class="fact">' + meta(f.k, { size: 9 }) + '<div class="v">' + esc(f.v) + '</div></div>';
  }
  function postCard(p, post, i) {
    return '<div class="post">' +
      photo('partner/' + p.id + '/post' + i, { label: post.theme, faded: p.isFading }) +
      '<div class="veil"></div>' +
      '<div class="cap">' + meta('お題「' + post.theme + '」 · ' + post.meta, { size: 9, ls: 0.12, color: C.onPhoto }) +
      (post.caption ? '<div class="t">' + esc(post.caption) + '</div>' : '') + '</div></div>';
  }

  /* ======================================================================
     11 · CameraView — 縦持ちのまま UI だけ倒す 16:9 / 2 秒クリップ
     ====================================================================== */
  LT3.screens.camera = {
    enter: function (s) { s.camera = { rec: false, progress: 0 }; },
    view: function (s) {
      var c = s.camera;
      var pct = Math.round(Math.min(1, c.progress) * 100);
      var label = c.rec ? '0:0' + Math.min(2, Math.floor(c.progress * 2)) + ' / 0:02' : '2 SEC';
      // 帯 (band) は rot 空間の右端 = 端末を縦に持ったときの下辺。シャッターが親指の位置に来る
      return '<div class="lt3-view camera"><div class="rot">' +
        '<div class="stage">' +
          '<div class="preview">' + photo('camera/preview', { label: 'カメラプレビュー' }) + '</div>' +
          (s.theme ? '<div class="theme"><div class="box">' + meta("TODAY'S THEME", { size: 9, color: C.accentOnDark }) +
            '<div class="t">' + esc(s.theme.theme) + '</div></div></div>' : '') +
        '</div>' +
        '<div class="band">' +
          '<div class="btn lt3-tap" data-act="back">' + icon.close(C.onDark) + '</div>' +
          '<div class="ring" style="background:conic-gradient(var(--accent) ' + pct + '%, rgba(255,255,255,.28) 0)">' +
            '<div class="shutter' + (c.rec ? ' rec' : '') + ' lt3-tap" data-act="startRec"><i></i></div>' +
          '</div>' +
          '<div class="btn lt3-tap" data-act="switchCam">' + icon.swap(C.onDark) + '</div>' +
          '<div class="rec-label' + (c.rec ? ' on' : '') + '">' + label + '</div>' +
        '</div>' +
      '</div></div>';
    },
    actions: {
      switchCam: function () { /* レンズ切替 (プレビューは同じ枠) */ },
      startRec: function () {
        var s = LT3.state;
        if (s.camera.rec) return;
        s.camera.rec = true; s.camera.progress = 0;
        LT3.render();
        var id = LT3.every(80, function () {
          var c = LT3.state.camera;
          c.progress += 0.04;
          if (c.progress >= 1) {
            c.progress = 1; c.rec = false;
            clearInterval(id);
            LT3.replace('compose');
            return;
          }
          LT3.render();
        });
      },
    },
  };

  /* ======================================================================
     12 · ComposeView — 撮ったクリップにひとことを添えて投稿
     ====================================================================== */
  // ひとことは最大幅に達したら折り返す。行が増えた分だけ入力欄の高さを合わせる
  function fitCap() {
    var el = document.querySelector('.compose .frame .cap');
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  LT3.screens.compose = {
    enter: function (s) {
      s.draft.caption = ''; s.busy.post = false; s.uploadProgress = 0;
      // ひとことを入力する前提の画面なので、開いた時点で中央の入力欄にフォーカスする
      setTimeout(function () {
        var el = document.querySelector('.compose .frame .cap');
        if (el) { el.focus(); fitCap(); }
      }, 0);
    },
    view: function (s) {
      return '<div class="lt3-view compose">' +
        '<div class="hd lt3-tap" data-act="retake">' + icon.back(C.text2, 20) + '撮り直す</div>' +
        '<div class="stage"><div class="frame">' +
          photo('camera/preview', { label: '' }) +
          '<div class="chip">' + meta(s.theme ? s.theme.composeMeta : '', { size: 9.5, color: C.onPhoto }) +
            '<textarea class="cap" rows="1" data-model="caption" data-live="live" placeholder="ひとことを添える"></textarea>' +
          '</div>' +
        '</div></div>' +
        '<div class="foot">' +
          '<div class="post lt3-tap' + (s.busy.post ? ' busy' : '') + '" data-act="post">' +
            (s.busy.post ? '送信中 ' + Math.round((s.uploadProgress || 0) * 100) + '%' : '投稿する') + '</div>' +
        '</div></div>';
    },
    actions: {
      live: function () { LT3.render(); setTimeout(fitCap, 0); },
      retake: function () { LT3.replace('camera'); },
      post: function () {
        var s = LT3.state;
        if (s.busy.post) return;
        s.busy.post = true; s.uploadProgress = 0; LT3.render();
        var id = LT3.every(120, function () {
          var st = LT3.state;
          st.uploadProgress += 0.15;
          if (st.uploadProgress >= 1) {
            clearInterval(id);
            st.busy.post = false;
            // 今日のお題を現在の全枠へ配る (公開先は 3 枠のみ)
            var caption = (st.draft.caption || '').trim();
            st.posted = true;
            st.myPost = { theme: st.theme ? st.theme.theme : '', meta: st.theme ? st.theme.composeMeta : '', caption: caption, mediaUrl: 'me/today' };
            LT3.media.set('me/today', LT3.media.get('camera/preview') || '');
            LT3.offAll('main');
            return;
          }
          LT3.render();
        });
      },
    },
  };

  /* ---- boot ------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () { LT3.boot(); });
})(window);
