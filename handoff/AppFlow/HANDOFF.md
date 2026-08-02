# AppFlow — アプリの全動作が動く HTML プロトタイプ

Flutter 実装（別 repo・本体アプリ）の**全画面・全動作**を、素の HTML/CSS/JS で動くようにしたもの。
`index.html` をブラウザで開けば、登録の 5 分対話から 3 枠・タイムライン・撮影・投稿・解除接近まで通しで操作できる。

- repo: `univbrofd/the-last-three-design`（branch `main`）
- raw base: `https://raw.githubusercontent.com/univbrofd/the-last-three-design/main/`
- DS 索引: `DesignSystem/_ds_manifest.json`（`prototypes` にこの一式が載っている）
- 色・書体の canonical: `DesignSystem/colors_and_type.css`（このプロトタイプは参照するだけ・複製しない）
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

## 画面（12）

Splash / Login / OnboardingChat / Main（3 枠 + AI 分析レポート）/ MY PROFILE / 基本情報編集 /
相棒（Persona）/ 分析レポート拡大 / ペアのタイムライン / 相手プロフィール / 撮影 / 投稿。

## 状態を直接開く

右のパネルでも切り替えられるが、URL でも指定できる（スクショ・レビュー用）。

```
index.html?route=main&slots=0            枠が空 = AI 分析レポートが占める
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
`route` は `splash login onboarding main pair partner camera compose persona profileEdit reportDetail`。

## 写真

写真枠はすべて**クリックまたはドラッグ&ドロップで実写を差し込める**（localStorage に残る）。
mock には実写が無いので、既定は design 準拠のプレースホルダ枠（`linear-gradient(135deg,#2A2114,--surface)` + ラベル）。
実写を入れて初めて評価できる設計なので、参考写真の投入を推奨。パネルの「入れた写真を消す」で戻せる。

## スマホ配置文脈

- 画面 402×874。SafeArea は上 62 / 下 34（`card.css` の `.safe-top` / `.safe-bottom` と同じ）。
- タップ範囲は最小 44。タブバーは高さ 66 + 下 SafeArea 34。
- MY PROFILE だけは上端まで敷くため safe-top を通さない（余白はタブ側が持つ）。
- 撮影画面は端末を縦に持ったまま UI だけ 90 度倒す（16:9 のプレビューを横で構える）。

## 実装由来の設計値（このプロトタイプに焼いてある値）

| 対象 | 値 |
|---|---|
| 枠（MainSlotCard） | 16:9 full-bleed / 上スクリム 74・下スクリム 104 / 退色は彩度 0.15（危機は赤ではなく退色） |
| 分析レポート | 1 列 = 1 枠、列高 = 均等割（上限 190）、カード 5:4、右の立ち絵は列高 × 0.55 |
| タイムライン | 自分の投稿 150 高・幅 76% 右寄せ / 相手 180 高・全幅 + いいね行 |
| 解除カウントダウン | Instrument Serif 46 / tabular-nums / `AUTO-RELEASE IN` は呼吸（opacity .28↔.9・4s） |
| 登録対話 | 字幕 42ms/字、進行 5 段、山場だけ Instrument Serif 26 の見出し扱い |
| 粒子像 | 5 段階。s0 pitch 6.4・blur 6.5 → s3 pitch 2.6・blur 0.3。目は本体より細かいピッチで抜く |
| 相棒カード | 300×400（結晶は 300×402）、角丸 18、下スクリム 132 |
| 灯り | `--primary #E9B26A` のみ。埋まった枠 / 絆 / CTA / 通知だけに使う |

粒子像の 5 段階は `figure.js` の `SPECS` に、`radial-gradient(rx ry at cx cy, …)` と
`mask-image: radial-gradient(circle,#000 X%,transparent Y%)` + `mask-size` の実測値がそのまま入っている。
`handoff/OnboardingChatView/OnboardingCall_*.dc.html` の specimen と同じ構造（外 = blur / 中 = 呼吸 / 内 = 点描）。

## 直すべき逸脱（デザイン判断が要るところ）

1. **アイコンが線画の自前 SVG**。撮影・戻る・閉じる・カメラ切替・リプライ・編集は Material の代用で描いている。
   線幅 1.6〜1.8 の細身セットに統一した正規のアイコン一式が欲しい（`assets/icons/` へ）。
2. **ロゴマークが無い**。ワードマークは Instrument Serif の素組みのまま（Splash / Login）。
3. **アプリアイコン**が `assets/images/app-icon-rings-photo.png` の写真依存。
4. **分析レポートカードの情報密度**が高い（あだ名 + 4 行 + 結論 + 立ち絵を 237×190 に詰めている）。
   枠が 1 つだけ空いているときは列が 1 本になり余白が余るので、枠数に応じた見せ方の設計が要る。
5. **MY PROFILE の頭**が円アバター + 名前で、ブランドの「写真が主役」から外れている。
   相棒の立ち絵を上に敷く案があったが未着手。
6. **撮影画面の回転 UI** はプレビュー以外が縦のまま倒れているだけで、横持ち前提の配置になっていない。

## Claude Design に頼みたいこと

上の 1〜6 を、`DesignSystem/taste.md` と `USAGE_RULES.md` の範囲で詰めてほしい。
プロトタイプ側を直接編集して構わない（`app.css` と `screens.js` が実体）。
新しいトークンが要るときは `DesignSystem/colors_and_type.css` に足してから使う（色の canonical はそこ）。
`data/mock.js` は生成物なので触らない。
