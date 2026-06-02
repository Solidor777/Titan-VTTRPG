# Effect Tray sidebar tab — design (backlog #2)

**Date:** 2026-06-02
**Status:** Approved — ready to plan
**Backlog item:** `docs/TODO.md` #2 ("Custom sidebar-tab effect directory")

## Problem

Accessing the reusable-effects compendium through Foundry's native Compendium
sidebar tab is clunky: it is buried under Compendiums, presents a generic
document list, and cannot apply an effect to a target. The user wants a
dedicated, always-visible TITAN sidebar tab — a "tray" of effects that can be
pulled up fast, browsed, applied to targets in one click, and curated.

### Current state (verified)

- **Compendium exists, but empty.** `system.json` declares one pack:
  `{ name: "effects", label: "TITAN Effects", path: "packs/effects",
  type: "ActiveEffect", ownership: { PLAYER: "OBSERVER", ASSISTANT: "OWNER" } }`.
  The pack's tracked LevelDB files are all 0 bytes — it currently contains **zero
  effects**. There is **no pack-build pipeline** (no foundryvtt-cli, no
  `compilePack`, no pack-source directory) and **no defined "standard effects"**
  set in code (conditions are a separate `condition` subtype, not this library).
- **No existing custom sidebar tab.** Every "sidebar" file under `src/` is a
  document-sheet-internal sidebar; there is no top-level custom sidebar tab. This
  is net-new.
- **v14 sidebar wiring (verified in the client source).** `CONFIG.ui` maps tab
  ids to tab-application classes (`CONFIG.ui.sidebar = Sidebar`,
  `CONFIG.ui.actors = ActorDirectory`, …). `Sidebar.TABS` is a static object
  listing each tab (`{ documentName }` or `{ icon, tooltip }` for non-document
  tabs like `placeables`/`compendium`/`settings`). Tab applications extend
  `foundry.applications.sidebar.AbstractSidebarTab`, which extends
  `ApplicationV2` — so the system's established "mount Svelte into ApplicationV2"
  pattern applies directly. `Sidebar._configureRenderOptions` iterates
  `this.constructor.TABS`; core instantiates `ui[tabId]` from `CONFIG.ui[tabId]`.
- **Existing targeting to reuse.** `getBestCharactersToUpdate()`
  (`src/helpers/utility-functions/`) is the role-aware target resolver behind
  `ApplyDamageToTargets`/`ApplyHealingToTargets`: GM → `getTargetedCharacters()`;
  player → controlled-token character actors, fallback `game.user.character`. It
  composes the primitives `GetTargetedCharacters`, `GetControlledTokens`,
  `GetControlledCharacters`.

## Scope decision

This spec covers **only sub-project A: the sidebar-tab tray UI** (browse / apply /
full CRUD against any visible ActiveEffect compendium). Authoring and shipping a
seeded "standard effects" compendium (sub-project B) is **deferred** to its own
later spec — it needs new packaging infrastructure (a pack-build pipeline) and
content authored from the rulebook (a future scrape script). For now, packs ship
empty; the tray is useful immediately as a scratch tray and against the user's
own packs.

## Requirements (approved)

- A TITAN sidebar tab (id **`titanEffects`**, a "tray" icon) visible to **all
  users**; actions gated by ownership.
- **Layout C:** a list of effect rows (icon, name, inline-rename), each with an
  inline **Apply** button; drag-to-apply also works.
- A **compendium dropdown** selecting which ActiveEffect pack is shown — the
  system `effects` pack plus any world/module ActiveEffect packs the user can see.
- A **search** box filtering the current pack.
- **Apply** copies the effect onto the smart-resolved, owner-filtered targets.
- **Full CRUD:** create-blank, stash-from-actor (drag-in), duplicate, inline
  rename, delete (confirmed), open sheet, and native compendium **folders**.

## Decision — Approach 1: native sidebar tab

Register the tab the blessed v14 way rather than fighting the sidebar with a
`renderSidebar` hook:

- Additively add a `titanEffects` entry to `Sidebar.TABS` (icon + tooltip) at
  `init` and set `CONFIG.ui.titanEffects = TitanEffectTrayTab`. **No wholesale
  `Sidebar` replacement** — additive mutation minimizes collision risk with
  modules.
- **Feasibility hinge — RESOLVED (Task 1, 2026-06-02).** Mutating the static
  `Sidebar.TABS` plus setting `CONFIG.ui.titanEffects` at `init` **is
  sufficient**; no `Sidebar` subclass / `CONFIG.ui.sidebar` override is needed.
  Verified in the v14 client source: `Game#initialize` fires `Hooks.callAll("init")`
  before `Game#setupGame` → `Game#initializeUI`, and `initializeUI` instantiates
  every `ui[k] = new cls()` from `Object.entries(CONFIG.ui)`; `Sidebar` reads
  `this.constructor.TABS` at render time and `#renderTabs` renders `ui[id]` into a
  per-tab stub. The Task 1 e2e (`tests/e2e/effect-tray.spec.js`) confirms at runtime
  that `ui.titanEffects` exists, the tab is in `Sidebar.TABS` + `CONFIG.ui`, and the
  Svelte panel mounts with no console errors.
- Core then handles the tab-strip icon, active-tab switching, expand/collapse, and
  popout for free.

Approach 2 (`renderSidebar` hook injecting a button + a self-managed popout) is
the fallback only if Approach 1 collides badly; it is brittler and re-implements
tab behavior, so it is not chosen.

## Components

### Registration layer (JS, at `init`)

- **`src/sidebar/TitanEffectTrayTab.js`** — class extending
  `foundry.applications.sidebar.AbstractSidebarTab`. `tabName = 'titanEffects'`.
  `DEFAULT_OPTIONS` set the window/id/classes. On render it mounts
  `EffectTrayShell.svelte` with Svelte 5 `mount()`, following the system's
  shell/context mount pattern (no Handlebars). Cleans up the mount on close.
- **Registration** (in the system `init` hook, alongside the other
  `CONFIG`/registration code): add the `titanEffects` `Sidebar.TABS` entry
  (`{ icon, tooltip }`), set `CONFIG.ui.titanEffects = TitanEffectTrayTab`, and a
  localized tab tooltip in `lang/en.json`.

### Svelte layer (`src/sidebar/tray/`)

- **`EffectTrayShell.svelte`** — mounted by the tab app; instantiates the tray
  state, sets it into Svelte context, renders `EffectTray`.
- **`EffectTray.svelte`** — composes header + body; hosts the drag-in drop zone.
- **`EffectTrayHeader.svelte`** — compendium `<select>` dropdown, search input,
  **+ New** button, folder controls. Write controls disable when the selected
  pack is not editable by the user.
- **`EffectTrayList.svelte`** — renders the filtered effects grouped by folder;
  empty-pack and no-packs placeholders.
- **`EffectTrayRow.svelte`** — one effect: icon, inline-rename name, **Apply**
  button, drag source (`effect.toDragData()`), context menu (Open sheet /
  Duplicate / Delete).

### State

- **`src/sidebar/tray/EffectTrayState.svelte.js`** — a Svelte 5 runes class:
  selected pack id, search text, expanded-folder set, loaded effect documents for
  the current pack, and `refresh()`. Last-selected pack persists in a per-user
  client setting **`titan.effectTrayLastPack`**; search and folder-expansion are
  ephemeral.

## Compendium-source model

- **Dropdown contents:** `game.packs.filter(p => p.metadata.type ===
  'ActiveEffect' && p.visible)`. TITAN-owned packs sort first, then the rest
  alphabetically. On load, reselect `titan.effectTrayLastPack`; if missing, fall
  back to the system `effects` pack, else the first entry.
- **Loading:** selecting a pack loads full documents via `pack.getDocuments()`
  (effect packs are small and full docs are needed for Apply-copy and CRUD), held
  in tray state. **Display filter:** TITAN-owned packs show only `type ===
  'effect'` (excludes `condition`/base AEs, consistent with the rest of the
  system); non-TITAN (user) packs show all ActiveEffects.
- **Reactivity:** a single `refresh()` re-pulls the current pack's docs. Called
  (a) after any CRUD this tray performs, and (b) by lightweight
  `createActiveEffect`/`updateActiveEffect`/`deleteActiveEffect` and compendium
  folder hook listeners **only when the changed document belongs to the
  currently-selected pack** (checked via the document's pack/collection), so
  unrelated edits do not thrash the UI. The hook→runes bridge follows the
  system's existing hook-to-reactive convention.
- **Edge cases:** empty pack → "No effects yet — create one or drag an effect
  here" placeholder (expected, since packs ship empty). No visible ActiveEffect
  packs → disabled "No effect compendiums" dropdown state.

## Apply flow & smart targeting

**Apply:** for each resolved target actor the user owns,
`actor.createEmbeddedDocuments('ActiveEffect', [sourceEffect.toObject()])` (a
fresh independent copy, owner-gated). Then a summary notification ("Applied
*<name>* to N actors"), reusing the damage path's notification convention.
Targets the user does not own are skipped; if zero ownable targets resolve, a
"select or target a token" notification fires and nothing is created.

**Upgraded shared targeting (approved blast radius):** `getBestCharactersToUpdate()`
is **upgraded in place** (kept by name; damage/healing callers benefit too) to add
fallbacks where there were none — without changing the existing *primary* order,
so current workflows do not shift:

- **GM:** `getTargetedCharacters()` → else controlled-token character actors →
  else focused-sheet actor.
- **Player:** controlled-token character actors → else `game.user.character`
  (assigned) → else focused-sheet actor.
- Results de-duplicated; the Apply flow then filters to `actor.isOwner`.

New helper **`src/helpers/utility-functions/GetFocusedCharacterSheetActor.js`** —
returns the actor of the currently-focused/active `TitanActorSheet`, or null —
provides the final fallback. The function composes existing primitives
(`GetTargetedCharacters`, `GetControlledTokens`, `game.user.character`) plus this
new getter.

**Drag-to-apply:** dragging a row emits standard `effect.toDragData()`, so
dropping on a sheet or token uses Foundry's native handling (no extra code).

## Full CRUD, drag-stash & folders

All write actions are gated on the selected pack being editable for the user
(`!pack.locked` and sufficient permission); controls disable otherwise.

- **Create blank** — "+ New" creates `{ name: "New Effect", type: "effect" }` in
  the pack (`pack.documentClass.create(data, { pack: pack.collection })`), then
  opens its sheet.
- **Stash from actor (drag-in)** — the tray drop zone accepts dropped ActiveEffect
  drag data (actor sheet, token HUD, canvas), reads the effect, and copies it into
  the selected pack. This is the "save an ad-hoc effect to my tray" move.
- **Duplicate** — context-menu; clones the source doc into the same pack with a
  "(Copy)" suffix.
- **Rename inline** — double-click the name → input → `doc.update({ name })` on
  commit.
- **Delete** — context-menu; routes through a `ConfirmationDialog` (reusing the
  system's confirm pattern, consistent with the just-shipped effect confirm-delete),
  then `doc.delete()`.
- **Open sheet** — `doc.sheet.render(true)` (the `TitanActiveEffectSheet`,
  registered for `type: 'effect'`).
- **Folders** — native compendium folders (`pack.folders`): create/rename/delete
  in the header, drag rows between folders (`doc.update({ folder })`),
  expand/collapse persisted in tray state. Non-folder packs show a flat list.

## Permissions / audience

The tab is visible to all users. The dropdown lists only packs the user can
observe (`p.visible`). CRUD controls disable unless the pack is editable by the
user (GM by default, given pack ownership). Apply is gated by target ownership
(`actor.isOwner`), so a player can self-apply to their own character while a GM
can apply to anyone.

## Testing

### Unit (Vitest)

- The upgraded `getBestCharactersToUpdate` fallback ladder: GM
  targeted→selected→focused-sheet; player controlled→assigned→focused-sheet;
  de-dup. Mock `game.user`, targets, controlled tokens, focused sheet.
- The Apply flow's `isOwner` filtering.
- The dropdown pack-filter + sort (ActiveEffect-only, TITAN-first) as a pure
  function.

### e2e (Playwright; in-world-trigger + mount-assertion patterns)

- **Tab registration** — the `titanEffects` tab icon is present; activating it
  mounts the tray at a stable selector; no console errors.
- **Dropdown** — lists the system `effects` pack and a seeded test-world
  ActiveEffect pack; selecting loads contents; empty pack shows the placeholder.
- **Apply** — with a controlled token, Apply creates a copy on that token's actor
  (`actor.effects` grows, names match); applying to an unowned target is skipped
  with a notification.
- **CRUD round-trips** — create-blank adds a doc; rename persists; duplicate adds
  a "(Copy)"; delete (through the confirm dialog) removes it (asserted via
  `pack.getDocuments()`).
- **Drag-stash** — dropping an actor's effect onto the tray adds it to the pack.
- **Regression** — re-run `socket-sync` and the report apply-damage/healing
  suites to confirm the upgraded targeting did not break existing flows.

Baselines to hold: unit 64+, e2e 332+ (plus the new cases).

## Risk / blast radius

- **New UI surface, mostly additive.** The only shared-code change is upgrading
  `getBestCharactersToUpdate` (intentional, to keep effect-apply and
  damage/healing targeting consistent). Mitigated by preserving the existing
  primary targeting order (fallbacks added only where there were none) plus unit
  + regression coverage.
- **`CONFIG.ui` / `Sidebar.TABS` is a shared surface.** Additive mutation (not
  replacement) minimizes module-collision risk; exact wiring verified in planning.
- No data migration. No engine/computation changes.

## Out of scope

- Sub-project B: authoring + shipping a seeded "standard effects" compendium and
  the pack-build pipeline / rulebook-scrape script (separate later spec).
- Renaming `getBestCharactersToUpdate` (kept to avoid rippling through damage
  callers).
- The icon-grid layout (B) — list layout (C) was chosen; a grid toggle is a
  possible later enhancement, not built now.
- Any non-character apply target handling beyond what the upgraded targeting
  resolver returns.
