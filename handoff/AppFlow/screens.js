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

  var C = { // DesignColors (色は CSS 変数が正。SVG の stroke にだけ直値で渡す)
    primary: '#E9B26A', onPrimary: '#0B0A0C', text1: '#F5F1EA',
    text2: 'rgba(245,241,234,.64)', text3: 'rgba(245,241,234,.38)',
    tabInactive: 'rgba(245,241,234,.55)', camDisabled: 'rgba(245,241,234,.30)',
  };

  function meta(text, opt) {
    opt = opt || {};
    var st = 'font-size:' + (opt.size || 10) + 'px;letter-spacing:' + ((opt.size || 10) * (opt.ls == null ? 0.16 : opt.ls)) + 'px';
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
      return '<div class="lt3-view splash lt3-safe-top lt3-safe-bottom">' +
        '<div class="icon">' + photo('app/icon', { label: 'APP ICON', src: '../../assets/images/app-icon-rings-photo.png' }) + '</div>' +
        '<div class="title">the last three</div>' +
        '<div class="dots">' +
          '<i style="animation-delay:812ms"></i><i style="animation-delay:1008ms"></i><i style="animation-delay:1204ms"></i>' +
        '</div>' +
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
        '<div class="title">The Last Three</div>' +
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
      speak('こんにちは。これから、あなたの理想の相手を 1 体の相棒として生成します。まずは、その人のことを聞かせてください。');
    },
    view: function (s) {
      var o = s.onb;
      if (!o) return '<div class="lt3-view"></div>';
      var stage = figureStage(o);
      var scrimH = o.climax ? 420 : (showOptions(o) ? 400 : 340);
      var figure = '';
      if (o.done) {
        figure = crystalHtml(s, o);
      } else if (o.companionRevealed && s.persona) {
        figure = companionHtml(s, o);
      } else {
        figure = '<div class="figure" style="top:' + figureTop(stage) + 'px">' +
          LT3Figure.render(stage, { speaking: o.speaking }) + '</div>';
      }
      return '<div class="lt3-view onb">' +
        '<div class="glow"></div>' + figure +
        '<div class="scrim-top"></div><div class="scrim-bottom" style="height:' + scrimH + 'px"></div>' +
        header(o) + bottom(s, o) +
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
    if (phase === 'intro') { speak('こんにちは。これから、あなたの理想の相手を 1 体の相棒として生成します。まずは、その人のことを聞かせてください。'); }
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

  function figureTop(stage) {
    if (stage === 's0' || stage === 's1') return 84;
    if (stage === 's2') return 60;
    if (stage === 's3') return 56;
    return 84;
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

  function bottom(s, o) {
    var html = '<div class="bottom">';
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
        var labels = usesLabelChoice(o) ? o.basicsOptions : o.options.map(function (x) { return x.label; });
        html += '<div class="chips">' + labels.map(function (label, i) {
          var on = !usesLabelChoice(o) && o.picked.indexOf(i) >= 0;
          return '<div class="chip lt3-tap' + (on ? ' on' : '') + '" data-act="pick" data-arg="' + i + '">' + esc(label) + '</div>';
        }).join('') + '</div>';
        if (o.isMulti && o.picked.length) {
          html += '<div class="action lt3-tap" data-act="submitPicked" style="margin-top:8px">これで送る（' + o.picked.length + '）</div>';
        }
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

  function companionHtml(s, o) {
    var card = s.persona;
    return '<div class="companion">' +
      '<div class="fig-wrap" style="filter:blur(14px)">' + photo('persona/figure', { label: '' }) + '</div>' +
      '<div class="veil"></div>' +
      '<div class="cap">' + (card.epithet ? meta(card.epithet, { color: C.primary }) : '') +
        '<div class="nm">' + esc(card.name) + '</div></div>' +
    '</div>';
  }
  function crystalHtml(s, o) {
    var card = s.persona;
    var inner = card
      ? '<div class="fig-wrap">' + photo('persona/figure', { label: '' }) + '</div>'
      : '<div class="fig-wrap"><div class="figure" style="top:-116px;left:-51px;width:402px;right:auto">' +
          LT3Figure.render('crystal', {}) + '</div></div>';
    return '<div class="crystal">' + inner + '<div class="veil"></div>' +
      '<div class="cap">' + meta('YOUR COMPANION · 05:00') +
      '<div class="nm">' + esc(card && card.name ? card.name : 'あなたが探している人') + '</div></div></div>';
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
      return '<div class="lt3-view main">' + body + tabBar(s) + '</div>' + balloon(s) + debugBtn();
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
      openReport: function (i) { LT3.go('reportDetail', { index: Number(i) }); },
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
    // 1 列の高さとカード幅は実測値から決める (Flutter: MainMatchReports.rowHeightFor)
    after: function (s, screen) {
      var rows = screen.querySelector('.reports .rows');
      if (!rows) return;
      var list = rows.querySelectorAll('.rline');
      var n = list.length;
      if (!n) return;
      var even = (rows.clientHeight - 10 * (n - 1)) / n;
      var rowHeight = Math.max(0, Math.min(even, 190));
      var cardWidth = rowHeight * 1.25; // MatchReportCard.aspectRatio = 5 / 4
      Array.prototype.forEach.call(list, function (row) {
        row.style.height = rowHeight + 'px';
        Array.prototype.forEach.call(row.children, function (card) {
          card.style.height = rowHeight + 'px';
          card.style.width = cardWidth + 'px';
        });
      });
    },
  };
  LT3.screens.main.actions.resetOnboarding = function () { LT3.offAll('onboarding'); };

  function slotsHtml(s) {
    var partners = LT3.partners();
    var filled = partners.length >= 3;
    var cards = partners.map(slotCard).join('');
    if (filled) return '<div class="slots filled">' + cards + '</div>';
    return '<div class="slots">' + cards + reportsHtml(s, 3 - partners.length) + '</div>';
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
        avatar(p.initial, { size: 28, key: 'partner/' + p.id + '/avatar', lit: !p.isFading }) +
        '<div class="nm">' + esc(p.name) + '</div></div>' +
      '<div class="center">' + meta(p.postMeta, { size: 9.5, color: C.text2 }) +
        '<div class="cap">' + esc(p.caption) + '</div></div>' +
    '</div>';
  }

  function reportsHtml(s, freeSlots) {
    var reports = M.matchReports;
    var rows = Math.min(Math.max(freeSlots, 1), 3);
    var body;
    if (!reports.length) {
      body = '<div class="empty">AI が、誰かの理想像とあなたを照らし合わせています。\n分析が終わるたび、ここに 1 枚ずつ並びます。</div>';
    } else {
      var cols = '';
      for (var r = 0; r < rows; r++) {
        var slice = [];
        for (var i = r; i < reports.length; i += rows) slice.push({ rep: reports[i], index: i });
        cols += '<div class="rline">' + (slice.length
          ? slice.map(function (x) { return reportCard(x.rep, x.index); }).join('')
          : '<div class="waiting" style="aspect-ratio:5/4;height:100%">' + meta('次の巡回を待っています', { size: 9.5 }) + '</div>') +
          '</div>';
      }
      body = '<div class="rows"><div class="cols">' + cols + '</div></div>';
    }
    return '<div class="reports">' +
      '<div class="head"><div class="dot"></div>' + meta('ANALYZING', { size: 9.5, color: C.primary }) +
      '<div class="sp"></div>' + meta(freeSlots + ' SLOT' + (freeSlots > 1 ? 'S' : '') + ' OPEN', { size: 9.5 }) + '</div>' +
      body + '</div>';
  }

  function isWanted(outcome) { return outcome === 'mutual' || outcome === 'theirIdeal'; }

  function reportCard(rep, index) {
    var lines = rep.lines.map(function (l) {
      return '<div class="line"><div class="b' + (l.hit ? ' hit' : '') + '">' + (l.hit ? '○' : '·') + '</div>' +
        '<div class="t' + (l.hit ? ' hit' : '') + '">' + esc(l.label + ' ' + l.value) + '</div></div>';
    }).join('');
    return '<div class="rep-card lt3-tap' + (isWanted(rep.outcome) ? ' wanted' : '') + '" style="aspect-ratio:5/4;height:100%"' +
      ' data-act="openReport" data-arg="' + index + '">' +
      '<div class="analysis"><div class="nick">' + esc(rep.nickname) + '</div>' +
        '<div class="lines">' + lines + '</div>' +
        (rep.verdict ? '<div class="verdict' + (isWanted(rep.outcome) ? ' wanted' : '') + '">' + esc(rep.verdict) + '</div>' : '') +
      '</div>' +
      '<div class="ideal" style="aspect-ratio:.55;height:100%">' +
        (rep.idealImageUrl ? photo('report/' + index, { label: '' })
          : '<div class="fallback">' + meta('像を結ぶ前', { size: 8 }) + '</div>') +
        '<div class="fade"></div><div class="tag">THEIR IDEAL</div>' +
      '</div></div>';
  }

  function tabBar(s) {
    var camera;
    if (s.myPost) {
      camera = '<div class="cam mine lt3-tap" data-act="openMyPost">' + photo('me/today', { label: '' }) + '</div>';
    } else {
      var active = !!s.theme && !s.posted;
      camera = '<div class="cam' + (active ? ' on' : '') + ' lt3-tap" data-act="openCamera">' +
        icon.camera(active ? C.onPrimary : C.camDisabled) + '</div>';
    }
    return '<div class="tabbar"><div class="inner">' +
      '<div class="tab lt3-tap" data-act="goHome">' + icon.home(s.tab === 0 ? C.primary : C.tabInactive) + '</div>' +
      camera +
      '<div class="tab lt3-tap" data-act="goMyProfile">' + icon.person(s.tab === 1 ? C.primary : C.tabInactive) + '</div>' +
    '</div></div>';
  }

  function balloon(s) {
    var text = (s.theme && s.theme.theme) || (s.myPost && s.myPost.theme) || '';
    if (!text) return '';
    return '<div class="balloon"><div class="lt3-tap" data-act="openCamera" style="display:flex;flex-direction:column;align-items:center">' +
      '<div class="tail"></div>' +
      '<div class="body">' + meta("TODAY'S THEME", { size: 8.5, color: C.primary }) +
      '<div class="t">' + esc(text) + '</div></div></div></div>';
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
    var html = '<div class="myprof">';
    html += '<div class="big-avatar" data-slot="me/avatar">' +
      (LT3.media.get('me/avatar') ? '<img src="' + esc(LT3.media.get('me/avatar')) + '">'
        : '<span>' + esc((me.name || '?').substring(0, 1)) + '</span>') + '</div>';
    html += '<div class="nm">' + esc(me.name) + '</div>';
    html += '<div class="mt">' + esc([me.meta, b.gender === 'female' ? '女性' : '男性'].filter(Boolean).join(' · ')) + '</div>';
    // 基本情報 (申告値。性別と年齢は変えられない)
    html += '<div style="height:24px"></div><div class="card-box">' +
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
        '<div class="chevron"></div></div>';
    }
    if (wishes.length) {
      html += '<div style="height:12px"></div><div class="card-box">' +
        wishes.map(function (f) { return kv(f.k, f.v); }).join('') + '</div>';
    }
    return html + '</div>';
  }
  function kv(k, v) {
    return '<div class="kv"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + '</div></div>';
  }

  /* ======================================================================
     6 · MatchReportDetail — 縦長レポートを横へ送って読む
     ====================================================================== */
  LT3.screens.reportDetail = {
    view: function (s) {
      var reports = M.matchReports;
      var pages = reports.map(function (rep, i) {
        var lines = rep.lines.map(function (l) {
          return '<div class="r"><div class="b' + (l.hit ? ' hit' : '') + '">' + (l.hit ? '○' : '·') + '</div>' +
            '<div class="k">' + esc(l.label) + '</div><div class="v' + (l.hit ? ' hit' : '') + '">' + esc(l.value) + '</div></div>';
        }).join('');
        return '<div class="page" id="rep-' + i + '"><div class="sheet' + (isWanted(rep.outcome) ? ' wanted' : '') + '">' +
          '<div class="hero">' +
            (rep.idealImageUrl ? photo('report/' + i, { label: '' })
              : '<div class="slot"><div class="ph">像を結ぶ前</div></div>') +
            '<div class="veil"></div>' +
            '<div class="cap">' + meta('THEIR IDEAL', { size: 8.5, color: C.primary }) +
            '<div class="nm">' + esc(rep.nickname) + '</div></div>' +
          '</div>' +
          '<div class="body"><div class="hl">' + esc(rep.headline || rep.verdict) + '</div>' +
            (rep.detail ? '<div class="dt">' + esc(rep.detail) + '</div>' : '') +
            '<div class="sec">' + meta('この人のこと', { size: 9.5 }) + '</div>' + lines +
          '</div></div></div>';
      }).join('');
      return '<div class="lt3-view rep-detail">' +
        '<div class="hd">' + meta('ANALYSIS') + '<div class="close lt3-tap" data-act="back">×</div></div>' +
        '<div class="pages" id="rep-pages">' + pages + '</div></div>';
    },
    actions: {},
  };

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
        : '<div class="empty">まだ発信はありません</div>';
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
      ? '<div class="chip">' + meta(e.meta, { size: 9.5, ls: 0.14, color: C.text2 }) +
        (e.caption ? '<div class="cap">' + esc(e.caption) + '</div>' : '') + '</div>'
      : '';
    var card = '<div class="photo ' + (isMine ? 'mine' : 'theirs') + '">' +
      photo(key, { label: showChip ? '' : e.placeholder, faded: faded, grain: faded }) + chip + '</div>';
    if (isMine || !e.likeKey) return card;
    var liked = LT3.isLiked(p.id, e.likeKey);
    return '<div>' + card +
      '<div class="likes" style="margin-top:6px">' +
        '<div class="b lt3-tap' + (liked ? ' on' : '') + '" data-act="like" data-arg="' + esc(p.id + '|' + e.likeKey) + '">' +
          '<span class="hh">' + (liked ? '♥︎' : '♡︎') + '</span>' + (liked ? 'いいね済み' : 'いいね') + '</div>' +
        '<div class="b lt3-tap" data-act="focusInput">' + icon.reply(C.text2) + 'リプライ</div>' +
      '</div></div>';
  }
  function inputBar() {
    return '<div class="input">' +
      '<div class="rnd ghost lt3-tap" data-act="postImage">' + icon.photo('rgba(245,241,234,.72)') + '</div>' +
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
      '<div class="cap">' + meta('お題「' + post.theme + '」 · ' + post.meta, { size: 9, ls: 0.14, color: C.text2 }) +
      (post.caption ? '<div class="t">' + esc(post.caption) + '</div>' : '') + '</div></div>';
  }

  /* ======================================================================
     11 · CameraView — 縦持ちのまま UI だけ倒す 16:9 / 2 秒クリップ
     ====================================================================== */
  LT3.screens.camera = {
    enter: function (s) { s.camera = { rec: false, progress: 0 }; },
    view: function (s) {
      var c = s.camera;
      var label = '● REC 0:0' + Math.min(2, Math.floor(c.progress * 2)) + ' / 0:02';
      return '<div class="lt3-view camera"><div class="rot">' +
        '<div class="preview">' + photo('camera/preview', { label: 'カメラプレビュー' }) +
          '<div class="ratio">16:9</div></div>' +
        '<div class="scrim-top"></div><div class="scrim-bottom"></div>' +
        '<div class="close lt3-tap" data-act="back">×</div>' +
        '<div class="switch lt3-tap" data-act="switchCam">' + icon.swap('rgba(245,241,234,.92)') + '</div>' +
        (s.theme ? '<div class="theme"><div class="box">' + meta("TODAY'S THEME", { size: 9, color: C.primary }) +
          '<div class="t">' + esc(s.theme.theme) + '</div></div></div>' : '') +
        '<div class="shutter-block">' +
          (c.rec ? '<div class="rec-label">' + label + '</div>' : '') +
          '<div class="shutter' + (c.rec ? ' rec' : '') + ' lt3-tap" data-act="startRec"><i></i></div>' +
          '<div class="bar"><i style="width:' + (c.progress * 100) + '%"></i></div>' +
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
  LT3.screens.compose = {
    enter: function (s) { s.draft.caption = ''; s.busy.post = false; s.uploadProgress = 0; },
    view: function (s) {
      var text = (s.draft.caption || '').trim();
      return '<div class="lt3-view compose">' +
        '<div class="hd lt3-tap" data-act="retake">' + icon.back(C.text1, 12) + '撮り直す</div>' +
        '<div class="stage"><div class="frame">' +
          photo('camera/preview', { label: text ? '' : '撮影したクリップ' }) +
          (text ? '<div class="chip">' + meta(s.theme ? s.theme.composeMeta : '', { size: 9.5, color: C.text2 }) +
            '<div class="t">' + esc(text) + '</div></div>' : '') +
        '</div></div>' +
        '<div class="foot">' +
          '<div class="box"><input data-model="caption" data-live="live" placeholder="ひとことを添える（そのまま動画に載ります）"></div>' +
          '<div class="post lt3-tap' + (s.busy.post ? ' busy' : '') + '" data-act="post">' +
            (s.busy.post ? '送信中 ' + Math.round((s.uploadProgress || 0) * 100) + '%' : '投稿する') + '</div>' +
        '</div></div>';
    },
    actions: {
      live: function () { LT3.render(); },
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
