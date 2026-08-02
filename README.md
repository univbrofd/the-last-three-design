# The Last Three Design System

The Last Three のデザインの**単一ソース**。純 HTML/CSS で、Flutter の概念は持たない。Claude Design が接続するのはこの repo のみ。アプリ実装（`the_last_three`）はスキルがこの repo を読んで具現化する。

- 状態: 初期 seed（ブランド・デザイン初稿は Claude Design で作成予定）
- GitHub repo 化（public・raw リンク直取得）は初稿確定後に実施
- raw base（repo 化後）: `https://raw.githubusercontent.com/univbrofd/the-last-three-design/main/`

## 索引（最初にこれを読む）

`DesignSystem/_ds_manifest.json` がフォルダ全体の索引（`cards` / `globalCssPaths` / `tokens` / `fonts`）。DS 同期スキルが生成・更新する（初稿確定まで未生成）。

## トップ階層

- `assets/` — **共有アセットの単一ソース**（`icons/` `images/` `sample/`）。1ファイル1コピー。per-View に複製しない。specimen は深さに応じた相対で参照（`handoff/{View}/x.html` → `../../assets/...`）。
- `DesignSystem/` — foundation（トークンと美学の一次情報）。`colors_and_type.css`（役割トークン・**色の canonical**）/ `taste.md`（ブランド確定後に作成）/ `USAGE_RULES.md`（同）/ `preview/`（コンポーネント specimen `comp-*.html` ＋共有 `components.css` / `card.css`）/ `_ds_manifest.json`（全索引）。
- `handoff/AppFlow/` — **アプリの全動作が動く HTML プロトタイプ**（実装準拠の正）。`index.html` を開けば登録対話 → 3 枠 → タイムライン → 撮影 → 投稿 → 解除接近まで通しで操作できる。12 画面ぶんの実体は `app.css` / `screens.js`。`handoff/AppPrototype/` は 2026-07 のデザイン初稿で、実装が進んだ分は AppFlow にしかない。
- `handoff/{View}/` — 1 View = タスク単位フォルダ。`HANDOFF.md`（この repo 内で完結する spec）＋ その View 固有 specimen（`comp-*.html` / `clean.html`）＋ `shots/`。**foundation CSS・アセットは持たず共有を参照**（View 固有上書きが要るときだけ `{View}.css` に差分だけ）。
- `preview/` — design↔flutter の比較合成 PNG（`{View}.png`）。アプリ側スキルが出力する成果物。

## 原則

- **specimen = この repo 内の正**。設計値（色・余白・角丸・タイポ・状態）は HANDOFF.md と specimen に値で固定する（外部 fetch リンクに依存しない）。
- 共有優先・重複禁止: アセットは `assets/`、foundation は `DesignSystem/` の単一ソース。handoff はコピーせず参照する。
- 色は `DesignSystem/colors_and_type.css` の役割トークンを使う（Flutter 側 `DesignColors.dart` がこれを鏡写しする）。新規発明・specimen に無い組み上げはしない。
- **タスク時に Claude Design へ渡すのは「foundation 索引＋対象 1 handoff」のスコープだけ**（全カード manifest はばらまかない）。HANDOFF.md は lean（~2000 tokens 目安）、参照スクショ ≤4。
- スマホ前提（モバイルファースト）: 画面ものは `card.css` の `.phone` 枠に実配置で描く。`.phone` = **iPhone 17（402×874・角丸55・Dynamic Island）が既定**、旧 393×852 は `class="phone phone-legacy"`。chrome は `.statusbar` / `.dynamic-island` / `.home-ind`。
