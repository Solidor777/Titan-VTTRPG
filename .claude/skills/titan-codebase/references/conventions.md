# Conventions & Non-Obvious Facts

> Descriptive only. For the authoritative style/formatting/documentation rules, see
> `.claude/CLAUDE.md` (summarized at the bottom of this file).

## ESLint-enforced formatting rules

Seven of the house formatting rules in `.claude/CLAUDE.md` are ESLint-enforced (`eslint.config.js`),
not just documented — `npx eslint .` must report 0 errors:

- **120-char wrap** — `@stylistic/max-len` (`code: 120`, `ignoreUrls`, `ignoreRegExpLiterals`).
- **Braces on every conditional** — core `curly: ['error', 'all']`.
- **Multi-line object literals with 2+ properties** — `@stylistic/object-curly-newline` +
  `@stylistic/object-property-newline`, scoped to `ObjectExpression` so destructuring/imports/exports
  are untouched.
- **Multi-line array literals with 2+ elements** — a local rule, `titan/array-literal-newline`
  (`eslint/rules/array-literal-newline.js`), written locally because
  `@stylistic/array-bracket-newline`/`array-element-newline` cannot be scoped away from destructuring
  patterns; unit-tested at `tests/unit/eslint/ArrayLiteralNewline.test.js`.
- **Trailing commas on every multi-line literal/import/export/argument list** —
  `@stylistic/comma-dangle: ['error', 'always-multiline']`.
- **No trailing whitespace on any line** — `@stylistic/no-trailing-spaces`.
- **Exactly one trailing newline per file** — `@stylistic/eol-last`.

**`no-undef` is an error everywhere.** No `globals` package is installed; `eslint.config.js` declares the real
globals per file set (`BROWSER_GLOBALS` + `FOUNDRY_GLOBALS` for `src/` and `tests/` — e2e `page.evaluate` bodies
run in-page, and vitest mocks Foundry globals; `NODE_GLOBALS` for configs, `scripts/`, `eslint/`, `tests/`;
`SVELTE_RUNES` for `src/**/*.svelte.js`). A new global a file legitimately uses is added to its list.

`@stylistic/indent` (3-space, `SwitchCase: 1`) covers `.js`/`.mjs`/`.cjs`; `svelte/indent` (same
settings) covers `.svelte` files instead, since `@stylistic/indent` misjudges markup-nested mustache
expressions (e.g. under `{#if}`) as JS continuation lines. Pre-existing `jsdoc/*` warnings are out of
scope for this enforcement.

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

## `~/` alias for Node scripts (outside the Vite build)

`scripts/` CLI entry points (e.g. `spreadsheet-to-markdown.mjs`) are plain Node, not Vite-built, so they
cannot rely on `vite.config.mjs`'s `resolve.alias` for `~/`-prefixed imports into `src/`. Instead,
`scripts/lib/registerSrcAlias.mjs` calls Node's loader-registration API,
`module.register(new URL('./srcAliasHooks.mjs', import.meta.url))`, which installs
`scripts/lib/srcAliasHooks.mjs`'s `resolve(specifier, context, nextResolve)` hook — it resolves any
`~/`-prefixed specifier to `src/` under the repo root and passes everything else to `nextResolve`
unchanged. Because `module.register()` only affects imports resolved AFTER it runs, the entry script
bootstraps in two steps: a static `import './lib/registerSrcAlias.mjs'` (registers the hook), followed by
a **dynamic** `await import('./lib/spreadsheetToMarkdownCli.mjs')` for the module that itself imports
`~/`-prefixed `src/` modules. This dynamic import is a Node-script bootstrap ordering requirement, not a
shipping-build concern — `scripts/` is never bundled into `dist/`, so it does not violate the "no dynamic
imports in shipping builds" rule.

`src/spreadsheet/markdown/` (the Markdown-rendering layer this CLI drives) touches no Foundry globals,
so it runs unmodified under plain Node via this alias hook — the same modules the in-Foundry Vite build
also imports.

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

**Non-owners and form controls** — `DocumentSheetV2._onRender` calls `_toggleDisabled(true)` when the viewer cannot
edit, disabling every form control present at that render (controls mounted later are untouched).
`TitanDocumentSheet._toggleDisabled` re-enables buttons inside any `[data-view-controls]` container — the `Tabs`
strip, `CharacterSheetItemExpandButton`, and `SidebarCheck`'s toggle — so observers can navigate. A control
that changes no document state goes in such a container; editing controls gate themselves on ownership
(`DocumentOwner*` components).

**Conditional check modifiers** — `CONDITIONAL_CHECK_MODIFIER_TYPES` (`src/system/ConditionalCheckModifierTypes.js`)
is the single list of `modifierType` values (`damage`, `dice`, `expertise`, `training`, `healing`, `advantage`,
`automaticFailure`): the rules-element editor's options and the actor cache keys. `CHECK_TYPE_MODIFIER_TYPES` maps each
check type to the modifier types it reads (an Attribute Check has no Damage; a Resistance Check has no Training); the
editor offers a check type only for those, and `getSituationalCheckModifiers` offers only those.
`MODIFIER_TYPE_PARAMETER_KEYS` maps each summable type to the parameter a ticked situation adds to. `advantage` stores
its level (±1, ±2) in `value` and sums across sources; `automaticFailure` counts as 1 whatever its `value`
(`_getConditionalCheckModifierValue`). `CharacterDataModel.get{Attribute,Resistance,Attack,Casting,Item}CheckMod` are
thin wrappers over one table-driven helper, `_sumConditionalCheckMods(modifierType, checkType, selectorKeys)`: it
reads the cache only through `_getConditionalCheckModsForType` (which asserts the modifier type is in that list) and
sums each cell the frozen `CHECK_TYPE_CONDITIONAL_SELECTORS` table (same module) lists for the check type — element
check type → selectors — where the check matches the selector (`any` always; `multiAttack` for a multi-attack; a
keyed selector by the check's key or keys). `tests/unit/CharacterCheckModifiers.test.js` pins each check type's cells
against a cache holding a distinct power of two per cell. The editor's check-type and selector options are the frozen
`CONDITIONAL_CHECK_MODIFIER_CHECK_TYPE_OPTIONS` and `CONDITIONAL_CHECK_MODIFIER_SELECTOR_OPTIONS` (same module, display
order); `tests/unit/ConditionalCheckModifierTypes.test.js` pins them to the element check types and selectors the
table reads (plus `situation`), and `tests/unit/check/rebuild-check-options.test.js` requires
`CHECK_OPTIONS_METHODS` and `CHECK_TYPE_MODIFIER_TYPES` to name the same check types, and the editor's check-type
options (beyond `any`) to be exactly the check types whose `CHECK_TYPE_CONDITIONAL_SELECTORS` row has a cell of the
check type's own name (attribute reads `any` only, so the editor does not list it), so a sixth check type fails until
each list has it. A blank selector key never matches: the keyed cache builders (`_sortElementsByKey`) store nothing
under it (a missing key is blank), the situational cache builder skips blank-key situations, and the check-modifier
lookup skips it, for a single key and inside an array of keys. `multiAttack` is a
Boolean from `createAttackCheckOptions` onward. Typed keys (free-typed in the
editor) are grouped and matched in camel case; the one source is the frozen `TYPED_KEY_SELECTORS` map in the same
module, keyed by operation: `conditionalCheckModifier` (`customTrait`, `spellTradition`, `situation`),
`conditionalRatingModifier` (`customArmorTrait`, `customShieldTrait`, `customWeaponTrait`), and `rollMessage`
(`customTrait`, `spellTradition`). The check-modifier cache builder and lookups (`_normalizeConditionalCheckModKey`),
the rating-modifier builder, and the roll-message builder each read their own entry, and
`tests/unit/TypedKeySelectorEditors.test.js` asserts every editor's text-input selectors equal its entry.
`_expandAllKeyElements` does not use the map: it expands `'all'` only for a selector that `_getSelectorKeys` resolves
to keys. Resistance checks read only the modifier types in `CHECK_TYPE_MODIFIER_TYPES.resistance` (`dice`,
`expertise`, `advantage`, `automaticFailure`) via `getResistanceCheckMod`, whose table entry is checkType `any` +
selector `any`,
checkType `resistance` + selector `any`, and checkType `resistance` + selector `resistance` keyed by the rolled
Resistance; `any`-type `attribute`/`skill` selectors never apply to them.

**Situational check modifiers** — a `conditionalCheckModifier` with selector `situation` never applies
automatically. `_applyRulesElements` tags every gathered element with its owner's name (`sourceName`), and
`_applySituationalCheckModifierElements` caches the situation elements in `rulesElementsCache.situationalCheckModifier`
(`{ checkType, key, label, [labelKey], modifierType, skill, source, value }`) instead of the summed cache.
`getSituationalCheckModifiers(checkType, { skill })` returns the entries of the check type plus `any`, of modifier
types the check reads, narrowed by `skill` (`''` = any Skill), one entry per key + modifier type summed across owners
(`sources: string[]`); a check type outside `CHECK_TYPE_MODIFIER_TYPES` is asserted by name and offers nothing.
Check options carry `situations` (camel-case keys the dialog ticks or a caller names); every
`get<Type>CheckParameters` adds the named entries on top of the options through `_applySituationalModifiers` (options
keep only always-on values, so recomputing never double-counts; a key that no longer applies is ignored) and records
`{ key, label, [labelKey] }` in `parameters.situations`. The equipped armor's Heavy/Encumbering/Loud traits add
synthetic situation elements (`createArmorTraitCheckModifiers`,
`src/document/types/item/types/armor/ArmorTraitCheckModifiers.js`): each carries a canonical English `key` (its
camel-case form is the situation key on every client), a localized `label`, and a `labelKey` that the chat card
localizes again for the reading client; user-typed situations have no `labelKey`. Each is narrowed to the Skill its
checks use (Athletics; Loud's is Stealth).

**`ReactiveDocument` bridge** — `src/document/reactive/ReactiveDocument.svelte.js` is the
Foundry↔Svelte-5 reactivity bridge (it replaces TyphonJS `TJSDocument`). It wraps the live document;
its `.data` getter calls a `createSubscriber()` (from `'svelte/reactivity'`) subscriber and returns
the **live document**, so reading `document.data.system.x` inside a component or `$derived` re-runs
when the document changes. The subscriber registers `update<DocumentName>` plus embedded
`create/update/deleteItem` and `create/update/deleteActiveEffect` hooks and tears them down
automatically when the last reactive reader unsubscribes (on unmount). Because `.data` is the live
document, reads (`.data.system.x`), writes (`.data.update(...)`), collections (`.data.items`), and
methods all go through the same accessor. A hook invalidates the bridge only when the changed document, or for an
embedded hook its parent or grandparent, has the bridged document's `uuid`: an unlinked token's synthetic actor shares
its base actor's `id` and has its own `uuid`, so an `id` match would re-render an open base-actor sheet on every edit
of a token's actor (pinned by `tests/unit/ReactiveDocument.test.js` and `tests/e2e/sheet-header.spec.js`).

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
`content: { class: CheckDialogShell, props: { shell, actor, checkType, callerOptions,
checkOptions: writable(...), checkParameters: writable(...) } }` and the shell distributes those stores to
children via `setContext`. The `'checkOptions'` context is a read-only view (`{ subscribe }` only) of a store
whose every value is a frozen snapshot sharing nothing with its sources (`freezeCheckOptions`: Check Options are plain
data — plain objects and arrays are copied with their prototype and frozen at every depth; any other object, such as
a document or data model, is first converted to a plain snapshot through its `toObject()` or a structured clone; a
function, symbol, uncloneable object, non-plain snapshot (`Map`, `Set`, `Date`, typed array), or cycle — tracked
through the ancestors on the copy path, so a shared value is copied into each field — throws a `TypeError` naming the
field, never a partial freeze), so a
bind, assignment, in-place mutation, or store-method write from a component throws and changes nothing. Dialog
fields write through the `'setCheckOption'` context (`createCheckOptionSetter`
in `src/check/dialog/RebuildCheckOptions.js`), which records the write as a user edit. On every Actor
change or edit, `CheckDialogShell` rebuilds the options (`rebuildCheckOptions`): the input
`{ ...callerOptions, ...userEdits }` is validated quietly (`validate<Type>CheckOptions(options, false)` reports
nothing); if it is invalid, each `'default'`-sentinel field it leaves unset (e.g. the Attribute after Skill
"None") is pinned to its displayed value and validated again; if it is still invalid (its item or effect is
gone), nothing is written and the type shell's own validation closes the dialog; otherwise
`initialize<Type>CheckOptions(input)` derives every other field from the live Actor and is written only when
structurally different. `tests/unit/check/check-dialog-option-writes.test.js` is the backstop scan: it reads
every `.svelte`, `.js`, and `.svelte.js` under any `dialog` directory of `src/check`, plus every source in `src`
that reads `getContext('checkOptions')`, whole (exempting only `CheckDialogShell.svelte` and
`RebuildCheckOptions.js`) and fails on any write form through the store or an alias bound from the context, and on
any context read whose declaration is not typed `import('svelte/store').Readable`.

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
`CheckListMixin` (the check array is `system.check`; its mutators live on the document, shared by `TitanItem` and
`TitanActiveEffect`, like `addCheck`);
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
- **A shape value that is already a `foundry.data.fields.DataField` instance passes through
  `buildSchemaFromShape` unchanged**, at top level and nested. This is the only way a shape can express a
  nullable `StringField`: a `null` shape value builds a nullable `ObjectField` instead, which rejects a
  string id. Used by the actor shape templates for `equipped.armor` / `equipped.shield` (nullable ids
  defaulting to `null`, built with `createStringField(null)` and passed through as-is).

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
light/dark themes) so Foundry's per-sheet color-scheme option overrides individual windows. Unpaired text/
accent tokens: the `headers` group `header-1-font-color`…`header-6-font-color` (per heading level) and the
application-group `accent-color` (the HUD flyout accent, replacing the former undefined `--titan-cyan`).
TITAN surfaces must use TITAN text colors, not Foundry's `--color-text-*` (which track Foundry's color
scheme and mismatch the active TITAN theme): `Global.scss` redefines `--color-text-primary`/`-secondary`/
`-emphatic` to `--titan-app-font-color` inside `.titan`, and colors `.titan`/`.rich-text` headings per level
by setting BOTH `color` AND `--color-text-primary` on the heading element (so Foundry's own
`color: var(--color-text-primary)` heading rule resolves to the TITAN token regardless of that rule's
specificity; the `color` covers the non-`.titan` HUD). Every TITAN app/dialog/sheet/chat carries the base
`titan` class — `TitanDocumentSheet` and `TitanDialog` constructors MERGE `'titan'` into the `classes`
array, the direct `ApplicationV2` subclasses set it, and `ChatMessage#renderHTML` adds it. Resolution:
client `theme` setting → `auto` follows Foundry's `theme-dark`/`theme-light` body class (a
MutationObserver re-applies on change) → GM world defaults (`defaultDarkTheme`/`defaultLightTheme`) →
built-in heritage fallback. Custom themes live in the `customThemes` client setting (same data shape as
built-ins) and are managed by the theme editor (`src/theme/editor/`, opened via `registerMenu`). Theme
switching is live — no reload; settings `onChange` calls `apply()`. Saved customs store every token at save time,
so `ThemeManager.getAllThemes` completes them with `fillMissingThemeTokens` (`ValidateThemeData.js`) from the
Heritage theme for their scheme — adding a contract token needs no migration. Content links own their full
color pair (`content-link-font-color`/`-background`/`-border-color`, the theme's panel-2 pair) because Foundry
paints `.content-link` backgrounds per color scheme (near-black in the dark scheme); `THEME_TOKEN_PAIRS` lists
the pair and `ThemeContract.test.js` enforces WCAG AA contrast for it.

**Setting localization keys are `SETTINGS.<key>.label`** (plus `.hint` and per-choice children) —
`lang/en.json` defines `label`, not `text`, for every setting; a `name: 'SETTINGS.x.text'` reference
renders as the raw key in the settings window. The settings-menu button label key is
`SETTINGS.themeEditor.button`.

**Every `$appState` path must exist in the sheet's initial-state factory.** A path outside the factory's
object silently creates a new key on write (a misspelled `scrollTop` loses the initialised state, and the
behavioural test still passes). `tests/unit/SheetStatePaths.test.js` derives each sheet's components by
following `.svelte` imports from its `*SheetShell.svelte` and walks every `$appState.a.b.c` (and
`tabs[tabKey]`) path against that sheet's factory (`createCharacterSheetData`,
`createRulesElementItemSheetData`, `createSpellSheetData`, `createWeaponSheetData`); a new shell must be
added to its registry, and a state-reading component no registered sheet mounts fails the suite. The same
file ties each registry factory to the sheet class: it finds the class importing the shell, follows the
`extends` chain to the nearest `_createReactiveState` (which must be a single
`return createXSheetState(this.document);`), and checks that store's initial value equals the registered
factory's output; every `*SheetData.js` factory must yield a distinct state for its stand-in document.

**Spell aspect display is one selector.** `selectDisplayedSpellAspects(aspects, customAspects)`
(`spell/SelectDisplayedSpellAspects.js`) returns `DisplayedSpellAspect` entries (`key`, `isCustom`,
`index`, `label`, `isLocalized`, `cost`, `aspect`): the enabled standard aspects then the custom aspects —
the set that makes up `totalAspectCost`; the sheet sidebar, Casting Check tab panel, character-sheet spell
row and spell chat card all use it. `SpellAspectTags` takes that array unchanged (`aspects` prop) and
orders the tags by approximate size (scaling, options, a non-`'none'` resistance check), stable for ties.
`tests/unit/SpellAspectSelectorUse.test.js` parses every `.svelte` mentioning aspects with
`svelte/compiler`'s `parse` (styles blanked by `preprocess`, since they are SCSS) and walks the AST: any
`MemberExpression` on `enabled` or `enabled` key in an `ObjectPattern` at any depth fails it (an `enabled=`
attribute passed to a child is allowed); `SpellSheetEnableAspectButton`'s
"aspect is on the spell" prop is therefore `isAdded`. `aspect.enabled` and `aspect.cost` are derived in
`SpellDataModel#prepareDerivedData`, not stored.

**AppV2 sheets must bind their own DragDrop** — ApplicationV2 wires no drag-drop handlers;
`TitanActorSheet._onRender` creates a `foundry.applications.ux.DragDrop.implementation` (drop
permission = `isEditable`) and binds it to `this.element` every render. Without that, `_onDrop` is
dead code and sheet drops silently no-op.

**No `$bindable` prop declares a fallback** (`tests/unit/BindableNoFallback.test.js` fails on
`$bindable(<anything>)`): Svelte 5 throws `props_invalid_value` when a parent `bind:`s an undefined value
to a bindable prop that has a fallback. Components apply defaults at the read site
(`$derived(value ?? default)`). The recurring undefined-bound case is a per-index sheet-state read for a
row the document just gained (the state array grows AFTER the document update renders the row); use a
function binding with the seeded default as fallback:
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
not display text. A comprehensive e2e guard, `tests/e2e/surfaces.spec.js`, renders every actor/item/
effect sheet, every spell tab, the five check-options dialogs and the effects sidebar and fails on any rendered
text/tippy-tooltip containing `LOCAL.`;
`tests/unit/LocalizationKeys.test.js` guards `lang/en.json` values against embedded `LOCAL.` keys.
`tooltipAction` cleans every non-blank tooltip with `foundry.utils.cleanHTML` (the cleaner core's `TooltipManager`
applies) before tippy renders it as HTML, when created and on update, so tooltip text built from document or chat
data may carry user-written HTML. A report effect tag's tooltip comes from `buildEffectTagTooltip(effect, leadKey)`:
each duration tag passes its own `effect.<type>.desc` lead key, a condition entry none.

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
`svelte-floating-ui` (`createFloatingActions`, `offset`/`flip`/`shift`; `autoUpdate: true` keeps the
list anchored to the trigger through ancestor scroll, resize, and layout shift; **closes on
outside-click**). Portaling escapes ApplicationV2 windows' `transform` containing block; theme
`--titan-*` tokens still apply because they are injected on `:root`.

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
(reset to the first option when `value` is out of range) is preserved. Handled keys call
`stopPropagation` so they do not leak to Foundry's bubble-phase keybindings — otherwise Esc pops the
main `#menu` dialog and arrow keys pan the canvas while the list is open (unmodified single characters
drive typeahead; Ctrl/Alt/Meta combos pass through to Foundry/browser shortcuts). This is also why e2e
helpers can safely close the list with `Escape`.

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
deprecation shim (removed in v16); TITAN's hooks use the v14 names. Directory entry `li` elements carry
`li.dataset.entryId`; chat message `li` elements carry `li.dataset.messageId` (confirmed in `document-directory.mjs`
line 237 and `chat.mjs` line 338). `li.closest('[data-entry-id]')?.dataset.entryId` is the safe accessor pattern (same
as used in `_getEntryContextOptions` at `document-directory.mjs:237`).

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
  cleans its value with `foundry.utils.cleanHTML` first (`enrichHTML` assigns its input to a live element's
  `innerHTML`, where an event-handler attribute fires), then populates a `$state('')` variable from a `$effect` that
  awaits the promise (with a cancellation guard).

- **`FilePicker` constructor** — use `new foundry.applications.apps.FilePicker.implementation({...})` (honors
  `CONFIG.ux` override); `new foundry.applications.apps.FilePicker({...})` is not the canonical v14 path.

- **AppV2 position width** — `ApplicationV2` instances have no `options.width`; the current rendered width lives
  on `application.position.width`. (`options.width` yields `undefined`, producing `NaN` in arithmetic.)

- **Status-effect icon field** — v14 `CONFIG.statusEffects` entries use `img` (not `icon`). Token HUD reads
  `status.img`; the v13 `icon` fallback was removed. All entries in `src/system/Conditions.js` use `img:`.

## Other gotchas

- **`structuredClone` rejects `$state` proxies** — a value read from `$state` (a `$bindable` array of options, for
  example) must be copied with `$state.snapshot(...)` before it is assigned into data that is later passed to
  `structuredClone` or a document update (measured: `EditTraitsDialogBase` threw `could not be cloned` until it
  snapshotted the trait options; `.superpowers/sdd/test-suite-rewrite/phase-3/gate120-before-fix.log`).

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

**No dynamic `import()` inside a test body** — a module imported with `await import(...)` inside an
`it(...)`/`test(...)` body pays a cold Vite transform under that test's own timeout, which can exceed it
under full-suite parallel load. The established pattern is a static import plus a `vi.hoisted(() => {...})`
block: Vitest hoists `vi.hoisted` (and `vi.mock`) above the static imports, so it runs before the imported
module evaluates and can seed the module-evaluation-time Foundry globals the import reads (e.g.
`foundry.applications.api.ApplicationV2`, `game.i18n`) — see `tests/unit/spreadsheet/ui/ExportDialog.test.js`.
Per-test mutation of those globals (e.g. toggling `game.user.isGM`) still belongs in `beforeEach`/the test
body, not in `vi.hoisted`. `beforeAll`-scoped dynamic imports (covered by the 60 s `hookTimeout`, mainly the
schema golden-master suites) are the one place this pattern does not apply.

**Foundry globals mock** — `tests/setup.js` (loaded as Vitest `setupFiles`) installs:
- `globalThis.foundry = { abstract: { Document: MockDocument }, utils: { mergeObject } }` — a minimal
  `foundry.abstract.Document` stub (for `instanceof` checks) and a recursive `mergeObject` plain-object
  merge.
- `globalThis.Hooks` — a `HooksMock` instance reinstalled fresh `beforeEach` test so hook registrations
  never leak across tests. Supports `on(name, fn)`, `off(name, fn)`, and `call(name, ...args)`.

**Tooltip-bearing tags under happy-dom** — components using the tippy `tooltipAction` (e.g. `TraitTag`) mount in
Vitest's happy-dom environment with no tippy mocking. Non-blank tooltip content (and `RichText` values) pass through
`foundry.utils.cleanHTML`, which only the Foundry client defines; the shared `tests/setup.js` defines a pass-through
stand-in beside its other `foundry.utils` stand-ins. Sanitization itself is verified live
(`tests/e2e/html-sanitization.spec.js`), never against that stand-in.

**`data-testid` convention** — Stable E2E selectors are wired via `testId` props on shared dialog
wrappers. `CheckDialogField` (`src/check/dialog/CheckDialogField.svelte`) forwards its `testId` prop
to the wrapper `<div class="field" data-testid={testId}>`. `CheckDialogSummary` forwards `testId` to
the inner `<div class="tag" data-testid={testId}>`. `CheckDialogBase` passes `testId={'check-dialog-roll'}` and
`testId={'check-dialog-cancel'}` to the two `Button` components. Each concrete `CheckDialogField` and
`CheckDialogSummary` user supplies a static string literal such as `testId={'check-field-attribute'}` or
`testId={'check-summary-totalDice'}`. Playwright specs select these with `page.locator('[data-testid="..."]')`. The
Advantage, Automatic Failure, and situation dialog rows use `check-field-advantage`, `check-field-automaticFailure`,
`check-summary-difficulty` (the post-Advantage Difficulty), `check-field-situations`, and per situation
`situation-row-<key>` / `situation-toggle-<key>`; check cards use `check-chat-dc`, `check-chat-advantage`,
`check-chat-automatic-failure`, `check-chat-situations`, and `check-chat-situation`; the conditional-check-modifier
editor uses `ccm-*` ids (`DocumentSelect` forwards `testId`).
Essentially every base primitive in `src/helpers/svelte-components/**` now carries an optional `testId`
(`data-testid` passthrough on its root element, or forwarded to its inner primitive's root for wrappers) —
the lone exception is `Text` (no root element). See the component-probe harness entry below for the full
coverage map, the wrapper-forwarding rules, and the selector each component resolves to.

**Playwright E2E** — `npm run test:e2e` runs `playwright test` against a Foundry world on
`http://localhost:30000` (`playwright.config.mjs`; env `FOUNDRY_USER` / optional `FOUNDRY_PASSWORD`). The
config's `webServer` reuses a server already on the port and otherwise runs `scripts/e2e-foundry-server.mjs`,
a supervisor (`scripts/lib/superviseServer.mjs`) that spawns `node main.js --dataPath=… --world=test-titan`
from the sibling `foundry/` install (paths derived from the repo location; `FOUNDRY_APP_DIR` /
`FOUNDRY_DATA_PATH` / `FOUNDRY_PORT` / `FOUNDRY_WORLD` override) and kills the whole tree when Playwright ends
the run or when the Playwright runner process itself disappears (it watches the nearest non-shell ancestor
pid, polling liveness once a second), so a hard-killed run never leaves a Foundry holding the port and the
pack LevelDB locks. `tests/unit/SuperviseServer.test.js` covers spawn/reuse/teardown. Specs live in
`tests/e2e/`: `surfaces.spec.js` (every sheet type, spell tab, check-options dialog and the effect tray renders on
flow-made documents with zero uncaught page errors and no `LOCAL.` text; the collapsed-layout regressions; the
portrait pick through Foundry's file picker; opening a sheet from the directory; the Edit Unique ID dialog),
`sheet-header.spec.js` (the window-header controls menu, the inline header buttons, unlinking from the sheet a token
double-click opens, and the `ReactiveDocument` identity pin), `interaction-rolls.spec.js` (each `roll<Type>Check`
posts a chat message of the expected subtype (`message.type`) and the card renders), `character-sheet-rows.spec.js`
(the Abilities, Spells, Inventory and Effects rows of one flow-made actor: a functional sweep per item type, rows
following edits made in the item or effect sheet, delete confirmation and the confirmation-off path, check tag parity
across the item sheet, the character sheet and the Effect HUD), `custom-traits.spec.js` (the Add Custom Trait dialog,
the tag's edit and delete icons, the tooltip, on items and effects), `sheet-filters.spec.js` (the name filters of the
character sheet tabs and of the item Checks tab), `character-sheet-layout.spec.js` (Skills row geometry, sidebar
labels, browser zoom on the shared bulk actor), `rules-element-editor.spec.js` (the Rules Elements tab of a flow-made
weapon: add and delete, the selector's default key, the rounding select of Multiply Base and Multiply Sum, the
conditional check modifier editor), `item-sheet-rolls.spec.js` (the sidebar roll buttons of an owned equipment, weapon
and spell, the Checks tab roll preview, a check added while the sheet is open, damage-reduction settings in the
posted check parameters), `spell-sheet.spec.js` (the condition aspects' Off-Balance option, the Casting Check tab's
aspect costs, its re-pricing by a second client and its scroll position) and `drag.spec.js` (real pointer drags:
character sheet item and effect lists, the four item sheet lists, a row copied between sheets and refused by a list
of another kind, a world item or a folder dropped on an actor sheet). `tests/e2e/harness.js` provides `test`, `expect` and
`flushPageErrors`; `tests/e2e/join.js` (no test-runner imports, so the setup, teardown and census load it without
`harness.js`) provides `joinWorld`, `trackWorldPage`, `flushPageErrors` and `takeUncheckedErrors`; `tests/e2e/fixtures.js`
re-exports `joinWorld` and provides `login`, `openSheetByUuid(page, uuid)` (`fromUuid` then `sheet.render`, waits for
the content to mount, returns the window's locator; a read-side render, not a document change) and `renderSheet(page,
uuid, expectedSelector, errors)` (opens by uuid, asserts the frame class, flushes and asserts the spec's `errors`
collector is empty; see the shared-world harness below). Drives the real built system at
the repo root, so it catches v14 API breaks that the mocked Vitest tier cannot.

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
Because every sidebar tab is mounted (hidden) from ready, the Effects tray's `[data-effect-id]` rows (root
effects and those in expanded folders) precede any sheet in document order; sheet row locators are therefore always
scoped to the open sheet — `page.locator('.application.titan-document-sheet [data-item-id]')` /
`[data-effect-id]` — never bare `page.locator('[data-…-id]')`.
`clearChat(page)` deletes all chat messages in `beforeAll` (per-file world reset — keeps the world lean so
GM→player socket replication does not time out). `attachPageErrors(page)` wires ONE `pageerror` listener
and returns the shared `errors` array; per-test `page.on('pageerror', …)` is banned (it would stack on the
reused page) — fold any per-test error assertion onto the shared `errors`, which is reset each `afterEach`.
A `pageerror` never includes a hook listener's throw: core's `Hooks.#call` catches it and passes it to
`Hooks.onError`, which logs it and calls the `error` hook only when the thrown value is an `Error`
(`Error.isError`); a thrown non-`Error` value is logged by `Hooks.#call` as a console warning and reported nowhere, so
no harness sees it (Foundry 14.364 `client/helpers/hooks.mjs:158-168, 182-188`). `world.js`
`installHookErrorReporting(page)` runs before the first navigation: an init script registers an `error` hook listener
the moment core assigns the `Hooks` global (`client/client.mjs` assigns it through `Object.assign(globalThis, …)`,
which calls the script's setter), and an exposed binding pushes each report, as `Hooks.onError (<location>):
<message>`, into every array `attachPageErrors` returned for that page. The binding is asynchronous, so the document
also counts its reports; `flushHookErrorReports(page)` waits until the delivered count matches.
**Harness gate (every test, every world page).** Every spec imports `expect` and `test` from `tests/e2e/harness.js`,
never from `@playwright/test` (the gate runs only through `harness.js`'s `test`; review checks the import).
`join.js` `joinWorld` (which `login` calls, and `withClients` through it for every second client) attaches
a collector before the page's first navigation and records the page (`harness.js` `trackWorldPage`), so it collects
from boot onward. `test` carries
two automatic fixtures: after each test, including its `afterEach` hooks, it flushes every recorded open page and fails
the test on any error collected since the previous check, naming the user and the spec that logged the page in; a
worker-scoped one does the same after the worker's last test. Errors raised in a `beforeAll` after the boot fail the
file's first test; errors in an `afterAll` fail the next test of the worker, or the worker's teardown after the last
one. `withClients` flushes each client before closing its context (a closed page cannot be flushed). A spec's own
`attachPageErrors` collector is optional: it adds an assertion at a chosen point, on a chosen page.
**Boot gate.** `login` fails when the boot raised an error: `joinWorld` waits for `game.ready`, flushes, and returns
the page errors and hook errors collected from the join screen on, including from `init`/`setup`/`ready` listeners;
they are marked checked, so the harness gate does not report them again. Core sets `game.ready` and calls the `ready`
hook synchronously (`client/game.mjs:777-779`), so the read follows every synchronous `ready` listener. The cleanup
tool `census.js` calls `joinWorld` without the assertion: a boot error is printed in its JSON (`bootErrors`) and sets
exit code 1, but never stops the census or the sweep, which may be what removes the documents behind the error.
Console output is not read, so its noise (`ERR_CONNECTION_REFUSED`, vendor warnings) never reaches a collector.
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
synchronous predicate (50 ms interval, 5 s default timeout). **There are now no fixed sleeps in the suite
at all**, including assert-absence tests. When a negative assertion appears to have no pollable positive
edge, look for a **happens-after edge**: an observable the code under test emits strictly LATER than the
decision being asserted. `permissions-auto-open.spec.js` waits on a turn-start fast-healing change,
because `onTurnStart` resolves the auto-open branch BEFORE its resource updates — so the heal landing
proves the sheet's fate was already decided. Seeding an extra rules element purely as a synchronization
signal is preferred over a bounded wait. Condition-polling
`setInterval` canvas-readiness loops (`effect-tray.spec.js`) are NOT fixed sleeps and are fine.

**E2E runner configuration (all optional; defaults reproduce historical behavior).**
`npm run test:e2e` wraps `playwright test` in `tests/e2e/run-e2e-throttled.ps1`, which throttles ITS OWN
process before spawning anything, so npx, node, Foundry, and every Chromium inherit the limits:

- `TITAN_E2E_CORES` — logical cores for the affinity mask; an integer, or `all` to skip masking. Defaults
  to half the machine's logical cores.
- `TITAN_E2E_PRIORITY` — process priority class. Defaults to `BelowNormal`.
- `TITAN_E2E_GPU=0` — falls back to software rendering. The default is GPU-on via the `--enable-gpu`
  Chromium arg in `playwright.config.mjs`; without it headless Chromium silently uses the SwiftShader CPU
  rasterizer, which renders the PIXI canvas across every core. `gpu-rendering.spec.js` asserts the adapter
  is not software. Verified minimal: `--use-angle` needlessly pins a backend and `--ignore-gpu-blocklist`
  does nothing on its own.
- `TITAN_E2E_SLOW_MS` — threshold for `tests/e2e/slow-operation-reporter.js` (default 1000), which ranks
  every operation over budget at end of run and dumps the full record to `debug/dumps/`. It reads
  Playwright's own step stream, so no spec needs instrumenting, and it never fails a test.

**Core context-menu entries are chosen through `chooseContextMenuEntry(page, entry)`** (`tests/e2e/contextMenu.js`),
never a bare `entry.click()`: it clicks, then waits for `#context-menu` to detach. Core `ContextMenu#close()` removes
the instance's CURRENT menu element after its 200 ms collapse, and every document click while `ui.context` is set
queues another close, so clicks made during the collapse leave closes pending that remove the instance's next menu
(a re-opened pack or folder menu never shows). Dismissing an open menu without choosing uses
`ui.context?.close({ animate: false })`, which closes synchronously. No test scans for a direct context-menu entry
click; whoever writes a spec uses `chooseContextMenuEntry` and review checks it.

**Test rules** (`.claude/claude.md` "Project Scope"). No unit test scans test code. Whoever writes a test follows
the rules (genuine live documents, no fake write surfaces, real user flows), and review checks them.

**No migration tests while no migration is active** (`.claude/claude.md` "Project Scope"). The migration system
(`MigrateWorld`, version chains, the stored-actor walker, `migrateData` hooks) stays in `src/helpers/migration/` with no
unit or e2e test; the nine migration unit files and the four migration specs were deleted. It was confirmed once
(2026-10-02) by a one-off run on documents the flows above made in `test-titan`, with a temporary version-1 entry in
`ActorMigrations.js` and `ItemMigrations.js` (reverted, never committed). Measured: a Disabled load showed no dialog and
logged no migration line; a Prompt load showed `ConfirmMigrateWorldDialog` and Cancel changed nothing; an Automatic load
showed no dialog, logged `TITAN | Starting world migration.`, `TITAN | Stored-actor migration finished: 0 updated, 0
skipped; failures: 0.` and `TITAN | World migration complete.` (core echoes both notifications to the console), and every
world actor, owned item and world item (11) reached `documentVersion` 1 carrying the entry's flag, while a locked world
pack's actor, the pack lock and an unlinked token's stored delta were unchanged; a Prompt load afterwards showed no
dialog. No test covers the stored-actor write paths (condition sync, effect Item conversion, a locked pack's unlock and
relock, Adventure writes, orphaned-token failures), version-chain failure semantics, the `onceReady` boot path (the
five deleted `OnceReady.test.js` tests: Disabled scans nothing, Prompt asks first, a client that is not the active GM
skips the migration, and a failed migration still registers the `hotbarDrop` hook and builds the Player HUD; the
one-off ran only the success path), or the chat-message `migrateData` hoists. A synthetic token actor reads its base actor's merged data, so after a migration it shows the base actor's
version.

**E2E census** — every world document an e2e test creates (actor, item, scene, folder, macro, roll table, journal
entry, playlist, cards, world compendium label) is named with the `E2E ` prefix; the sweep finds leftovers by that
prefix alone, so an unprefixed name survives every cleanup. `tests/e2e/census.js` exports
`takeCensus(page, { since? })` (per kind: `E2E `-prefixed actors, items, scenes, folders, macros, roll tables,
journal entries, playlists, cards and world compendia; tokens on any scene whose actor does not resolve; hotbar
entries of the four E2E users whose macro does not resolve; chat messages from `since` on when given),
`sweepWorld(page)` (removes all of those except messages through the API — scenes first, folders after their
contents, orphaned tokens and dangling hotbar slots last; never User documents) and `countCensus(census)`. Both
`takeCensus` and `sweepWorld` throw before reading or deleting anything unless `game.world.id` is `test-titan`
(`CENSUS_WORLD`; `assertCensusWorld` is exported and the teardown calls it too). Run directly
(`node tests/e2e/census.js [--sweep]`) it logs in to localhost:30000 as `E2E GM 1`, prints JSON counts, and exits 1
when the final census is not empty.

**E2E registry, flows and teardown (documents made through real user flows)** — a test of a document runs on a document
a flow made. `tests/e2e/registry.js` keeps the running list in `test/state/registry.json` (gitignored; not `test/build/`,
which the probe build empties): `runStartedAt`, every created document `{ key?, documentName, id, parent (uuid|null),
sceneId?, packId?, createdBy (spec file) }` (a world compendium is `documentName: 'Compendium'` with the pack collection
id as `id`), hotbar assignments `{ userId, slot, macroId }` and `settings` `{ scope, namespace, key, prior }`. It is a
file because it must outlive a spec file, a mid-file reload and the worker, and be read by the runner; the file is
overwritten, never deleted. Exports: `record`, `recordHotbar`, `recordSetting` (a setting keeps its FIRST prior value),
`startRun`, `resetRegistry`, `hasWork`. The module is a leaf (it imports no flow). `flows.js` holds `resolves(page,
entry)` and `shared(page, key)` (the id of the shared fixture `key` when the list has it and it still resolves,
otherwise a new one made by the flow in `SHARED_FIXTURES` and recorded under the key; shared fixtures are never deleted
mid-run, and a test that edits one restores the field through the same control or uses a per-test document).
`tests/e2e/flows.js` has one exported async function per flow; each drives the DOM like a user, reads the id of what it
made from the DOM or a read-only API call, records it and returns it; it never creates, updates or deletes a document
through the API. Flows: `createActor` (Actors tab Create button and core dialog), `createOwnedItem` (the
Abilities/Spells tab add button or the Inventory tab's add button and its item-type dialog, then the new item is
renamed in its own sheet opened by the row's Edit button), `dragItemOntoSheet` (drags an Items-tab entry onto the
open actor sheet), `addEffect` (the Effects tab add button, the effect renamed in its sheet, and optionally its
duration type chosen in the sheet header), `addCheck` (the Checks tab add button, then the row's label input and,
when asked, its Resolve Cost input, Resistance Check select and Opposed Check box),
`addRulesElement` (the Rules Elements tab add button, the operation select, and the `ccm-*` selects and value input
of a conditional check modifier), `createWorldItem`, `createFolder` (the directory's Create Folder button and the folder
configuration window; `createActor` and `createWorldItem` take a `folderId` and then use that folder's own Create
button, which creates the document inside the folder), `addCustomTrait`, `addAttack`, `enableAspect` and
`addCustomAspect` (the Add Custom Trait dialog with an optional description, the weapon Attacks tab add button,
the spell Standard Aspects toggle with its option toggles and resistance select, the spell Custom Aspects tab add
button), `pickPortrait` (the
sheet's portrait button opens Foundry's own file picker, the Core Data tab is chosen when it is not the open one (the
picker of a player actor opened on the User Data tab: `.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-1.log`, `actor picker tabs`),
the directory is typed into the address bar and the file is clicked and confirmed; nothing is stubbed),
`createTrayEffect` (the Effect Tray's sidebar tab button and create button in an unlocked effect pack, the effect renamed in the sheet the
create opens), `createScene` / `viewScene` / `activateScene` (Scenes tab, entry context menu View/Activate; core
views a scene created while none is viewed, so `createScene` then waits for the draw, and `viewScene` skips the menu
for a viewed scene), `placeToken` (drags the actor's directory entry onto a free spot near the centre of `#board`,
which core handles as an Actor drop; the spots are a 7-column grid with 130 px spacing and a spot that already holds a
token is skipped, because two tokens dropped on one point took the same `x`/`y`
(`.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-1.log`, `stack`); 34 tokens fit at 1920x1080 and the 35th drop timed out, cause not
determined (`.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-2.log`); open windows are closed first and the Escape key releases the
controlled tokens: measured on a scene with `tokenVision` true, a second token had `visible` false while the first
was controlled and `visible` true after Escape, and with `tokenVision` false it stayed visible while the first was
controlled (`.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-1.log`, `A controlled`, `after Escape`, `tokenVision false`), and a token that is
not visible takes no pointer events), `toggleTokenLink`, `unlinkPlacedToken` and `controlPlacedToken` (the
sheet header buttons; the token flows close the open windows, release control, move the pointer onto the
token and wait for `token.object.hover` before the double-click that opens the sheet (`unlinkPlacedToken`,
which then waits for the reopened synthetic actor's sheet) or the click that takes control
(`controlPlacedToken`)), `targetPlacedToken` / `releaseTargets` / `targetedTokenIds` (core's Target key T on
the hovered token, Shift+T adds; `game.user.targets` then holds real Token objects, as
`checks-opposed.spec.js` uses), `createCompendium` / `setCompendiumLocked` (Compendium tab Create dialog, entry
context menu Lock/Unlock), `putInPack` (opens the pack's popout window and drags the world entry onto its
`.directory-list`; the pack index is polled for the new id; the caller passes the world entry's locator, and the flow
reopens that entry's sidebar tab before the drag). The creation dialogs are `DialogV2` forms whose content
lacks the template's `form#document-create` id, so the flows find them by `dialog.application.dialog` with the
`.dialog-content` fields. A flow opens the sheet it drives with `openSheetByUuid` and clicks its tabs inside that sheet
(`openTab`), so another open TITAN sheet's tab strip is never clicked; the Standard Aspects tab and the sidebar both
use the class `aspect`, so the flow looks inside `.standard-aspects-tab`. A TitanDialog
id carries a generated suffix (`[id^="add-inventory-item-dialog-<actorId>"]`). A document's sheet instance keeps its
last tab, so a shared fixture's sheet can come up on the tab a flow last used; a test that needs a tab opens it.
`shared(page, key)` and `sharedUuid(page, key)` (the uuid, for `openSheetByUuid` and `fromUuid`) serve `SHARED_FIXTURES`:
`player`, `npc`, the seven world items `weapon`, `ability` (one check), `spell` (the Void custom trait; a range aspect of 10 and a rounds-scaling
duration aspect, as the old localization seed held, and an inflict-condition aspect with the Stunned option and a
Resilience resistance; stored values: `.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-3.log`, `spell aspects`), `armor`, `shield`,
`equipment`, `commodity`; `effectHost` (a player that holds only the two effects) with `effect` and `conditionalEffect`
(permanent, one conditional dice modifier); `roller` (a player owning copies of the shared weapon, spell and ability,
dragged onto its sheet); `situationalActor` (a player owning an ability with a conditional dice +2, a conditional
Advantage and a conditional dice +1 situation); `bulkActor` (`BULK_COUNT` = 12 abilities, an equipment with 12
checks and an effect with 12 rules elements; measured at every tested zoom in
`.superpowers/sdd/test-suite-rewrite/phase-3/entry-count-measure-12.log` (local): the Abilities tab has 225 px
to scroll at the least, the Checks tab 3934 px and the rules elements list 1378 px; the build took 69.1 s with 30
entries of each in one run (`.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-1.log`, `build bulkActor`),
so its first consumer, the browser zoom describe of `character-sheet-layout.spec.js`, raises its own timeout);
`scene` (created and viewed); `trayPack` (an unlocked `ActiveEffect` pack holding one effect).
`playwright.config.mjs` sets `use.actionTimeout` to 10 s (about ten times the longest action measured in a full run,
916 ms), so a flow that waits on a missing element fails after 10 s; a wait that legitimately takes longer passes its
own timeout.
`tests/e2e/global-teardown.js` (Playwright `globalTeardown`) launches one Chromium, logs in as `E2E GM 1`, asserts the
census world and in order deletes the list through the API (combats; tokens by their scene; scenes; embedded
documents by their parent; world actors, items, macros, roll tables, journal entries, playlists, cards, folders; recorded
pack documents whose pack is not recorded, unlocked for the deletion and locked again; world compendia after
unlocking), clears each recorded hotbar slot that still
holds its recorded macro (`user.assignHotbarMacro(null, slot)`: deleting a Macro does not clear its slot, which lives on
the User), deletes every chat message with `timestamp >= runStartedAt`, restores each recorded world setting, runs
`sweepWorld` (its per-kind counts are printed; they are not a failure in Phases 1-5) and `takeCensus` (which must be
all zero or the run fails), prints one `e2e teardown (...)` JSON line and, only after the census is zero, resets the list
(a failed teardown leaves the list for the next `global-setup.js` to retry; shown by forcing a non-zero census).
`global-setup.js` runs the same `tearDownAndReport` over a list that still shows a run in flight or holds entries (a crashed run), then `startRun()`
before the probe build. `settings.js` `setWorldSetting` records the prior value before it writes; `setClientSetting` and a
`game.settings.set` made directly in a spec are not recorded. A client-scope setting lives in the browser context that
set it (measured: a value set in one context read its default in another context and in another browser), so it ends
with its context and needs no restore.

**No e2e operation may exceed 1 second**, and wait ceilings are set to that budget so a breach fails loudly instead of
silently absorbing 15s: explicit `timeout:` values are `1000`. Inherently multi-second waits are deliberately exempt:
- a `game.ready` world boot (`fixtures.js`; the teardown's and the setup recovery's own login goes through it too);
- a mid-file reload through `world.js` `reloadWorld(page, { ready })` (15 s for the `/game` URL, 60 s for the
  readiness predicate, `game.ready` by default), used by the last test of `condition-description.spec.js`, the reload
  test of `player-hud-layout.spec.js` and both portrait tests of `surfaces.spec.js`;
- a scene draw on the canvas after a scene is created while none is viewed, viewed or activated (`flows.js`
  `waitForSceneDrawn`, 30 s);
- building the `bulkActor` shared fixture (`flows.js`; through the sheet controls, `BULK_COUNT` abilities,
  checks and rules elements; 69.1 s with 30 of each in one run,
  `.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-1.log`), whose first consumer raises its own
  timeout;
- a second browser context finishing login (`multiClient.js`, used by the last test of `effect-tray.spec.js` for its
  E2E GM 2 client);
- core's 2 s scrolling text finishing before the viewed scene is deactivated (`condition-description.spec.js`, last
  test, 10 s; OPEN_BUGS #114).

The tests that reload raise `test.setTimeout` to 120 s or 300 s (`condition-description.spec.js`'s last test: 120 s).
Do not sweep those to 1s. A ceiling is a failure bound, not a duration: a `waitForFunction` returns the moment its
predicate holds. **`titanWait`'s default timeout is also 1000ms** (`tests/e2e/poll.js`), so the budget is the default
everywhere and the exceptions are the few explicit overrides — pass an explicit `timeout` only for an inherently
multi-second wait, such as a world boot.

Invalid core or priority values are hard errors, never silent fallbacks to the default.

**Fixture hygiene:** `controlFixtureActorToken` creates a fallback scene only when none is active and
reuses a same-named one thereafter, so the world holds at most one scene per fallback name. It places the
token only once `canvas.ready && canvas.scene?.id === scene.id`: a token created while a just-activated scene is
still drawing gets an unparented placeable, and a later actor update throws in core's `RenderFlags.set` because
`canvas.pendingRenderFlags` does not exist until the draw activates its ticker (measured; `docs/CLOSED_BUGS.md`
#113). Killing a full-suite run mid-flight skips every `afterAll` and leaves its fixtures behind; accumulated
fixtures show up as slow LOGIN (`Navigate to "/join"` and `game.ready`), not as slow tests.

**The e2e viewport must stay at or above Foundry's 1366x768 minimum** (`use.viewport` is 1920x1080).
Below it, Foundry raises a permanent resolution notification whose `#notifications` banner spans the
full viewport width near the top and **intercepts pointer events on anything under it** — the player
HUD included, which makes row clicks retry until the test times out with no visible cause.

**`createEmbeddedDocuments` return order is NOT input order.** Never map the returned array by index
to your payloads — resolve created ids by NAME afterward (`actor.items.getName(payload.name)?.id`),
as the player-hud specs' `seedDocuments` helpers do. Index-mapping produced wrong-id assertions that
only failed in multi-payload creates.

**One-shot `boundingBox()` snapshots race layout settling.** `boundingBox()` and in-page
`getBoundingClientRect()` are non-retrying reads, and `toBeVisible()` resolves at the START of a reveal
transition — so a geometry read gated only on visibility samples a mid-animation frame. Two settling
mechanisms, in preference order:

1. **Event-driven (preferred): `waitForAnimations(page, selector)`** (`tests/e2e/world.js`) awaits every
   finite transition/animation under a subtree via each `Animation`'s `finished` promise (infinite
   animations excluded; a cancelled animation counts as settled). Use it before any geometry read that
   follows a reveal, drag, edit-mode toggle, or sidebar expand — `#titan-player-hud` is the HUD root.
2. **Retry (when the settle has no event, e.g. a ResizeObserver re-flow after a setting write):**
   `expect.poll` re-reading the boxes each attempt — see `expectBoxes` in
   `player-hud-action-menu-layout.spec.js`.

**Chat cards render TWICE — always target `#chat`.** Every TITAN card mounts in the persistent `#chat`
log AND as a transient toast in `#chat-notifications`. They are siblings under `#ui-right` and the
toast is FIRST in DOM order, so an unscoped `.message[data-message-id=…]` locator with `.first()`
silently selects the toast — which has no layout box for ~500ms, is stable only to ~4750ms, and
**removes itself from the DOM at ~5250ms**. Always scope to `` `#chat .message[data-message-id="…"]` ``
(exactly one match, so `.first()` becomes redundant). The exception is
`chat-message-mounts.spec.js`, which drives both panes deliberately.

Because the e2e client starts with the sidebar COLLAPSED, `#chat` sits at x=1920 in a 1920-wide
viewport — off-screen. Text and `toBeVisible()` assertions still pass there (non-empty bounding box),
but a click fails with "element is outside of the viewport". Any spec that interacts with a card must
call **`showChatLog(page)`** (`world.js`) in `beforeAll`.

Creating a `ChatMessage` document does not render it, so still gate a one-shot chat-DOM read on the
mounted card: `expect(page.locator('#chat .message[data-message-id="…"] .check-chat-message')).toBeAttached()`.

This class of race stays latent while rendering is slow enough to mask it: under the SwiftShader software
rasterizer the Playwright round-trip outlasted the transition, and enabling GPU rendering exposed it.

**Foundry core Escape releases token control.** Any canvas-overlay UI that closes on Escape must
consume the event in the WINDOW CAPTURE phase (`onkeydowncapture` + `stopImmediatePropagation`),
or core deselects the token and selection-driven UI unmounts mid-interaction (the player HUD's
cascade and effect popout both do this).

**The action menu's open category persists across e2e tests.** `openCategory` lives in the shared
layout state and `afterEach` only closes apps, so a cascade left open by one test survives into the
next. A test that clicks the SAME category the previous test left open TOGGLES it closed; dismiss any
open flyout first (`Escape` when `player-hud-flyout` is present), as the `openCategory` helper in
`player-hud-action-menu-layout.spec.js` does.

**Mid-file `page.reload()` idiom.** Steps (3)-(5) below are `tests/e2e/world.js` `reloadWorld(page, { ready })`,
where `ready` is the in-page predicate of step (5) (`game.ready` by default); a spec never repeats them inline.
`expectActiveGM(page)` (also in `world.js`) asserts `game.users.activeGM?.isSelf`, because only the active GM migrates
and core's `getDesignatedUser` makes the active GM with the highest role that GM. The last test of
`condition-description.spec.js`, the reload test of `player-hud-layout.spec.js` and the portrait tests of
`surfaces.spec.js` call `reloadWorld(page)` with the default predicate. A spec navigates only through
`reloadWorld` and `joinWorld` (the one `.reload(` in `world.js`
and the one `.goto(` in `fixtures.js`), never an inline `page.reload(`, `location` change or `goto(`; no test scans for
it, and review checks it. `page.on('console')` and
`attachPageErrors` listeners survive reloads (they attach to the Page object). Sequence:
(1) PROVE the first boot's ready work finished BEFORE clearing the capture buffer —
`waitForFunction(() => !!game.titan?.playerHud)`, since the Player HUD is built after the GM's migration attempt
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

**E2E: scope text locators to the sheet** — every sidebar tab is rendered at ready and hidden while inactive, and
the Compendium directory renders each pack title as a `<strong>` (the compendium module's packs are labelled
"Abilities", "Spells", "Effects", …), so a page-wide `getByText(label).first()` can resolve to a hidden element
and time out. Sheet tabs are clicked with `openSheetTab(page, label)` (`tests/e2e/fixtures.js`, scoped to
`.application.titan-document-sheet .tab-list`). A HUD category persists open across tests and clicking an open
category closes it; Escape with no flyout open falls through to Foundry and releases token control.

**E2E sheet-row tests (`character-sheet-rows`, `sheet-filters`, `custom-traits`, `character-sheet-layout`)** — notes
from writing them; each says whether it was measured (with its saved log, under
`.superpowers/sdd/test-suite-rewrite/phase-3/`, local), read (with the source) or inferred:
- A document's sheet instance keeps each row's expanded state and each tab's filter text across renders, so closing the
  window does not reset them: a helper clicks an expander only on a collapsed row, and a test that types into a filter
  empties it again before it ends. Inferred from the tests, not measured on its own: a later test saw the text an
  earlier one typed.
- An edit that must reach an open row is made in the item or effect sheet opened by the row's Edit button (header
  inputs found by their label). `NumberInput` commits on the native change event and on Enter (read:
  `src/helpers/svelte-components/input/NumberInput.svelte`, the comment above the commit function), so `fill` then
  `blur`, and a store read after it needs a poll. An effect sheet's initiative input slides in beside the remaining
  input, so a test waits for both (inferred from a locator that resolved too early; no log saved).
- The weapon item sheet renders more than one `.sidebar` element, and a weapon's Attacks tab more than one `.traits`
  element (the sidebar's trait list and each attack's `.traits:has(.traits-header)`). A skill row's check button
  contains its own `.stat`, so the training inputs are under `.stats .stat`. A row's Equipped toggle is in its controls
  and, for an item with checks or attacks, also in its expanded content. Observed as Playwright strict-mode violations
  while writing the specs; no log of them was saved, so these are inferred from the locators that failed.
- A refused delete (a `preDelete<Document>` listener that returns false, installed in the page and removed in a
  `finally`) leaves the document, its deletion mark, an equipped armor's slot and the row's expanded state as they
  were; a listener counts the refusals so the test waits for the delete to have run. Effects are never marked
  (`TitanItem#safeDelete` is the only writer of the mark, read). Gates: `gates-fix-after.log`,
  `gate119-predelete-after-fix.log` and `gate103-else-before-fix-item.log` (it fails with the confirm branch's
  `else` removed), under `.superpowers/sdd/test-suite-rewrite/phase-3/`.
- When a test fails, Playwright restarts the worker and runs the file's `beforeAll` again, which then finds a second
  document of the same name and fails inside the flow; the first failure is the one to read. Measured: the second
  failure in `gates-fix-before.log` (two `E2E Rows Actor` directory entries).

**E2E drag and item sheet tests (`drag`, `rules-element-editor`, `item-sheet-rolls`, `spell-sheet`)** — notes; each says
whether it was measured (with its saved log, under `.superpowers/sdd/test-suite-rewrite/phase-3/`, local), read (with
the source) or inferred:
- A grip drag (`dragTo` from a row's `[data-drag-handle]` to another row, with `targetPosition`) moves a row only when
  both ends are on screen. Measured: with three checks, one of them expanded (302 px), in an item sheet at its default
  650 px height, the first row was scrolled out of view behind the filter and two drags from its grip to the last row
  moved nothing (`zz-check-drag.log`, `zz-check-drag.png`); `drag.spec.js` sets each sheet to `top: 10, height: 1000`
  with `setPosition` (a window size, not a document). The drop half decides before or after: `computeIndex` compares
  the pointer with the row's midpoint (read: `DragReorderActions.js`), so a move to the end drops in the lower half of
  the last row, and the drag tests collapse the first and last rows so that half stays short and on screen.
- A list's `<ol>` renders only when the list has a row (read: `{#if ...length > 0}` in `ItemSheetRulesElementsTab.svelte`
  and `ItemSheetChecksTab.svelte`), so a sheet that receives a copied row needs one row of its own to drop on.
- The Casting Check tab has no control that changes an aspect (read: `SpellSheetCastingCheckTab.svelte` holds only the
  attribute, skill, auto-calculate, difficulty and complexity controls) and a sheet shows one tab at a time, so the
  re-pricing test has a second client (`E2E GM 2`) change the range on the Standard Aspects tab while the first
  client's Casting Check panel is open.
- The Casting Check panel's list scrolls once the spell has 13 custom aspects at the default sheet size: 1 to 8 gave no
  overflow, 9 and 10 gave 2 px, 11 and 12 gave 39 px, 13 and 14 gave 77 px (`spell-overflow-measure.log`); the test
  scrolls 40 px and uses 14.
- A folder's own header Create button creates a document inside that folder (read: `templates/sidebar/partials/
  folder-partial.hbs`, `create-entry`, and `DocumentDirectory#_onCreateFolder` / `_onCreateEntry` in Foundry 14.364 at
  `C:\FoundryVTT\V14\dev\foundry`), which is how `createWorldItem` and `createActor` fill a folder. Dragging a folder's
  header onto an actor sheet is dispatched to `TitanActorSheet#_onDrop` as `type: 'Folder'` (read).
- With the inverted `_onDropFolder` an Actor folder dropped on an actor sheet created no item and the harness failed the
  test on a core `preCreateDocumentArray` validation error (`actor-folder-old-code.log`), so the Actor folder step of
  the folder test fails on the old code as well as the Item folder step.

**E2E browser-zoom emulation** — the browser zoom tests of `character-sheet-layout.spec.js` emulate page zoom
z through a CDP session:
`Emulation.setDeviceMetricsOverride({ width: 1920 / z, height: 1080 / z, deviceScaleFactor: z })`. Foundry
re-clamps and repositions open windows after the resize, so layout assertions poll until they settle. Each
zoom step first checks that the list overflows its scroll area, so a fixture too short to scroll fails
instead of passing.

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

**Multi-client harness** — `tests/e2e/multiClient.js` (Phase 4) provides three helpers for tests that
require simultaneous Foundry sessions: `withClients(browser, clientSpec, fn)` creates one independent
`BrowserContext` per entry in `clientSpec` (a `{label: userName}` map), logs each in via `login()`, then
calls `fn(pages)` where `pages` maps each label to its `Page`, then flushes each client's errors
(`flushPageErrors`) for the harness gate. All contexts are closed in `finally` even if the callback or a login
throws. `seedEncounterForClients(gm, viewers, seed)` seeds an encounter unstarted on the GM's client, calls
`viewCombat` on every other client, then starts it: a combat tracker keeps viewing the combat it has (the world's own
scene-less combat, from the first render), and core's `CombatTracker#_onRender` throws on each round or turn update of
a combat it does not view, so a client must view the encounter before it starts.
`awaitUsersActive(page, userNames)` polls `game.users.getName(name)?.active`
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
(text set through `textContent`, never interpolated HTML). Props are recursively scanned for the one marker
shape that survives the Node↔page boundary in place of an un-serializable reference: `{ __probeComponent: name }`
resolves to a registered component constructor (for component-valued props). Function-valued props cannot be
probed; no registered primitive takes one. The probe is NEVER part of a system build: it is built as a
standalone IIFE by `vite.probe.config.mjs` (`createSveltePlugin({ emitCss: false })`) to
`test/build/probe.iife.js` (plus an extracted global stylesheet `test/build/probe.css`). `probeBundleEntry.js`
is that bundle's entry — it calls `registerProbe()` immediately when `game.titan` already exists, else on the
`ready` hook. Playwright injects it on demand: `componentProbe.js`'s `mountProbe` → `ensureProbe(page)` adds
`probe.css` then `probe.iife.js` (the IIFE registers `game.titan._probe`) only when the API is absent. There
is no `__TITAN_PROBE__` define and no dynamic `import()` anywhere — the production bundle is structurally
probe-free. The Playwright page object `tests/e2e/componentProbe.js` exposes
`mountProbe`/`readProbeEvents`/`clearProbeEvents`/`unmountAll`, the marker builder `probeComponent(name)`,
and `documentContext({ isOwner })` (a minimal non-reactive `document`
context for components reading `getContext('document')`); callbacks are instrumented INSIDE `page.evaluate`
(functions cannot cross the Node↔page boundary) and record into `window.__titanProbeEvents`. A component that persists
through `document.data.update` and must re-render on it (the rules-element settings editors) is mounted on
`syntheticDocumentContext(system)`: the page replaces its `{ __probeDocument: true, data }` marker with a
`ProbeDocument` (`src/test-probe/ProbeDocument.svelte.js`), whose `data` is the plain object the test gave and whose
`update` merges changes into it and re-renders the readers, as the real bridge does on a document update.
`readProbeContext(page, probeId, path)` reads what the component wrote into that object (through
`game.titan._probe.context(id)`). Without it the plain context is not reactive: a write through a bound prop changes the
object and the DOM keeps what it first rendered. `component-probe-inputs.spec.js` uses it for stored data no control
produces: an Advantage value outside the four levels, an unknown check type, and a Multiply Base or Multiply Sum
element with no `rounding`.

**Coverage is complete:** all **83** primitives in `src/helpers/svelte-components/**` are registered in
`componentRegistry.js` and probed (the registry also holds the three rules-element settings editors
`ItemSheetConditionalCheckModifierSettings`, `ItemSheetMulBaseSettings` and `ItemSheetMulSumSettings`). Specs are split by family (each describe = one component):
`tests/e2e/component-probe.spec.js` (core: `Button`, `TextInput`, `NumberInput`, `IntegerInput`,
`CheckboxInput`, `Select`, `LabelTag`); `-context.spec.js` (`RichText`, the `EffectTag` family + its six
duration-variant wrappers, `CondensedCheckButton`, `ProseMirrorEditor`); `-tags.spec.js`
(17 `tag/` primitives incl. `EditDeleteTag` whose probe also locks in the FontAwesome `font-family`
regression); `-labels.spec.js` (5 `label/`); `-inputs.spec.js` (8 `input/` non-select, and the editors above); `-selects.spec.js`
(16 `input/select/` typed wrappers); `-buttons.spec.js` (13 `button/`); `-display.spec.js` (`Meter`, `Text`,
`Tabs`, `ScrollingContainer`, `LabeledElement`, `BorderedColumnList`, `TagContainer`). Every primitive
carries a `testId` (`data-testid` passthrough) **except `Text`**, which renders `{processTextData(text)}`
inline with no root element — a wrapper would change its DOM contract, so its probe locates via the probe
container selector instead. Wrapper components forward `testId` to their inner primitive's rendered root
(e.g. wrapper selects → the `AttributeInput`/`RarityInput`/`ResistanceInput` div; bare selects → the inner
`<Select>`'s combobox button (`[role="combobox"]`); `ImagePicker` → `ImageButton`'s `<button>`). To probe
a new primitive: add it to `componentRegistry.js`, add a `testId` prop on its root if it lacks one (never
add a wrapper element solely to host it), append a describe block, then re-run the spec — `test:e2e`'s
global-setup rebuilds
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

**`buildFlatModifierAbilityData` builder** — `tests/shared/builders.js` exports
`buildFlatModifierAbilityData(name, values)`: accepts a `string` name and a `number[]` of modifier values; returns an
`Item.create` payload of type `'ability'` with one flatModifier rules element per value, each targeting
`selector: 'attribute'`, `key: 'body'`, and `uuid: 'e2e-flatmod-{index}'`. The companion Vitest unit test lives in
`tests/unit/builders.test.js`.

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

## Compendium spreadsheet conventions

Exported sheets always carry the fixed leading columns `_id, _parentId, _folder, name, type, img, sort`
before type-specific `system.*`/`flags.*`/`prototypeToken.*` columns. Wide layout expands arrays into
indexed dotted columns (`system.attack.0.damage`); relational layout puts each array in its own
`<type>.<arrayPath>` child sheet keyed by `_id` + a dotted `_index`. A `_manifest` sheet records the
layout, pack type, and sheet-to-type/array-path mapping; import falls back to "every sheet is a
wide-layout document sheet named after its type" when no manifest is present. CSV cells inside an
untyped bag (rules elements, traits, `flags.*`) auto-detect booleans/numbers/null; wrap a cell in
literal double quotes (e.g. `"5"`) to force a literal string. See
`docs/superpowers/specs/2026-09-10-compendium-spreadsheet-design.md` for the full design.

**Schema resolution merges embedded types** — `ResolveTypeSchemas.js`'s `resolveTypeSchemasForPack(packType)`
returns the flat subtype -> schema-info map for a pack's ENTIRE embedded graph, not just its own document
type: an Actor pack merges `Actor` + `Item` + `ActiveEffect` subtypes (owned items and their effects appear
in export/import rows too), an Item pack merges `Item` + `ActiveEffect`, and an ActiveEffect pack is just
`ActiveEffect`. Safe because `system.json`'s `documentTypes` never reuses a subtype name across those three
document types, so `readTables`/`buildTables`/`planImport` can key the merged map by subtype name alone.
`exportCompendium` and `planImport` both call it (not the single-type `resolveTypeSchemas`).

**Sheet names are truncated once, at the Workbook level** — `uniqueSheetNames` (in
`src/spreadsheet/codec/Workbook.js`, not `Xlsx.js`) strips Excel-forbidden characters (`[ ] : * ? / \`) and
truncates/de-duplicates names to Excel's 31-character limit. `buildTables` applies it to the data-sheet
names BEFORE writing the `_manifest` sheet, so the manifest's recorded `sheet` values and the actual
`Sheet.name`s are always the same final names in both XLSX and CSV. `encodeXlsx` still calls it too, which
is a no-op on already-final names but protects a hand-built Workbook that skipped `buildTables`.

**`forceStringCell` protects number/boolean-looking strings in untyped bags** — `DecodeCell.js` exports
`forceStringCell(text)`: wraps `text` in double quotes (the same convention `decodeLiteral` unwraps) whenever
`decodeLiteral(text)` would not hand back the identical string (numbers, `true`/`false`/`null`, and
already-quoted text all fail that check); an empty string is left unchanged (never quoted) since
`decodeCell`'s untyped-bag blank rule already treats `''` as absent. `buildTables` applies it to every string
value whose column is neither a fixed column (`FIXED_COLUMNS`) nor schema-typed
(`lookupFieldSchema(typeSchema.fieldTypes, path) === undefined`), in both wide cells and relational
child-sheet cells.

**`FolderPath.js` owns folder-path splitting and escaping** — `resolveFolderPath`/`splitFolderPath` (moved
out of `ApplyImport.js`, which still imports `splitFolderPath` from here) join/split a folder chain as a
`/`-separated path of escaped names: a literal `\` is escaped to `\\` and a literal `/` to `\/` (backslashes
escaped first, so the escape-introduced backslash is never mistaken for a literal one).  `splitFolderPath`
parses with a single left-to-right scan honoring both escapes; `unescapeFolderName` reverses the per-segment
escaping. The empty string is reserved for "no folder" (the pack root) and is never produced by a real,
non-empty folder-name chain, since every escaped segment is non-empty — but `splitFolderPath('')` itself
still returns `['']` (one empty segment), so callers must filter falsy paths before calling it, the way
`ApplyImport.js`'s `resolveFolders` does.

**Two loud guards reject unrepresentable relational shapes** — in `BuildTables.js`'s relational builder:
`detectArrayPaths` throws when a concrete path has two consecutive numeric segments (a primitive array
nested directly inside another primitive array has no relational representation); `buildChildSheet` throws
when an array-of-objects sub-field is named `_id` or `_index` (both are reserved relational-layout column
names). Neither shape exists in any current `src/document/types/**` shape template, so these guards are
dead in shipped data and exist only to fail loudly if a future template introduces one.

**Relational import rejects ambiguous blank-`_id` new documents** — `ReadTables.js`, relational layout only,
when a document sheet with a child sheet (i.e. an array field exists for that type) has two or more rows
with a blank `_id`: every relational child row is merged back onto its parent by raw `_id`, so two or more
blank ids would collapse onto the same map key and cross-contaminate each other's array data. The importer
throws instead, naming both row numbers and telling the user to give each new document a file-local key.
Wide layout (no child sheets to merge) and a single blank-id row in relational layout both stay allowed.

**`EmbeddedPackIndex.js` resolves embedded parents from the target pack** — `buildPackEmbeddedIndex(targetPack)`
indexes every document already embedded in the pack (owned items, those items' effects, and top-level
documents' own effects) by id, mapping to `{document, parentId, depth}` (depth 1 = an owned item or a
top-level document's own effect; depth 2 = an effect on an owned item). Shared by `PlanImport.js` (resolves a
row whose parent id is absent from the uploaded file but already exists in the pack — e.g. a file containing
only a child-sheet row for an item embedded on an existing actor) and `ApplyImport.js` (resolves a row's
actual parent document INSTANCE when that parent is itself embedded, since `pack.getDocument` only finds
top-level documents).

**Import preview invalidates on target/option change** — `ImportDialogShell.svelte` holds the last computed
plan in `plan = $state(null)`; an `$effect` reading `targetCollection` and `deleteMissing` resets `plan` to
`null` whenever either changes (Apply stays disabled until the user re-runs the preview against the new
target/options), and choosing new files does the same in `onFilesChosen`.

**CSV export always writes a zip** — the `_manifest` sheet is always present alongside the data sheet(s), so
a CSV export always has 2+ sheets; `ExportCompendium.js` has no single-sheet bare-`.csv` branch, it always
`zipFiles`s the per-sheet `.csv` files and calls `saveDataToFile` with `'application/zip'`.

## Style rules live in CLAUDE.md

`.claude/CLAUDE.md` is the single authority for all code-style, formatting, and documentation rules for this
project — covering the 120-character wrap limit, multiline formatting for objects/arrays/Svelte components,
strict typing requirements, JSDoc conventions, and comment grammar rules. This skill file does not restate
those rules; read `.claude/CLAUDE.md` before writing or reviewing any code in this codebase.
