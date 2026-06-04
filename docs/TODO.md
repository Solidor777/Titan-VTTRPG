# Deferred Work / Backlog

Work that has been intentionally parked. Each item should graduate into its own
spec (`docs/superpowers/specs/`) and plan (`docs/superpowers/plans/`) when picked up.

## Active Effects conversion — related items

The "Effects → TitanActiveEffect" effort is specced in
`specs/2026-05-30-titan-active-effects-conversion-design.md`. The following were
split off to keep that spec focused.

### 1. Convert Conditions to rules elements — DONE

- **Status: COMPLETE.** Both Spec A (sum operations) and Spec B (conditions as a
  `condition`-subtype Active Effect) have shipped. Spec B design:
  `docs/superpowers/specs/2026-06-01-conditions-to-rules-elements-design.md`; plan:
  `docs/superpowers/plans/2026-06-01-conditions-to-rules-elements.md`.
- **Spec B end-state (shipped):**
  - Conditions are a native `condition` ActiveEffect subtype (`system.json`
    `documentTypes.ActiveEffect.condition`; `CONFIG.ActiveEffect.dataModels.condition =
    ConditionDataModel`, a `RulesElementMixin(TitanDataModel)` carrying only the
    v14-mandated `changes` ArrayField — no duration/checks/customTraits).
  - `Conditions.js` exports pure `buildConditionDefinitions()`; every condition is
    `type: 'condition'`, and the six mechanically-active ones (blinded, contaminated,
    prone, restrained, stunned, sleeping) carry a seeded `system.rulesElement` built
    from the Spec A operations. The five inert conditions (dead, deafened, frightened,
    incapacitated, unconscious) carry none.
  - `CharacterDataModel._applyRulesElements` derives from three sources — owned items,
    `effect`-subtype AEs, and `condition`-subtype AEs (tagged `'condition'`);
    `_resetDynamicMods` has a `condition` mod bucket; `getConditions()` filters
    `effect.type === 'condition'`. The old `_applyConditions` `switch` was **removed**.
  - `TitanActiveEffectSheet` is registered for `types: ['effect']` only; conditions use
    Foundry's default config sheet.
  - Verified by unit tests (`ConditionDefinitions.test.js`, 8) and e2e
    (`tests/e2e/logic/conditions.spec.js`, 7).
- **No migration (deliberate):** legacy applied conditions created before the subtype
  existed are inert (their mechanics no longer run through any code path) until removed
  and re-toggled, which re-instantiates them as the `condition` subtype with the seeded
  rules elements. No one-shot converter was written for in-world condition effects.
- **Spec A (sum operations) — COMPLETE.** The rules-element operations needed to
  express condition math now ship: **`mulSum`** (multiply the post-additive
  running total), **`setSum`** (force/floor/cap the running total via
  `set`/`min`/`max`), the **`'all'` key selector** (expand one element per
  concrete key under the selector, engine-wide via `_expandAllKeyElements`), and
  **`mulBase` rounding** (directional `up`/`down` round on the scaled base). All
  shipped with settings UI, unit tests (`RoundDirectional` /
  `ComputeMulSumDelta` / `ComputeSetSumDelta`), and e2e
  (`tests/e2e/logic/rules-elements.spec.js`). See spec
  `docs/superpowers/specs/2026-06-01-rules-element-sum-operations-design.md` and
  plan `docs/superpowers/plans/2026-06-01-rules-element-sum-operations.md`.
- **Spec B (the remaining work) — convert status effects into rules elements.**
  - Make each status effect a proper `TitanActiveEffect` of a **`condition`
    subtype** carrying `system.rulesElement` (via `RulesElementMixin`).
  - Seed each **mechanically-active** condition's rules elements using the Spec A
    operations: blinded / contaminated / stunned via `flatModifier` (incl.
    `'all'`); prone via `mulSum` 0.5 `up` on speed `'all'` + `flatModifier` −1
    melee/accuracy; restrained via `flatModifier` + `setSum` `set` 0 on speed
    `'all'`; sleeping via `mulSum` 0.5 `up` on awareness.
  - **Mechanically-inert** conditions (dead / deafened / frightened /
    incapacitated / unconscious) intentionally get **no** rules elements.
  - Extend `CharacterDataModel._applyRulesElements` to also process
    `effect.type === 'condition'`, then **retire `_applyConditions`**.
  - **Feasibility hinge:** how Foundry v14 instantiates a `CONFIG.statusEffects`
    entry into the `condition` subtype — verify whether
    `ActiveEffect.fromStatusEffect` honors `type` + `system`, or whether a
    `preCreate` hook is needed to stamp them.
- **Risk:** Behavior drift in condition math. Needs careful parity testing
  against the current `_applyConditions` results.
- **Depends on:** The "Effects → TitanActiveEffect" spec (conditions are already
  `TitanActiveEffect` instances after it; their mechanics still run through
  `_applyConditions`).

### 1a. Rules-element settings: `onSelectorChange` never fires — DONE

- **Status: COMPLETE.** `DocumentSelect` now declares and forwards an optional
  `onchange`, composed to run the consumer callback as a pure mutation **before**
  `refreshSystemDocument` persists, so the curated default-key reset fires on
  selector change. All **seven** rules-element settings components that wire a
  handler through `DocumentSelect` (the four sum-operation files plus
  `ItemSheetConditionalRatingModifierSettings`, `ItemSheetRollMessageSettings`,
  and `ItemSheetConditionalCheckModifierSettings`) became pure key-setters:
  the dead `assert(document?.isOwner, …)` guard (it checked the `ReactiveDocument`
  bridge, which has no `isOwner`/`name`) and the handlers' own
  `document.data.update(...)` were removed; `ConditionalCheckModifier` also shed
  an obsolete boolean return-value protocol. Owner-gating + persistence now live
  solely in `DocumentSelect` (disables for non-owners) and `refreshSystemDocument`.
  Commits `e67f9863`, `d9a510a7`, `f383b56a`. Spec/plan:
  `docs/superpowers/specs/2026-06-01-rules-element-selector-onchange-design.md`,
  `docs/superpowers/plans/2026-06-01-rules-element-selector-onchange.md`.
- **Note (7th component):** `ItemSheetConditionalCheckModifierSettings` was not in
  the original audit (it had no broken `assert` guard) but was surfaced during
  execution because the `DocumentSelect` fix is global — its previously-dead
  handlers began double-persisting. A discriminating e2e case is impossible for it:
  its curated key defaults coincide with each key-select's first option
  (`body`/`blast`/`melee`/`arcana`) and it uses no `allowAll`, so the `Select`
  clamp produces the identical end-state — which is precisely why the dead cascade
  went unnoticed. Verified by full-suite regression instead. The discriminating
  e2e lives on the flatModifier `resource`→`resolve` case in
  `tests/e2e/rules-element-crud.spec.js`.

- **What:** The per-operation settings components (`ItemSheetFlatModifierSettings`,
  `ItemSheetMulBaseSettings`, `ItemSheetMulSumSettings`, `ItemSheetSetSumSettings`)
  pass `onchange={onSelectorChange}` to `DocumentSelect`, but `DocumentSelect`
  ignores the `onchange` prop — it hardcodes its own
  `onchange={() => refreshSystemDocument(...)}`. So the curated default-key reset
  on selector change is **dead code**.
- **Impact:** Not a crash. `Select.svelte`'s clamp `$effect` auto-corrects an
  out-of-range key to the first valid option, so the key never becomes invalid —
  but the intended *sensible-default* key (e.g. `body` for `attribute`) is lost;
  the key just falls to whatever option is first.
- **To do:** Have `DocumentSelect` accept and forward an optional `onchange` (and
  still run `refreshSystemDocument`), or move the default-key logic elsewhere.
- **Found by:** Spec A (sum operations) verification — pre-existing, not
  introduced by that work.

### 2. Custom sidebar-tab effect directory

- **Status: COMPLETE (sub-project A).** Shipped the Effect Tray: a native
  `titanEffects` sidebar tab (`TitanEffectTrayTab` extends `AbstractSidebarTab`,
  mounts a Svelte tray; registered additively via `Sidebar.TABS` +
  `CONFIG.ui.titanEffects`). A compendium **dropdown** selects any visible
  `ActiveEffect` pack (system + the user's own); **search**; per-row one-click
  **Apply** (owner-gated copy to smart targets) + drag-to-apply; **full CRUD**
  (create / stash-from-actor drag-in / duplicate / inline rename / confirmed
  delete / open sheet) and native compendium **folders**. The shared
  `getBestCharactersToUpdate` targeting ladder was upgraded in place (damage/
  healing benefit too). Spec/plan:
  `docs/superpowers/specs/2026-06-02-effect-tray-sidebar-tab-design.md`,
  `docs/superpowers/plans/2026-06-02-effect-tray-sidebar-tab.md`. Covered by
  `tests/e2e/effect-tray.spec.js` (5 cases) + `tests/unit/GetEffectCompendiums.test.js`
  and `tests/unit/GetBestCharactersToUpdate.test.js`.
- **Enhancement — COMPLETE (2026-06-02).** Row interaction reworked: a right-click
  **context menu** (Apply / Open Sheet / Rename / Move to Folder / Duplicate / Delete) via
  `src/sidebar/tray/EffectRowContextMenu.js` + a Foundry `ContextMenu` attached to the tray
  root; **left-click a row opens its sheet** (debounced 250 ms vs double-click-rename); inline
  buttons reduced to **Apply** only; an actor-sheet-style labelled **Filter** bar; a GM/owner-only
  compendium **lock toggle** (`pack.configure({ locked })`, reactive `isLocked` mirror); and a
  **Move-to-Folder** picker dialog. Spec/plan:
  `docs/superpowers/specs/2026-06-02-effect-tray-context-menu-and-localization-test-design.md`,
  `docs/superpowers/plans/2026-06-02-effect-tray-context-menu-and-localization-test.md`. Covered by
  3 new `effect-tray.spec.js` cases + `tests/unit/EffectRowContextMenu.test.js`.
- **Localization double-localization guard — COMPLETE (2026-06-02).** New
  `tests/e2e/localization.spec.js` renders every actor/item/effect sheet + the effects sidebar and
  fails on any rendered text/tippy-tooltip containing `LOCAL.`; `tests/unit/LocalizationKeys.test.js`
  guards `lang/en.json` values. The scan surfaced a pre-existing system-wide bug class — tooltips/`Text`
  passing already-localized or dynamic strings (which `processTextData` re-localizes into `LOCAL.…`) —
  fixed across 49 components (actor/item sheets, chat, reports, effect HUD). See the tooltip/`Text`
  value contract now documented in `references/conventions.md`.
- **Sub-project B (deferred):** ship a seeded *standard effects* compendium — needs
  a pack-build pipeline (foundryvtt-cli `compilePack` or ClassicLevel) and the
  effect content (a future rulebook-scrape script). The tray already works against
  the empty scratch pack and user packs; B just fills a pack with shipped defaults.
- **What:** A custom sidebar-tab directory (ApplicationV2 + Svelte) presenting a
  browsable library of reusable effects, backed by the ActiveEffect compendium
  (or a world-setting store), as a dedicated top-level tab.
- **Why deferred:** A *native* world ActiveEffect tab is impossible without
  forking the Foundry engine (`ActiveEffect` is not a `WORLD_DOCUMENT_TYPE`; the
  world-collection init list is hardcoded; the server vends world data per
  hardcoded type). The conversion spec delivers the reusable library via a native
  compendium instead. A custom tab is a heavier, non-standard enhancement on top.
- **Depends on:** The compendium shipped by the conversion spec.

### 3. Native visual-active-effects-style panel

- **Status: COMPLETE.** Shipped a native screen-level Effect HUD
  (`src/ui/effect-hud/`): a `TitanEffectHud` singleton controller (created on
  `ready`, attached as `game.titan.effectHud`) that mounts `EffectHudShell` into
  a fixed-position container and tracks the active actor via the pure
  `resolveHudActor` ladder. Grouped Conditions/Effects sections, a
  collapse-to-icon-grid header, owner-gated send-to-chat + delete, and rollable
  embedded checks (reusing the character sheet's effect leaf components through
  the actor `ReactiveDocument` bridge). Gated by an `enableEffectHud` client
  setting (default on). The `visual-active-effects` flag stamping and the dead
  `_enrichDescription` method were removed. Spec/plan:
  `docs/superpowers/specs/2026-06-02-native-effect-hud-design.md`,
  `docs/superpowers/plans/2026-06-02-native-effect-hud.md`. Covered by
  `tests/unit/ResolveHudActor.test.js` + `tests/e2e/effect-hud.spec.js`.
- **What:** Build a native, in-system panel that displays active effects with
  their descriptions on the character UI — replacing the dependency on the
  third-party `visual-active-effects` module. Until this lands, the conversion
  spec keeps setting `flags['visual-active-effects.data.content']` on effects so
  the module still works for users who have it.
- **Reference source:** Zhell's `visual-active-effects` —
  https://git.gay/Zhell/visual-active-effects
- **Depends on:** The "Effects → TitanActiveEffect" spec (effects are native AEs
  with native `description`).

### 5. Confirm-delete dialog for effects

- **Status: COMPLETE.** Added a `confirmDeletingEffects` client setting (default
  true, Shift inverts) + `shouldConfirmDeletingEffects` helper +
  `ConfirmDeleteEffectDialog` + `requestEffectDeletion`/`safeDeleteEffect` on
  `CharacterDataModel` (inherited by player + npc). The effect-row delete button
  is repointed off the raw `effect.delete()` onto `requestEffectDeletion` and its
  `deleteItem`->`deleteEffect` label fixed. Two new `interaction-dialogs` e2e
  cases cover confirm-on (dialog mounts, effect persists) and confirm-off
  (immediate deletion). Commit `fd9ececd`.
- **What:** Effect deletion uses native `effect.delete()` (owner-gated) with no
  confirmation dialog. The "confirm deleting items" setting and
  `ConfirmDeleteItemDialog` are item-only, so effects bypass it.
- **To do:** Add a `requestEffectDeletion` path mirroring the item
  confirm-delete dialog, honoring the delete-confirm setting.
- **Depends on:** The "Effects → TitanActiveEffect" spec.

### 6. Convert effect Items inside compendium-packed actors

- **What:** The `convertEffectItemsToActiveEffects` migration handles world
  actors and unlinked token actors, but NOT actors stored inside compendium
  packs. Those actors keep their legacy `effect` Items.
- **To do:** Extend the converter (or add a one-shot tool) to iterate unlocked
  actor compendium packs and convert their effect Items, then re-lock.
- **Depends on:** The "Effects → TitanActiveEffect" spec.

## v14 migration — related items

### 7. Rich (TyphonJS-style) sheet header buttons — DONE

- **Status: COMPLETE.** The TyphonJS-era experience is restored as
  **always-visible inline Svelte header buttons**. Base machinery lives in
  `TitanDocumentSheet` (`src/document/sheet/TitanDocumentSheet.js`): a
  `_getHeaderButtonsComponent()` factory (undefined in base) is mounted in
  `_onFirstRender` into `this.window.header`, anchored at `this.window.controls`,
  with a context map providing `application` + the `document` bridge; `_onClose`
  unmounts it. Because the frame is built once on first render, the mount
  survives `render({ parts: [] })`. The actor sheet
  (`ActorSheetHeaderButtons.svelte`) ships Import / Edit Token / a reactive
  Toggle-Link-Unlink-Unlinked button (`.linked` orange + `.unlinked` brown glow),
  all with rich `.desc` tippy tooltips; the item sheet
  (`ItemSheetHeaderButtons.svelte`) ships Send to Chat (fixing the old
  send-to-chat tooltip key → `sendItemToChat.desc`) plus a conditional Import.
  The effect-subtype ActiveEffect sheet
  (`ActiveEffectSheetHeaderButtons.svelte`) gains a Send-to-Chat header button
  and a matching `_getHeaderControls()` entry, so the action exists both inline
  and in the ⋮ dropdown. All three inline trees **coexist** with the native v14
  `_getHeaderControls()` dropdown rather than replacing it. E2E coverage:
  `tests/e2e/header-buttons.spec.js`.
- **What:** The actor/item sheet header buttons (edit-token, dynamic
  link/unlink, import, send-to-chat) were restored under v14 via native AppV2
  `_getHeaderControls()` (see the v14 context-and-migration-repair spec, Task
  11). Native v14 controls render in the header **ellipsis dropdown**, expose
  only an icon + label (no tooltip field), so the dynamic link/unlink state is
  conveyed by a changing icon + label and is only visible when the dropdown is
  open.
- **Done in:** The Svelte header-buttons spec
  (`docs/superpowers/specs/2026-06-02-svelte-header-buttons-design.md`) and plan
  (`docs/superpowers/plans/2026-06-02-svelte-header-buttons.md`). The shipped
  implementation mounts the Svelte tree in `_onFirstRender` (first render only),
  not the `_onRender`/`_onClose` approach this item originally proposed —
  `_onFirstRender` is the correct hook because the AppV2 frame (and its header)
  is built exactly once.
- **Depends on:** The v14 context-and-migration-repair spec (Task 11).

## E2E suite — related items

### 8. Harden the `itemRollData` false-sentinel root cause — DONE

- **Status: COMPLETE.** Both prongs shipped: `createItemCheckOptions`
  (`src/check/types/item-check/ItemCheckOptions.js`) now passes `itemRollData`
  through unchanged (absent → `undefined`, a true "absent") instead of defaulting
  to the literal `false`, so `??` and `||` behave identically across every
  consumer; and `initializeItemCheckOptions` (`CharacterDataModel.js`) now writes
  the resolved roll data back into `checkOptions.itemRollData` so
  post-initialization readers get the real object. A grep confirmed all current
  `itemRollData` consumers use truthy checks, so the sentinel change is
  behavior-preserving. Parity unit test: `tests/unit/CreateItemCheckOptions.test.js`
  (default-`undefined` + passthrough + shape). Commits `52015399`, `bfb592d8`.
- **What:** The 2b-3 fix (`fix(item-check)`, commit `f155c1e0`) changed
  `validateItemCheckOptions` from `??` to `||` so the literal-`false`
  `itemRollData` default falls back to the item lookup. That was the deliberate
  minimal fix, but the underlying fragility remains: `createItemCheckOptions`
  (`src/check/types/item-check/ItemCheckOptions.js:43`) defaults `itemRollData`
  to the literal `false` (forcing every consumer to use truthy checks rather
  than `??`), and `initializeItemCheckOptions`
  (`CharacterDataModel.js:3369-3371`) resolves the real roll data into a *local*
  variable and never writes it back into `checkOptions` — so any future code that
  reads `checkOptions.itemRollData` after initialization gets `false` even when an
  item was supplied.
- **To do:** Either default `itemRollData` to `undefined` (so `??` and `||`
  behave identically everywhere and the sentinel is a true "absent"), or have
  `initializeItemCheckOptions` assign the resolved roll data back into the returned
  options. Add parity tests.
- **Why deferred:** The shipped minimal fix closes the user-facing bug (the item
  options dialog no longer self-closes) and all five dialog types pass E2E; this
  is hardening against a latent class of bug, not a live defect.
- **Found by:** The 2b-3 checks-dialog E2E (see `e2e-suite-status.md` bug #3).

### 9. Replace fixed-timeout waits in the E2E dialog/check helpers — DONE

- **Status: COMPLETE.** `openCheckDialog` dropped its 400ms mount sleep (relies on
  the auto-retried `toBeVisible`); `clickRoll(dialog, page)` now captures the
  pre-roll `game.messages.size` baseline; `readNewestCheckFlags(page, baseline)`
  `expect.poll`s for the newest titan-flagged message created at/after that
  baseline (no fixed sleep, no global-newest read). The shared helper is reused in
  `checks-integration.spec.js` (its 300ms-sleep + global-newest block replaced;
  redundant `created` assertion removed); the three `checks-dialog.spec.js` call
  sites were updated. The same fixed-sleep pattern in other specs
  (`checks-opposed`, `effect-checks`, `interaction-rolls`) was left out of scope
  for a future pass. **E2E run is user-gated** (needs the launched world) — pending
  a green run before merge. Commits `7d491c1f`, `0c0774e8`.
- **What:** `tests/e2e/checkDialog.js` waits a hard-coded 400ms for the dialog to
  mount (`openCheckDialog`) and 300ms for the chat message to settle
  (`readNewestCheckFlags`), and `readNewestCheckFlags` reads the *globally* newest
  message (`game.messages.contents[size-1]`) rather than the one this roll
  produced. The same fixed-sleep + global-newest pattern exists in the 2b-2
  `checks-integration.spec.js`. These are race-prone on a loaded/CI machine.
- **To do:** Replace fixed sleeps with polling (e.g. `expect.poll`) — wait for the
  dialog locator (already auto-retried) and poll for a chat message whose creation
  postdates the roll click, across both the dialog and integration helpers.
- **Why deferred:** Non-blocking — the full suite is green (40/40 e2e); this is
  flake-prevention, and fixing it well means revisiting the shared pattern across
  specs rather than one helper.
- **Found by:** Final code review of the 2b-3 implementation.

## Chat message subtypes — related items

The "first-class ChatMessage subtypes" effort is specced/planned in
`specs/2026-06-03-chat-message-subtypes-phase1-design.md` and
`plans/2026-06-03-chat-message-subtypes-phase1.md` (Phase 1 = infrastructure +
the five check subtypes; later phases cover items, reports, and effect).

### 10. Chat-message Svelte mount is keyed per-document, not per-element

- **What:** `TitanChatMessage` stores a single `_svelteComponent = { handle, bridge }`
  per message document. Foundry renders one message into TWO elements when chat
  notifications are active — the main chat log (`ChatLog#postOne` / `#updateMessage`)
  AND the notifications pane (`ChatLog#postNotification`) — each calling `renderHTML`.
  The second render's `_teardownComponent()` unmounts the first element's component
  (leaving its `.message-content` blank until the next re-render), and the
  notification-pane mount + its `ReactiveDocument` bridge later leak, because
  notification auto-dismissal removes the element without a teardown hook.
- **Severity:** Only manifests when the chat sidebar tab is NOT the active tab (so a
  notification is posted). **Pre-existing:** the legacy `OnRenderChatMessageHTML` hook
  uses the identical single-slot `message._svelteComponent` pattern, so the Phase 1
  refactor preserves parity rather than regressing.
- **To do:** Key the mount per rendered element (store `{ handle, bridge }` on the
  `<li>` element, or a `WeakMap<HTMLElement, …>` keyed by target), tearing down
  per-element; on delete, tear down all of a message's mounts. Consider a
  MutationObserver (or Foundry hook) to unmount on notification-pane element removal.
  Apply the same model to the legacy hook until it is retired in the final phase.
- **Why deferred:** Out of scope for Phase 1 (parity migration of checks). Fixing it
  well means reworking the mount-tracking model shared with the legacy path.
- **Found by:** Opus code-quality review of Phase 1, Task 3.

### 11. Check chat components mutate the live DataModel before `update()`

- **What:** Several check chat components — `CheckChatMessageDie.svelte`,
  `CheckChatResetExpertiseButton.svelte`, `CastingCheckChatMessageScalingAspect.svelte` —
  mutate `document.data.system.results` / `.parameters` (and `die.*`) in place on the live
  `system` DataModel instance, then persist via
  `document.data.update({ system: { results: structuredClone(...) } })`.
- **Severity:** Not a corruption bug — Foundry's `update()` diffs the submitted payload against
  `_source`, not the mutated prepared data, and the component remounts on the resulting
  `updateChatMessage` render (discarding the transient mutated state). This is a **pre-existing**
  pattern carried over unchanged from the `flags.titan` implementation.
- **To do:** Refactor to build a local plain object (e.g. from `document.data.system.toObject()`),
  mutate only that, and pass it to `update()` — never mutate the live model. Mirrors the clean
  clone-then-update pattern already used in `OnGetChatLogEntryContext.js`.
- **Why deferred:** Behavior-preserving cleanup, low risk; outside Phase 1's parity scope.
- **Found by:** Opus code-quality review of Phase 1, Task 5.

### 12. Chat-message ↔ document path parity (schema-from-shape)

- **What:** Bring chat messages to **path parity** with their source documents so
  the same display/edit components are reusable across item sheets, character
  sheets, and chat — e.g. the weapon **item** card shows attacks via
  `document.data.system.attack[index]` (parity with the weapon item document),
  and the attack-**check** chat message gains parity with the attack check
  (deep `parameters` / `results` schemas instead of opaque `ObjectField`s).
- **Mechanism:** a `buildSchemaFromShape(shape)` helper that recursively converts
  a canonical plain-object shape into an appropriate Foundry schema (string →
  `StringField`, number → `NumberField`, bool → `BooleanField`, array →
  `ArrayField`, nested object → `SchemaField`). One shape feeds both the source
  document schema and the chat-message document schema; differentiating fields
  are added/overridden on top of the base shape.
- **No migration:** chat cards are historical snapshots — new messages carry the
  parity shape; historical messages are not retrofitted, and the source document
  is *not* resolved live (a card must not mutate when the weapon is later edited
  or deleted).
- **North-star:** progressively move all fields on all documents onto consistent
  `system.*` paths via the helper.
- **Depends on / sequencing:** the in-flight chat-message-subtypes conversion
  (`specs/2026-06-03-chat-message-subtypes-phase1-design.md` + later item/report/
  effect phases) must finish first.
- **Origin:** branched off the embedded-document-stores design —
  `specs/2026-06-03-embedded-document-stores-design.md` (Follow-up work →
  "Chat-message path parity").

## E2E suite speedup — remaining phases

### 14. E2E speedup Phase 1b — bespoke sleep removal

- **What:** Convert the `setTimeout` settles deferred from Phase 1a (the uniform bulk shipped on
  branch `chore/e2e-sleep-removal`, merged to `main`). Bespoke, per-site conditions:
  `effect-tray.spec.js` (18 — tray render+activate / select-change),
  `logic/rules-elements.spec.js` (10 — derived-data settle), `logic/conditions.spec.js` (2),
  `localization.spec.js` (2 tray sites), `permissions-auto-open.spec.js` (1 — assert-absence; needs
  a positive signal or a bounded wait, can't poll a negative). Reuse the `titanWait` helper from
  `tests/e2e/poll.js`.
- **Spec:** `docs/superpowers/specs/2026-06-03-e2e-suite-speedup-design.md` (Workstream A).

### 15. E2E speedup Phase 2 — shared-world harness + hygiene

- **What:** Per-file login (boot once per spec file, opt-out per the spec) to collapse ~100+
  per-test world boots to ~40; per-test hygiene (close apps, reset error listeners); per-run/per-file
  world reset (chat clear + trim accumulated state). The world-reset also fixes the bloat that causes
  the **socket-sync flake** (`docs/OPEN_BUGS.md` #1).
- **Spec:** `docs/superpowers/specs/2026-06-03-e2e-suite-speedup-design.md` (Workstream A, Phase 2).
