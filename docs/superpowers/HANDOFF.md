# Session Handoff — 2026-06-09 (#23 + #12 increment 1 merged; backlog open)

Resume point. Read this, then the referenced docs + the auto-loaded memory.

## ✅ This session — TODO #23 + TODO #12 (strategy + increment 1) — DONE + MERGED + PUSHED

`main` is at **`35a98a12`** (two fast-forward merges, pushed to origin). Executed mainline
(`mainline-plan-execution`), one dispatched final review per branch, both clean.

- **#23 — shared check-row** (branch `check-row-extraction`, merged @ `e3228401`): new
  `src/document/svelte-components/check/CheckRow.svelte` (props
  `{ checkParameters, checkIdx, onRoll }`; two-context; reads `autoSpendResolveChecks`; gate
  inside). `CharacterSheetItemCheck` / `CharacterSheetEffectCheck` keep only options-building +
  roll handlers (258 duplicated lines deleted). Spec/plan
  `2026-06-09-check-row-extraction*`. Verified: build clean, unit 221, targeted e2e 13/13
  (checks-integration, embedded-context-effects, effect-hud).
- **#12 — path parity** (branch `checktags-item-cards`, merged @ `35a98a12`): strategy locked
  **component-driven** (user-approved; spec
  `specs/2026-06-09-path-parity-strategy-and-checktags-chat-design.md`) — each increment converges
  one duplicated cross-surface display onto a shared component reading parity paths; schema work
  only where parity is missing. **Increment 1 shipped:** `ItemChatMessageItemChecks` (all 7 item
  cards) renders intrinsic check tags via shared `CheckTags` (`<CheckTags {idx}/>`, zero schema
  change — the message bridge satisfies the `'document'` context via snapshot path parity). Two
  user-approved display convergences: resolve-cost icon → `SPEND_RESOLVE_ICON`, tag spacing →
  `tag-container-child-margin`. Verified: build clean, unit 221, targeted e2e 14/14 (item-cards,
  checks-integration). **#12 stays open** (north-star); increment 2 queued as **TODO #25**
  (CastingCheckTags across `SpellChatMessage` / `CharacterSheetSpellCastingCheck` /
  `SpellSheetSidebarCastingCheck`).
- **Full e2e suite NOT run this session** — both specs scoped verification to targeted specs +
  unit; run the full 3-shard suite before the next large merge.
- titan-codebase skill updated (CheckRow entry; CheckTags consumer list → 3 consumers).

## ⚠ Working-tree note

The user live-deleted **TODO #20** (inline attack editing, the whole "Embedded document contexts —
follow-ups" section) in `docs/TODO.md` — left **uncommitted** by agreement (user-managed edit; do
not revert). Work branches `check-row-extraction` and `checktags-item-cards` are merged but NOT
deleted (deletion needs user confirmation).

## ▶ NEXT — remaining backlog (order = user's call)

Open TODO items: **#25** (CastingCheckTags, #12 increment 2 — natural continuation), **#24**
(+#18/#19 folded in: e2e fixture-helper consolidation), **#13** (effectsExpiredReport e2e), **#16**
(golden-master harness consolidation), **#17** (lang TYPES housekeeping), **#2** (seeded
standard-effects compendium). #12's north-star continues via component-driven increments.

## ⚠ Carried-forward OUTSTANDING (from prior handoffs)

User still owes the **manual deep-path pack-conversion verification** (run a COPY of a
pre-conversion world with a packed actor + world actor carrying legacy effect Items against
current `main`; pass = a SECOND load with zero red errors + zero conversion lines).

## Gotchas (this session)

- The item chat cards' checks **buttons** block does NOT share `CheckRow` (multi-controlled-actor
  roll, no owner gate, config label vs `checkParameters`) — known non-goal, documented in the
  path-parity spec.
- `CheckTags` reads `check.opposedCheck.enabled` unguarded — safe because every check comes from
  `createItemCheckTemplate()` (reviewer-verified across all item types).
- Targeted e2e invocation: `npx playwright test <spec-names> --reporter=line` (foreground only;
  world must be launched — probe `http://localhost:30000/join` first, 200 = up).

## Repo state at handoff

- `main` @ `35a98a12`, pushed; `origin/main` in sync. Working tree dirty with the sanctioned
  never-stage noise (`packs/effects/*`, `.claude/*`, `graphify-out/`, root `CLAUDE.md` graphify
  section) **plus the user's uncommitted TODO #20 deletion**. Do not stage `packs/` or `.claude/*`.
- Branches: `check-row-extraction`, `checktags-item-cards` (merged, pending deletion confirmation),
  plus the older `development`, `chore/build-output-dist`, `chore/e2e-sleep-removal`,
  `feat/chat-message-subtypes-phase2-item-dm-templates`.
