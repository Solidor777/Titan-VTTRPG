# Conventions & Non-Obvious Facts

> Descriptive only. For the authoritative style/formatting/documentation rules, see
> `.claude/CLAUDE.md` (summarized at the bottom of this file).

## Import maps

There are no TyphonJS runtime imports in `src/` — the v14 migration removed
`@typhonjs-fvtt/runtime`, `@typhonjs-fvtt/standard`, `@typhonjs-fvtt/svelte-standard`, and the
`#runtime/*` / `#standard/*` subpath maps entirely. (The `@typhonjs-config/*` and
`@typhonjs-fvtt/eslint-config-*` packages remain in `devDependencies` as ESLint tooling only.)

Svelte and Foundry are used directly:

```js
import { mount, unmount } from 'svelte';
import { getContext, setContext } from 'svelte';
import { createSubscriber } from 'svelte/reactivity';
import { slide, fade } from 'svelte/transition';

const { DocumentSheetV2, ApplicationV2 } = foundry.applications.api;
```

The `~/` path alias (configured in `vite.config.mjs` as a Vite `resolve.alias` pointing at `src/`)
**is** used everywhere for intra-project imports; `$fonts/` aliases the repo `fonts/` directory:

```js
import assert from '~/helpers/utility-functions/Assert.js';
import localize from '~/helpers/utility-functions/Localize.js';
```

## Application & reactivity patterns

**`DocumentSheetV2` mount lifecycle** — `TitanDocumentSheet` (`src/document/sheet/TitanDocumentSheet.js`)
extends `foundry.applications.api.DocumentSheetV2`. It mounts the Svelte tree with Svelte 5's
`mount()` (from `'svelte'`) inside `_replaceHTML()` **on first render only** (`options.isFirstRender`)
and tears it down with `unmount(handle, { outro: true })` in `_onClose()`. `_renderHTML()` returns
`{}`. The per-type subclass supplies the inner shell component via `this.options.svelte.props.shell` (a plain
ApplicationV2 options object — the `svelte` key is a naming holdover, not TyphonJS middleware).
`TitanDialog` (`src/helpers/dialogs/Dialog.js`) follows the same lifecycle on a bare
`foundry.applications.api.ApplicationV2`, mounting `options.content.class` with `options.content.props`.
Its constructor hardcodes element classes `['titan', 'titan-dialog']`; any
per-type CSS classes must be passed as `classes: [...]` in the `super({...})` options object (the
v14 `TitanDialog` never calls `_getDialogClasses()` — that leftover de-TyphonJS override is dead).
`AddCustomTraitDialog` and `EditCustomTraitDialog` both use the correct `classes:` pattern. The stable
per-type window identifier is the element **id** prefix `titan-<type>-check-dialog-<actorId>` (base
ctor suffixes a generated UUID).

**`ReactiveDocument` bridge** — `src/document/reactive/ReactiveDocument.svelte.js` is the
Foundry↔Svelte-5 reactivity bridge (it replaces TyphonJS `TJSDocument`). It wraps the live document;
its `.data` getter calls a `createSubscriber()` (from `'svelte/reactivity'`) subscriber and returns
the **live document**, so reading `document.data.system.x` inside a component or `$derived` re-runs
when the document changes. The subscriber registers `update<DocumentName>` plus embedded
`create/update/deleteItem` and `create/update/deleteActiveEffect` hooks and tears them down
automatically when the last reactive reader unsubscribes (on unmount). Because `.data` is the live
document, reads (`.data.system.x`), writes (`.data.update(...)`), collections (`.data.items`), and
methods all go through the same accessor.

**Always read displayed document values through a bridge's `document.data`, never off a raw prop** —
Svelte 5's fine-grained reactivity only tracks reads that go through the `.data` accessor of a
`ReactiveDocument` / `EmbeddedDocument` bridge. Reading a value directly off a passed Document prop
(e.g. `effect.system.isActive`) is **not** tracked and will never re-render when the underlying data
changes. Inside a provider-wrapped row subtree, the nearest `'document'` context IS the embedded
document, so the read is a plain optional-chained derived:

```svelte
// WRONG — not reactive; the toggle will not update when the effect is toggled
const isActive = effect.system.isActive;

// CORRECT — reads through the embedded bridge; re-evaluates on every document change
const isActive = $derived(document.data?.system.isActive ?? false);
```

The `?.` guards the mid-frame window where the embedded document has been deleted but the row has not
yet unmounted (the bridge re-resolves by id and returns `undefined`).

**Never make a `$derived` whose VALUE is a live document object** — a document reference is stable
across `update()`, so the derived's new value is `===` its previous value, Svelte's equality check
trips, and downstream `.system.x` reads stay stale even though the leaf data changed. Always derive
leaf values (primitives, arrays) through the bridge instead, one `$derived` per displayed value.
Embedded rows never look their document up themselves — the list-level `EmbeddedDocumentProvider`
shadows `'document'` and every leaf derives through the shadowed bridge; no per-leaf
`document.data.items.get(...)` / `.effects.get(...)` lookup (or function-accessor workaround for one)
remains in `src/`.

**`EmbeddedDocumentProvider` in an `{#each}` MUST be keyed by `doc.id`** — the provider captures its target
document at init (`setContext` runs once per instance; the `EmbeddedDocument` stores the id it was
constructed with), so an unkeyed or index-keyed `{#each}` reuses a provider instance across DIFFERENT
documents on list reorder/removal and every descendant silently reads the wrong document. Key the block by
id (`{#each items as item (item.id)}`) so a new id mounts a new provider.
`EmbeddedDocumentProvider.svelte`'s own comment points to this rule. Four list-level wrap sites exist —
`CharacterSheetMultiItemList`, `CharacterSheetItemList`, `CharacterSheetEffectList`, and
`EffectHudSection` — each keyed by the document id. Chat cards need NO provider: the
chat-message bridge already exposes the snapshot at `document.data.system.*` (path parity), so shared
components such as `AttackTags` render unchanged under `ChatMessageContent`'s `'document'` context — and
snapshot semantics are deliberate (the card never mutates with the source document).

**Row two-way INPUTS to an embedded-document leaf use a function binding, never
`bind:value={<prop>.system.x}`** — a `$derived` is read-only, so you cannot `bind:value` to the reactive
display read. For a row input that edits an embedded document, use a Svelte 5 **function binding**
(≥5.9.0) whose getter reads the provider-shadowed bridge and whose setter commits through the bridge's
non-subscribing `.doc` handle:
`bind:value={() => document.data?.system.<leaf> ?? <fallback>, (v) => document.doc?.update({ system: { <leaf>: v } })}`.
Binding straight to a passed prop (`bind:value={effect.system.duration.remaining}`) is the input twin of
the display-read bug: the read is non-reactive (stale until remount) and, on `IntegerIncrementInput`, the
+/- buttons never persist (they mutate the prop but never fire `onchange`). The function binding fixes both
— the setter commits on typing AND the buttons. The `?? <fallback>` guards the mid-deletion transient where
the read is `undefined` (`NumberInput` would throw at `value.toString()`). Used by
`CharacterSheetEffect.svelte` (duration remaining + initiative) and `CharacterSheetCommodity.svelte`
(quantity). NOTE: `bind:value={document.data.system.x}` on a document's OWN sheet is already reactive and
does NOT need this — only embedded-row inputs do.

**Trait-sidebar index iteration must be numeric** — All three trait-sidebar `$derived.by` loops
(`ItemSheetSidebarTraits`, `ArmorSheetSidebarTraits`, `ShieldSheetSidebarTraits`) iterate with a
numeric `for (let idx = 0; idx < arr.length; idx++)` loop. Using `for...in` over an array yields
string keys (`"0"`, `"1"`, …), and any `const [idx]` destructuring then takes only the first
*character* of that string key — so `idx` remains a string. Downstream strict comparisons
(`idx === traitIdx`, `idx !== traitIdx`) are number-vs-string and never match, breaking edit and
delete. Never use `for...in` (or destructuring into `[idx]`) when a numeric index is required for
later comparison.

**Never mutate a live `document.system.*` array in place before `update()`** — pushing/splicing the
live array (e.g. `this.system.customTrait.push(x); this.update({ system: { customTrait: ... } })`)
defeats `ReactiveDocument` change-detection: the document persists but dependent `$derived`/sheets do
not re-render. Always build a fresh array and pass that to `update()` (e.g.
`this.update({ system: { customTrait: [...this.system.customTrait, x] } })`). This bug was fixed
across the custom-trait add/edit/delete paths on items and effects; the same antipattern still exists
in `TitanActiveEffect`'s inline-`check` add/delete paths and in `RulesElementMixin` add/delete.

**Chat components never mutate the live DataModel** — chat-card update handlers build their payload from
`document.data.system.toObject()` (source ≡ prepared for the check chat DMs — they derive nothing over
`parameters`/`results`), mutate the clone, then `document.data.update(...)`. Display `$derived`s stay on
the live model; only update handlers clone. Exemplar: `OnGetChatLogEntryContext.js`. Known accepted
limitation: two rapid clicks on DIFFERENT targets within one update round-trip are last-write-wins — the
second silently reverts the first (see `docs/POST_WORK_FINDINGS.md`).

**Context access convention** — `DocumentSheetShell.svelte` sets four context keys at mount: the
`ReactiveDocument` bridge under `'document'`, the UI-state store under `'applicationState'`, the SAME
top-level bridge again under `'sheetDocument'`, and the check-rolling actor bridge under `'rollActor'`.
`'document'` is always the NEAREST document — `EmbeddedDocumentProvider` shadows it for embedded subtrees
— while `'sheetDocument'` always points at the owning sheet's top-level bridge and is never shadowed (the
escape hatch for actor-coupled reads inside an embedded subtree). `'rollActor'` (resolved once by
`src/document/reactive/ResolveRollActor.js`) is the actor that performs checks for the sheet: the actor
itself on an actor sheet; an owned item's parent character actor on an item sheet, but only when the
current user owns it (`item.isOwner` already means "owns the actor or is GM"); otherwise `undefined`. A
present `'rollActor'` is the single gate for showing a roll button on an item sheet. Resolution mechanics
live in data-flow.md, "Embedded-document contexts". Every descendant reads:

```svelte
import { getContext } from 'svelte';
const document = getContext('document');          // nearest document bridge (may be an EmbeddedDocument)
const appState = getContext('applicationState');  // writable store
```

then accesses reactive data via `document.data.system.*`. There is no `$document` store
auto-subscription — that syntax was swept out across all of `src/`. `applicationState` is still a
Svelte `writable()` store (factory functions such as `createCharacterSheetState`), consumed with
`$appState` / `.update()`.

**Embedded-row idioms (the sheet-wide end state)** — inside a provider-wrapped row subtree, `'document'`
IS the embedded document, and components take no document props. The settled idioms:

- **Display reads** are optional-chained deriveds through the nearest bridge:
  `$derived(document.data?.system.x)` (the `?.` guards the mid-frame deletion window).
- **Ids**: reactive contexts read `document.data?._id`; an init-time one-shot capture (e.g. a
  check-options builder run inside a handler) may use `document.doc._id`.
- **Handler-time document METHOD calls** go through the non-subscribing handle:
  `document.doc?.sendToChat()`, `document.doc?.sheet.render(true)`, `document.doc?.update(...)`.
- **Actor method calls and actor-derived state** go through `'sheetDocument'`, e.g.
  `sheetDocument.data.system.requestItemDeletion(document.data?._id)` or
  `sheetDocument.data.system.getItemCheckParameters(...)`.
- **Condensed check roll** goes through `'rollActor'`, NOT `'sheetDocument'`: the shared
  `document/svelte-components/check/Condensed{Item,Attack,Casting}CheckButton.svelte` resolve params and
  roll via `rollActor.data.system.{getItemCheckParameters,request*Check}({ itemId, checkIdx|attackIdx })`,
  taking the item id from `'document'` and an optional `idx` prop (default 0). The SAME buttons serve the
  character-sheet item rows and the item-sheet sidebars/settings; on the character sheet `'rollActor'`
  resolves to the sheet's own actor, so behavior there is unchanged. `SidebarCheck.svelte` takes an
  optional `rollButton` snippet that replaces its static attribute/skill/DC info line; the three item-sheet
  sidebars (`ItemSheetSidebarCheck`, `WeaponSheetSidebarAttacks`, `SpellSheetSidebarCastingCheck`) and the
  three settings panels (`ItemSheetCheckSettings`, `WeaponSheetAttackSettings`, `SpellSheetCastingCheckTab`)
  render the matching button only when `'rollActor'` is present.
- **Owner gates** read the NEAREST `'document'` with `?.` (`disabled={!document.data?.isOwner}`) —
  the shared leaves `RichText` and `DocumentOwner*Button` do exactly this, so they work under a sheet,
  a provider, or a chat bridge.
- **List-script logic** (sort/filter/drag payloads) stays on the actor bridge in the list component,
  above the providers.

**`applicationState` writes must be ROOTED at `$appState`** — the compiler only emits a store `.set()`
for assignments whose left-hand side is `$`-prefixed (`$appState.tabs.effects.filter = v`, or
`bind:value={$appState.tabs.effects.filter}`). If you instead read an INNER object out of the store and
pass it down as a prop, then mutate a member of that prop (`isExpandedMap[id] = true` where
`isExpandedMap={$appState.tabs.effects.isExpanded}`), it is a plain object mutation — **no `.set()`
fires, nothing re-renders.** This was bug #13 (the expand toggle was dead on every list tab). Fix: bind
the leaf directly against the store root, e.g. `bind:isExpanded={$appState.tabs[tabKey].isExpanded[id]}`
in the list component (pass a `tabKey` string, not the inner map). Dynamic keys on a `$appState`-rooted
path DO still compile to a store-write. The `tabKey` prop on `CharacterSheetItemList` /
`CharacterSheetMultiItemList` (and the static `tabs.effects` path in `CharacterSheetEffectList`) exist
for exactly this reason.

**Dialog data passing** — check dialogs (e.g. `AttributeCheckDialog`) construct with
`content: { class: CheckDialogShell, props: { shell, actor, checkOptions: writable(...),
checkParameters: writable(...) } }` and the shell distributes those stores to children via
`setContext`.

**Dynamic component dispatch** — `<svelte:component this={...}>` is gone (deprecated in Svelte 5
runes mode). Shells select a component class and render it with `{@const}`:

```svelte
{#if shell}
   {@const Shell = shell}
   <Shell />
{/if}
```

`ChatMessageContent.svelte` (the render path for every TITAN chat subtype — checks, item cards, reports,
effect) selects the leaf DataModel's `get component()` and renders it this way.

**Transitions** — Svelte built-ins from `'svelte/transition'` (`slide`, `fade`), e.g.
`<li transition:slide|local>`. The TyphonJS `slideFade` transition is no longer used.

**Rich text** — `ProseMirrorEditor.svelte` (`src/helpers/svelte-components/editor/`) wraps Foundry's
native `foundry.applications.elements.HTMLProseMirrorElement`; `DocumentBoundEditorInput.svelte` and
`DocumentEditorInput.svelte` delegate to it (TyphonJS `TJSProseMirror` is gone). The wrapper runs the
element in **toggled** mode (`toggled = true` by default): it shows enriched HTML with a hover-revealed
pencil edit button (owner only, via core CSS) and shows the formatting toolbar only while editing. The
two input wrappers compute `enriched` reactively with
`foundry.applications.ux.TextEditor.implementation.enrichHTML(value, { secrets: isOwner, relativeTo:
doc })` and pass `enriched` plus `documentUUID={doc.uuid}` so content links/relative UUIDs resolve.
Because the `<prose-mirror>` element is appended at runtime (`container.appendChild`) it never receives
Svelte's scoping attribute, so its fill is set with an **inline JS style** (`editor.style.flex = '1'`
only — never zero its `min-height`, which would drop Foundry's 150px floor and collapse it) over a
single fill container (`flex-column` + `align-items: stretch` + `flex: 1 1 auto` + `min-height: 0`);
scoped CSS cannot target the element and `:global` is forbidden. The two input wrappers
(`DocumentBoundEditorInput`/`DocumentEditorInput`) render `ProseMirrorEditor` as their root — they no
longer wrap it in their own `.editor` div; instead they pass `tooltip` and `notOwner={!isOwner}`, and
`ProseMirrorEditor`'s single container div carries the tooltip (`use:tooltipAction`) and the
`not-owner` class. Foundry captures the toggled element's enriched HTML once at construction and
`save()` → `_refresh()` repaints the inactive view from that snapshot, so the wrapper **rebuilds the
element when `enriched` changes while inactive** (guarded by `classList.contains('active')`) to avoid
stale rendered content; rebuilds never write `value`, so they do not loop with the persist effect.

## Drag-to-reorder lists & cross-sheet element copy

`src/helpers/svelte-components/drag-reorder/` holds the shared drag system used by the four
item-settings lists (`rulesElement`, `check`, `attack`, `customAspect`) and the character sheet's
item and effect lists:

- **`DragHandle.svelte`** — the ⋮⋮ grip (`data-drag-handle`). A row is grabbable only by its handle,
  so text selection inside settings-row inputs is never hijacked.
- **`InsertionLine.svelte`** — the drop-position bar. It is `height: 0` with an absolutely-positioned
  `::before`, so rendering it between rows does **not** shift layout (no dragover jitter).
- **`DragReorderActions.js`** — two Svelte actions plus a module-level `activeDrag` descriptor.
  `draggableRow` sets `activeDrag` (`{kind, sourceKey, index}`) on `dragstart` and writes the
  `dataTransfer` payload; `reorderDropZone` reads `activeDrag` synchronously during `dragover`
  (which `dataTransfer` payloads are **not** readable in) to gate by `kind` and tell a same-list
  reorder (`sourceKey` match → `onReorder`) from a foreign-sheet copy (`onForeignDrop`). `sourceKey`
  is `` `${document.data.uuid}:${kind}` ``. Two load-bearing requirements when wiring a new list:
  - **Every draggable `<li>` must carry `data-row-index={idx}`** with its index in the FULL
    (unfiltered) array. `computeIndex` reads that attribute (not the DOM position), so reorder/insert
    indices stay correct when the list is filtered and the DOM holds only a subset of rows.
  - **`acceptsForeign`** must be `true` on a zone that handles cross-sheet copies (the four settings
    lists) and falsy on the character item/effect zones. When falsy, foreign-source drags pass through
    untouched so Foundry's own drop handler still runs (cross-actor item/effect creation); `drop`'s
    `stopPropagation()` fires only for drops this zone actually owns. `activeDrag` is also cleared in
    `draggableRow`'s `destroy()` when its node is the drag source, so a row removed mid-drag (filter
    change) cannot leave a stale descriptor.

`animate:flip` cannot be combined with the interleaved `{#if dropIndex === idx}<InsertionLine/>{/if}`
because Svelte requires an `animate:` element to be the **only** child of its keyed `{#each}`. The
insertion line is kept; flip is dropped.

**Reorder/copy data mutators** mirror the existing `addX`/`deleteX` convention, one pair per kind:
`moveX(fromIdx, toIdx)` (uses `moveArrayEntry`, insertion-point semantics) and `insertX(element,
atIdx)` (uses `cloneElementWithNewUuid` → fresh uuid, copy semantics). Locations:
`moveRulesElement`/`insertRulesElement` on `RulesElementMixin`; `moveCheck`/`insertCheck` on
`TitanItem` (the check array is `system.check` but its mutators live on the Item, like `addCheck`);
`moveAttack`/`insertAttack` on `WeaponDataModel`; `moveCustomAspect`/`insertCustomAspect` on
`SpellDataModel`.

**Per-row UI-state lockstep:** checks, attacks, and custom aspects keep index-keyed expansion arrays
(`tabs.<kind>.isExpanded`, plus `sidebar.<kind>.isExpanded` for checks and attacks). A reorder/insert
must reorder/splice those arrays via sheet-state methods (`postMove<Kind>`/`postInsert<Kind>`),
invoked through the sheet before the `update()` re-render. These methods must be forwarded through
**every** wrapping sheet-state factory: `TitanItemSheetState` defines the check pair;
`RulesElementItemSheetState`, `WeaponSheetState`, and `SpellSheetState` each re-destructure their
parent and must re-export it, or the sheet's delegate throws `is not a function`.

**Items/effects reorder** through Foundry's `sort` field via `foundry.utils.performIntegerSort`
(the bare `SortingHelpers` global is deprecated, since 13/until 15) +
`updateEmbeddedDocuments(..., [{...update, _id: target._id}])`. The native list `drop` calls
`stopPropagation()` only for same-actor reorders, so the actor sheet's Foundry `DragDrop` still
receives genuine external drops (compendium / cross-actor item creation). Cross-sheet element drags
use a custom `{titanElementDrag, kind, sourceDocUuid, sourceIdx, element}` payload, which Foundry's
Item/Effect drop handlers ignore (no `type` field) and vice-versa.

## Schema-from-shape: presence-guarded snapshot fields

When typing a chat-message (or any) snapshot whose components use `{#if obj}` / `{#if arr}` presence
guards, the shape value fed to `buildSchemaFromShape` must preserve the "absent is falsy" semantics the
guard relies on:

- **Conditionally-present OBJECT fields → `null` in the shape.** `buildSchemaFromShape` maps `null` to a
  nullable `ObjectField` (initial `null`), so the `{#if obj}` guard stays correct. A typed non-null
  `SchemaField` would have a truthy `{...}` initial and always pass the guard — a parity break. The
  component still reads sub-fields off the opaque object (e.g. `wounds.value`, `fastHealing.total`).
- **Conditionally-present ARRAY fields → an explicit `ArrayField`, NOT a shape entry.** Foundry's
  `ObjectField` rejects arrays (`getType([]) === 'Array'`), so a `null`-in-shape `ObjectField` cannot hold
  them. Declare these as real `ArrayField`s on the leaf schema (after the `buildSchemaFromShape` spread,
  `initial: []`) and write their presence guards as `?.length` (the empty-array initial `[]` is truthy, so
  a bare `{#if arr}` would always pass). Established by Phase 3 reports (`message`/`conditions` on the turn
  reports).

## Styling

SCSS mixins are the deliberate, preferred styling mechanism — a codebase-wide refactor replaced all
`:global` selector usage with mixins, and no `:global` occurrences remain in `src/`.

**Theming model (two-tier tokens, runtime injection)** — `src/styles/Variables.scss` holds ONLY the
static structure tier (spacing, radii, border widths, font sizes). Every color and the two font-family
tokens are THEMED: `src/theme/ThemeTokenContract.js` defines the contract (~112 tokens + the fill→text
pairing list — every `…-background` fill that carries text has a paired `…-font-color`, so a theme can
never produce light-on-saturated text), the four built-in themes live in `src/theme/themes/`, and
`ThemeManager.apply()` writes one `<style id="titan-theme-style">` containing the active theme on
`:root` plus `.titan.themed.theme-light` / `.titan.themed.theme-dark` scoped blocks (the world-default
light/dark themes) so Foundry's per-sheet color-scheme option overrides individual windows. Resolution:
client `theme` setting → `auto` follows Foundry's `theme-dark`/`theme-light` body class (a
MutationObserver re-applies on change) → GM world defaults (`defaultDarkTheme`/`defaultLightTheme`) →
built-in heritage fallback. Custom themes live in the `customThemes` client setting (same data shape as
built-ins) and are managed by the theme editor (`src/theme/editor/`, opened via `registerMenu`). Theme
switching is live — no reload; settings `onChange` calls `apply()`.

**Setting localization keys are `SETTINGS.<key>.label`** (plus `.hint` and per-choice children) —
`lang/en.json` defines `label`, not `text`, for every setting; a `name: 'SETTINGS.x.text'` reference
renders as the raw key in the settings window. The settings-menu button label key is
`SETTINGS.themeEditor.button`.

**AppV2 sheets must bind their own DragDrop** — ApplicationV2 wires no drag-drop handlers;
`TitanActorSheet._onRender` creates a `foundry.applications.ux.DragDrop.implementation` (drop
permission = `isEditable`) and binds it to `this.element` every render. Without that, `_onDrop` is
dead code and sheet drops silently no-op.

**Never `bind:` a possibly-undefined value into a defaulted `$bindable` prop** — Svelte 5 throws
`props_invalid_value` at runtime. The recurring case is a per-index sheet-state read for a row the
document just gained (the state array grows AFTER the document update renders the row). Use a function
binding with the seeded default as fallback:
`bind:expanded={() => $appState...isExpanded[idx] ?? true, (v) => $appState...isExpanded[idx] = v}`
(`ItemSheetSidebarCheck`, `WeaponSheetSidebarAttacks`).

**mini-button radius derives from the tag radius token** — the `button` mixin sets
`--titan-border-radius: var(--titan-button-border-radius)`, so `mini-button` re-pointing
`--titan-button-border-radius` back at `--titan-border-radius` closes a var() cycle that invalidates
both (radius collapses to 0). It uses `--titan-tag-border-radius` instead; `Tabs.svelte` zeroes that
token inside its strip to keep tab buttons square under the clipped rounded frame.

**FontAwesome icon classes belong on an inner `<i>`, never on `<button>` directly** —
Foundry's global button styling (`Signika, …`) has higher specificity than `.fas`, so placing the FA
class on a `<button>` causes the Signika font to win and glyphs render as the notdef box. The
established pattern (used in `IconLabel` inside `Button`, and now in `EditDeleteTag.svelte`) is to put
the FA class on an inner `<i class={ICON}></i>` inside the button. The `.tag button { ... }` reset in
`EditDeleteTag.svelte` resets button chrome (appearance, background, border, margin, padding, color,
font-size, line-height, cursor) without touching `font-family` or `font-weight`; since the glyph now
lives on the `<i>` these two properties are irrelevant on the button, but must still not be reset to
`inherit` in any context where FA icon `<i>` elements are nested inside buttons.

**Tooltip / `Text` value contract (avoid double-localization)** — `TooltipAction.js` and the `Text`
component both run their value through `processTextData`, which calls `localize()` on a **bare string**
(treating it as an i18n key → `LOCAL.<value>.text`). So a tooltip/`Text` value must be EITHER a raw i18n
**key** string (e.g. `tooltip={'defense.desc'}`, `tooltip={`${rating}.desc`}`) OR a TextData object
`{ text: <already-localized-or-dynamic>, localize: false }`. The classic bug is passing
**already-localized** text as a bare string — `tooltip={localize('x')}` or
`tooltip={composedLocalizedHtml}` or a dynamic `tooltip={doc.name}` — which localizes it a second time
and renders `LOCAL.<text>.text` to the user. Fixes: drop the redundant `localize` and pass the raw key
(`tooltip={'x'}`), or wrap already-localized/dynamic/user text as `{ text, localize: false }`. Note
`label` / aria-label props are **not** routed through `processTextData`, so those stay
`label={localize('x')}`. Trait-description maps (`ATTACK_/ARMOR_/SHIELD_TRAIT_DESCRIPTIONS`) hold **keys**,
not display text. A comprehensive e2e guard, `tests/e2e/localization.spec.js`, renders every actor/item/
effect sheet and the effects sidebar and fails on any rendered text/tippy-tooltip containing `LOCAL.`;
`tests/unit/LocalizationKeys.test.js` guards `lang/en.json` values against embedded `LOCAL.` keys.

**Where mixins live:** `src/styles/Mixins/` contains per-domain files (see `architecture.md`,
`src/styles/` section, for the full mixin file list).

**`Root.scss`** (`src/styles/Root.scss`) `@forward`s all mixin files in `src/styles/Mixins/` plus
`Variables.scss`. It is auto-prepended into every Svelte component's `<style lang="scss">` block by `svelte-preprocess`
(`prependData: '@use "src/styles/Root.scss" as *;'` in `vite.config.mjs`). This means component style blocks
can call any mixin directly without an explicit `@use`, e.g.:

```scss
<style lang="scss">
.row {
   @include flex-row;
   @include panel-1;
}
</style>
```

See `architecture.md` — `src/styles/` section — for the full list of global SCSS files.

## Custom Select (combobox, not native `<select>`)

`src/helpers/svelte-components/input/select/Select.svelte` is a custom listbox, **not** a native
`<select>` — a native option popup cannot render icons or per-option styling. It is a `<button
role="combobox">` trigger that, when open, mounts `SelectList.svelte` (`role="listbox"`) **portaled to
`document.body`** via the `portalToBody` action (`src/helpers/svelte-actions/`) and positioned with
`svelte-floating-ui` (`createFloatingActions`, `offset`/`flip`/`shift`; positions once on open and
**closes on outside-click / scroll / resize**, no live reposition). Portaling escapes ApplicationV2
windows' `transform` containing block; theme `--titan-*` tokens still apply because they are injected on
`:root`.

The public contract is unchanged from the old native version — `{ options, value (primitive,
`$bindable`), disabled, tooltip, onchange, testId }` — so all ~37 wrappers (domain selects +
`Document*Select`) are untouched. `value` stays a primitive written straight to the document (no whole-item
object). Additions: `SelectOption` gains an optional `icon` (FontAwesome class, drawn left of the label in
the row and the closed control), and `Select` accepts optional `option(opt, i)` / `selection(opt)` snippets
for full per-row styling. `AttributeSelect`/`AttackTypeSelect` populate `icon` from `~/system/Icons.js`;
`AttributeSelect` also supplies an `option` snippet that tints each row by its attribute via the
`attribute-colors` mixin (the closed control is tinted by the existing `AttributeInput` wrapper).

Keyboard parity with the native element: Up/Down/Home/End, Enter/Space to commit, Esc/Tab to close,
first-letter typeahead, plus `aria-expanded`/`aria-controls`/`aria-activedescendant`. The clamp `$effect`
(reset to the first option when `value` is out of range) is preserved.

**e2e:** drive it through `tests/e2e/select.js` — `selectTitanOption(page, trigger, value)`,
`titanSelectOptionValues(page, trigger)`, `readTitanSelectValue(trigger)`. The trigger is
`[role="combobox"]`; option rows carry `data-value` and are matched **document-wide** (the list is portaled
to `<body>`, and only one list is open at a time). The trigger reflects the committed value as its own
`data-value`. Never use Playwright `selectOption` on a TITAN select (it is not a native `<select>`); the
Foundry login `select[name="userid"]` in `fixtures.js` IS native and stays on `selectOption`.

## assert()

`assert` is a standalone default export from `src/helpers/utility-functions/Assert.js`, imported with the
`~/` alias:

```js
import assert from '~/helpers/utility-functions/Assert.js';
```

It wraps `console.assert` and also fires a Foundry UI error notification (`ui.notifications.error`) prefixed
with `"TITAN | "`. It returns the boolean result so callers can use it in a guard:

```js
if (assert(someCondition, 'Error message')) { ... }
```

`game.titan` (registered during the `init` hook in `src/hooks/OnceInit.js`) exposes the full namespace
`{ macros, assert, warn, log, error, socketManager }` — so `game.titan.assert` does exist and is the same
underlying function. Throughout the codebase the convention is to prefer the locally-imported form over the
`game.titan.*` accessors (see `CLAUDE.md`).

## v14 hook names and ContextMenuEntry shape

**Directory context-menu hooks** — In v14, `DocumentDirectory._createContextMenus()` fires
`get${documentName}ContextOptions` (e.g. `getActorContextOptions`, `getItemContextOptions`). The old
v13 names (`getActorDirectoryEntryContext`, `getItemDirectoryEntryContext`) no longer fire.
Hook signature: `(application: ApplicationV2, menuItems: ContextMenuEntry[])`.

**Chat context-menu hook** — `getChatMessageContextOptions` (was `getChatLogEntryContext` in v13).
Hook signature: `(application: ApplicationV2, menuItems: ContextMenuEntry[])`.

**Journal render hooks** — `renderJournalEntrySheet` (was `renderJournalSheet`) and
`renderJournalEntryPageProseMirrorSheet` (was `renderJournalTextPageSheet`). Both follow the standard
AppV2 render hook signature: `(application, element: HTMLElement, context, options)`.

**ContextMenuEntry shape (v14)** — `{ label, icon, visible(li: HTMLElement), onClick(event, li: HTMLElement) }`.
The old v13 shape used `name`, `condition`, and `callback(entry)` (one argument); v14 renames them to
`label` / `visible` / `onClick` (passing two arguments to `onClick`). The v13 names still work via a
deprecation shim (removed in v16); TITAN's hooks use the v14 names. Directory entry `li` elements carry `li.dataset.entryId`; chat message
`li` elements carry `li.dataset.messageId` (confirmed in `document-directory.mjs` line 237 and
`chat.mjs` line 338). `li.closest('[data-entry-id]')?.dataset.entryId` is the safe accessor pattern
(same as used in `_getEntryContextOptions` at `document-directory.mjs:237`).

**AppV2 header controls (no `_getHeaderButtons`)** — v14 `ApplicationV2` has no `_getHeaderButtons`;
sheet header actions are returned from `_getHeaderControls()` (runs on every frame render). Each entry
is `{ action, icon, label, onClick?, visible?, ownership? }` (`ApplicationHeaderControlsEntry` =
`ContextMenuEntry` + `action`). Controls render **in the header controls dropdown** opened by the
ellipsis button (`button[data-action="toggleControls"]`), as `#context-menu li.context-item` rows
(icon `<i>` + label `<span>`) — NOT inline in the header (`_renderHeaderControl` is unused in v14 core.
TITAN renders always-visible inline header buttons as Svelte instead: `TitanDocumentSheet._onFirstRender`
mounts the component from `_getHeaderButtonsComponent()` into `this.window.header`, anchored at
`this.window.controls`, with a context map providing `application` + the `document` bridge; `_onClose`
unmounts it. The frame is built once on first render, so the header mount survives `render({ parts: [] })`.
See `ActorSheetHeaderButtons.svelte` / `ItemSheetHeaderButtons.svelte` /
`ActiveEffectSheetHeaderButtons.svelte`. These COEXIST with the `_getHeaderControls()` dropdown.) The
menu entry shows only icon + label (no tooltip field), and the label runs through core `_loc` (pass
already-localized text). Click dispatch: if
`onClick` is a function it is called directly; otherwise the `action` string is looked up in
`options.actions`. TITAN sheets (`TitanActorSheet`, `TitanItemSheet`) use `onClick` arrow functions
bound to the sheet instance so dynamic per-render entries (the actor link/unlink control) need no
static `actions` map. To refresh a dynamic control's icon/label after a state change, call
`this.render({ parts: [] })` (re-renders the frame without re-running the Svelte mount).

## v14 API breakpoints (confirmed against live Foundry source)

- **`CompendiumCollection` permission API** — `CompendiumCollection#getUserLevel(user = game.user)` returns a
  numeric `CONST.DOCUMENT_OWNERSHIP_LEVELS` value (NONE=0, LIMITED=1, OBSERVER=2, OWNER=3). It iterates
  `this.ownership` (merges world config override over `metadata.ownership`) and takes `Math.max` over all roles
  the user satisfies via `user.hasRole(role)` (non-exact: `user.role >= roleLevel`). A GAMEMASTER user satisfies
  PLAYER, ASSISTANT, and GAMEMASTER entries, so it naturally resolves OWNER even when the pack omits a GAMEMASTER
  key. `testUserPermission(user, permission)` short-circuits to OWNER for `user.isGM` but `getUserLevel` does not
  need that short-circuit. Source: `client/documents/collections/compendium-collection.mjs` lines 433-440 and 452-457.

- **`ChatMessage` style field** — In v14, `ChatMessage.type` is a string `DocumentTypeField` (subtype, default
  `"base"`). The numeric render style (`CONST.CHAT_MESSAGE_STYLES.*`) moved to a separate `style` NumberField.
  All four TITAN `ChatMessage.create()` call sites (`Check.js`, `TitanActiveEffect.js`,
  `CharacterDataModel._whisperOwners`, `TitanItem.js`) use `style: CONST.CHAT_MESSAGE_STYLES.OTHER`.

- **`TextEditor.enrichHTML` is always async in v14** — The `async: false` option was removed; the method is
  declared `static async` and always returns a `Promise<string>`. The canonical call pattern is
  `foundry.applications.ux.TextEditor.implementation.enrichHTML(value, { secrets: true })`. `RichText.svelte`
  populates a `$state('')` variable from a `$effect` that awaits this promise (with a cancellation guard).

- **`FilePicker` constructor** — use `new foundry.applications.apps.FilePicker.implementation({...})` (honors
  `CONFIG.ux` override); `new foundry.applications.apps.FilePicker({...})` is not the canonical v14 path.

- **AppV2 position width** — `ApplicationV2` instances have no `options.width`; the current rendered width lives
  on `application.position.width`. (`options.width` yields `undefined`, producing `NaN` in arithmetic.)

- **Status-effect icon field** — v14 `CONFIG.statusEffects` entries use `img` (not `icon`). Token HUD reads
  `status.img`; the v13 `icon` fallback was removed. All entries in `src/system/Conditions.js` use `img:`.

## Other gotchas

- **`localize()` wrapper** — All i18n calls go through `src/helpers/utility-functions/Localize.js` rather than
  calling `game.i18n.localize` directly. It automatically prepends `"LOCAL."` and appends `".text"` to the key,
  so `localize('attackCheck')` resolves to `game.i18n.localize('LOCAL.attackCheck.text')`.

- **`~/` alias vs relative paths** — The codebase uses the `~/` alias for cross-directory imports;
  relative paths (`./`, `../`) appear only within the same immediate directory.

- **Svelte context protocol** — Five keys are set into Svelte context at mount time:
  - `'document'`, `'applicationState'`, `'sheetDocument'`, and `'rollActor'` are set by
    `DocumentSheetShell.svelte` — see the **Context access convention** entry above for what each holds, the
    provider-shadowing rule, and how `'rollActor'` gates item-sheet roll buttons.
  - `'application'` (the owning `ApplicationV2` / `DocumentSheetV2` instance) is set at the `mount()` call
    site in both `TitanDocumentSheet._replaceHTML` and `TitanDialog._replaceHTML`. All components (sheet,
    dialog, and their descendants) can call `getApplication()` (`~/helpers/utility-functions/GetApplication.js`)
    which reads `getContext('application')`; it returns `undefined` when mounted without an application context
    (e.g. chat messages). The obsolete TyphonJS `getContext('#external').application` pattern has been removed.
  Read reactive data via `document.data.*` (not `$document`); context values are never passed as props down
  the tree.

- **Build output goes to `dist/`** — `vite.config.mjs` sets `build.outDir` to `path.join(__dirname, 'dist')`
  with `emptyOutDir: true`, so each build self-cleans stale chunks. Source lives in `src/`; build artifacts
  such as `index.js` land in `dist/`. See `architecture.md` for the full directory layout.
- **CSS must be emitted as `style.css`** — `system.json` (`styles: ["dist/style.css"]`) and the dev-server
  proxy both reference `dist/style.css`, so `build.lib.cssFileName` is pinned to `'style'` (producing
  `dist/style.css`). Without it the Vite 8 lib build names the CSS after `lib.fileName` (`index` →
  `index.css`), which Foundry never loads — CSS-only changes then build cleanly but silently fail to deploy
  while JS changes still apply.

## Test infrastructure

**Vitest harness** — `vitest.config.mjs` (project root) configures Vitest 2 with `happy-dom`, Svelte 5
(`@sveltejs/vite-plugin-svelte` with `hot: false`), `svelte-preprocess` (same SCSS `prependData` as
`vite.config.mjs`), and the `~/` / `$fonts/` aliases. `hookTimeout` is 60 s — the schema-equivalence
golden-master suites' `beforeAll` dynamic imports are transform-heavy (Svelte compiles) and exceed the 10 s
default under full parallelism. Tests live in `tests/unit/**/*.test.js`; there is NO test code under `src/`.

**Foundry globals mock** — `tests/setup.js` (loaded as Vitest `setupFiles`) installs:
- `globalThis.foundry = { abstract: { Document: MockDocument }, utils: { mergeObject } }` — a minimal
  `foundry.abstract.Document` stub (for `instanceof` checks) and a recursive `mergeObject` plain-object
  merge.
- `globalThis.Hooks` — a `HooksMock` instance reinstalled fresh `beforeEach` test so hook registrations
  never leak across tests. Supports `on(name, fn)`, `off(name, fn)`, and `call(name, ...args)`.

**Tooltip-bearing tags render fine under happy-dom** — components using the tippy `tooltipAction` (e.g.
`TraitTag`) mount cleanly in Vitest's happy-dom environment; unit tests can seed real trait names (whose
tags attach tippy tooltips) with no tippy or tooltip mocking required.

**`data-testid` convention** — Stable E2E selectors are wired via `testId` props on shared dialog
wrappers. `CheckDialogField` (`src/check/dialog/CheckDialogField.svelte`) forwards its `testId` prop
to the wrapper `<div class="field" data-testid={testId}>`. `CheckDialogSummary` forwards `testId` to
the inner `<div class="tag" data-testid={testId}>`. `CheckDialogBase` passes `testId={'check-dialog-roll'}` and
`testId={'check-dialog-cancel'}` to the two `Button` components. Each of the 16 concrete `CheckDialogField`
users and 2 `CheckDialogSummary` users supplies a static string literal such as `testId={'check-field-attribute'}` or
`testId={'check-summary-totalDice'}`. Playwright specs select these with `page.locator('[data-testid="..."]')`.
Essentially every base primitive in `src/helpers/svelte-components/**` now carries an optional `testId`
(`data-testid` passthrough on its root element, or forwarded to its inner primitive's root for wrappers) —
the lone exception is `Text` (no root element). See the component-probe harness entry below for the full
coverage map, the wrapper-forwarding rules, and the selector each component resolves to.

**Playwright E2E** — `npm run test:e2e` runs `playwright test` against a running Foundry world
(`playwright.config.mjs`, `baseURL: http://localhost:30000`; env `FOUNDRY_USER` / optional
`FOUNDRY_PASSWORD`). Specs live in `tests/e2e/`: `render-smoke.spec.js` (renders every document type's
sheet, asserts zero uncaught page errors), `interaction-rolls.spec.js` (each `roll<Type>Check` posts a
chat message of the expected subtype (`message.type`) and the card renders), and `interaction-dialogs.spec.js`
(check/confirm/trait/edit-UUID dialogs mount). `tests/e2e/fixtures.js` provides `login`, `renderSheet`,
and `ensureDocument` (creates missing world fixtures; `renderSheet` takes an optional 4th `errors`
collector — see the shared-world harness below). Drives the real built system at the repo root, so it
catches v14 API breaks that the mocked Vitest tier cannot.

**Shared-world E2E harness (one world boot per FILE)** — every eligible spec boots the world ONCE per
file, not per test. The pattern: module-scoped `let page; let errors;` plus three inline lifecycle hooks
at module scope — `test.beforeAll(async ({ browser }) => { page = await browser.newPage(); errors =
attachPageErrors(page); await login(page); await clearChat(page); })`, `test.afterEach(async () => { await
closeAllApps(page); errors.length = 0; })`, and `test.afterAll(async () => { await page?.close(); })`.
Tests and `beforeEach`/`afterEach` hooks are `async () =>` (no `{ page }` fixture destructure) and use the
closure `page`. The helpers live in `tests/e2e/world.js`: `closeAllApps(page)` closes transient apps
(sheets/dialogs/HUDs) but DELIBERATELY KEEPS three classes of app — (1) core UI singletons (those held on
`ui[key]` for each `key in CONFIG.ui` — `Sidebar`, `ChatLog`, `Hotbar`, the `titanEffects` tray, …);
closing them tears down DOM that the sidebar tab-switch lifecycle depends on and crashes any later
sidebar-activating test; (2) nested sub-apps OWNED by a kept singleton — any app whose `options.directory`
is in the keep-set (the v14 `PlaceableDirectory` caches per-type `PlaceableTab` apps constructed with
`{ directory: ui.placeables }`; closing one detaches the element its owner re-queries on every later
render, so each subsequent token create/delete crashes `PlaceableDirectory#_renderTab` with a
`null.replaceWith` TypeError); and (3) the canvas HUD container (`canvas.hud`, element id `hud` — NOT in
`CONFIG.ui`): it renders only during canvas draw, and `BasePlaceableHUD#_insertElement` and `ChatBubbles`
re-query its DOM with no null guard, so closing it crashes the first later test that opens a token HUD or
emits a chat bubble.
`clearChat(page)` deletes all chat messages in `beforeAll` (per-file world reset — keeps the world lean so
GM→player socket replication does not time out). `attachPageErrors(page)` wires ONE `pageerror` listener
and returns the shared `errors` array; per-test `page.on('pageerror', …)` is banned (it would stack on the
reused page) — fold any per-test error assertion onto the shared `errors`, which is reset each `afterEach`.
**Not migrated** (self-managed `BrowserContext`s via `multiClient.js`): `multi-client.spec.js`,
`socket-sync.spec.js`, `permissions-compendium.spec.js`, `permissions-ownership.spec.js`,
`permissions-auto-open.spec.js`. Fast-check (`injectFastCheck` → `page.addInitScript`) must run in
`beforeAll` BEFORE `login` (init scripts must precede navigation). A spec needing pristine per-test boots
opts out by keeping `beforeEach(login)`.

**No fixed sleeps in E2E (banned)** — never settle with a fixed-duration `await page.waitForTimeout(n)`
or an in-page `await new Promise(r => setTimeout(r, n))`; they are slow and flaky. Wait on a deterministic
condition instead. Three patterns: (1) **delete** a sleep that precedes an auto-retrying Playwright
web-first assertion (`expect(locator).toHaveText/.toHaveCount/.toBeVisible/.toHaveValue/...`) or an
auto-waiting action (`.click()`/`.fill()`) — the assertion/action already polls; (2) before a
**non-retrying read** (`await page.evaluate(...)`, `locator.textContent()/.inputValue()/.count()/
.getAttribute()/.allTextContents()`), use `await expect.poll(() => <sameRead>, { message }).toBe(<value>)`
(guard the poll body so it returns a sentinel rather than throwing on early iterations); (3) inside a
`page.evaluate`, use `await titanWait(syncPredicate, { message })` — `globalThis.titanWait`
(`tests/e2e/poll.js`), installed by `login()` via `installPoll`/`addInitScript` before navigation, polls a
synchronous predicate (50 ms interval, 5 s default timeout). The ONLY allowed bounded wait is a **negative
assertion** (assert-absence) that has no pollable positive edge — pair it with a positive `waitForFunction`
signal and document it inline (see `permissions-auto-open.spec.js`). Condition-polling
`setInterval` canvas-readiness loops (`effect-tray.spec.js`) are NOT fixed sleeps and are fine.

**`createEmbeddedDocuments` return order is NOT input order.** Never map the returned array by index
to your payloads — resolve created ids by NAME afterward (`actor.items.getName(payload.name)?.id`),
as the player-hud specs' `seedDocuments` helpers do. Index-mapping produced wrong-id assertions that
only failed in multi-payload creates.

**One-shot `boundingBox()` snapshots race layout settling.** Element sizes bound via
`bind:clientWidth/Height` update through ResizeObserver a frame after remounts; geometry assertions
must `expect.poll` re-reading boxes (see `expectBoxes` in `player-hud-action-menu-layout.spec.js`).

**Foundry core Escape releases token control.** Any canvas-overlay UI that closes on Escape must
consume the event in the WINDOW CAPTURE phase (`onkeydowncapture` + `stopImmediatePropagation`),
or core deselects the token and selection-driven UI unmounts mid-interaction (the player HUD's
cascade and effect popout both do this).

**The action menu's open category persists across e2e tests.** `openCategory` lives in the shared
layout state and `afterEach` only closes apps, so a cascade left open by one test survives into the
next. A test that clicks the SAME category the previous test left open TOGGLES it closed; dismiss any
open flyout first (`Escape` when `player-hud-flyout` is present), as the `openCategory` helper in
`player-hud-action-menu-layout.spec.js` does.

**Mid-file `page.reload()` idiom** (first used in `tests/e2e/pack-conversion.spec.js`): `page.on('console')` and
`attachPageErrors` listeners survive reloads (they attach to the Page object). Sequence: (1) PROVE the first
boot's converter/async ready-work finished via a positive console-line poll BEFORE clearing the capture buffer
(`game.ready` is set before the un-awaited ready hooks finish, so login resolving proves nothing about them);
(2) clear the buffer; (3) `await page.reload()`; (4) `await page.waitForURL('**/game', { timeout: 15_000 })` so a
lost session fails crisply; (5) `waitForFunction(() => globalThis.game?.ready === true && ..., null,
{ timeout: 60_000 })` — note the THREE-positional form (`fn, arg, options`); the two-argument form silently binds
options as `arg`; (6) poll the positive completion signal again before any absence assertion. Budget the test via
`test.setTimeout(120_000)` (a full reboot inside one test exceeds the 60s default under the throttled runner).

**E2E leak probe for chat-card mounts** — `Hooks.events.updateChatMessage?.length` deltas count live
chat-card mounts (`Hooks.events` is public Foundry API; each mounted card's `ReactiveDocument` bridge holds
exactly one `updateChatMessage` registration while mounted).

**E2E sidebar / chat-notification gotchas** — the world boots with the sidebar COLLAPSED, and programmatic
`ui.sidebar.changeTab(...)` never expands it (only the user-click path does), so Playwright clicks on chat
cards need `ui.sidebar.expand()` first or fail "outside of the viewport". Notification-pane tests must
raise `ChatLog.NOTIFY_DURATION` (stash/restore; it is read live each ticker tick) because
`#rerenderMessage` carries `_lifeSpan` over to replacement elements — the 5 s auto-dismiss clock is NOT
reset by updates. Notification posting requires `core.uiConfig.chatNotifications === 'cards'` AND (a
collapsed sidebar with sufficient viewport width, or the chat tab not visible) — a RENDERED popout
suppresses posting entirely.

**E2E helpers must not blind-toggle expanders** — verify a row's mount default before clicking its
expand/collapse toggle: weapon-sheet sidebar attacks mount EXPANDED (`WeaponSheetData` seeds `isExpanded`
true per existing attack), and item-sheet sidebar checks likewise mount EXPANDED (`TitanItemSheetData`
pushes `true` per existing check, for both `sidebar.checks` and `tabs.checks`). An "expand" click on such
a row actually COLLAPSES it and starts a 400 ms `slide`
out-transition that subsequent assertions race — a latent flake that an unrelated bundle-timing shift can
flip. Assert the expanded content directly (web-first assertions auto-wait) and click only to change state
whose default you have verified. (Root-caused in `attack-tags.spec.js`'s weapon-sheet helper.)

**Run e2e from a foreground shell (machine-local)** — launching Playwright from a DETACHED background
shell on this machine crashes its worker processes at startup with Windows status `0xC0000142`
(process-initialization failure), so the run dies before any test executes. Always run
`npm run test:e2e` from a foreground shell.

**Multi-client harness** — `tests/e2e/multiClient.js` (Phase 4) provides two helpers for tests that
require simultaneous Foundry sessions: `withClients(browser, clientSpec, fn)` creates one independent
`BrowserContext` per entry in `clientSpec` (a `{label: userName}` map), logs each in via `login()`, then
calls `fn(pages)` where `pages` maps each label to its `Page`. All contexts are closed in `finally` even
if the callback throws. `awaitUsersActive(page, userNames)` polls `game.users.getName(name)?.active`
inside `page.waitForFunction` (30 s timeout) until all named users are active on that client. Because
`playwright.config.mjs` uses `workers: 1`, logins are sequential and there are no race conditions on
the `/join` form. The smoke test is `tests/e2e/multi-client.spec.js`.

**npm scripts** — `npm test` runs `vitest run` (single pass); `npm run test:watch` runs Vitest in watch
mode; `npm run test:e2e` runs the Playwright suite above (its `global-setup.js` builds the test bundles into
`test/build/` first) and is THROTTLED by default — it wraps `playwright test` in
`tests/e2e/run-e2e-throttled.ps1` (BelowNormal process priority, affinity limited to half the cores; filter
args pass through) so a full run does not starve the machine. `npm run test:e2e:fast` is the unthrottled
`playwright test` escape hatch. `npm run build:e2e` (`vite build --config vite.probe.config.mjs`) builds just
the standalone component-probe IIFE (see next entry).

**Component-probe harness (externalized, test-only)** — `src/test-probe/` lets Playwright mount a single base
Svelte primitive in isolation inside the live Foundry runtime, with controlled props, to assert its
interaction contract independent of any sheet. `registerProbe.js` installs `game.titan._probe =
{ components, mount(name, props?, context?), unmount(id), unmountAll() }`; `mount` creates a detached
`<div data-titan-probe="<id>">` (positioned `fixed`, max `z-index` so it sits above Foundry chrome and
receives pointer events), mounts the named component from `componentRegistry.js`, and returns
`{ id, selector }`. A string `text` prop is converted to a `children` snippet via `createRawSnippet`
(text set through `textContent`, never interpolated HTML). Props are recursively scanned for two marker
shapes that survive the Node↔page boundary in place of un-serializable references: `{ __probeComponent: name }`
resolves to a registered component constructor (for component-valued props), and `{ __probeFn: kind, component? }`
resolves to a fixed-library helper function — `returnTrue` (`() => true`), `returnEntry` (`(entry) => entry`),
and `returnComponent` (`() => Component`, named via `component`) — sufficient for list components such as
`FiltereedList` whose props are functions. The probe is NEVER part of a system build: it is built as a
standalone IIFE by `vite.probe.config.mjs` (`createSveltePlugin({ emitCss: false })`) to
`test/build/probe.iife.js` (plus an extracted global stylesheet `test/build/probe.css`). `probeBundleEntry.js`
is that bundle's entry — it calls `registerProbe()` immediately when `game.titan` already exists, else on the
`ready` hook. Playwright injects it on demand: `componentProbe.js`'s `mountProbe` → `ensureProbe(page)` adds
`probe.css` then `probe.iife.js` (the IIFE registers `game.titan._probe`) only when the API is absent. There
is no `__TITAN_PROBE__` define and no dynamic `import()` anywhere — the production bundle is structurally
probe-free. The Playwright page object `tests/e2e/componentProbe.js` exposes
`mountProbe`/`readProbeEvents`/`clearProbeEvents`/`unmountAll`, the marker builders `probeComponent(name)`
and `probeFn(kind, { component })`, and `documentContext({ isOwner })` (a minimal non-reactive `document`
context for components reading `getContext('document')`); callbacks are instrumented INSIDE `page.evaluate`
(functions cannot cross the Node↔page boundary) and record into `window.__titanProbeEvents`.

**Coverage is complete:** all **84** primitives in `src/helpers/svelte-components/**` are registered in
`componentRegistry.js` and probed. Specs are split by family (each describe = one component):
`tests/e2e/component-probe.spec.js` (core: `Button`, `TextInput`, `NumberInput`, `IntegerInput`,
`CheckboxInput`, `Select`, `LabelTag`); `-context.spec.js` (`RichText`, the `EffectTag` family + its six
duration-variant wrappers, `FiltereedList`, `CondensedCheckButton`, `ProseMirrorEditor`); `-tags.spec.js`
(17 `tag/` primitives incl. `EditDeleteTag` whose probe also locks in the FontAwesome `font-family`
regression); `-labels.spec.js` (5 `label/`); `-inputs.spec.js` (8 `input/` non-select); `-selects.spec.js`
(16 `input/select/` typed wrappers); `-buttons.spec.js` (13 `button/`); `-display.spec.js` (`Meter`, `Text`,
`Tabs`, `ScrollingContainer`, `LabeledElement`, `BorderedColumnList`, `TagContainer`). Every primitive
carries a `testId` (`data-testid` passthrough) **except `Text`**, which renders `{processTextData(text)}`
inline with no root element — a wrapper would change its DOM contract, so its probe locates via the probe
container selector instead. Wrapper components forward `testId` to their inner primitive's rendered root
(e.g. wrapper selects → the `AttributeInput`/`RarityInput`/`ResistanceInput` div; bare selects → the inner
`<Select>`'s combobox button (`[role="combobox"]`); `ImagePicker` → `ImageButton`'s `<button>`). To probe a new primitive: add it to
`componentRegistry.js`, add a `testId` prop on its root if it lacks one (never add a wrapper element solely
to host it), append a describe block, then re-run the spec — `test:e2e`'s global-setup rebuilds
`test/build/probe.iife.js` and the harness re-injects it (no `dist/` rebuild needed).

**Gotcha — Foundry global `.disabled`:** Foundry's `foundry2.css` defines `.disabled { pointer-events: none; }`.
Never use `disabled` as a CSS class on an element wrapping interactive content — it silently blocks all
pointer events on descendants. Use a non-colliding name (e.g. `not-enabled`). `ToggleOptionButton` originally
used `disabled` for its off state, which made toggled-off filter options permanently un-clickable; the
off-state class is now `not-enabled`.

**Logic layer — Playwright + fast-check** — The in-client logic tier uses Playwright `page.evaluate`
calls against the live v14 runtime (no external module dependency). Property-based tests inject the
`fast-check` library as the `fc` page global and drive data-model operations directly in the running
Foundry world. Quench 0.10.0 was **removed** because its `runBatches` executes 0 tests under Foundry
v14: the async-`describe` / ApplicationV2 timing mismatch causes all batch registrations to be skipped
silently. `src/quench/` and `tests/e2e/quench-runner.spec.js` were deleted; the `test:e2e:quench` npm
script was removed. No Quench code remains in `src/` or `tests/`.

**Derived-data (rules-element) E2E spec** — `tests/e2e/logic/rules-elements.spec.js` asserts the live
flatModifier pipeline: creates a fresh `player` actor (Body base = 1), attaches an `ability` item carrying
a `+2 flatModifier` rules element via `buildFlatModifierAbilityData`, waits 100 ms for derived-data
preparation to settle, and asserts `actor.system.attribute.body.value === 3`. Abilities apply their
rules elements on mere ownership (no equip), making them the canonical fixture type for derived-stat
assertions. The spec uses `test.afterEach` to delete the fixture actor so world state does not accumulate.

**`buildFlatModifierAbilityData` builder** — `tests/shared/builders.js` exports `buildFlatModifierAbilityData(name, values)`:
accepts a `string` name and a `number[]` of modifier values; returns an `Item.create` payload of type `'ability'`
with one flatModifier rules element per value, each targeting `selector: 'attribute'`, `key: 'body'`, and
`uuid: 'e2e-flatmod-{index}'`. The companion Vitest unit test lives in `tests/unit/builders.test.js`.

## Integration manifest drift guard

**`system.json` is the source of truth** for declared document subtypes, packs, grid config, and the socket
flag. `tests/e2e/integration-manifest.spec.js` (7 tests, Phase 3c) guards against runtime drift by reading
`system.json` via Node `fs.readFileSync` inside the Playwright process and comparing the parsed values to live
`CONFIG`/`game` state:

- Every subtype declared in `documentTypes` has a registered `CONFIG` data model (and vice versa), including
  `ChatMessage`: the bidirectional guard now covers `Actor`, `Item`, `ActiveEffect`, and `ChatMessage`.
- `ChatMessage` declares all 26 TITAN chat subtypes (the 5 checks, the 7 item cards, the 13 reports, and
  `effect`), registered in `CONFIG.ChatMessage.dataModels` (set in `OnceInit.js`). The old
  `'ChatMessage declares no document subtypes'` test was removed and replaced by the bidirectional declared ==
  registered guard above.
- Every declared pack resolves via `game.packs.get(`titan.${name}`)` with matching `metadata.type` and
  `metadata.packageName === 'titan'`.
- Grid and socket config (`game.system.grid.units`/`.diagonals` and `game.system.socket` equal the manifest
  `grid` block and `socket` flag).
- Titan document classes are proper subclasses of the Foundry base (structural assertion, see minification
  note below).
- Per-subtype TITAN sheet registered with `default===true`; core sheets (`core.ActorSheet`/`core.ItemSheet`)
  unregistered.
- Runtime CONFIG flags (`roundTime`, `legacyTransferral`, initiative prefix, conditions, settings keys).

**Build minifies system class names (gotcha — affects tests AND runtime branching)** — Vite/Rollup minifies
the system bundle; all system class names are mangled (e.g. `TitanActor` → `ro`). Consequences:

1. Never assert or branch on a system class's `.name` against a literal string — it will not match in the
   built bundle.
2. Sheet registration ids are built by Foundry as `` `${scope}.${SheetClass.name}` ``, so titan sheet ids
   become `` `titan.<mangled>` `` (not `` `titan.TitanActorSheet` ``). Match titan sheets by the `titan.`
   prefix rather than a full literal id.
3. Assert document-class identity structurally: `cls.prototype instanceof <FoundryBaseGlobal> && cls !==
   <FoundryBaseGlobal>`. This is reliable because the class hierarchy is preserved even after minification.
4. Foundry CORE class names (`core.ActorSheet`, `core.ItemSheet`, etc.) are NOT mangled — they ship in a
   separate bundle — so those ids remain stable and can be matched as literals.

**v14 sheet registration shape** — `CONFIG[doc].sheetClasses[subtype]["<scope>.<SheetClass.name>"]` →
`{ id, label, cls, default, ... }`. `default === true` marks the makeDefault sheet for that subtype.
Per-subtype sheet entries are keyed by the full `<scope>.<SheetClass.name>` string (mangled for titan
sheets), so iterating `Object.values(CONFIG[doc].sheetClasses[subtype])` and checking `.default` or
the `titan.` prefix on `.id` is the robust pattern.

## Style rules live in CLAUDE.md

`.claude/CLAUDE.md` is the single authority for all code-style, formatting, and documentation rules for this
project — covering the 120-character wrap limit, multiline formatting for objects/arrays/Svelte components,
strict typing requirements, JSDoc conventions, and comment grammar rules. This skill file does not restate
those rules; read `.claude/CLAUDE.md` before writing or reviewing any code in this codebase.
