# AppFlow — アプリの全動作が動く HTML プロトタイプ

Flutter 実装（別 repo・本体アプリ）の**全画面・全動作**を、素の HTML/CSS/JS で動くようにしたもの。
`index.html` をブラウザで開けば、登録の 5 分対話から 3 枠・タイムライン・撮影・投稿・解除接近まで通しで操作できる。

- repo: `univbrofd/the-last-three-design`（branch `main`）
- raw base: `https://raw.githubusercontent.com/univbrofd/the-last-three-design/main/`
- DS 索引: `DesignSystem/_ds_manifest.json`（`prototypes` にこの一式が載っている）
- **色・書体・余白・角丸・陰影・モーションの canonical: Kaiwa Design System**
  （`_ds/kaiwa-design-system-c50556c2-19f8-4a5d-b0d2-4bbd29ff401c/styles.css`）。
  `DesignSystem/colors_and_type.css` は旧・役割トークンを Kaiwa へ写すだけの薄い層になった。
- デバイス枠: `DesignSystem/preview/card.css` の `.phone`（iPhone 17 / 402×874 / 角丸 55 / Dynamic Island）

これは**初稿デザイン `handoff/AppPrototype/` の後継**。AppPrototype は 2026-07 のデザイン初稿（5 画面 + 通しプロト）で、
その後に実装が進んだぶん（Splash / Login / MY PROFILE / 基本情報編集 / 相棒 / 分析レポート / 撮影 / 投稿）はここにしかない。
**いま実装に載っているのはこちらが正**。

## ファイル

| ファイル | 役割 |
|---|---|
| `index.html` | シェル。`.phone` 枠 + 画面コンテナ + 状態パネル |
| `app.css` | 全画面のスタイル。foundation は `colors_and_type.css` を参照し、View 固有の差分だけを持つ |
| `app.js` | 状態・ルーティング・共通パーツ（写真枠 / アバター / アイコン）・状態パネル |
| `screens.js` | 12 画面のレンダラとアクション。1 画面 = `view()` + `actions` |
| `figure.js` | 粒子像（通話相手）の 5 段階。密度場 × dot mask、実測値は下表 |
| `data/mock.js` | 生成物。`tools/build-data.mjs` が本体の `assets/mock/**` と `assets/onboarding/battery.json` から作る。**手編集しない** |

## 画面（11）

Splash / Login / OnboardingChat / Main（3 枠 + AI のタイムライン）/ MY PROFILE / 基本情報編集 /
相棒（Persona）/ ペアのタイムライン / 相手プロフィール / 撮影 / 投稿。

## 状態を直接開く

右のパネルでも切り替えられるが、URL でも指定できる（スクショ・レビュー用）。

```
index.html?route=main&slots=0            枠が空 = タイムラインだけが残る
index.html?route=main&slots=3            3 枠が埋まった状態
index.html?route=main&tab=1              MY PROFILE
index.html?route=main&theme=posted       今日のお題を出し終えた（タブが自分の 1 枚になる）
index.html?route=pair&id=mio             解除が近い枠（退色 + カウントダウン + 救出）
index.html?route=onboarding&phase=ideal      理想の相手を聞く（像が収束していく）
index.html?route=onboarding&phase=climax     山場（許せないこと）
index.html?route=onboarding&phase=companion  相棒を描いている最中
index.html?route=onboarding&phase=done       結晶（登録完了）
```

`phase` は `intro / gender / ideal / companion / self / climax / done`。
`route` は `splash login onboarding main pair partner camera compose persona profileEdit`。

## 写真

写真枠はすべて**クリックまたはドラッグ&ドロップで実写を差し込める**（localStorage に残る）。
既定の実写は同梱してある（レポートの理想像 3 枚 = `assets/ideal/`、Main のお題投稿 4 枚 = `assets/posts/`。後者は Unsplash のフリー素材）。
それ以外の枠は design 準拠のプレースホルダ枠（`linear-gradient(135deg,#2A2114,--surface)` + ラベル）。
実写を入れて初めて評価できる設計なので、参考写真の投入を推奨。パネルの「入れた写真を消す」で戻せる。

## スマホ配置文脈

- 画面 402×874。SafeArea は上 62 / 下 34（`card.css` の `.safe-top` / `.safe-bottom` と同じ）。
- タップ範囲は最小 44。タブバーは高さ 66 + 下 SafeArea 34。
- MY PROFILE だけは上端まで敷くため safe-top を通さない（余白はタブ側が持つ）。
- 撮影画面は端末を縦に持ったまま UI だけ 90 度倒す（16:9 のプレビューを横で構える）。SafeArea（横構えで左 62 / 右 34）を避けた内側に 16:9 を最大化して画面中央へ置き、シャッター・クローズ・スワップは右寄せの帯へ。帯は面を持たずスクリムのみで、プレビューに約 120px 重なる。お題は横構えの画面中央上部。

## 実装由来の設計値（このプロトタイプに焼いてある値）

| 対象 | 値 |
|---|---|
| 枠（MainSlotCard） | 16:9 full-bleed / 上スクリム 74・下スクリム 104 / 退色は彩度 0.15（危機は赤ではなく退色） |
| タイムライン（Main） | 枠は上詰め・空き枠は置かない。下に AI の思考ログが無限スクロール（1 件 = アバター 40 / 本文 15 / 画像 16:9・角丸 10 / 合致の点）|
| タイムライン | 自分の投稿 150 高・幅 76% 右寄せ / 相手 180 高・全幅 + いいね行 / ヘッダーは面なしで上端に白い透過グラデーションのスクリム、フッターは白背景（セーフエリアまで） |
| 解除カウントダウン | Instrument Serif 46 / tabular-nums / `AUTO-RELEASE IN` は呼吸（opacity .28↔.9・4s） |
| 登録対話 | 字幕 42ms/字、進行 5 段、山場だけ Instrument Serif 26 の見出し扱い |
| 粒子像 | 5 段階。s0 pitch 6.4・blur 6.5 → s3 pitch 2.6・blur 0.3。目は本体より細かいピッチで抜く |
| 相棒カード | 300×400（結晶は 300×402）、角丸 18、下スクリム 132 |
| MY PROFILE | 頭は 5:4 の全幅ヒーロー（上端まで写真）、上スクリム 96 / 下スクリム 156、名前は膜の上 |
| 撮影 | rot 空間 874×402。右 152 が操作帯（= 端末を縦に持ったときの下辺）、プレビューは残りに 16:9 |
| アイコン | grid 24 / 線幅 1.7（素の折れ線 1.8）/ 端も角も丸 / 当たり判定 44 |
| ロゴ | マーク = 灯り 3 点（正三角）+ 囲みのヘアライン。灯りは Kaiwa green。ワードマークは M PLUS Rounded 1c 800 の小文字・`three` だけ緑 |
| 灯り | `--accent #0EAE63` のみ。埋まった枠 / 絆 / CTA / 送信 / 選択だけに使う |

粒子像の 5 段階は `figure.js` の `SPECS` に、`radial-gradient(rx ry at cx cy, …)` と
`mask-image: radial-gradient(circle,#000 X%,transparent Y%)` + `mask-size` の実測値がそのまま入っている。
`handoff/OnboardingChatView/OnboardingCall_*.dc.html` の specimen と同じ構造（外 = blur / 中 = 呼吸 / 内 = 点描）。

## 直すべき逸脱 — 1〜6 対応済み（2026-08-02）

新しい色は要らなかったので `DesignSystem/colors_and_type.css` は無変更。`data/mock.js` も無変更。

1. **アイコン一式** — Material の代用を全部差し替え、`assets/icons/` に 13 個（+ `README.md` に規約）。
   grid 24 / 線幅 1.7（`back` `chevron` `close` の素の折れ線だけ 1.8）/ 端も角も丸 / `currentColor` /
   表示 16〜24 に対し当たり判定は常に 44。プロトタイプは `app.js` の `ICON` に同じ path を持つ
   （`LT3.icon.<name>(color, size)`）。**SVG と JS のどちらか片方だけ直さない。**
   いいねの ♥︎/♡︎ 文字も `heart` / `heart-fill` に置換した。
2. **ロゴ** — マークは「三つの灯り」（正三角に灯り 3 点 + 囲みのヘアライン、`assets/brand/mark.svg`）。
   灯りは 0〜3 の状態を持てるので、空き枠の表し方（輪郭だけ）とそのまま同じ語彙になる。
   ワードマークは素組みをやめ、小文字・トラッキング .005em・`three` だけイタリック。
   Login の Title Case 「The Last Three」は廃止。Splash はロゴの 3 点が 812/1008/1204ms で 1 つずつ灯り、
   別のローディング表現（旧 `.dots`）は置かない。検討した 3 方向は `Brand & Icons.dc.html`。
3. **アプリアイコン** — 写真依存をやめ、`assets/brand/app-icon.svg`（1024 マスター）と
   `app-icon-foreground.svg`（Android adaptive 432）。地は `--bg` の平面 + 灯り 3 点のみ。
   旧 `app-icon-rings-photo.png` の青・赤は 2 色目のアクセントにあたるので落とした（Splash からも外した）。
4. **分析レポート** — 密度を 6 要素 → 4 要素に。1 枚が持つのは あだ名 / 見立て 1 行 / 合致の点（●●○● 3 / 4）/ 理想像 だけで、
   4 行の内訳は拡大（`reportDetail`）に送る。**空き枠 1 つ = 帯 1 本**で、帯は埋まった枠とまったく同じ形・同じ高さに座るので、
   枠が 1 つしか空いていなくても余白が余らず、画面は常に「3 つの枠」のまま。帯の中は全幅カードの横送り（左下に pager）。
   高さは flex の均等割で決まるため、`MainMatchReports.rowHeightFor` 相当の実測計算は不要になった。
5. **埋まった枠の名前** — 左上のユーザーバーは円アバターを外し、名前だけのインクのピルにした（`--ink-a56`）。
   相手プロフィールへは名前のピルを押して入る。
6. **MY PROFILE の頭** — 円アバターを廃止し、5:4 の全幅ヒーロー（上端まで写真、上下にスクリム、名前と meta は膜の上）。
   埋まった枠・相手プロフィールと同じ作法に揃えた。写真が無いときは Instrument Serif の頭文字 1 字。
   基本情報編集の丸い写真ピッカーも同じ 5:4 のタイルにした。相棒の立ち絵は下の相棒カードが持つ（頭には敷かない）。
7. **撮影の回転 UI** — rot 空間の右 152px を操作帯にした。ここは端末を縦に持ったときの**下辺**にあたるので、
   シャッターが親指の位置（物理的な下辺中央）に来て、閉じる／カメラ切替がその左右に並ぶ。
   プレビューは残り幅に 16:9 で座り、お題は帯の反対側（物理的な上辺中央）。
   2 秒の進行はシャッターの縁そのもの（conic）にして、別の進行バーは廃止。録画中は内側が角丸の四角になる。

## Kaiwa Design System への全面移行（2026-08-03）

ブランドイメージを Kaiwa Design System に合わせ、12 画面すべてを貼り替えた。**レイアウト・寸法・
文言・状態遷移は 1 つも変えていない**（Flutter 実装との対応はそのまま）。変えたのは見た目の語彙だけ。

| 対象 | 旧（the last three v0.1） | 新（Kaiwa） |
|---|---|---|
| 地 | `#0B0A0C` の暗い部屋 | `--bg-app` 白 / 帯は `--bg-subtle` の平面。グラデーション全廃 |
| アクセント | 提灯色 `#E9B26A` | Kaiwa green `#0EAE63` 1 色（CTA / 送信 / 選択 / FILL 済みタブ） |
| 書体 | Instrument Serif + Zen Kaku + IBM Plex Mono | Zen Kaku Gothic New（UI 全部）/ M PLUS Rounded 1c 800（ワードマークのみ）/ JetBrains Mono（カウントダウン・ID） |
| アイコン | 自作 SVG 13 個 | Material Symbols Rounded 一本化。**FILL 軸が状態を持つ**（選択中 = 1 / 待機 = 0） |
| アイブロウ | mono 7.5〜10px | UI 書体 11px / `--tracking-caps`。11px を下回る文字は置かない |
| 分ける | 暗い面の重なり | 1px ヘアライン。カードは「影 か 線」のどちらか片方だけ |
| 角 | 12〜26 の混在 | ボタン・チップ・入力はピル / カード 14 / フィールド 10 / シート 20 / 吹き出し 18 |
| 写真の上の文字 | 上下のグラデーションスクリム | インクの平面（`--ink-a56`）のピル・チップ・帯。ぼかしの膜は使わない |
| ペアのタイムライン | 暗い面に金の吹き出し | チャット壁紙 `#8CB2D8` + 白（相手）/ ミント `--green-100`（自分）、日付は インク 30% のピル |
| 登録対話 | 全面に膜を重ねた暗い通話画面 | 白い面 + 粒子像、字幕から下は白いボトムシート（上ヘアライン + `--shadow-sheet`） |
| 粒子像 | 明色の粒（`245,241,234`） | インクの粒（`20,24,28`）。白地でも読めるよう密度を 2.0 倍・上限 .82 |
| 危機 | 退色のみ（赤は使わない） | 退色は据え置き。解除カウントダウンだけ Kaiwa の `--danger` に載せた |
| モーション | 独自の ease | `--dur-instant/fast/base/slow/sheet` + `--ease-out/in-out`。押下は 80ms で `scale(.97)` |

- 触ったファイル: `DesignSystem/colors_and_type.css`（Kaiwa を `@import` する薄い写像層になった）、
  `DesignSystem/preview/card.css`（台と端末枠を明るく）、`handoff/AppFlow/{index.html,app.css,app.js,screens.js,figure.js}`、
  `Brand & Icons.dc.html`（アイコン章を Material Symbols Rounded の FILL 軸に書き直し、ロゴ・アプリアイコンを白地 + 緑に）。
- `data/mock.js` は無変更。`assets/icons/` の自作 SVG はもう読んでいない（Kaiwa は手描き SVG を置かない規約）。
- `.slot .drop-hint`（写真をドロップできる印）はプロトタイプ専用の足場なので 11px の底を適用せず 8px のまま。
  48px 以下の器（タブのサムネイル・丸い写真ピッカー）では出さない。

## Main を上詰め + タイムライン（2026-08-08）

空き枠を「帯」で埋めるのをやめた。**空き枠には何も置かない**。枠は上へ詰め、その下を AI のタイムラインが下へ流れる。
枠が少ないほどタイムラインが上がってくる（枠 0 なら画面はタイムラインだけ）。

- 中身は自分の投稿ではなく、AI が見つけた候補 1 人。**2 段構成**で、上が「この人はどういう人か」（趣味・性格を簡潔に）、
  下が「この人が求めている相手」。下段は写真の上に重ねる（`--ink-a56` の平面を一枚かけて白字。グラデーションは使わない）。
  ヘッダは名前 + 年齢・地域 + 時刻。アバターは置かない。footer は合致の点（●●○● 3 / 4）だけ。
- 作法は X の投稿（アバター / 名前・ハンドル・時刻 / 本文 / 画像 / footer）。面は Kaiwa の白 + ヘアラインで、影は使わない。
  時刻は Kaiwa の表記（いま → N 分前 → N 時間前 → 昨日 → 日付）。
- 投稿を押すと拡大（本文は 2 行で切れていて、「続きを読む」= 投稿全体のタップ）。拡大時は両方の本文が全文になり、
  写真が 16:9 → 4:5 の縦長になる。同時に、その投稿の名前が sticky の帯のすぐ下に来る位置までスクロールする。
  開いているのは常に 1 件（`state.feedOpen`）。
- 無限スクロール: `slots` の底 400px で 6 件ずつ継ぎ足す（上限 96）。継ぎ足しは DOM 追記なのでスクロール位置は飛ばない。
  最初の 4 件は `matchReports` の実データに対応し、人物の文面は `FEED_PEOPLE`（12 人）を循環する。
- 落としたもの: `.reports` / `.rep-card`（帯と横送り・pager）、そして `reportDetail`（分析レポート拡大）画面ごと。
  分析の中身はタイムラインの投稿（紹介 + 理想の相手 + 合致の点）がすべて持つ。画面数は 12 → 11。

### 残っている判断

- `assets/icons/` と `assets/brand/app-icon*.svg` は旧ブランドのまま。Kaiwa に寄せるなら
  アプリアイコンの地も白 + 緑の灯り 3 点に切り直す（未着手）。
- ロゴの囲み（ヘアライン）は 16px 以下で消える。タブバーなど極小で使うなら灯り 3 点だけの版を切る。
- タイムラインの継ぎ足しはクライアント生成のダミー（`FEED_PEOPLE` の循環）。実装では巡回 API のページングになる。
- 撮影の操作帯は右手前提。左利き設定を持つなら帯を左右反転する（`.camera .rot { flex-direction: row-reverse }`）。
