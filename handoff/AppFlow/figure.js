/* ============================================================================
   WdParticleFigure の HTML 版 — 粒子で結ばれた通話相手の像。
   値は lib/component/ui/view/WdParticleFigure/WdParticleFigure.dart の
   _FigureSpec そのまま (設計フレーム 402×640)。構造は Flutter と同じで、
   密度場 (radial-gradient) を dot mask で抜いて点描にする。
   ========================================================================== */
(function (global) {
  'use strict';

  var TEXT1 = '245,241,234';

  // _Blob(cx, cy, rx, ry, [[alpha, stop], ...])
  function blob(cx, cy, rx, ry, stops) {
    return { cx: cx, cy: cy, rx: rx, ry: ry, stops: stops };
  }

  var SPECS = {
    s0: {
      blobs: [
        blob(201, 336, 206, 224, [[0.26, 0], [0.14, 0.52], [0, 0.84]]),
        blob(138, 246, 126, 146, [[0.16, 0], [0, 0.80]]),
        blob(268, 432, 148, 126, [[0.16, 0], [0, 0.80]]),
      ],
      pitch: 6.4, dotRatio: 0.30, blur: 6.5,
      driftX: 34, driftY: 56, driftSeconds: 7,
      breathFrom: 1, breathTo: 1.018, originY: 0.82, blinkSeconds: 6.5,
    },
    s1Speaking: {
      blobs: [
        blob(201, 208, 100, 118, [[0.42, 0], [0.28, 0.58], [0, 0.84]]),
        blob(201, 300, 52, 84, [[0.34, 0], [0.22, 0.60], [0, 0.90]]),
        blob(201, 428, 196, 168, [[0.36, 0], [0.24, 0.56], [0, 0.86]]),
      ],
      mouth: blob(201, 262, 30, 13, [[1.0, 0], [0, 0.82]]),
      pitch: 4.8, dotRatio: 0.34, blur: 3.4,
      driftX: 34, driftY: 56, driftSeconds: 14,
      breathFrom: 1, breathTo: 1.018, originY: 0.82, blinkSeconds: 6.5,
    },
    s1Listening: {
      blobs: [
        blob(201, 208, 96, 114, [[0.54, 0], [0.36, 0.58], [0, 0.82]]),
        blob(201, 300, 46, 78, [[0.44, 0], [0.28, 0.60], [0, 0.88]]),
        blob(201, 428, 190, 160, [[0.44, 0], [0.30, 0.56], [0, 0.84]]),
      ],
      pitch: 4.4, dotRatio: 0.36, blur: 3.2,
      driftX: 44, driftY: 62, driftSeconds: 9,
      breathFrom: 1, breathTo: 1.022, originY: 0.82, blinkSeconds: 6.5,
    },
    s2: {
      blobs: [
        blob(201, 208, 94, 112, [[0.58, 0], [0.40, 0.58], [0, 0.82]]),
        blob(201, 300, 46, 78, [[0.48, 0], [0.32, 0.60], [0, 0.88]]),
        blob(201, 428, 190, 160, [[0.48, 0], [0.34, 0.56], [0, 0.84]]),
      ],
      eyes: [
        blob(171, 206, 17, 9, [[0.50, 0], [0, 0.80]]),
        blob(231, 206, 17, 9, [[0.50, 0], [0, 0.80]]),
      ],
      eyePitch: 2.6,
      pitch: 3.6, dotRatio: 0.40, blur: 1.6,
      driftX: 38, driftY: 58, driftSeconds: 12,
      breathFrom: 1, breathTo: 1.018, originY: 0.82, blinkSeconds: 6.5,
    },
    s3: {
      blobs: [
        blob(201, 208, 94, 112, [[0.68, 0], [0.48, 0.58], [0, 0.82]]),
        blob(201, 300, 46, 78, [[0.54, 0], [0.38, 0.60], [0, 0.88]]),
        blob(201, 428, 190, 160, [[0.54, 0], [0.40, 0.56], [0, 0.84]]),
      ],
      eyes: [
        blob(171, 206, 16, 8, [[0.92, 0], [0, 0.78]]),
        blob(231, 206, 16, 8, [[0.92, 0], [0, 0.78]]),
      ],
      eyePitch: 2.2,
      pitch: 2.6, dotRatio: 0.46, blur: 0.3,
      driftX: 26, driftY: 44, driftSeconds: 16,
      breathFrom: 1.14, breathTo: 1.158, originY: 0.34, blinkSeconds: 8,
    },
    crystal: {
      blobs: [
        blob(201, 214, 94, 112, [[0.56, 0], [0.36, 0.56], [0, 0.84]]),
        blob(201, 300, 46, 78, [[0.56, 0], [0.40, 0.60], [0, 0.88]]),
        blob(201, 428, 190, 160, [[0.58, 0], [0.42, 0.56], [0, 0.84]]),
      ],
      eyes: [
        blob(171, 210, 16, 8, [[0.68, 0], [0, 0.80]]),
        blob(231, 210, 16, 8, [[0.68, 0], [0, 0.80]]),
      ],
      eyePitch: 2,
      pitch: 2.2, dotRatio: 0.48, blur: 0,
      driftX: 18, driftY: 30, driftSeconds: 20,
      breathFrom: 1, breathTo: 1.012, originY: 0.34, blinkSeconds: 8,
    },
  };

  function gradientOf(b, alphaScale) {
    var stops = b.stops.map(function (s) {
      return 'rgba(' + TEXT1 + ',' + (s[0] * alphaScale).toFixed(3) + ') ' + (s[1] * 100) + '%';
    });
    return 'radial-gradient(' + b.rx + 'px ' + b.ry + 'px at ' + b.cx + 'px ' + b.cy + 'px,' + stops.join(',') + ')';
  }

  // CSS では先に書いた層が手前。Flutter は blobs[0] から順に重ねる (後が手前) ので逆順にする
  function backgroundOf(blobs, alphaScale) {
    return blobs.slice().reverse().map(function (b) { return gradientOf(b, alphaScale); }).join(',');
  }

  function maskOf(pitch, dotRatio) {
    var inner = (dotRatio * 100).toFixed(1);
    var outer = (dotRatio * 100 + 2).toFixed(1);
    var img = 'radial-gradient(circle,#000 ' + inner + '%,rgba(0,0,0,0) ' + outer + '%)';
    return '-webkit-mask-image:' + img + ';mask-image:' + img +
      ';-webkit-mask-size:' + pitch + 'px ' + pitch + 'px;mask-size:' + pitch + 'px ' + pitch + 'px;' +
      '-webkit-mask-repeat:repeat;mask-repeat:repeat;';
  }

  function layerStyle(spec, css, extraAnim) {
    return 'position:absolute;inset:0;--dx:' + spec.driftX + 'px;--dy:' + spec.driftY + 'px;' +
      'animation:lt3-drift ' + spec.driftSeconds + 's linear infinite' + (extraAnim || '') + ';' + css;
  }

  /// stage の像 1 体ぶんの HTML。[opts.speaking] は s1 の口と輪郭に効く。
  ///
  /// 3 層構造は specimen と同じ: 外 = blur / 中 = 呼吸 / 内 = 点描 (背景 × dot mask)。
  /// CSS は filter → mask の順に効くので、blur を同じ要素に置くとドットが溶けない。
  function render(stage, opts) {
    opts = opts || {};
    var key = stage === 's1' ? (opts.speaking ? 's1Speaking' : 's1Listening') : stage;
    var spec = SPECS[key] || SPECS.s0;
    var out = '';

    out += '<div class="layer" style="' + layerStyle(spec,
      'background:' + backgroundOf(spec.blobs, 1) + ';' + maskOf(spec.pitch, spec.dotRatio)) + '"></div>';

    if (spec.mouth && opts.speaking) {
      // 口だけ密度が律動する (Flutter: mouth alpha = 律動 × 0.40)
      out += '<div class="layer" style="' + layerStyle(spec,
        'background:' + gradientOf(spec.mouth, 0.4) + ';' + maskOf(spec.pitch, spec.dotRatio),
        ',lt3-mouth .48s linear infinite') + '"></div>';
    }

    if (spec.eyes) {
      // 目だけ細かいピッチで抜くと、粒のまま視線が面として立つ
      out += '<div class="layer eyes" style="' + layerStyle(spec,
        'background:' + backgroundOf(spec.eyes, 1) + ';' + maskOf(spec.eyePitch, spec.dotRatio),
        ',lt3-blink ' + spec.blinkSeconds + 's linear infinite') + '"></div>';
    }

    return '<div class="fig-blur" style="position:absolute;inset:0;' +
      (spec.blur > 0 ? 'filter:blur(' + spec.blur + 'px);' : '') + '">' +
      '<div class="fig-breath" style="position:absolute;inset:0;transform-origin:50% ' + (spec.originY * 100) + '%;' +
      '--bfrom:' + spec.breathFrom + ';--bto:' + spec.breathTo + ';' +
      'animation:lt3-breath 8s ease-in-out infinite">' + out + '</div></div>';
  }

  global.LT3Figure = { render: render, specs: SPECS };
})(window);
