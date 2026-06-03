# Restore always-visible Svelte sheet header buttons — Design

- **Date:** 2026-06-02
- **Backlog item:** `docs/TODO.md` §7 ("Rich (TyphonJS-style) sheet header buttons").
- **Status:** Design — awaiting user review before planning.

## Problem

Before the v14 / Svelte 5 conversion (TyphonJS / AppV1 era), actor and item sheets
showed **always-visible icon buttons in the window title bar**, each rendered as a
Svelte component and carrying a **rich HTML tooltip** (tippy via the
`tooltipAction` Svelte action). The dynamic token link/unlink button changed its
icon, tooltip, and colour (orange/brown glow) with the link state.

The v14 migration (commit `89a1e4ae`) deleted those seven Svelte components and
replaced them with native AppV2 `_getHeaderControls()` entries. Those render only
inside the **ellipsis (⋮) dropdown**, expose only an icon + plain-text label (no
tooltip field), and are invisible until the dropdown is opened. The rich,
always-visible experience was lost.

This spec restores the always-visible Svelte header buttons (with rich tooltips)
**in addition to** the existing dropdown, and extends the pattern to the
ActiveEffect sheet (new since the migration), where Send-to-Chat is the priority
action.

## Goals

- Always-visible icon buttons in the `.window-header`, rendered as Svelte
  components, with the original rich HTML (`.desc`) tippy tooltips.
- Restore the actor token link/unlink button's reactive icon/tooltip/glow.
- Add a Send-to-Chat header button to the `effect`-subtype ActiveEffect sheet.
- Keep the existing `_getHeaderControls()` ⋮ dropdown entries (coexistence) so
  every action is reachable both inline and in the menu.
- Fit the current pure-Svelte-mount architecture — the header mount is the twin
  of how `TitanDocumentSheet` already mounts the content shell.

## Non-goals

- Removing or restyling the native ⋮ dropdown (it stays as-is).
- Header buttons on condition-subtype effects (they use Foundry's default config
  sheet and are auto-applied mechanics, not chat-able).
- An Import button for effects (there is no world ActiveEffect collection to
  import into — the reason the Effect Tray exists).
- Any change to the underlying click-handler logic; the buttons reuse existing
  methods.

## Background: the old behaviour (to restore)

| Sheet | Button | Visibility condition | Action | Rich tooltip key |
|---|---|---|---|---|
| Actor | Import | `game.user.isGM && actor.pack` | `_onImportActor()` | `importActorToWorld` |
| Actor | Edit Token | `isGM \|\| (actor.isOwner && can('TOKEN_CONFIGURE'))` | `_onEditToken()` | `editLinkedToken.desc` / `editUnlinkedToken.desc` (state-dependent) |
| Actor | Toggle Link | above **and** directory actor (`token === null`) | `_onToggleTokenLink()` | `toggleTokenLinkedButton.desc` / `toggleTokenUnlinkedButton.desc` |
| Actor | Unlink | above **and** placed + linked token | `_onUnlinkToken()` | `unlinkTokenButton.desc` |
| Actor | Unlinked | above **and** placed + unlinked token | none (disabled) | `unlinkedTokenButton.desc` |
| Item | Send to Chat | always | `item.sendToChat()` | **new** `sendItemToChat.desc` |
| Item | Import | `item.pack` | `_onImportItem()` | `importItemToWorld` |
| Effect (`effect` subtype) | Send to Chat | always | `effect.sendToChat()` | **new** `sendEffectToChat.desc` |

All tooltip bodies except the two new send-to-chat keys already exist in
`lang/en.json`. The old `ItemSheetSendToChatButton` mistakenly pointed at
`importActorToWorld` ("Import this Actor to the game world") — a copy-paste bug
fixed here by adding a proper key.

The token link/unlink button restored its original colours: `.linked`
(`darkorange` + glow) and `.unlinked` (`brown` + glow); the Unlinked button is
`disabled` and wrapped so the tooltip still fires (`cursor: not-allowed`).

## Architecture

### Why this approach

Foundry v14 `_renderFrame` builds the `.window-header` **once, on first render**
(`application.mjs` line 546 guards it behind `options.isFirstRender`); a
`this.render({ parts: [] })` re-render does **not** rebuild it. So a Svelte tree
mounted into `.window-header` on first render persists across re-renders — exactly
like the content shell, which `TitanDocumentSheet` already mounts once in
`_replaceHTML` and tears down in `_onClose`.

The native always-visible path (`_getFrameButtons()`) was rejected: it renders
plain Handlebars HTML with only a native plain-text `data-tooltip`, is not
reactive, and is not Svelte — it cannot carry the rich HTML `.desc` tooltips.
Restoring the original seven per-button `.svelte` files was rejected too: that
split only existed because TyphonJS's `_getHeaderButtons` consumed one component
per entry. One reactive component per document category is simpler and lets the
link/unlink button update from the document bridge without any `render()` call.

### Components

```
TitanDocumentSheet  (base — generic header mount/unmount machinery)
 ├─ TitanActorSheet        → _getHeaderButtonsComponent() = ActorSheetHeaderButtons.svelte
 ├─ TitanItemSheet         → _getHeaderButtonsComponent() = ItemSheetHeaderButtons.svelte
 └─ TitanActiveEffectSheet → _getHeaderButtonsComponent() = ActiveEffectSheetHeaderButtons.svelte
```

### Base machinery — `src/document/sheet/TitanDocumentSheet.js`

- Add private field `#headerMountHandle = void 0`.
- Add protected `_getHeaderButtonsComponent()` returning `undefined` (no header
  buttons). Modelled on the existing `_createReactiveState()` factory — a method,
  not a `DEFAULT_OPTIONS.svelte.props` entry, to avoid deep-merging a component
  class through the options chain.
- Add `_onFirstRender(context, options)`: read the component from
  `_getHeaderButtonsComponent()`; if present, `mount()` it with
  - `target: this.window.header` (the `.window-header` element — public getter),
  - `anchor: this.window.controls` (the ⋮ button) so buttons render to its left,
  - `context: new Map([['application', this], ['document', this.#bridge]])` —
    mirroring the content mount so `getApplication()` and `getContext('document')`
    resolve inside the header tree,
  and store the handle. (`super._onFirstRender` if defined.)
- Extend `_onClose(options)` to `unmount(this.#headerMountHandle, { outro: true })`
  and clear the handle, alongside the existing content-shell unmount and bridge
  teardown.

`_onFirstRender` runs after the frame and content both exist (`application.mjs`
lines 547–586), so `this.window.header`/`this.window.controls` are guaranteed
present.

### Category components

Each lives beside its sheet, reads `const application = getApplication()` and
`const document = getContext('document')` (the `ReactiveDocument` bridge), and
renders `<button class="header-control icon …">` entries with
`use:tooltipAction={'…desc'}`. Visibility/labels/icons are computed reactively
from `application` + `document.data`. Click handlers call the **existing** sheet
methods / document methods (no logic duplicated between dropdown and inline bar).

- `src/document/types/actor/sheet/ActorSheetHeaderButtons.svelte`
  - Order (left→right, matching the old `unshift` order): Import, Edit Token,
    link-state button.
  - `canEditToken` and `actor.pack`/`isGM` guard the buttons as in the table.
  - Link-state button is mutually exclusive on `application.token`:
    directory → Toggle Link (reactive on `prototypeToken.actorLink`, glow);
    placed + linked → Unlink (orange glow); placed + unlinked → Unlinked
    (disabled, brown glow, tooltip-wrapped). The placed branches need no live
    reactivity (unlinking is irreversible and closes/reopens the sheet); the
    directory branch reacts to `prototypeToken.actorLink` via the bridge.
- `src/document/types/item/sheet/ItemSheetHeaderButtons.svelte`
  - Send to Chat (`item.sendToChat()`), then Import (`if (item.pack)`).
- `src/document/types/active-effect/sheet/ActiveEffectSheetHeaderButtons.svelte`
  - Send to Chat only (`effect.sendToChat()` — the method the Effect HUD already
    uses).

### Subclass wiring

- `TitanActorSheet._getHeaderButtonsComponent()` → `ActorSheetHeaderButtons`.
- `TitanItemSheet._getHeaderButtonsComponent()` → `ItemSheetHeaderButtons`.
- `TitanActiveEffectSheet._getHeaderButtonsComponent()` →
  `ActiveEffectSheetHeaderButtons`, **and** a new `_getHeaderControls()` override
  adding a Send-to-Chat entry (coexistence — the effect sheet currently has no
  TITAN dropdown entries).

`TitanActorSheet` and `TitanItemSheet` already have `_getHeaderControls()`
overrides; they are left untouched (coexistence).

### Localization

Add two rich-HTML keys to `lang/en.json`, matching the existing `.desc.text`
style:

- `sendItemToChat.desc.text` — e.g. "<p>Display this <strong>Item</strong> in
  chat.</p>"
- `sendEffectToChat.desc.text` — e.g. "<p>Display this <strong>Effect</strong> in
  chat.</p>"

Per the project's tooltip contract (`conventions.md`), `tooltipAction` keys are
raw i18n keys resolved by `processTextData` — pass the key, not pre-localized
text.

### Styling

A scoped SCSS block per component (no `:global`) restores the `.linked`
(`darkorange`) / `.unlinked` (`brown`) glow and the disabled
`cursor: not-allowed` wrapper. Buttons reuse the native `.header-control icon`
classes so they inherit Foundry's header button sizing/hover.

## Data flow

1. Sheet opens → `_renderFrame` builds `.window-header` (first render only) →
   `_replaceHTML` mounts the content shell → `_onFirstRender` mounts the header
   buttons component into `.window-header` before the ⋮.
2. The header tree reads live state through the shared `ReactiveDocument` bridge;
   a token-link change on a directory actor re-derives the bridge and the Toggle
   Link button updates its icon/tooltip/glow with no `render()` call.
3. A click calls the existing sheet/document method (e.g. `_onEditToken`,
   `item.sendToChat`, `effect.sendToChat`).
4. Sheet closes → `_onClose` unmounts the header tree (and the content shell) and
   destroys the bridge.

## Testing

- **E2E** (`tests/e2e/header-buttons.spec.js`, new — sibling to the existing
  `header-controls.spec.js` which stays green):
  - Player actor (directory): Edit Token + Toggle Link buttons are visible in
    `.window-header` **without** opening the ⋮; toggling `prototypeToken.actorLink`
    flips the Toggle Link button's state.
  - Weapon item: Send to Chat button visible inline; clicking posts a chat
    message.
  - `effect`-subtype ActiveEffect: Send to Chat button visible inline; clicking
    posts a chat message.
- **Existing** `header-controls.spec.js` (dropdown) remains unchanged and passing
  (coexistence).
- **Skill update:** revise the `conventions.md` "AppV2 header controls" note —
  it currently states inline buttons "would require `_getFrameButtons`"; document
  the Svelte-header-mount pattern (`_onFirstRender` → `mount()` into
  `this.window.header` anchored at `this.window.controls`, unmount in `_onClose`).

## Files

**New**
- `src/document/types/actor/sheet/ActorSheetHeaderButtons.svelte`
- `src/document/types/item/sheet/ItemSheetHeaderButtons.svelte`
- `src/document/types/active-effect/sheet/ActiveEffectSheetHeaderButtons.svelte`
- `tests/e2e/header-buttons.spec.js`

**Modified**
- `src/document/sheet/TitanDocumentSheet.js` (header mount machinery,
  `_onFirstRender`, `_onClose`, `_getHeaderButtonsComponent`)
- `src/document/types/actor/sheet/TitanActorSheet.js` (`_getHeaderButtonsComponent`)
- `src/document/types/item/sheet/TitanItemSheet.js` (`_getHeaderButtonsComponent`)
- `src/document/types/active-effect/sheet/TitanActiveEffectSheet.js`
  (`_getHeaderButtonsComponent`, new `_getHeaderControls`)
- `lang/en.json` (`sendItemToChat.desc`, `sendEffectToChat.desc`)
- `.claude/skills/titan-codebase/references/conventions.md` (header pattern note)
- `docs/TODO.md` (mark §7 complete; note effect-sheet Send-to-Chat addition)

## Delegation

Per `.claude/CLAUDE.md`, all `.js` / `.svelte` / `.svelte.js` work routes to the
`titan-svelte-dev` subagent with the `svelte-5`, `foundry-vtt`, and
`foundry-svelte` skills loaded.

## Risks

- **Header mount lifecycle:** if a future change makes the frame re-render on
  non-first renders, the header tree would be orphaned. Mitigated by mounting in
  `_onFirstRender` (frame-creation-symmetric) and verified against the current
  v14 `_render` flow.
- **Bridge reactivity for prototype-token link:** relies on the existing bridge
  re-deriving on `updateActor`; this is the same dependency the old
  `ActorSheetToggleLinkedTokenButton` had and is exercised by the E2E toggle case.
