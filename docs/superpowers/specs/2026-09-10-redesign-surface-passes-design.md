# Redesign Surface Passes — character sheet, item/effect sheets, chat cards, dialogs, Effect Tray

**Date:** 2026-09-10
**Status:** Approved for execution (autonomous backlog campaign; closes TODO #26)
**Foundation:** `specs/2026-06-10-ux-redesign-foundation-design.md` — its language (soft & airy, borderless
depth via background steps, generous padding, 13-14px text, sentence-case headings; density may tighten
toward the balanced variant — subtle 1px-bordered panels, row dividers, small uppercase section labels —
where real content demands it) and its mandate that readability and at-a-glance scanning outrank aesthetics.

## Method

Every TITAN surface was captured live in Heritage Dark and Heritage Light with a Playwright screenshot
harness (character sheet × 6 tabs, all 7 item sheets, the effect sheet, the 5 check dialogs, the confirm
dialog, all 26 chat cards, the Effect Tray). Each pass below records what the capture showed, the decision,
and the verification. Defects found by the capture were fixed first and logged in `CLOSED_BUGS.md`
(#36 dialog labels, #37 duplicated Rarity label, #38 blank effect description).

## Pass 1 — Character sheet layout

**Finding.** The Skills tab lists 18 skills as two-line panels (skill button + attribute select on the
left, a `Training` row and an `Expertise` row on the right), so a 650px sheet shows seven skills before
scrolling. Skills are the most frequently scanned list on the sheet. The sidebar stacks resources,
ratings, mods, and speeds as unlabeled groups separated only by dividers.

**Decision.**
- **Compact skill rows.** `CharacterSheetSkill` lays each skill out on ONE line: skill check button,
  attribute select, then the Training and Expertise groups side by side, each as `icon [base] + [mod] = total`
  with the icon carrying the tooltip (the text labels "Training"/"Expertise" move into the tooltip; the
  icons already exist and are the same ones the sheet uses elsewhere). Rows drop from ~85px to ~44px, so
  the tab shows roughly twice as many skills — the balanced-variant tightening the foundation permits for
  real content. Inputs and behaviour are unchanged (every existing e2e that drives skill inputs must stay
  green).
- **Section labels in the sidebar.** `DocumentSheetSidebar` sections may declare a `label`;
  `CharacterSheetSidebar` labels Ratings, Mods, and Speeds with a small uppercase muted heading rendered
  by a new `section-label` mixin (`FontMixins.scss`: small font size, bold, `letter-spacing: 0.06em`,
  `text-transform: uppercase`, `--titan-app-font-color` at reduced opacity is NOT used — colour must
  stay a themed token, so the label uses `--titan-header-6-font-color`). Portrait and Resources carry no
  label (the meters are self-describing).

**Verification.** Unit: none needed (layout). E2E: `reactive-*` and `checks-integration` specs that touch
skills stay green; a new `character-sheet-layout.spec.js` asserts a skill row's rendered height is under
56px and that the sidebar renders the three section labels with `text-transform: uppercase` from the live
computed style.

## Pass 2 — Item and effect sheets

**Finding.** All seven item sheets and the effect sheet share one shell (header: icon, name, per-type stats;
sidebar: trait buttons + check/attack summary chips; tabs). The capture found two defects (#37 duplicated
Rarity label, #38 blank effect description) and otherwise a consistent surface. Multi-word tab labels
("Rules Elements", "Standard Aspects") wrap to two lines on the narrower sheets; the strip stays uniform
because every button stretches to the strip height, so this is legible.

**Decision.** Fix the two defects (done); no further layout change. The empty Description tab shows only
the editor's edit toggle — that is Foundry's own toggled-editor idiom and matches every other description
surface, so it stands.

**Verification.** `sheet-regressions.spec.js` (Rarity once) and `effect-sheet-layout.spec.js` (description
renders) — both added with the fixes.

## Pass 3 — Chat cards in detail

**Finding.** The spell card renders a `Tradition |` tag with an empty value when the spell has no
tradition; every other optional stat (XP cost, value, custom traits) is guarded. Cards are otherwise
consistent: item chip, tag row, results panel, action buttons.

**Decision.** `SpellStats` guards the Tradition tag on a non-empty tradition, matching its own XP-cost
guard. No other card change — the audit of every `StatTag` consumer found no other unguarded optional
value (quantity always has a number, aspect costs and trait values are always present).

**Verification.** `item-cards.spec.js` gains a case: a spell with no tradition renders no Tradition tag,
and setting a tradition renders it (presence → absence on the same card).

## Pass 4 — Dialogs

**Finding.** Every dialog ends with two equally weighted peach buttons (Roll/Cancel, Delete Item/Cancel).
The primary action is not scannable from the dismiss action.

**Decision.** `Button` gains a `secondary` prop rendering the `button-secondary` mixin: transparent fill,
`--titan-button-border-color` border, `--titan-app-font-color` text, hover → the existing button hover
tokens. The check dialogs' Cancel (`CheckDialogBase`) and every `ConfirmationDialogShell` Cancel use it;
confirm/roll actions keep the filled default. No new theme tokens.

**Verification.** `component-probe.spec.js` probes `Button` with `secondary` and asserts the computed
background is transparent while the default is the button token; `checks-dialog.spec.js` stays green.

## Pass 5 — Effect Tray

**Finding.** Folders start collapsed on every session and their expansion is not remembered. With the
shipped standard-effects pack (3 folders, 17 effects), the first sight of the tray is three closed folders.

**Decision.** Folder collapse persists per pack in a new client setting `effectTrayCollapsedFolders`
(`Object`: pack collection id → array of COLLAPSED folder ids). Expanded is the default for any folder
absent from its pack's entry, so a pack with no entry and a folder created after the entry was saved both
render expanded without a reconciliation pass (storing expanded ids instead would make a new folder
indistinguishable from a collapsed one). `toggleFolder` writes the setting from the pack's current folders,
which also drops deleted ids. Setting registration follows `effectTrayLastPack`.

**Verification.** `effect-tray.spec.js`: the shipped pack's folders are expanded on first open (rows visible
without clicking), collapsing one and re-rendering the tray keeps it collapsed, and a folder created after a
collapse was saved for the pack renders expanded while the stored entry lists only the collapsed id.

## Documentation (required final step)

- Delete TODO #26 (and the now-empty "UX/UI redesign" section) from `docs/TODO.md`.
- `titan-codebase` skill: skill row layout, sidebar section labels, `Button` `secondary`, the tray
  `effectTrayCollapsedFolders` setting, the pack-source/screenshot method is NOT recorded (session-only).
