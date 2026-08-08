# Kaiwa Design System

**Kaiwa（かいわ）** is a mobile-first messaging & light-social product in the Japanese SNS-messenger idiom: a chat list, one-to-one and group chat rooms, a friends directory, a sticker shop, a timeline, and a wallet stub. This repository is the design system behind it — tokens, reusable primitives, product UI kits, and the writing/visual rules that keep them consistent.

## Sources & provenance — read this first

| What was provided | Status |
| --- | --- |
| Brief: “SNSアプリ LINE のようなデザインシステムを作成して” (create a design system *like* the SNS app LINE) | The only input. |
| Codebase / repo | None provided. |
| Figma file or link | None provided. |
| Slide deck / brand guidelines | None provided. |
| Logo files, fonts, icon set, imagery | None provided. |

Because no product source was supplied, **nothing here is a copy of an existing company's design system.** Kaiwa is an original system authored for the *category* the brief names: a green-accented Japanese messenger. It deliberately does **not** reproduce LINE's logo, wordmark, brand green, mascots, sticker artwork, or any other protected brand element. If the intent was to recreate an existing product, attach that product's codebase, Figma file, or brand kit and the system can be rebuilt against it.

Three substitutions are in force until real assets arrive — see **Open substitutions** at the end.

## Product surfaces

| Surface | Where | What it covers |
| --- | --- | --- |
| Mobile app | `ui_kits/mobile_app/` | Login → chat list → chat room (send text + stickers) → friends → sticker shop → settings, click-through. |
| Marketing site | `ui_kits/marketing_site/` | Desktop landing page: hero, feature rows, sticker strip, download CTA. |

The mobile app is the product; the marketing site borrows its type and green but runs at a larger scale with more air.

---

## CONTENT FUNDAMENTALS

**Language.** Japanese first. Every string in this system is authored in Japanese and translated outward, not the reverse. Latin copy exists for the marketing site and setting values (`English`, `Kaiwa Studio`).

**Politeness level.** Plain です・ます. Never 敬語 stacking (`〜させていただきます`), never casual だ・である in UI. The product speaks like a helpful shop clerk, not a bank.

- ✓ `スタンプを送りました`
- ✗ `スタンプの送信が完了いたしました！！`

**Person.** The app rarely says “I” or “you”. It names the object instead: `友だちを追加しますか？` — not `あなたは友だちを追加しますか？`. First person (`わたしたち`) appears only in marketing copy.

**Buttons are verbs, not requests.** `送信` / `追加` / `削除` / `ログイン`. Never `送信してください` on a button. Cancel is always `キャンセル`, never `いいえ`.

**Length.** Titles ≤ 12 JP characters. Row subtitles are one ellipsised line. Body paragraphs ≤ 38 JP characters per line, 2–3 lines. Errors are one sentence and always tell the user the next move: `通信環境を確認してもう一度お試しください` — not `エラーが発生しました（code: 500）`.

**Punctuation & casing.** 。 at the end of sentences in body copy; **no** 。 on labels, list rows, or buttons. One ！ maximum per screen, and only in celebratory moments (`追加しました！`). Latin copy is sentence case — never Title Case, never ALL CAPS except 11px eyebrow labels with `--tracking-caps`.

**Numbers & time.** Half-width numerals with tabular figures: `14:05`, `6/21`, `既読 4人`, `¥1,280`. Relative time up to a day (`いま`, `10分前`, `昨日`), then dates.

**Emoji.** Not used in UI chrome, labels, or system messages — ever. Emoji and stickers are *user content*; the interface stays quiet so the user's expression is the loud part. Sticker/emoji names in the shop may contain them because they are authored content.

**Vibe.** Warm but unfussy. Short lines, no marketing adjectives inside the app, no personality-fied error messages. The tone target: “a friend who is good at explaining things.” Marketing copy is allowed one romantic line — `会話をもっと、かんたんに。` — and then goes back to plain facts.

---

## VISUAL FOUNDATIONS

**The one-accent rule.** Kaiwa green (`--green-500` `#0EAE63`) is the only brand colour. It appears on the primary CTA, the compose FAB, the active tab underline, switches, checks, and the outgoing chat bubble tint (`--green-100`). It never becomes a page background, never a gradient, and never appears twice competing in one view. Everything else is neutral; blue is links/info only, yellow is coins/premium, red is unread + destructive.

**Backgrounds.** Flat colour. White (`--bg-app`) for content, `--bg-subtle` grey for section bands and grouped-settings backdrops. No gradients anywhere in the app UI, no photographic hero backgrounds, no repeating patterns, no noise or grain. The single decorative surface in the whole product is the **chat wallpaper** (`--chat-wallpaper` `#8CB2D8`, a muted blue), which exists so the two bubble colours read correctly — white incoming, mint outgoing. The marketing site may use one large flat green field per page, nothing more.

**Type.** Two families. `--font-ui` (Zen Kaku Gothic New) does 100% of interface text — 21px bold list titles, 16px row titles, 15px body, 13px meta, 11px tab labels. `--font-display` (M PLUS Rounded 1c, 800) is for the wordmark and marketing headlines only; its roundness carries the friendliness so the UI font doesn't have to. Japanese body is 15/1.7 with `+0.01em` tracking; display is `-0.02em`. Mono (JetBrains Mono) is for tokens, IDs, and auth codes.

**Spacing & layout.** 4px base with 2/6px half-steps because list UI is dense. Screen gutter 16px on phones, 24px on wide. Fixed chrome: nav bar 52px, tab bar 56px, composer 52px, list rows 64px (72px in the chat list) — all pinned, content scrolls between them. Nothing tappable goes below 44px. Content columns cap at 720px in docs/marketing.

**Corners.** 10px for fields and tiles, 14px for cards, 20px for sheets and feature cards, 28px for large promos, **18px for chat bubbles** with a 4px notch on the speaking corner (the notch replaces a drawn tail), and the pill (`999px`) for every button, chip, badge, and search field. Avatars are circles for people and 34% squircles for groups and official accounts.

**Cards.** White surface, 14px radius, **one** elevation cue: either `--shadow-1` *or* a `--border-default` hairline, never both. No coloured left borders, no card gradients, no outlined-plus-shadow combos.

**Shadows.** Soft, neutral, low-opacity, always straight down. `--shadow-1` cards → `--shadow-2` floating panels → `--shadow-3` toasts/menus → `--shadow-4` dialogs. Messages get `--shadow-bubble` (a 1px hint). The **only** coloured shadow in the system is `--shadow-fab` under the green compose button. Inner shadows: only `--shadow-inset` on pressed field states; not decorative.

**Hairlines do the separating.** `--border-subtle` between list rows (inset to start after the leading avatar, `gutter + 64px`), `--border-default` around surfaces, `--border-strong` on field outlines. Grey `SectionHeader` bands group blocks so individual rows never need boxes.

**Transparency & blur.** Used in exactly three places: translucent nav/tab chrome over scrolling content (`--surface-chrome` + `--blur-chrome`), the modal scrim (`--surface-scrim`, ink at 56%), and the chat day pill / toast (ink at 30–88%). Text is never placed on a blur without a solid enough backing; when copy must sit over imagery, use an ink scrim, not a gradient wash. No frosted cards, no glassmorphism.

**Animation.** Fast and mechanical, with one exception. Press feedback 80ms, hover 140ms, switches and tab underlines 200ms, screen pushes 320ms, bottom sheets 380ms. `--ease-out` for entering and sliding, `--ease-in-out` for colour and size, `--ease-in` for exits. `--ease-pop` (a 1.56 overshoot) is reserved for **stickers, reactions, and unread badges** — the playful parts. No parallax, no scroll-jacking, no looping ambient motion, no spinner where a skeleton will do.

**Hover / press / selected / focus / disabled.**
- Hover (pointer devices only): buttons lighten to `--accent-hover`; rows and icon buttons tint `--bg-subtle`.
- Press: buttons darken to `--accent-press` **and** scale to `0.97`; tiles scale to `0.94`; rows tint `--bg-sunken`. Never a shadow change on press.
- Selected: green tint (`--surface-selected` for rows, `--accent-subtle` + green border for chips) — never a solid green fill, which reads as a button.
- Focus: a 3px green ring (`--focus-ring`) plus a green border; red variant on invalid fields.
- Disabled: `--neutral-100` fill, `--text-disabled` label, no border change, `cursor:not-allowed`. Never 50% opacity on a whole component.

**Imagery.** Warm, natural, and unfiltered — everyday scenes at eye level (a café table, a station exit), not staged stock. No black-and-white, no heavy grade, no grain, no duotone. Photos are cropped square in grids and 16:9 in the timeline, 10px radius, no border. Sticker artwork is the loudest imagery in the product and is always shown on white so it doesn't fight the UI.

**Dark theme.** `[data-theme="dark"]` swaps surfaces (`#14181C` app, `#1F252B` cards), lines, and bubbles (`#2A3138` incoming, `--green-600` outgoing with white text). The green accent is unchanged, so dark mode never looks like a different brand.

---

## ICONOGRAPHY

**System.** [Material Symbols Rounded](https://fonts.google.com/icons) — variable icon font, loaded from the Google CDN in `tokens/fonts.css` and exposed as `--font-icon`. **This is a substitution**: no icon set was supplied with the brief. Rounded (not Outlined or Sharp) was chosen because its terminals match M PLUS Rounded 1c and the general softness of the brand. If a real icon set exists, drop the SVGs/font into `assets/icons/` and re-point `--font-icon`; the `Icon` component is the only place that needs editing.

**Rules.**
- Every icon in the system goes through the `Icon` component. No hand-drawn SVG paths anywhere in this repo — that is a hard rule, and the reason there are no `.svg` files in `assets/`.
- The **FILL axis carries state**: `filled` = active/selected/brand chrome (the current tab, the send button); `filled={false}` = idle and inline meta (the idle tab, search glyph, hint icons).
- Sizes come from tokens only: 18 inline with text, 22 in rows and nav bars, 26 in the tab bar, 32 for empty states. Weight 400; 500 when a small glyph sits on a coloured field.
- `currentColor` always — icons inherit from their button or row, so they get hover/press/disabled states for free.
- Icons are decorative (`aria-hidden`); the accessible label lives on the parent control (`IconButton` requires `label`).
- **Emoji are never icons.** They are user content. Unicode symbols are likewise not used as UI glyphs — the two exceptions are `✓`/`✗` inside written guidance (the voice card) and `¥` in prices.

**Glyph vocabulary in use.** `home`, `chat_bubble`, `play_circle`, `wallet`, `more_horiz` (tab bar) · `search`, `person_add`, `edit_square`, `settings`, `notifications`, `arrow_back_ios_new`, `chevron_right`, `menu`, `call` (chrome) · `add`, `photo_camera`, `image`, `mood`, `mic`, `send` (composer) · `push_pin`, `notifications_off`, `block`, `check`, `check_circle`, `error`, `cancel`, `content_copy`, `lock`, `expand_more`, `sentiment_satisfied` (states & sheets).

**Logo.** None was provided, and none has been invented. Wherever a mark belongs, Kaiwa sets the **name in type** — M PLUS Rounded 1c 800, green on white or white on the green field (`guidelines/brand-wordmark.html`). `assets/` therefore contains no logo file. Please supply one.

---

## Index

**Root**
- `styles.css` — the single entry point consumers link. `@import` lines only.
- `index.html` — human-readable index: opens every specimen card, component card and UI kit.
- `readme.md` — this file.
- `SKILL.md` — Agent-Skills front matter so this folder can be used as a skill.
- `thumbnail.html` — homepage tile.

**`tokens/`** — `fonts.css` (webfont + icon-font imports), `colors.css` (raw scales), `typography.css`, `spacing.css` (spacing, radii, control sizes), `elevation.css` (shadows, lines, focus, blur), `motion.css`, `semantic.css` (aliases + `[data-theme="dark"]`).

**`guidelines/`** — 23 specimen cards: colours (brand, neutrals, semantic, text, chat surfaces, dark), type (display, UI, body, scale, weights, mono), spacing (scale, row anatomy, radii, tap targets), elevation (shadows, hairlines & focus), motion (durations & easing, interaction states), brand (wordmark, iconography, voice & tone).

**`components/`** — 27 primitives, each with `.jsx`, `.d.ts`, `.prompt.md`, and one preview card per folder.

| Group | Components |
| --- | --- |
| `core/` | `Icon`, `Button`, `IconButton`, `Badge`, `Tag`, `Avatar` |
| `forms/` | `Input`, `SearchField`, `Select`, `Checkbox`, `Radio`, `Switch` |
| `layout/` | `Card`, `ListRow`, `SectionHeader` |
| `navigation/` | `NavBar`, `TabBar`, `SegmentedTabs` |
| `messaging/` | `ChatBubble`, `ChatDayDivider`, `MessageComposer`, `ChatListItem`, `StickerTile` |
| `feedback/` | `Dialog`, `Toast`, `Tooltip`, `ActionSheet` |

**`ui_kits/`** — `mobile_app/` (`index.html` + `LoginScreen`, `ChatsScreen`, `ChatRoomScreen`, `FriendsScreen`, `StickerShopScreen`, `SettingsScreen`) and `marketing_site/` (`index.html` + `LandingPage`).

**`assets/`** — currently empty of brand marks by design (see ICONOGRAPHY → Logo). Icons come from the CDN icon font.

### Intentional additions

No source defined a component inventory, so the set above is the standard primitive set sized to a messenger. Two additions beyond the generic list are worth naming:

- **`Icon`** — a wrapper over the icon font so the FILL-axis state rule is enforced in one place instead of 27.
- **`messaging/` group** (`ChatBubble`, `ChatDayDivider`, `MessageComposer`, `ChatListItem`, `StickerTile`) — the product's actual subject matter. Without these the system would describe a generic app, not this one.

### Open substitutions — please replace

1. **Fonts.** Zen Kaku Gothic New / M PLUS Rounded 1c / JetBrains Mono are Google Fonts stand-ins loaded by CDN because no binaries were supplied. Send the licensed families and they can be swapped into `tokens/fonts.css` as local `@font-face` rules.
2. **Icons.** Material Symbols Rounded, loaded from the CDN, standing in for a real set.
3. **Logo & imagery.** No mark, no photography, no sticker artwork was provided; the wordmark is plain type and image areas are neutral placeholders. Nothing was drawn or generated to fill the gap.
