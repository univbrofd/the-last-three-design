# the last three — デザイン初稿 v0.1

同時マッチング上限 **3 人**のマッチングアプリ。無限スワイプを廃し、「誰と向き合い、誰を手放すか」というリソース管理とサンクコストで関係を濃くする。

## プロダクト前提
- 登録はフォームではなく **AI との 5 分の対話**（経験 / 人生設計 / 趣味 / 嫌いなこと・許せないこと）。
- ユーザーは**自分で相手を探せない**。AI が見つけたときだけ push で届く（「選ばれた 3 枠」）。
- 日常共有は**運営お題**（平日の昼ごはん / 最近一番の買い物 …）の写真投稿。
- **絆ゲージ**は無反応で減り、期限切れで自動解除（マッチ直後 24h / 1 週間〜 72h / 1 ヶ月〜 1 週間）。
- 別れは**非対称**：自分から手放した側・放置した側だけ 14 日間の待機ペナルティ。

## ブランド（この初稿で確定）
暗い部屋に、三つだけ灯りがある。写真が主役、UI は縁に徹する。アクセントは提灯色 `#E9B26A` の 1 色のみ。危機は赤ではなく**退色**で表す。詳細は `../../DesignSystem/taste.md`、実装規約は `../../DesignSystem/USAGE_RULES.md`。

## ファイル
| ファイル | 内容 |
|---|---|
| `../../DesignSystem/colors_and_type.css` | 役割トークン＋書体スケール（canonical） |
| `colors_and_type.dc.html` | Foundations specimen |
| `OnboardingChatView.dc.html` | 画面 1 |
| `WaitingView.dc.html` | 画面 2 |
| `MainView.dc.html` / `MainViewSlotStates.dc.html` | 画面 3 と枠の 3 状態 |
| `PairTimelineView.dc.html` | 画面 4 |
| `BreakupView.dc.html` | 画面 5 |
| `Prototype.dc.html` | 通し操作できるインタラクティブ・プロトタイプ（主デザイン） |
| `support.js` / `image-slot.js` | Claude Design studio runtime（specimen 描画用） |

## 写真について
写真枠はすべてドロップ可能なプレースホルダ（`image-slot`）。画像をドラッグ＆ドロップすると保存され、再読込後も残る。実写を入れて初めて評価できる設計なので、参考写真の投入を推奨。

## 未確定・要判断
- ロゴマークは未作成（提供素材がないため、ワードマークは Instrument Serif の素組み）。
- アイコンは最小限の CSS 図形。実装時は線幅 1.6px・角丸の細身セットに差し替える想定。
