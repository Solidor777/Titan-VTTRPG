# Spec — Effect-tray context menu / filter / lock + double-localization E2E test

- **Date:** 2026-06-02
- **Branch:** `development`
- **Status:** Approved design, pending spec review → implementation plan

Two independent deliverables bundled in one spec because they share a surface (the
effects sidebar) and the localization test uses the tray as a primary test case.

---

## 1. Background

### 1.1 The `localize` double-wrap defect class

`src/helpers/utility-functions/Localize.js` resolves a key as
`game.i18n.localize('LOCAL.' + key + '.text')`. Foundry returns the **input string
unchanged** when a key does not resolve. Therefore:

- A double wrap — `localize('LOCAL.foo')` → `game.i18n.localize('LOCAL.LOCAL.foo.text')`
  → unresolved → renders the literal `LOCAL.LOCAL.foo.text`.
- A missing/typo key — `localize('typo')` → unresolved → renders the literal
  `LOCAL.typo.text`.

Both surface the substring **`LOCAL.`** to the user. So: *any rendered user-facing
text or tooltip containing `LOCAL.` is a defect.* `LOCAL` is TITAN's only i18n
namespace, so the substring is TITAN-specific and will not false-positive on Foundry
core text.

### 1.2 Tooltips are tippy, not `data-tooltip`

`src/helpers/svelte-actions/TooltipAction.js` builds **tippy.js** instances. Content is
stored in JS (`element._tippy.props.content`) and only injected into the DOM (as a
`.tippy-box`) on hover. Tippy is initialized **at mount** for non-blank content, so
`element._tippy` exists immediately and its `props.content` can be read without
hovering. The scan must read `_tippy.props.content`, not a DOM attribute.

### 1.3 Effect-tray current state (`src/sidebar/tray/`)

- `TitanEffectTrayTab.js` — `AbstractSidebarTab` that mounts `EffectTrayShell.svelte`,
  passing an `EffectTrayState` instance and the application into Svelte context.
- `EffectTrayState.svelte.js` — reactive state. Notable: `get canEdit()` reads
  `!pack.locked && pack.getUserLevel(game.user) >= OWNER` (a non-reactive read of
  `pack.locked`). Methods exist for create/duplicate/rename/stash/folder CRUD and
  `moveEffectToFolder`.
- `EffectTrayHeader.svelte` — pack `Select`, New/New-Folder `IconButton`s, and a bare
  `<input class="effect-tray-search">` bound to `trayState.filter`.
- `EffectTrayRow.svelte` — icon + name (dblclick inline rename) + inline `IconButton`s:
  Apply (always), and Open/Duplicate/Delete (when `canEdit`). Delete prompts via
  `ConfirmationDialog`. Row is draggable.
- `EffectTrayList.svelte` — filters by name, groups by folder, renders rows.

### 1.4 Confirmed Foundry v14 APIs

- `new foundry.applications.ux.ContextMenu(container, selector, menuItems,
  { jQuery: false, fixed: true })`. Entry shape read by the class: `label` (run through
  core `_loc` — pass already-localized text), `icon` (string; `<i …></i>` HTML form
  supported), `visible(target)` (preferred over `condition`), `onClick(event, target)`
  (preferred over `callback`). This matches TITAN's directory hooks
  (`OnGetActorDirectoryEntryContext.js`).
- `CompendiumCollection`: `get locked()` → `config.locked ?? (packageType !== 'world')`;
  `await pack.configure({ locked })` persists the change (GM-only).

---

## 2. Feature 1 — Double-localization E2E test

### 2.1 Files

- **New:** `tests/e2e/localization.spec.js`.
- **Edit:** `tests/e2e/fixtures.js` — add a reusable page-side scanner helper.

### 2.2 Layer A — static source audit (Node side)

In the spec, import/read `lang/en.json` and assert no string **value** contains the
substring `LOCAL.` (recursive over the `LOCAL` object's values). Catches double-wrapped
keys at the data source independent of rendering. Failure message lists each offending
`key → value`.

### 2.3 Layer B — runtime DOM + tippy scan (page side)

A helper evaluated in the page that, given a root `HTMLElement` (or `document.body`),
returns an array of offending strings containing `LOCAL.`, collected from:

- text content of the root and descendants,
- attributes `aria-label`, `title`, `placeholder`, `alt`, `data-tooltip`,
- tippy content: for every descendant with `_tippy`, read `_tippy.props.content`
  (string → use directly; `HTMLElement` → use `textContent` + `outerHTML`).

Scoped per surface to the surface's own element where practical; the context menu is
scanned via the body-level `#context-menu`.

### 2.4 Surfaces (comprehensive)

Mirrors `render-smoke.spec.js` plus the tray:

1. Player actor sheet.
2. NPC actor sheet.
3. Each of the 7 item sheets (`ability, armor, commodity, equipment, shield, spell,
   weapon`).
4. An embedded effect sheet on a player actor.
5. **Effects sidebar** (`ui.titanEffects`): render + activate, select a seeded pack,
   then scan: header (filter label, New/New-Folder/lock buttons + their tippy
   tooltips), at least one row, and the **opened right-click context menu**
   (`#context-menu`).

Each surface collects offenders and asserts the list is empty, printing offenders on
failure. Per-surface assertions so one failing surface does not poison the rest.

---

## 3. Feature 2 — Effect-tray context menu, left-click open, filter restyle, lock toggle

### 3.1 Row interaction (`EffectTrayRow.svelte`)

- **Left-click the row** → `effect.sheet.render(true)`, for all users (sheet enforces
  its own permissions). Implement as `onclick` on the row root; the inline Apply button
  calls `event.stopPropagation()` so applying does not also open the sheet. Existing
  drag (`dragstart`) and dblclick-rename are preserved.
- **Inline buttons:** keep **Apply** only. Remove the Open / Duplicate / Delete inline
  `IconButton`s (moved into the context menu).
- **Rename bridge:** the row root listens (via a small Svelte action / `$effect` adding
  an event listener) for a `titan-effect-rename` `CustomEvent` and calls `beginRename()`
  on receipt, so the context-menu Rename entry can drive the existing inline-rename UX.

### 3.2 Context menu (new `src/sidebar/tray/EffectRowContextMenu.js`)

A module exporting a builder that, given the `trayState`, returns the
`ContextMenuEntry[]`, plus a helper resolving the live effect from
`target.dataset.effectId` (rows already carry `data-effect-id={effect.id}`). Entries:

| Label (localized) | `visible` | `onClick` |
|---|---|---|
| Apply to Target | always | `applyEffectToTargets(effect)` |
| Open Sheet | always | `effect.sheet.render(true)` |
| Rename | `trayState.canEdit` | dispatch `titan-effect-rename` on the target row |
| Move to Folder… | `trayState.canEdit && !!trayState.selectedPack?.folders` | open folder-picker `DialogV2` → `trayState.moveEffectToFolder(effect, folderId)` |
| Duplicate | `trayState.canEdit` | `trayState.duplicateEffect(effect)` |
| Delete | `trayState.canEdit` | `trayState.requestDeleteEffect(effect)` |

Mechanism: a Svelte action attached to the tray root in `EffectTray.svelte`
instantiates `foundry.applications.ux.ContextMenu(root, '[data-effect-id]', entries,
{ jQuery: false, fixed: true })` and tears it down on destroy. Icons use the `<i
class="…"></i>` HTML form to match directory hooks.

**Decisions (from brainstorming):** Rename uses the inline-bridge (preserves current
UX) rather than a dialog. Move-to-Folder uses a `DialogV2` folder picker (options = the
pack's folders + a localized "(Root)" entry); drag-to-folder still works as before.

### 3.3 Delete relocation (`EffectTrayState.svelte.js`)

Move the `ConfirmationDialog` delete flow out of the row into a new
`requestDeleteEffect(effect)` method on `EffectTrayState` (imports `ConfirmationDialog`
+ `localize`), so the context menu calls it directly. The row no longer owns delete UI.

### 3.4 Filter bar restyle (`EffectTrayHeader.svelte`)

Replace the bare `<input class="effect-tray-search">` with the actor-sheet header
pattern (cf. `CharacterSheetSpellsTab.svelte`): a bordered `panel-1` header containing
the pack `Select` + New/New-Folder/lock buttons on one row, and a **Filter** row with a
bold label (`localize('filter')`) + the shared `TextInput` component bound to
`trayState.filter`. No facets. SCSS mirrors the actor-sheet tab header mixins
(`flex-row`, `flex-group-center`, `border-bottom`, `padding-large`, bold `.label`).

### 3.5 Lock toggle (`EffectTrayHeader.svelte` + `EffectTrayState.svelte.js`)

- State additions:
  - `isLocked = $state(true)` — reactive mirror of `selectedPack?.locked`, set in
    `refresh()` / `selectPack()` and after `toggleLock()`.
  - `get isOwner()` → `!!pack && pack.getUserLevel(game.user) >=
    CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER`.
  - `get canEdit()` re-derived to read the reactive `this.isLocked` (instead of the live
    `pack.locked`) so the UI reacts to lock changes.
  - `async toggleLock()` → guard on `isOwner`; `await pack.configure({ locked:
    !pack.locked })`; set `this.isLocked = pack.locked`.
- Header `IconButton`, visible only when `trayState.isOwner`, icon `LOCK_ICON` when
  locked / `UNLOCK_ICON` when unlocked, tooltip/label localized, `onclick →
  trayState.toggleLock()`.
- Unlocking a system (TITAN) pack is permitted (per the chosen "GM/owner-only toggle");
  no extra warning. Edits to system packs are wiped on system update — documented
  behavior, out of scope to guard here.

### 3.6 Supporting data

- `src/system/Icons.js` — add `LOCK_ICON` (`fas fa-lock`), `UNLOCK_ICON`
  (`fas fa-lock-open`), `RENAME_ICON` (`fas fa-pen`), `MOVE_TO_FOLDER_ICON`
  (`fas fa-folder-arrow-down`), `TARGET_ICON` (replaces the inline `fa-bullseye-arrow`
  literal in the row's Apply button), each registered in the icon map where applicable.
- `lang/en.json` — add `LOCAL.*.text` keys: `effectTrayLock`, `effectTrayUnlock`,
  `effectTrayRename`, `effectTrayMoveToFolder`, `effectTrayMoveToFolderPrompt`,
  `effectTrayRoot`.

---

## 4. Testing

- **New** `tests/e2e/localization.spec.js` — Feature 1 (Layers A + B over all surfaces).
- **Extend** `tests/e2e/effect-tray.spec.js`:
  - left-click a row opens the effect sheet,
  - right-click → context menu visible; clicking Open Sheet opens the sheet; clicking
    Duplicate/Delete round-trips (GM, unlocked pack),
  - lock toggle: as owner, toggling flips `pack.locked` and the icon state, and disables
    CRUD affordances when locked.
- Unit tests if any pure helper (e.g., the offender-scan predicate) is extracted to a
  testable function.
- Full unit + e2e run before completion; report counts.

---

## 5. Out of scope

- Filter facets / type toggles (explicitly dropped).
- Cross-client lock-state sync (only the toggling client updates its mirror).
- Seeded standard-effects pack work (tracked separately).
- Any change to the `localize` helper itself.

---

## 6. Workflow notes

- All `.js` / `.svelte` / `.svelte.js` work routes to the `titan-svelte-dev` subagent
  with `svelte-5`, `foundry-vtt`, `foundry-svelte` skills loaded.
- Update the `titan-codebase` skill after implementation (new tray context-menu module,
  lock state, localization-scan test surface).
- Update `docs/TODO.md` as items complete.
