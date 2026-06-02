# Native Effect HUD — design (backlog #3)

**Date:** 2026-06-02
**Status:** Approved — ready to plan
**Backlog item:** `docs/TODO.md` #3 ("Native visual-active-effects-style panel")
**Reference module:** Zhell's `visual-active-effects` — https://git.gay/Zhell/visual-active-effects

## Problem

TITAN currently depends on the third-party `visual-active-effects` (VAE) module to
give players an always-on, screen-level readout of the effects on the character
they are playing. The conversion spec keeps this alive by stamping
`flags['visual-active-effects'].data.content` (the enriched description) onto every
effect and condition. We want to **own this experience natively** — a screen-level
HUD that lists the active actor's effects and conditions with their descriptions,
independent of whether any sheet is open — and then **drop the VAE flag coupling**.

The character **sheet** already renders effects with descriptions in its Effects
tab (`CharacterSheetEffect.svelte`); that is not the gap. The gap is the
persistent, screen-docked HUD that VAE provides. This spec covers **only** that
HUD.

### Current state (verified)

- **VAE flag is stamped in two places.**
  - `TitanActiveEffect.js` `_preCreate` (≈L66–73) seeds
    `flags['visual-active-effects'].data.content = await this._enrichDescription(this.description)`;
    `_preUpdate` (≈L99–106) re-syncs it when `description` changes (effect subtype only).
  - `Conditions.js` (≈L227–233) sets `flags['visual-active-effects.data.content']`
    to the localized condition description alongside `flags.titan`.
- **No screen-level HUD exists.** Effects are only surfaced inside the sheet
  (`CharacterSheetEffectsTab` → `CharacterSheetEffectList` → `CharacterSheetEffect`).
  Conditions are not surfaced on any in-system panel today (only the token HUD /
  status icons).
- **Reusable leaf components** (all read `getContext('document')` = the actor's
  reactive bridge, and an `effect` / `effectId`):
  - `RichText.svelte` — renders the effect `description` (HTML).
  - `DurationTag.svelte` — duration badge from `{ type, remaining }`.
  - `CharacterSheetEffectChecks.svelte` / `CharacterSheetEffectCheck.svelte` —
    render and **roll** an effect's embedded checks via
    `document.data.system.requestItemCheck({ itemRollData, checkIdx })`, gated by
    `document.data.isOwner`.
  - `DocumentOwnerIconButton.svelte` — owner-gated icon button.
  - Delete path: `actor.system.requestEffectDeletion(effectId)` (honors the
    `confirmDeletingEffects` setting from backlog #5).
  - Send-to-chat path: `effect.sendToChat()`.
- **Reactive-bridge + mount pattern** (the reuse hinge):
  - `ReactiveDocument` (`src/document/reactive/ReactiveDocument.svelte.js`) wraps a
    Foundry document and exposes reactive `.data` (`.data.system`, `.data.effects`,
    `.data.isOwner`) plus a store shim.
  - `OnRenderChatMessageHTML.js` shows the blessed non-sheet mount:
    `const bridge = new ReactiveDocument(doc); const handle = mount(Shell, { target, props: { documentStore: bridge } });`
    and stores `{ handle, bridge }` for `unmount(handle)` on teardown. The shell
    does `setContext('document', documentStore)`, after which every descendant
    reads `getContext('document')`.
- **Settings helpers** live under `src/helpers/Settings/` (one helper module per
  client setting, e.g. `DarkModeChatMessages.js`, `AutoSpendResolveChecks.js`,
  `ConfirmDeletingEffects` per #5).

## Requirements (approved)

1. A **screen-level HUD**, docked bottom-right above the players list, visible
   regardless of open sheets, tracking the user's *active actor*.
2. **Active-actor resolution.**
   - **Players** (first match wins): a **selected** token whose actor is the
     **assigned** character → a **selected** token the user **owns** → an **owned**
     token whose actor is the **assigned** character → any **owned** token →
     the **assigned** character (`game.user.character`, even with no token on scene).
   - **GMs:** the **first selected** token; nothing if none selected.
   - *selected* = `canvas.tokens.controlled`; *owned* = a token whose
     `actor.isOwner`; *assigned* = `game.user.character`.
3. **Layout C (collapsible cards).** Expanded: per-effect cards (icon, name,
   duration; click a row to reveal description + embedded-check buttons +
   controls). A header collapse toggle switches the whole panel to an **icon-only
   grid**. Hidden entirely when no actor resolves **or** the actor has zero
   effects and zero conditions.
4. **Two grouped sections:** **Conditions** (`type === 'condition'`) and
   **Effects** (`type === 'effect'`), each with a subheader, conditions first.
5. **Per-card controls (owner-gated):** **Send-to-chat** and **Delete** (delete
   honors `confirmDeletingEffects`). No in-HUD enable/disable toggle or edit
   button. **Embedded checks are rollable** from the card.
6. **Client setting** `enableEffectHud` (default **on**) with an `effectHudEnabled()`
   helper; toggling it mounts/unmounts the HUD live.
7. **Drop the VAE flag.** Remove the flag stamping in `TitanActiveEffect`
   (`_preCreate`, `_preUpdate`) and `Conditions.js`, and retire `_enrichDescription`
   if it has no remaining caller. The native `description` field is unchanged and
   continues to render via `RichText` (which enriches at display time).

### Out of scope

- Persisting collapse state across sessions (in-memory per session is enough).
- Re-styling or replacing the sheet Effects tab.
- Migrating already-applied effects (they keep their stale VAE flag harmlessly;
  nothing reads it once VAE is uninstalled).

## Decision — Approach: singleton controller + direct Svelte mount

A lightweight singleton **controller** that mounts the Svelte HUD into a
fixed-position node, mirroring `OnRenderChatMessageHTML`.

**Alternatives considered and rejected:**
- *Frameless ApplicationV2* — drags in window lifecycle/positioning machinery the
  HUD does not need; fixed-position direct mount is simpler and already idiomatic
  for non-sheet mounts (the chat-message hook).
- *Sidebar tab (`AbstractSidebarTab`)* — wrong UX (the Effect **Tray**, backlog
  #2, already owns the sidebar) and not screen-docked.

**Why fixed-position over inserting into a Foundry DOM anchor:** a
`position: fixed` container appended to `#interface` (bottom-right, above the
players element via CSS) avoids coupling to Foundry's internal v14 layout
structure, which changed across v13/v14.

## Architecture

```
ready hook
   └── TitanEffectHud (singleton controller)  src/ui/effect-hud/TitanEffectHud.js
        • creates <div id="titan-effect-hud"> in #interface (fixed, bottom-right)
        • registers hooks: controlToken, updateUser, canvasReady
        • resolveActiveActor()  ─ uses pure resolveHudActor()
        • on active-actor change → unmount old tree, build new ReactiveDocument
          bridge, mount EffectHudShell with { documentStore: bridge, hudState }
        • holds EffectHudState (collapse flag survives remounts within session)
        • on setting toggle / no-actor → unmount

EffectHudShell.svelte   (sets context 'document' = documentStore; renders EffectHud)
   └── EffectHud.svelte               root: render nothing if no effects+conditions;
        │                              header (actor name · count · collapse toggle)
        ├── EffectHudSection (Conditions)   ── icon-only grid when hudState.collapsed
        └── EffectHudSection (Effects)
             └── EffectHudRow.svelte   icon + name + DurationTag; click → expand:
                  • RichText (description)
                  • CharacterSheetEffectChecks (reused — rolls embedded checks)
                  • Send-to-chat (IconButton) + Delete (DocumentOwnerIconButton)
```

### Component / file inventory

| File | Purpose |
|---|---|
| `src/ui/effect-hud/TitanEffectHud.js` | Singleton controller: lifecycle, hook wiring, actor resolution, bridge rebuild + (un)mount. |
| `src/ui/effect-hud/ResolveHudActor.js` | **Pure** `resolveHudActor({ isGM, selected, ownedTokens, assigned })` → `Actor \| null` (`selected` = `canvas.tokens.controlled`; `ownedTokens` = scene tokens whose `actor.isOwner`; `assigned` = `game.user.character`). Unit-testable in isolation. |
| `src/ui/effect-hud/EffectHudState.svelte.js` | Reactive state: `{ collapsed }` (+ helpers). Owned by the controller so it survives remounts. |
| `src/ui/effect-hud/EffectHudShell.svelte` | Receives `{ documentStore, hudState }`; `setContext('document', documentStore)`; renders `EffectHud`. |
| `src/ui/effect-hud/EffectHud.svelte` | Root: derives condition/effect lists from `document.data.effects`; renders header + sections; renders nothing when both lists empty. |
| `src/ui/effect-hud/EffectHudSection.svelte` | Titled group; renders `EffectHudRow` per effect, or an icon grid when collapsed. |
| `src/ui/effect-hud/EffectHudRow.svelte` | Compact row; inline expand to description + checks + controls. |
| `src/ui/effect-hud/EffectHud.scss` (or component `<style>`) | Panel/flex/tag-mixin styling; fixed-dock container rules. |
| `src/helpers/Settings/EnableEffectHud.js` | `effectHudEnabled()` reader. |
| Setting registration site (where other client settings register) | Register `enableEffectHud` (client, boolean, default true) with an `onChange` that calls `TitanEffectHud.refresh()`. |

### Reactivity

- **Which actor** is tracked is the controller's job. It re-resolves on:
  `controlToken` (selection change), `updateUser` (current user's `character`
  reassignment), `canvasReady` (scene switch / selection reset). On a change of
  resolved actor, it unmounts the current tree and remounts with a fresh bridge.
- **Within one actor**, effect create/update/delete and combat duration ticks flow
  through the `ReactiveDocument` bridge automatically (the same mechanism that
  keeps an open sheet in sync) — no extra effect/combat hooks required in the
  controller.
- **Setting toggle** calls `TitanEffectHud.refresh()` → mount or unmount.

### Owner-gating & permissions

The HUD only ever resolves an actor the user owns (player ladder) or any actor
(GM). Delete / send-to-chat / roll are therefore always owner operations;
`DocumentOwnerIconButton` and the check buttons' `disabled={!document.data.isOwner}`
provide defense in depth. No `SocketManager` routing is needed.

## VAE flag removal

- `TitanActiveEffect.js`: delete the `flags['visual-active-effects']` writes in
  `_preCreate` and `_preUpdate`. If `_enrichDescription` becomes unreferenced,
  delete it; otherwise leave it.
- `Conditions.js`: drop the `'visual-active-effects.data.content'` key from the
  condition `flags` object; keep `flags.titan`.
- Grep the repo for any other `visual-active-effects` reader before removal; remove
  the dead module dependency note if one exists.

## Testing

**Unit (`tests/unit/ResolveHudActor.test.js`)** — the highest-value coverage; the
resolver is pure:
- Player branches: selected+assigned; selected+owned (not assigned); owned+assigned
  (not selected); owned-only; assigned-only (no token); none → `null`.
- "First" tie-breaking when multiple tokens qualify.
- GM: first selected; none selected → `null`.

**E2E (`tests/e2e/effect-hud.spec.js`)** — requires the world launched (user):
- HUD renders for the assigned character; Conditions and Effects appear in their
  separate sections; panel hidden when the actor has neither.
- Expanding a row reveals the description.
- Rolling an embedded check from a card posts a chat message.
- Delete honors `confirmDeletingEffects` (on → dialog mounts, effect persists until
  confirm; off → immediate removal).
- Send-to-chat posts a message.
- Selecting a different owned token swaps the tracked actor.
- Turning `enableEffectHud` off unmounts the HUD; on remounts it.

## Risks

- **Fixed-dock z-index / overlap** with the players list or other modules — tune
  the container CSS (z-index below dialogs, offset above `#players`).
- **Bridge swap churn** on rapid selection changes — debounce
  `resolveActiveActor()` if `controlToken` fires in bursts.
- **`RichText` enrichment at display** must match what the flag previously
  pre-enriched (secrets, inline rolls); verify enriched parity on a known effect.
```
