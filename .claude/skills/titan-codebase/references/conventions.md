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
`DEFAULT_OPTIONS.form.handler` is a no-op (`ignoreFormSubmission`): the sheet's `<form>` has no named fields, the
Svelte components write the document themselves, and core's handler would send `document.update({ type })` (measured
2026-10-09: `{type: 'weapon'}`) for every click on a `<button>` without a `type` attribute inside the form (the Add
Check button) and for Enter in a text input (CLOSED_BUGS #149).
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
(`DocumentOwner*` components). Core never enables the controls again, so `TitanDocumentSheet` remembers the ones
core's disable switched off, and `syncDisabledControls` (called from `DocumentSheetShell`'s effect on
`document.data.isOwner`) disables the controls of a sheet that has become read-only and enables the remembered ones
when it becomes editable, for sheets that core does not render again as well. A control a component disabled itself
before core's disable is not remembered and stays as the component set it.

**Shared vocabulary constants** — a string vocabulary that code and tests both name is defined once in `src/system/`
and imported; a component-local or test-local copy is a defect. Effect duration types: `DURATION_TURN_END`,
`DURATION_TURN_START`, `DURATION_INITIATIVE`, `DURATION_PERMANENT`, `DURATION_CUSTOM`, the list `DURATION_TYPES` (the
order the effect sheet's select offers), and `TURN_DURATION_TYPES` (the turn pair, which is also the `selector` of the
turn rules elements: turn message, fast healing, persistent damage) in `DurationTypes.js`. The report record and the
turn-message cache are keyed by these values and read with bracket access (`effects[DURATION_PERMANENT]`). The key
addressing every key under a rules-element selector: `ALL_KEY` (`AllKey.js`), expanded by
`CharacterDataModel._expandAllKeyElements` and offered by the stat key selects through `allowAll`. `setSum` modes:
`SET_SUM_MODE_SET/MIN/MAX` and `SET_SUM_MODES` in `SetSumModes.js`, where the mode table (mode to target total, read by
`getSetSumTarget`, which `computeSetSumDelta` calls) is the source of the list, so a mode has a rule and an editor entry
together. Tests name these constants for inputs; an expected stored value (a seeded condition, a factory default, pack
JSON) stays a literal so a changed constant fails it. A legacy stored form (the legacy effect Item's `permanent` in
`ConvertEffectItemsToActiveEffects.js`) stays a literal.

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
`conditionalRatingModifier` (`customArmorTrait`, `customShieldTrait`, `customWeaponTrait`), `immunity` (`effect`), and
`rollMessage` (`customTrait`, `spellTradition`). The check-modifier cache builder and lookups
(`_normalizeConditionalCheckModKey`), the rating-modifier builder, and the roll-message builder each read their own
entry, and `tests/unit/TypedKeySelectorEditors.test.js` asserts every editor's text-input selectors equal its entry.
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
checks use (Athletics; Loud's is Stealth). System situations (armor traits and conditions) are keyed by
`CANONICAL_SITUATIONS` (`src/system/CanonicalSituations.js`); a condition's situation stores only `labelKey`, which the
situational cache localizes (`CharacterDataModel.js:1680`).

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
of a token's actor (pinned by `tests/unit/ReactiveDocument.test.js` and `tests/e2e/sheet-header.spec.js`). It also
registers `update<Name>` hooks for the **ownership sources** of the document (`getOwnershipSources` in
`ReactiveDocument.svelte.js`) and invalidates when an update of a source carries an `ownership` key: the ancestors
(an Item's Actor, an effect's Item and Actor), the base actor of a token in the chain (core rebuilds an unlinked
token's synthetic actor from its base actor without a hook of the synthetic actor, `TokenDocument#_onUpdateBaseActor`;
the base actor's uuid is neither the synthetic actor's nor an ancestor's), and, for a chat message, the actor that
spoke (`ChatMessage.getSpeakerActor`) and that actor's base actor (a chat message always listens to `updateActor`).
`isOwner` follows those documents and none of the document's own hooks fire for their ownership change. A document of
a compendium pack follows the world's `compendiumConfiguration` setting through `createSetting`, `updateSetting` and
`deleteSetting`; `ActorSheetHeaderButtons` follows `core.permissions` the same way. Pinned by
`tests/e2e/ownership.spec.js` (item sheet, token
actor and token item sheets, roll button, Edit Token button, Reset Expertise button) and the `ReactiveDocument` unit
tests. A change of the viewing user's role logs that user out (`client/documents/user.mjs`), so no open sheet outlives
it.

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
escape hatch for actor-coupled reads inside an embedded subtree). `'rollActor'` is a reference object resolved once
by `src/document/reactive/ResolveRollActor.js`; its `current` is the actor bridge that performs checks for the sheet:
the actor itself on an actor sheet; an owned item's parent character actor on an item sheet, but only while the
current user owns the item (`item.isOwner` means "owns the actor or is GM" and is read through the item's bridge, so
`current` follows ownership changes); otherwise `undefined`. A consumer reads
`const rollActor = $derived(getContext('rollActor').current)` (kept in two statements, because `getContext` runs at
initialization only), and a defined `rollActor` is the single gate for showing a roll button on an item sheet.
Resolution mechanics live in data-flow.md, "Embedded-document contexts". Every descendant reads:

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
gone), nothing is written and the type shell's own validation closes the dialog; a check type's optional
`adjustInput(input, userEdits)` entry in `CHECK_OPTIONS_METHODS` reshapes the input before validation; otherwise
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
stale rendered content; rebuilds never write `value` or call `onchange`, so they never trigger a save.
`ProseMirrorEditor` takes an optional `onchange` callback, called after a committed edit has been written to `value`:
`DocumentBoundEditorInput` saves the document's whole system data in that callback, while `DocumentEditorInput` saves
a path through an effect on its value.

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
invoked through the sheet before the `update()` re-render. The check list also takes its change back when the update
is refused or rejected, with `undoDeleteCheck` / `undoMoveCheck` / `undoInsertCheck`; each reverses its own entry
and does not copy the arrays back, so a toggle made while the update was in flight stays (measured: a copy-back lost
it, `bugbatch1-logs/inflight-toggle.jsonl`, local). These methods must be forwarded through
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

**Vitest harness** — `vitest.config.mjs` (project root) configures Vitest 4 (`package.json`: `vitest ^4.1.7`) with
`happy-dom`, `globals: true`, Svelte 5 (`@sveltejs/vite-plugin-svelte`), `svelte-preprocess` (same SCSS `prependData` as
`vite.config.mjs`), and the `~/` / `$fonts/` aliases. `hookTimeout` is 60 s: the schema-equivalence golden-master
suites' `beforeAll` dynamic imports are transform-heavy (Svelte compiles) and exceed the 10 s default under full
parallelism. Tests live in `tests/unit/**/*.test.js`: 147 files, 1687 tests (measured: `npm test` → "Test Files  147
passed (147)", "Tests  1687 passed (1687)"). There is NO test code under `src/`. Support files: `tests/setup.js`,
`tests/components/*.svelte` (Svelte probes the unit tests mount), `tests/unit/helpers/schemaFingerprint.js`,
`tests/shared/checkOracle.js` (the independent check oracle the e2e `check-math.spec.js` compares against) and
`tests/fixtures/spreadsheet/excel-edited.xlsx` (read by `tests/unit/spreadsheet/format/Xlsx.test.js`).

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
(`component-probe-display.spec.js` for `RichText`, `component-probe-buttons-tags.spec.js` for `EffectTag` and `Tag`),
never against that stand-in.

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

**Playwright E2E** — `npm run test:e2e` runs `playwright test` against the `test-titan` Foundry world on
`http://localhost:30000`: 42 spec files, 798 tests (measured: `npx playwright test --list` → "Total: 798 tests in 42
files"). `playwright.config.mjs` sets `timeout` 60 s, `expect.timeout` 1000 ms, `workers` 1, `fullyParallel` false,
`globalSetup` and `globalTeardown`, the `list` reporter beside `slow-operation-reporter.js`, and for every test headless
Chromium (with `--enable-gpu`), `viewport` 1920x1080 and `actionTimeout` 10 s. The users are the four dedicated
identities of `tests/e2e/users.js` (`E2E_USERS`: E2E GM 1, E2E GM 2, E2E Player 1, E2E Player 2; `DEFAULT_GM` is E2E GM
1, never the developer's Gamemaster); env `FOUNDRY_USER` replaces the default user of `login`, and `FOUNDRY_PASSWORD` is
filled into the join form only when set. The config's `webServer` reuses a server already on the port and otherwise runs
`scripts/e2e-foundry-server.mjs`, a supervisor (`scripts/lib/superviseServer.mjs`) that spawns `node main.js
--dataPath=… --world=test-titan` from the sibling `foundry/` install (paths derived from the repo location;
`FOUNDRY_APP_DIR` / `FOUNDRY_DATA_PATH` / `FOUNDRY_PORT` / `FOUNDRY_WORLD` override) and kills the whole tree when
Playwright ends the run or when the Playwright runner process itself disappears (it watches the nearest non-shell
ancestor pid, polling liveness once a second), so a hard-killed run never leaves a Foundry holding the port and the pack
LevelDB locks. `tests/unit/SuperviseServer.test.js` covers spawn/reuse/teardown. The suite drives the real built system
at the repo root, so it catches v14 API breaks that the mocked Vitest tier cannot.

**The 42 spec files** (`tests/e2e/`; `logic/` holds three of them):
- Sheets and documents. `surfaces.spec.js` (every sheet type, spell tab, check-options dialog and the effect tray
  renders on flow-made documents with zero uncaught page errors and no `LOCAL.` text; the collapsed-layout regressions;
  the portrait pick through Foundry's file picker; opening a sheet from the directory; the Edit Unique ID dialog),
  `sheet-header.spec.js` (the window-header controls menu, the inline header buttons, unlinking from the sheet a token
  double-click opens, and the `ReactiveDocument` identity pin), `character-sheet-rows.spec.js` (the Abilities, Spells,
  Inventory and Effects rows of one flow-made actor: a functional sweep per item type, rows following edits made in the
  item or effect sheet, delete confirmation and the confirmation-off path, check tag parity across the item sheet, the
  character sheet and the Effect HUD), `custom-traits.spec.js` (the Add Custom Trait dialog, the tag's edit and delete
  icons, the tooltip, on items and effects), `sheet-filters.spec.js` (the name filters of the character sheet tabs and
  of the item Checks tab), `character-sheet-layout.spec.js` (Skills row geometry, sidebar labels, browser zoom on the
  shared bulk actor), `rules-element-editor.spec.js` (the Rules Elements tab of a flow-made weapon: add and delete, the
  selector's default key, the rounding select of Multiply Base and Multiply Sum, the conditional check modifier editor,
  the immunity editor),
  `item-sheet-rolls.spec.js` (the sidebar roll buttons of an owned equipment, weapon and spell, the Checks tab roll
  preview, a check added while the sheet is open, damage-reduction settings in the posted check parameters),
  `spell-sheet.spec.js` (the condition aspects' Off-Balance option, the Casting Check tab's aspect costs, its re-pricing
  by a second client and its scroll position), `drag.spec.js` (real pointer drags: character sheet item and effect
  lists, the four item sheet lists, a row copied between sheets and refused by a list of another kind, a world item or a
  folder dropped on an actor sheet), `effect-changes.spec.js` (core's `changes` on a TITAN effect: the Add change button
  stores core's initial change, saving leaves the priority unset, a malformed change type is rejected),
  `base-effect.spec.js` (a third party's `base` Active Effect, made through the document API as a module makes one, on
  an actor, an owned ability, a token and a pack: stored and reloaded as the base type, never used in TITAN stats,
  listed as a plain row on the sheet, in the Player HUD list and tray and in the Effect Tray that opens core's Active
  Effect Config, with toggle and delete; core's native `changes` apply), `item-text-input.spec.js` (text or a number
  entered without a key event, by composition, or key by key, is saved and kept while another client's rename
  replicates; an unfocused label input shows another client's label), `unlinked-token-delta.spec.js` (batches of
  embedded documents on an unlinked token with no stored delta, through Remove Expired Effects, `deleteAll` and
  Item-folder drops: persisted across a reload, rejected requests send nothing, a vetoed first document leaves the
  rest).
- Checks and rules. `check-math.spec.js` (every check type rolled from its sheet button with forced dice and compared
  to the independent oracle in `tests/shared/checkOracle.js`, with the card mounted; an attack's Difficulty from
  targeted tokens; the Resist button and the damage buttons of a card; the die click, reset and scaling-aspect controls
  of a card; Advantage and Automatic Failure set in the dialog), `check-dialog.spec.js` (each check type's dialog opened
  from the sheet's roll button: totals recomputed as the fields change, the Advantage, Automatic Failure and derived
  fields following permanent effects switched on and off with the Effects tab's active toggle (and one effect deleted)
  and items edited in the sheets while the dialog is open, the starting Dice Mod and Advantage that an active effect's
  rules elements give a dialog, a user-set field kept, the dialog closing when its item or effect is deleted (the tests
  read the one "no longer valid" notice, assert no "failed before construction" notice and dismiss the notice, which
  would otherwise cover the next create dialog), the `getCheckOptions` setting, Heavy, Encumbering and Loud armor, a
  condition's situation), `logic/rules-elements.spec.js` (rules elements added in the Rules Elements tab, read from the
  sheet's derived Body value, which owned sources apply and to which bucket, the check dialogs and the posted check
  parameters), `logic/conditions.spec.js`
  (conditions applied from the Token HUD, read from derived stats, the sheet's tooltip, rolled checks and the Player
  HUD; a condition's own sheet and its edited description; an immunity effect suppressing an existing condition or
  effect and refusing a condition applied through the Token HUD; its immunity block sets Immunity Handling to Suppress
  and restores it),
  `target-conditions.spec.js` (attack checks against a targeted token's Prone and Incapacitated conditions on real
  tokens of a scene of its own: the dialog's and the card's target-condition tags, a typed rating dropping its entry,
  the pinned facts after untargeting, a GM's controlled attacker never read as the target, a suppressed Prone giving no
  modifier, the attacker's token for distance, a message stored without `targetConditions`), `target-helpers.spec.js`
  (`measureTokenDistance` and the targeting helpers on real tokens), `unconscious.spec.js` (Unconscious applies Prone
  and Incapacitated once, an immune Character gets Incapacitated alone, only the creating client applies them; the spec
  has a scene of its own and restores the active scene on a reloaded page),
  `immunity-display.spec.js` (the "Suppressed" tag and dimming of a suppressed effect or condition on the sheet, in the
  Player HUD list and tray, and in turn-start and turn-end reports; Immunity Handling is Suppress and is restored),
  `immunity-handling.spec.js` (the Immunity Handling setting: Remove deletes a held condition when an immunity arrives
  on a world actor or an unlinked token's sheet, only on the client that made the change; Suppress keeps it and the
  switch to Remove clears it; a mutually immune pair stays; the settings window),
  `dice.spec.js` (the forced-dice seam: `forceDice` maps each queued face onto a real Roll,
  `resetDice` restores the random source), `logic/fast-check-smoke.spec.js`
  (fast-check is injected and runs a property in the page).
- Tokens, HUD, combat, chat. `player-hud.spec.js` (portrait, visibility, layout and effects panel of one controlled
  token, and a reload test), `player-hud-action-menu.spec.js` (categories, main actions and sub-buttons, options,
  layout, and the report cards of the HUD's direct actions), `combat-turns.spec.js` (turn effects replicated between
  clients, the sheet that opens at a turn start per setting, turn reports, the tags of conditions and turn effects in a
  report, a suppressed timed effect still counting down, and a placed token on a new scene with none active),
  `chat-cards.spec.js` (item and effect cards, the attack
  tags of a weapon, the tags of a rolled check card, and chat message mount keying), `macros.spec.js` (the item macros
  made by dragging an item row onto the hotbar), `ownership.spec.js` (OWNER, OBSERVER and LIMITED viewers of the TITAN
  sheet, observer tab switching, the roll button gated by ownership), `theme.spec.js` (the theme system, the theme
  editor and the content-link colors per built-in theme).
- Packs. `effect-tray.spec.js` (the Effect Tray on packs, folders and effects made through the tray's own controls,
  and Apply refused by an immune target),
  `compendium-spreadsheet.spec.js` (export and import of packs through the dialogs, including the outcomes of
  `ApplyImport`).
- Harness and drift guards. `multi-client.spec.js` (two contexts log in as distinct users and see each other active;
  the compendium permissions test), `action-helpers.spec.js` (the action helpers return with nothing in flight, see
  below), `gpu-rendering.spec.js` (the suite renders on a hardware adapter), `integration-manifest.spec.js` (see the
  Integration manifest drift guard section), and the three component-probe specs (see the Component-probe harness
  entry): `component-probe-inputs.spec.js`, `component-probe-buttons-tags.spec.js`, `component-probe-display.spec.js`.

**E2E helper modules** (`tests/e2e/`). `harness.js` provides `test`, `expect`, `flushPageErrors` and `trackWorldPage`.
`join.js` (no test-runner imports, so the setup, teardown and census load it without `harness.js`) provides `joinWorld`,
`trackWorldPage`, `flushPageErrors` and `takeUncheckedErrors`. `fixtures.js` re-exports `joinWorld` and provides
`login`, `openSheetByUuid(page, uuid)` (`fromUuid` then `sheet.render`, waits for the content to mount, returns the
window's locator; a read-side render, not a document change), `renderSheet(page, uuid, expectedSelector, errors)` (opens
by uuid, asserts the frame class, flushes and asserts the spec's `errors` collector is empty), `openSheetTab(page,
label)` and `collectLocalizationOffenders`. `world.js` holds `closeAllApps`, `clearChat`, `attachPageErrors`,
`installHookErrorReporting`, `flushHookErrorReports`, `newestMessageType`, `waitForAnimations`, `showChatLog`,
`expectActiveGM` and `reloadWorld`. `actions.js`, `select.js`, `contextMenu.js`, `dice.js`, `poll.js`, `settle.js`,
`settings.js`, `multiClient.js`, `users.js`, `registry.js`, `flows.js`, `census.js`, `global-setup.js`,
`global-teardown.js`, `checkDialog.js`, `componentProbe.js`, `fast-check.js` and `slow-operation-reporter.js` are
described under the entries below. `run-e2e-throttled.ps1` is the runner wrapper.

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
<stack>`, into every array `attachPageErrors` returned for that page. A collected entry is the error's `stack`
(its message when the error has none), so a failure shows the source frame; `dist/index.js.map` maps a minified frame
back to `src/`. The binding is asynchronous, so the document
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
**Specs that do not share one world page.** `gpu-rendering.spec.js` needs no world (a bare page identifies the graphics
backend). `multi-client.spec.js` opens each test's clients with `withClients`. Every other spec boots the world once in
`beforeAll` and shares that page; `combat-turns.spec.js` and `ownership.spec.js` add `BrowserContext`s of their own for
the further users, and `character-sheet-rows.spec.js`, `effect-tray.spec.js`, `player-hud.spec.js` and
`spell-sheet.spec.js` call `withClients` for a second client. Fast-check (`injectFastCheck` → `page.addInitScript`) must
run in `beforeAll` BEFORE `login` (init scripts must precede navigation).

**No fixed sleeps in E2E (banned)** — never settle with a fixed-duration `await page.waitForTimeout(n)` or an in-page
`await new Promise(r => setTimeout(r, n))`; they are slow and flaky. Wait on a deterministic condition instead. Three
patterns: (1) **delete** a sleep that precedes an auto-retrying Playwright web-first assertion
(`expect(locator).toHaveText/.toHaveCount/.toBeVisible/.toHaveValue/...`) or an auto-waiting action
(`.click()`/`.fill()`) — the assertion/action already polls; (2) before a **non-retrying read** (`await
page.evaluate(...)`, `locator.textContent()/.inputValue()/.count()/ .getAttribute()/.allTextContents()`), use `await
expect.poll(() => <sameRead>, { message }).toBe(<value>)` (guard the poll body so it returns a sentinel rather than
throwing on early iterations); (3) inside a `page.evaluate`, use `await titanWait(syncPredicate, { message })` —
`globalThis.titanWait` (`tests/e2e/poll.js`), installed by `login()` via `installPoll`/`addInitScript` before
navigation, polls a synchronous predicate (50 ms interval, 1000 ms default timeout). **The suite has no fixed sleeps**,
including assert-absence tests (measured: `grep -rn waitForTimeout tests` matches nothing, and `grep -rn setTimeout
tests/e2e` matches only `test.setTimeout` calls and the polling interval inside `poll.js`). When a negative assertion
appears to have no pollable positive edge, look for a **happens-after edge**: an observable the code under test emits
strictly LATER than the decision being asserted. `combat-turns.spec.js` wraps the character data model's `onTurnStart`
in a call-through spy on a client and waits until the spy has seen the turn start return, because `onTurnStart` opens
the sheet (or not) at its start, before its awaits — so the return proves the sheet's fate was already decided. Seeding
an extra rules element purely as a synchronization signal is preferred over a bounded wait.

**E2E runner configuration (all optional).**
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
(`MigrateWorld`, version chains, the stored-actor walker, `migrateData` hooks) lives in `src/helpers/migration/` with no
unit or e2e test. It was confirmed once (2026-10-02) by a one-off run on documents the flows below made in `test-titan`,
with a temporary version-1 entry in `ActorMigrations.js` and `ItemMigrations.js` (reverted, never committed; the record
is `.superpowers/sdd/test-suite-rewrite/migration-one-off.md`, local). Measured: a Disabled load showed no dialog and
logged no migration line; a Prompt load showed `ConfirmMigrateWorldDialog` and Cancel changed nothing; an Automatic load
showed no dialog, logged `TITAN | Starting world migration.`, `TITAN | Stored-actor migration finished: 0 updated, 0
skipped; failures: 0.` and `TITAN | World migration complete.` (core echoes both notifications to the console), and
every world actor, owned item and world item (11) reached `documentVersion` 1 carrying the entry's flag, while a locked
world pack's actor, the pack lock and an unlinked token's stored delta were unchanged; a Prompt load afterwards showed
no dialog. No test covers the stored-actor write paths (condition sync, effect Item conversion, a locked pack's unlock
and relock, Adventure writes, orphaned-token failures), version-chain failure semantics, the `onceReady` boot path
(Disabled scans nothing, Prompt asks first, a client that is not the active GM skips the migration, and a failed
migration still registers the `hotbarDrop` hook and builds the Player HUD; the one-off ran only the success path), or
the chat-message `migrateData` hoists. A synthetic token actor reads its base actor's merged data, so after a migration
it shows the base actor's version.

**E2E census** — every world document an e2e test creates (actor, item, scene, folder, macro, roll table, journal entry,
playlist, cards, world compendium label) is named with the `E2E ` prefix (`E2E_PREFIX`); the sweep finds leftovers by
that prefix alone, so an unprefixed name survives every cleanup. `tests/e2e/census.js` exports `E2E_PREFIX`,
`CENSUS_WORLD`, `assertCensusWorld`, `takeCensus(page, { since? })`, `sweepWorld(page)` and `countCensus(census)`:
- `takeCensus` returns, per kind: the `E2E `-prefixed `actors`, `items`, `scenes`, `folders`, `macros`, `tables` (roll
  tables), `journal` entries, `playlists`, `cards` and `packs` (world compendia); `combats` (every combat, which has no
  name to prefix); `orphanTokens` (tokens on any scene whose actor does not resolve); `hotbar` (hotbar entries of the
  four E2E users whose macro does not resolve); and `messages` (chat messages from `since` on, when `since` is given).
- `sweepWorld` deletes through the API, in this order: every combat; the prefixed scenes, actors, items, macros, roll
  tables, journal entries, playlists, cards and folders (folders last, after their contents); the prefixed world
  compendia (unlocked first); the orphaned tokens; the dangling hotbar slots of the E2E users
  (`user.assignHotbarMacro(null, slot)`). It never touches messages or User documents, and returns the number removed
  per kind.
- Both throw before reading or deleting anything unless `game.world.id` is `test-titan` (`CENSUS_WORLD`;
  `assertCensusWorld` is exported and the teardown calls it too). Run directly (`node tests/e2e/census.js [--sweep]`),
  the file logs in to localhost:30000 as `E2E GM 1`, prints JSON counts and the boot errors, and exits 1 when the final
  census is not empty or the boot raised an error.

**E2E registry, flows and teardown (documents made through real user flows)** — a test of a document runs on a document
a flow made. `tests/e2e/registry.js` keeps the running list in `test/state/registry.json` (gitignored; not
`test/build/`, which the probe build empties): `runStartedAt`, every created document `{ key?, documentName, id, parent
(uuid|null), sceneId?, packId?, createdBy (spec file) }` (a world compendium is `documentName: 'Compendium'` with the
pack collection id as `id`), hotbar assignments `{ userId, slot, macroId }` and `settings` `{ scope, namespace, key,
prior }`. It is a file because it must outlive a spec file, a mid-file reload and the worker, and be read by the runner;
the file is overwritten, never deleted. Exports: `STATE_DIR`, `REGISTRY_PATH`, `emptyRegistry`, `readRegistry`,
`writeRegistry`, `startRun`, `resetRegistry`, `hasWork`, `record`, `recordHotbar` and `recordSetting` (a setting keeps
its FIRST prior value). The module is a leaf (it imports no flow). `flows.js` holds `resolves(page, entry)` and
`shared(page, key)` (the id of the shared fixture `key` when the list has it and it still resolves, otherwise a new one
made by the flow in `SHARED_FIXTURES` and recorded under the key; shared fixtures are never deleted mid-run, and a test
that edits one restores the field through the same control or uses a per-test document). Fixture names are `E2E Shared
<Type>`. `tests/e2e/flows.js` has one exported async function per flow; each drives the DOM like a user, reads the id of
what it made from the DOM or a read-only API call, records it and returns it; it never creates, updates or deletes a
document through the API. `readServerSystem(page, uuid)` reads the `system` data the server stores for a document
(`CONFIG.DatabaseBackend.get`, picked by id: for an embedded document the first result held another sibling's data in
one probe, `task-9-logs/fix1/probe-two.json`, local; that the server returns every sibling is inferred from it). A read
through `fromUuid` returns the client's own document, which holds an edit made through a bound control before any update
reaches the database (measured: with the condition picker's `onchange` made a no-op, `fromUuid` read the new key while
the server held the old one, `task-9-logs/fix1/probe-mutant-server.json`, local), so a test that asserts a control saved
its edit reads the server copy, as `addCheck`, `addRulesElement`, `addAttack`, `addCustomAspect`, `enableAspect`,
`setAttackStat`, `setAttributeBase`, `setResource`, `setSkillTraining`, `setSkillDefaultAttribute`, `deleteAttack` and
`rules-element-editor.spec.js` do. Each of the nine helpers from `addAttack` to `setSkillDefaultAttribute` fails when
the client model changes but the update is dropped (measured, in a probe spec of one test per helper: the update after
the model edit of `addAttack`, `deleteAttack`, `addCustomAspect` and `addStandardAspect` replaced by a resolved
promise, or the send of `refreshSystemDocument` disabled, fails the helper's own test, and the tests that use the
dropped call in their setup, and no other; `mut-m6-*-run.log` and `m6-helpers-probe.spec.js.txt` under
`.superpowers/sdd/2026-09-29-conditions-rework/bugbatch1-logs/`, local). Flows: `openSidebarTab` (the
sidebar tab button of a directory), `createActor` (Actors tab Create button and core dialog), `createOwnedItem` (the
Abilities/Spells tab add button or the Inventory tab's add button and its item-type dialog, then the new item is renamed
in its own sheet opened by the row's Edit button), `dragItemOntoSheet` (drags an Items-tab entry onto the open actor
sheet), `addEffect` (the Effects tab add button, the effect renamed in its sheet, and optionally its duration type
chosen in the sheet header), `addCheck` (the Checks tab add button, then the row's label input and, when asked, its
Resolve Cost input, Resistance Check select, Opposed Check box, Damage box, Initial Value input and Damage Reduced By
select), `addRulesElement` (the Rules Elements tab add button, the operation select, and the controls of the operation:
the `ccm-*` selects, key input and value input of a conditional check modifier; the rating, selector and key of a
conditional rating modifier; the selector, key, value and rounding or mode of the flat, Multiply Base, Multiply Sum and
Set Sum operations; the `immunity-selector` and `immunity-key` controls of an immunity (a condition picker, or a typed
effect name); the selector and the rich-text message of a Turn Message or Roll Message, typed into its editor and
awaited in the document's `_source` because the live data holds the text before the editor's update reaches the
database, CLOSED_BUGS #145; a negative value is typed in parentheses because a leading operator in a number input is a
relative change), `addTrait` (the Edit Traits dialog of a weapon attack, an armor or a shield), `setAttributeBase` and
`setSkillTraining` (the base input of an attribute in the sheet header, the training input of a skill row in the Skills
tab), `applyCondition` / `removeCondition` (the Token HUD of a placed token: right-click, the status effects palette,
the status icon, then a left click on the token closes the HUD, so the next call's right-click opens it; core's
right-click toggles the HUD, so a second right-click does not close it reliably). The pointer reaches the token through
`restOnToken` before each click (it moves in from outside the token and waits for the token's `hover`, because a token's
interaction manager handles a pointer-down only from its HOVER state on, read at
`client/canvas/interaction/mouse-handler.mjs:474-475` and `565-566` of Foundry 14.364; whether it is needed is not
measured, see CLOSED_BUGS #134); it then waits until `DOUBLE_CLICK_TIME_MS` (250 ms) has passed since the later of the
interaction manager's `lcTime` and `rcTime`, because a press within 250 ms and 5 px of the previous press on the token
is a double click, which opens the token's sheet and does not control it (read at
`client/canvas/interaction/mouse-handler.mjs:480-497`; CLOSED_BUGS #137); `hoverToken` first makes the chat tab the
active sidebar tab, because a chat message posted while another tab is active shows as a card over the canvas for 5 s
and takes the pointer from a token under it (CLOSED_BUGS #134). A right-click that opened no HUD has been seen without a
located cause (OPEN_BUGS #129). `applyConditionRefused` clicks the same control for an actor immune to the condition,
waits for the refusal's warning notification (the creation's decision, so the absence of the condition follows a
positive edge), returns its text and dismisses it with a click. Further flows are `createWorldItem`, `createFolder` (the
directory's Create Folder button and the folder configuration window, both flows take the id of the entry that is new
after the click, not the first entry of that name; `createActor` and `createWorldItem` take a
`folderId` and then use that folder's own Create button, which creates the document inside the folder),
`addCustomTrait`, `addAttack`, `enableAspect` and `addCustomAspect` (the Add Custom Trait dialog with an optional
description, the weapon Attacks tab add button, the spell Standard Aspects toggle with its option toggles and resistance
select, the spell Custom Aspects tab add button), `pickPortrait` (the sheet's portrait button opens Foundry's own file
picker, the Core Data tab is chosen when it is not the open one (the picker of a player actor opened on the User Data
tab: `.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-1.log`, `actor picker tabs`), the directory is typed
into the address bar and the file is clicked and confirmed; nothing is stubbed), `openTrayPack` (the Effect Tray's
sidebar tab button, then the pack chosen in its pack select; it waits for the stored `effectTrayLastPack` setting),
`createTrayFolder` (the tray's Create Folder button, or an expanded folder's create-subfolder control for a subfolder,
then the folder context menu's Rename Folder entry and Enter), `createTrayEffect` (the tray's create button, or a
folder's create-effect control when given a `folderId`, in an unlocked effect pack; the effect is renamed in the sheet
the create opens), `createScene` / `viewScene` / `activateScene` (Scenes tab, entry context menu View/Activate; core
activates and draws a scene created while none is active (`Scene._preCreateOperation` tests `game.scenes.active`), so
`createScene` then waits for the draw, and `viewScene` skips the menu for a viewed scene; the create flows
(`createActor`, `createWorldItem`, `createScene`, `createFolder`, `createCompendium`) wait for one event at a time in
the order core produces them: the directory entry, then the record on the running list so a failed later wait cannot
orphan the document, then the creation window's close, then the draw (`createScene` only; measured to end after the
window's close in 40 of 40 first-scene creations), and `createFolder` and `createCompendium` end with `settle`),
`placeToken` (drags the actor's directory entry onto a free spot near the centre of `#board`, or, with
`{ square }`, onto the centre of that grid square, which core handles as an Actor drop; the spots are a 7-column grid
with 130 px spacing and a spot that already holds a token
is skipped, because two tokens dropped on one point took the same `x`/`y`
(`.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-1.log`, `stack`), as is a spot where
`document.elementFromPoint` is not the canvas (a chat notification over the canvas held a drag for about 1.5 s,
CLOSED_BUGS #141); 34 tokens fit at 1920x1080 and the 35th drop timed out, cause not determined
(`.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-2.log`); open windows are closed first and the Escape key
releases the controlled tokens: measured on a scene with `tokenVision` true, a second token had `visible` false while
the first was controlled and `visible` true after Escape, and with `tokenVision` false it stayed visible while the first
was controlled (`.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-1.log`, `A controlled`, `after Escape`,
`tokenVision false`), and a token that is not visible takes no pointer events), `toggleTokenLink`, `unlinkPlacedToken`
and `setTokenSize` (the Appearance tab of the Token Configuration window opened from the Token HUD's config button;
width and height inputs), `setTokenElevation` (the Token HUD's elevation field, submitted with Enter),
`controlPlacedToken` (the sheet header buttons; the token flows close the open windows, release control, move
the pointer onto the token and wait for `token.object.hover` before the double-click that opens the sheet
(`unlinkPlacedToken`, which then waits for the reopened synthetic actor's sheet, and `openPlacedTokenSheet`, which
returns the sheet of an unlinked token's synthetic actor) or the click that takes control (`controlPlacedToken`)),
`controlPlacedTokens` (drags a selection rectangle over the given tokens and asserts that
exactly those are controlled: while one token is controlled a second is not visible to the pointer, so Shift-click
cannot add it), `targetPlacedToken` / `releaseTargets` / `targetedTokenIds` (core's Target key T on the hovered token,
Shift+T adds; `game.user.targets` then holds real Token objects, as `check-math.spec.js` uses; the hover helper
closes the open windows first, and `releaseTargets(page, { keepWindows: true })` leaves them open for a test that
untargets under an open check dialog, with no token controlled), `createCompendium` /
`setCompendiumLocked` (Compendium tab Create dialog, entry context menu Lock/Unlock), `putInPack` (opens the pack's
popout window and drags the world entry onto its `.directory-list`; the pack index is polled for the new id; the caller
passes the world entry's locator, and the flow reopens that entry's sidebar tab before the drag). `setDescription`
(types into the rich text editor of an item's or effect's sheet and saves with the editor's save button), `setOwnership`
(the Configure Ownership window of an actor's directory entry), `createCombat` (the Combat Tracker's create button;
waits until the combat is `game.combat`), `addCombatant` (the Token HUD's combat button), `startCombat` / `endCombat`
(the Combat Tracker's Begin and End buttons; `endCombat` also confirms the dialog), `setSkillDefaultAttribute` (the
select of a skill row), `setEquipped` (the Equipped toggle of an Inventory row, clicked only when the state differs; a
collapsed row of an equipped weapon is expanded first, its toggle being inside the expanded content), `setEffectActive`
(the active toggle of an effect's row in the Effects tab), `deleteAttack` (the delete button of an attack row in the
weapon sheet), `setAttackStat` (the Range or Damage input of an attack row), `addAttackCustomTrait` (the attack row's
Add Custom Trait button and its dialog), `deleteOwnedItem` (the Delete Item button of an Inventory row; the
`confirmDeletingItems` client setting must be off), `setResource` (the meter row of the actor sheet's sidebar),
`rollInitiative` (the Combat Tracker's Roll All button; the combatants roll in the order they joined, so a caller forces
the dice with `forceDice` to choose the turn order), `nextTurn` / `previousTurn` (the Combat Tracker's turn buttons; the
turn's updates and reports follow, so the caller waits for the effect it asserts), `sendToChat` (the Send to Chat button
of an item's or effect's sheet header), `typeChatMessage` (types into the chat input and presses Enter),
`openCreateMacroDialog` (drags an owned item's row onto the first empty slot of the core hotbar, which the
`showFoundryHotbar` client setting must show), `createItemMacro` (that drag, the Create Macro dialog and its button; the
macro and its slot are recorded for the teardown) and `runHotbarMacro` (a click on the slot). The creation dialogs are
`DialogV2` forms whose content lacks the template's `form#document-create` id, so the flows find them by
`dialog.application.dialog` with the `.dialog-content` fields. A flow opens the sheet it drives with `openSheetByUuid`
and clicks its tabs inside that sheet (`openTab`), so another open TITAN sheet's tab strip is never clicked; the
Standard Aspects tab and the sidebar both use the class `aspect`, so the flow looks inside `.standard-aspects-tab`. A
TitanDialog id carries a generated suffix (`[id^="add-inventory-item-dialog-<actorId>"]`). A document's sheet instance
keeps its last tab, so a shared fixture's sheet can come up on the tab a flow last used; a test that needs a tab opens
it. `shared(page, key)` and `sharedUuid(page, key)` (the uuid, for `openSheetByUuid` and `fromUuid`) serve
`SHARED_FIXTURES`: `player`, `npc`, the seven world items `weapon`, `ability` (one check), `spell` (the Void custom
trait; a range aspect of 10, a rounds-scaling duration aspect, and an inflict-condition aspect with the Stunned option
and a Resilience resistance; stored values: `.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-3.log`, `spell
aspects`), `armor`, `shield`, `equipment`, `commodity`; `effectHost` (a player that holds only the two effects) with
`effect` and `conditionalEffect` (permanent, one conditional dice modifier); `roller` (a player owning copies of the
shared weapon, spell and ability, dragged onto its sheet); `situationalActor` (a player owning an ability with a
conditional dice +2, a conditional Advantage and a conditional dice +1 situation); `bulkActor` (`BULK_COUNT` = 12
abilities, an equipment with 12 checks and an effect with 12 rules elements; measured at every tested zoom in
`.superpowers/sdd/test-suite-rewrite/phase-3/entry-count-measure-12.log` (local): the Abilities tab has 225 px to scroll
at the least, the Checks tab 3934 px and the rules elements list 1378 px; the build took 69.1 s with 30 entries of each
in one run (`.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-1.log`, `build bulkActor`), so its first
consumer, the browser zoom describe of `character-sheet-layout.spec.js`, raises its own timeout); `scene` (created and
viewed); `trayPack` (an unlocked `ActiveEffect` pack holding one effect). `playwright.config.mjs` sets
`use.actionTimeout` to 10 s (its comment cites the slow-operation files of the runs that measured the longest action),
so a flow that waits on a missing element fails after 10 s; a wait that legitimately takes longer passes its own
timeout.

**E2E teardown, sweep and census gate.** `tests/e2e/global-teardown.js` (Playwright `globalTeardown`; it runs only when
the list shows work) launches one Chromium, logs in as `E2E GM 1`, asserts the census world and, in this order:
1. deletes the recorded documents through the API: tokens by their scene; other embedded documents by their parent;
   then combats, scenes, actors, items, macros, roll tables, journal entries, playlists, cards and folders; then
   recorded pack documents whose pack is not recorded (the pack unlocked for the deletion and locked again); then the
   recorded world compendia (unlocked first);
2. clears each recorded hotbar slot that still holds its recorded macro (`user.assignHotbarMacro(null, slot)`: deleting
   a Macro does not clear its slot, which lives on the User);
3. deletes every chat message with `timestamp >= runStartedAt`;
4. restores each recorded world setting to its prior value;
5. runs `sweepWorld`, the census's sweep of everything `E2E `-prefixed that no flow recorded (plus every combat,
   orphaned tokens and dangling hotbar slots);
6. runs `takeCensus` over the same kinds plus messages since `runStartedAt`.

It prints one `e2e teardown (...)` JSON line with the per-kind counts of each step. **The run fails** when the boot of
the teardown's own login raised an error, when the sweep deleted anything (the error names the kinds and counts: a
document no flow recorded; shown with an unregistered `E2E ` actor made before a run, `phase-6/sweep-gate-fail.log`), or
when the census is not all zero. Only after the sweep and the census are zero does it reset the list; a failed teardown
leaves the list for the next `global-setup.js` to retry (shown by forcing a non-zero census). A sweep failure that
follows a failing test can come from the worker restart: the file's `beforeAll` runs again and its flow finds the
document the first run made (measured: the second run's `createScene` locator resolved to 2 directory entries, and the
sweep then deleted a scene no flow recorded, `task-9-logs/fix1/mutations/G1-turn-path-skips-suppressed-run.log`, local).
It can also be a real leak of a document no flow recorded, so the log is read for which kind and name the sweep deleted
before the failure is put down to the restart. `global-setup.js` runs the same `tearDownAndReport` over a list that
still shows a run in flight or holds entries (a crashed run), then `startRun()`, then builds the probe bundle and the
fast-check bundle into `test/build/`.

**E2E settings.** `settings.js` `setWorldSetting` records the prior value of a world-scope setting on the list before it
writes, and the teardown restores it; `setClientSetting` and a `game.settings.set` made directly in a spec are not
recorded. A client-scope setting lives in the browser context that set it (measured: a value set in one context read its
default in another context and in another browser), so it ends with its context and needs no restore. Keys the specs
set (read from `tests/e2e/`):
- client scope, through `setClientSetting`: `getCheckOptions` (`never`, `always` or `situational`),
  `confirmDeletingItems`, `confirmDeletingEffects`, `themeCoreMessages`, `autoOpenCharacterSheetsGM`,
  `autoOpenCharacterSheetsPlayer`, `showFoundryHotbar`, `enablePlayerHud`, `playerHudOptions`, `playerHudLayout`,
  `theme` and `customThemes`;
- world scope, through `setWorldSetting` (recorded and restored): `autoApplyPersistentDamage`, `autoApplyFastHealing`,
  `autoRegainResolve`, `autoRevertPersistentDamage`, `autoDecreaseEffectDuration`, `autoRemoveExpiredEffects`,
  `reportEffects`, `reportTakingDamage`, `reportHealingDamage`, `reportSpendingResolve`, `reportRendingArmor`,
  `reportRepairingArmor` and `reportResting`;
- set by `game.settings.set` in a spec's own `page.evaluate`, not recorded: the core settings `core.uiConfig`
  (`chat-cards.spec.js`, `theme.spec.js`) and `core.messageMode` (`theme.spec.js`), which the test puts back itself
  (read: `chat-cards.spec.js:1036`, `theme.spec.js:146` and `:305`), and the client settings `titan.playerHudOptions`
  (`player-hud-action-menu.spec.js`) and `titan.theme` (`theme.spec.js`).
Setting a client key through the API is an interpretation of the Project Scope clause that settings are configuration,
not documents; the Configure Settings window is the alternative.

**No test poll lasts longer than 1 second** (`.claude/claude.md` "Project Scope"). Everything in the suite runs on
one machine, so a replicated update or a render lands at once, and a wait that needs longer is a defect to find and fix,
not a ceiling to raise. The rule covers every wait on something inside an already-loaded page: `expect.poll`, web-first
`expect` assertions, `waitForFunction`, `waitFor`, `waitForEvent`, `titanWait`, `toPass`, the in-page retry loops of
specs, and every explicit `timeout:` on them. `playwright.config.mjs` sets `expect.timeout` to 1000, and `titanWait`'s
default is 1000 (`tests/e2e/poll.js`), so a call that names no ceiling gets 1 s; an explicit `timeout:` is `1000` or
lower. Playwright retries a web-first assertion at 20, 50, 100 ms and then every 100 ms under the 1 s ceiling
(`retryWithProgressAndBackoff`, `playwright-core/lib/coreBundle.js:17979-17985`: `[20, 50, 100, 100, 500]`, with the
500 dropped while it exceeds a fifth of the timeout; the assertion path calls it at `:18298`). An action retries
through `_retryAction` (`:16201-16203`) after waits of 0, 20, 100, 100 and then 500 ms each, under the `actionTimeout`
(10 s), not under the 1 s ceiling. `expect.poll` uses the intervals 100, 250, 500, 1000 (`:4377`) and stops once the
next interval would pass the deadline (`:4377-4393`), so under 1 s it checks at 0, 100, 350 and 850 ms and not again;
a poll on something that can take 350 to 850 ms sets `intervals`. The mount-keying tests of `chat-cards.spec.js` set
`[100]` for the dismissed notification: with the default intervals the poll took 357 to 865 ms in four runs
(`e2e-r3c-gate-1-slowops.json`, `-2`, `e2e-r3d-gate-1-slowops.json`, `-2`; 865 ms once, 357 to 379 ms in the others),
and with `[100]` 443 to 449 ms (`e2e-r4-gate-1`, `-2`, `-3` and `e2e-r5-gate-1-slowops.json`). Svelte's default `slide`
transition lasts 400 ms (read in `svelte/src/transition/index.js`), and a click on a row that is still moving retries
until the row stops: without a transition settle, the Edit Item click on the new row took 51 to 928 ms in 134 samples
(`createOwnedItem`) and 54 to 965 ms in 54 samples (`addEffect`), over 50 ms, in four full runs (the same four files;
54 (`createOwnedItem`) and 51 (`addEffect`) samples of 380 to 450 ms, and 965, 928 and 919 ms once each). With
`createOwnedItem` and `addEffect` settling with transitions, the same two clicks took 51 to 81 ms in the samples over
50 ms (`e2e-r4-gate-1`, `-2`, `-3`, `e2e-r5-gate-1-slowops.json`: 89 and 32 samples; the `createOwnedItem` click at most
78 ms and the `addEffect` click at most 81 ms). Samples are matched by their locator title, never by the line number
alone, which moves when the file is edited (`phase-3/scripts/recheck-slowops.py`, output `r5-recheck-slowops.out`). A
test therefore waits for a transition with `settle(page, { transitions: true })` or collapses and expands rows in an
order that does not move the next target, instead of leaving the transition to a retry. A product delay or
animation longer than the ceiling is not waited out: the test removes the cause (the last test of
`combat-turns.spec.js` reloads, which ends core's 2 s scrolling text, before it deactivates the scene). The one
exception is the real-hover test below.

**Action helpers return only after the effect of their action is observable**, so no caller has to wait before its next
action (CLOSED_BUGS #131: a re-render of the previous action discarded or reordered the next one). `settle.js` counts
the document operations (`createDocuments`, `updateDocuments`, `deleteDocuments` of `foundry.abstract.Document`) and
`ApplicationV2#render` calls in flight in the page, installed by `joinWorld` on every document load, and `settle(page)`
waits for zero within 1 s; `settle(page, { transitions: true })` also waits for the finite, unfinished animations inside
a window's content (Svelte row transitions, counted by `globalThis.titanWindowTransitions()`, which `installSettle`
defines next to the counter). The helpers that add, move or delete a row, after which the caller edits the row, use it
(`addCheck`, `addAttack`, `addCustomAspect`, `addRulesElement`, `createOwnedItem`, `addEffect`, `dragGrip`, the delete
loops). `selectTitanOption` settles without transitions and the tab helpers do not settle at all: with transitions
in `clickSheetTab`, `clickTabButton` and `selectTitanOption` the three specs `character-sheet-rows`,
`rules-element-editor` and `surfaces` (74 tests) took 4.3 min, and 2.4 min without
(`r4-cost-A-with-tab-transitions.log`, `r4-cost-B-without-tab-transitions.log`). A caller that clicks into content that
is still sliding in after one of them settles with transitions itself (`item-sheet-rolls.spec.js`: 11 and 6 animations
were in flight right before a click that took 940 ms once, `e2e-r4-gate-1-slowops.json`; the two samples are from the
passing part of `r4-item-sheet-rolls-predamage.log`, a run of 7 passed, 5 failed and 30 not run, because the repeats of
`--repeat-each=6` collided on the actor name; census 0). After the `settle` was added to the test the click took 62 and
65 ms in `e2e-r4-gate-2-slowops.json` and `e2e-r5-gate-1-slowops.json`.
`joinWorld` calls `verifySettle(page)` after `game.ready`: for `Item.createDocuments([])`, `Item.updateDocuments([])`,
`Item.deleteDocuments([])` and `ui.chat.render()` it reads the counter right before the call and right after it
starts, in the same synchronous turn, and throws unless the counter rose by exactly 1. It waits on nothing. Run with
each of the four wrappers left out of `installSettle` in turn, login fails and the error names the call
(`r4-verify-settle-disabled-createDocuments.log`, `-updateDocuments.log`, `-deleteDocuments.log`, `-render.log`); the
check shows the four wrappers are installed on the page, not that every write goes through them.
`actions.js` holds `clickSheetTab` (waits for the tab to be the active one; no `settle`), `clickTabButton` (the same
for a tab button the caller already located), `commitText` (fill, blur, `settle`) and `dragGrip` (the drag, then
`settle` with transitions); `selectTitanOption` waits for the trigger's `data-value` and the closing of the list;
`setCheckbox` waits for the checkbox state, `clickRoll` and `addAttack` call `settle`, as do `addCustomAspect`,
`pickPortrait` and `dragGripToMove` (`drag.spec.js`: the dragged row's element changes position), and the spec setters
that write through the API call or wait as well. What the counter cannot see: a write that a handler starts after an
`await` of its own, a socket request that is not a document operation (the file picker's browse: `pickPortrait` marks
the old list and waits for it to be replaced), and the commit of a dialog's
number input (`setNumberField`: it changes dialog state only, and the caller reads the dialog's summary).

The exemptions wait on a process starting and are not polls on a loaded page:
- a `game.ready` world boot (`join.js` `joinWorld`, which `login` in `fixtures.js` calls; the teardown's and the setup
  recovery's own login goes through it, as does a second browser context's login in `multiClient.js`);
- a mid-file reload through `world.js` `reloadWorld(page, { ready })` (15 s for the `/game` URL, 60 s for the
  readiness predicate, `game.ready` by default), used by the last test of `combat-turns.spec.js`, the reload
  test of `player-hud.spec.js` and both portrait tests of `surfaces.spec.js`;
- the one real-hover test (`component-probe-buttons-tags.spec.js`, "an effect tag tooltip holds the cleaned
  HTML ..."): a hover shows a tooltip after `TOOLTIP_DELAY[0]` (1000 ms) and animates it for `TOOLTIP_DURATION[0]`
  (400 ms), both set in `src/helpers/svelte-actions/TooltipAction.js` and passed to tippy as `delay` and `duration`;
  its wait is 2500 ms. The user exempted it because it waits out the product's own hover-delay timer;
- `use.actionTimeout` (10 s safety net for actions) and per-test and hook limits (`test.setTimeout`, e.g. 120 s or
  300 s for the tests that reload and 240 s for the `beforeAll` of `drag.spec.js`).

Building the `bulkActor` shared fixture (69.1 s with 30 entries of each in one run,
`.superpowers/sdd/test-suite-rewrite/phase-2/review-measure-1.log`) is a long sequence of short waits inside a hook
limit, not one wait. `closeAllApps` (`world.js`) closes each window with `close({ animate: false })`: core waits up to
1000 ms for a window's close transition otherwise (`client/applications/api/application.mjs:982`, 14.364), and the call
measured 2057 ms in a `beforeAll` and 1013 ms in an `afterEach` before the option (`e2e-r2b-gate-2-slowops.json`,
`world.js:31`) and 261 to 293 ms in an `afterEach` after it (nine runs: `e2e-r3b-gate-1-slowops.json` through
`e2e-r4-gate-3-slowops.json`). It is an `evaluate`, not a poll, and is under 1 s.
`tests/e2e/action-helpers.spec.js` runs `addAttack`, `addRulesElement`, `addCheck`, `addCustomAspect`,
`selectTitanOption`, `clickRoll`, `dragGrip` and `commitText` on documents it makes through the flows and reads in one
`evaluate`, the moment each returns, what is still in flight and, where the helper has one, its stored effect (9 tests,
all pass, twice: `r5-gate-intact-1.log`, `r5-gate-intact-2.log`). The tab helpers `clickSheetTab` and `clickTabButton`
have no `settle` and no test: their own active-tab assertion is their contract. With the helper's own `settle` call
removed, 10 repeats each (`r4f-gate-disabled-<helper>.log`): `addAttack`, `addRulesElement`, `addCheck`,
`addCustomAspect` (6 to 16 finite window animations in flight; `addRulesElement` also 1 operation), `selectTitanOption`
and `commitText` (1 operation in flight; the stored value was already the typed one) fail 10 of 10. `dragGrip` failed 0
of 10 (`r4f-gate-disabled-dragGrip.log`) and 1 of 10 in an earlier run of the same test (operation and animation in
flight, order not stored yet, `r4-gate-disabled-repeat10-dragGrip.log`): shown necessary at a low rate, 1 of 20 runs.
`clickRoll` and the test that runs `commitText` twice in a row on the fields of a new row (the shape of #122 and #128)
passed 20 of 20 each without their `settle` (`r4f-gate-disabled-clickRoll.log`,
`r4-gate-disabled-repeat10-clickRoll.log`; `r4f-gate-disabled-commitText-twice.log`,
`r4-gate-disabled-repeat10-commitText-twice.log`): no run shows those two `settle` calls necessary.

Invalid core or priority values are hard errors, never silent fallbacks to the default.

**Fixture hygiene:** a token placed while a just-activated scene is still drawing gets an unparented placeable, and a
later actor update throws in core's `RenderFlags.set` because `canvas.pendingRenderFlags` does not exist until the draw
activates its ticker (measured; `docs/CLOSED_BUGS.md` #113); `createScene`, `activateScene` and `viewScene` wait for the
draw, and `placeToken` places on the viewed scene. Killing a full-suite run mid-flight skips the suite-end teardown;
`global-setup.js` deletes what the next run finds on the running list, and accumulated fixtures show up as slow LOGIN
(`Navigate to "/join"` and `game.ready`), not as slow tests.

**The e2e viewport must stay at or above Foundry's 1366x768 minimum** (`use.viewport` is 1920x1080).
Below it, Foundry raises a permanent resolution notification whose `#notifications` banner spans the
full viewport width near the top and **intercepts pointer events on anything under it** — the player
HUD included, which makes row clicks retry until the test times out with no visible cause.

**`createEmbeddedDocuments` return order is NOT input order.** Never map the returned array by index
to your payloads — resolve created ids by NAME afterward (`actor.items.getName(payload.name)?.id`). Index-mapping gives
wrong-id assertions that fail only in multi-payload creates. The specs create their documents through the flows, which
read and record each id.

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
   `player-hud-action-menu.spec.js`.

**Chat cards render TWICE — always target `#chat`.** Every TITAN card mounts in the persistent `#chat`
log AND as a transient toast in `#chat-notifications`. They are siblings under `#ui-right` and the
toast is FIRST in DOM order, so an unscoped `.message[data-message-id=…]` locator with `.first()`
silently selects the toast — which has no layout box for ~500ms, is stable only to ~4750ms, and
**removes itself from the DOM at ~5250ms**. Always scope to `` `#chat .message[data-message-id="…"]` ``
(exactly one match, so `.first()` becomes redundant). The exception is
the mount-keying tests of `chat-cards.spec.js`, which drive both panes deliberately.

Because the e2e client starts with the sidebar COLLAPSED, `#chat` sits at x=1920 in a 1920-wide
viewport — off-screen. Text and `toBeVisible()` assertions still pass there (non-empty bounding box),
but a click fails with "element is outside of the viewport". Any spec that interacts with a card must
call **`showChatLog(page)`** (`world.js`) in `beforeAll`.

Creating a `ChatMessage` document does not render it, so still gate a one-shot chat-DOM read on the
mounted card: `expect(page.locator('#chat .message[data-message-id="…"] .check-chat-message')).toBeAttached()`.

This class of race stays latent while rendering is slow enough to mask it: under the SwiftShader software
rasterizer the Playwright round-trip outlasted the transition, and enabling GPU rendering exposed it.

Releasing control presses Escape once, or twice when an action-menu cascade is open, because the cascade consumes
the first Escape (`releaseTokenControl`).

**Foundry core Escape releases token control.** Any canvas-overlay UI that closes on Escape must
consume the event in the WINDOW CAPTURE phase (`onkeydowncapture` + `stopImmediatePropagation`),
or core deselects the token and selection-driven UI unmounts mid-interaction (the player HUD's
cascade and effect popout both do this).

**The action menu's open category persists across e2e tests.** `openCategory` lives in the shared
layout state and `afterEach` only closes apps, so a cascade left open by one test survives into the
next. A test that clicks the SAME category the previous test left open TOGGLES it closed; dismiss any
open flyout first (`Escape` when `player-hud-flyout` is present), as the `openCategory` helper in
`player-hud-action-menu.spec.js` does.

**Mid-file `page.reload()` idiom.** Steps (3)-(5) below are `tests/e2e/world.js` `reloadWorld(page, { ready })`,
where `ready` is the in-page predicate of step (5) (`game.ready` by default); a spec never repeats them inline.
`expectActiveGM(page)` (also in `world.js`) asserts `game.users.activeGM?.isSelf`, because only the active GM migrates
and core's `getDesignatedUser` makes the active GM with the highest role that GM. The last test of
`combat-turns.spec.js`, the reload test of `player-hud.spec.js` and the portrait tests of
`surfaces.spec.js` call `reloadWorld(page)` with the default predicate. A spec navigates only through
`reloadWorld` and `joinWorld` (the one `.reload(` in `world.js`
and the one `.goto(` in `join.js`), never an inline `page.reload(`, `location` change or `goto(`; no test scans for
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
- When a test fails, Playwright restarts the worker and runs the file's `beforeAll` again, which creates a second
  document of the same name. The create flows (`createActor`, `createWorldItem`, `createScene`, `createFolder`,
  `createCompendium`) compare the entry ids before and after the click (`readEntryIds`) and record the new one, so
  the second document is recorded (measured: `diag-fail-registry-fixed.jsonl` against
  `diag-fail-registry-by-name.jsonl`, CLOSED_BUGS #150, under
  `.superpowers/sdd/2026-09-29-conditions-rework/bugbatch1-logs/`, local; core refuses a second pack of one label, so
  that creation fails loudly); a lookup by name elsewhere still finds
  both documents, and the first failure is the one to read (the older failure with two `E2E Rows Actor` directory
  entries: `gates-fix-before.log`).
- The check-list specs (`check-list-refused-update.spec.js`) make an update fail on demand, which no real flow does: a
  `preUpdateItem` listener returning false is a module's veto (the update resolves undefined), and an `update` method
  set on the item instance that throws stands for a failed database request (it is deleted again in `afterEach`; a
  held variant throws when the test says so, to toggle a row while the update is in flight). A rejected update is
  made by calling the document method directly, because the sheet's click handler does not await it. Every spec asserts
  the exact number of updates the interception saw (`toBe(1)`), so a second update (CLOSED_BUGS #149) fails it. The
  edits that prove the undo are in CLOSED_BUGS #148.
- A drag from one check row to another moves a row only when both ends are inside the viewport: with three expanded
  checks (355 px each) in a 1000 px sheet the first row's top edge was at y -121 and neither drop half of an upward drag
  moved anything (measured: `diag-up-drag.jsonl`); the upward reorder spec collapses the outer rows first.
- Typing specs: `fill` sends no key events, so the specs for a text sent on `input` use `pressSequentially` with no
  delay as well, and a CDP session (`Input.imeSetComposition`, `Input.insertText`) for an input method; the numeric
  inputs and `DocumentTextInput` keep the entered text in their own state while focused (CLOSED_BUGS #147; the IME
  specs count the page's `preUpdateItem` calls: none while a composition runs, one when it ends). Enter on an
  unchanged input sends no update (`check-list-refused-update.spec.js`, CLOSED_BUGS #149).
- The expansion undo methods are covered by a unit test over every move of 1 to 7 rows
  (`tests/unit/TitanItemSheetStateUndo.test.js`; the state only moves entries, so it uses numbers for the flags).

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
- A list's `<ol>` renders only when the list has a row (read: `{#if ...length > 0}` in
  `ItemSheetRulesElementsTab.svelte` and `ItemSheetChecksTab.svelte`), so a sheet that receives a copied row needs one
  row of its own to drop on.
- The Casting Check tab has no control that changes an aspect (read: `SpellSheetCastingCheckTab.svelte` holds only the
  attribute, skill, auto-calculate, difficulty and complexity controls) and a sheet shows one tab at a time, so the
  re-pricing test has a second client (`E2E GM 2`) change the range on the Standard Aspects tab while the first
  client's Casting Check panel is open.
- The Casting Check panel's list at the default sheet size: 1 to 8 custom aspects gave no overflow, 9 and 10 gave 2 px,
  11 and 12 gave 39 px, 13 and 14 gave 77 px (`spell-overflow-measure.log`). The test scrolls 40 px, which first fits
  at 13 custom aspects; it uses 14, which gives the same 77 px.
- A folder's own header Create button creates a document inside that folder (read: `templates/sidebar/partials/
  folder-partial.hbs`, `create-entry`, and `DocumentDirectory#_onCreateFolder` / `_onCreateEntry` in Foundry 14.364 at
  `C:\FoundryVTT\V14\dev\foundry`), which is how `createWorldItem` and `createActor` fill a folder. Dragging a folder's
  header onto an actor sheet is dispatched to `TitanActorSheet#_onDrop` as `type: 'Folder'` (read).

**E2E effect tray and compendium spreadsheet specs (`effect-tray`, `compendium-spreadsheet`)** — notes; each says
whether it was measured (with its saved log, under `.superpowers/sdd/test-suite-rewrite/phase-6/`, local), read (with
the source) or inferred:
- `effect-tray.spec.js` makes every pack in the Compendium tab (`createCompendium`, type `ActiveEffect`) and every
  folder and effect with the tray's own controls (`createTrayFolder`, `createTrayEffect`). A test that changes a pack
  makes its own; the read-only tests share the `trayPack` fixture, or the nested pack (a parent folder, a child folder
  with an effect, a root effect) that the `beforeAll` of their describe builds. A failure restarts the worker and runs
  that hook again, and the second run's duplicate pack label fails it (measured for the spreadsheet source pack in
  `sheet-1.log`; the tray's nested pack has the same shape and was not run that way). Folders and effects are recorded
  with their pack and go with it at teardown. The Apply tests place a per-test actor's token on the shared scene and
  control it (`createActor`, `placeToken`, `controlPlacedToken`); the stash tests drag the grip
  (`[data-drag-handle]`) of an effect row in an actor sheet onto a tray folder header or the empty list; the rollable
  table that core's Create Rollable Table folder action makes is recorded by the test (`record`). The row counts of
  the shipped `titan.effects` pack come from its index and folders.
- `compendium-spreadsheet.spec.js` imports `decodeSpreadsheetFiles`, `encodeCsv` and `zipFiles` from
  `src/spreadsheet/format/` through the `~/` alias (measured: the spec passed 17 of 17 with these imports,
  `phase-6/sheet-2.log`; that Playwright reads the `paths` entry of `jsconfig.json` is inferred). A file is the Export
  dialog's CSV zip, decoded to sheets in Node, edited the way a user edits a spreadsheet (a cell set, rows or a column
  deleted), encoded again and handed to the dialog's file input as an in-memory buffer. The source pack holds an actor
  with a weapon and two effects (`createActor`, `createOwnedItem`, `addEffect`, `putInPack`) and a second actor. No
  sheet creates an effect on an owned item, so the file's item-effect row names the weapon in its `_parentId` cell, and
  the import creates the depth-2 effect. Import behaviour read from `PlanImport.js` and `ApplyImport.js`: a row with a
  blank `_parentId` cell whose id is no top-level pack document is looked up in the pack's embedded index, which is how
  a file with only the edited weapon or effect row updates it; a row whose `_parentId` names a document that is not
  top-level and not in the file is planned as a create (`resolveExistingDocument` finds no parent). A row that names a
  parent that exists nowhere is therefore refused with the create branch's message, `Cannot create <class> documents
  under parent "<id>"` (measured: with that message changed, the refusal test fails, `mutations/A-M6a-item-parent.log`;
  a second test whose row had the id of a pack item reached the same branch, so it duplicated the first and was
  removed). The `Cannot update` branch is reached by a stale plan, measured: the Import dialog stays open and usable
  while the Compendium tab and a pack window are operated, so a test previews an update of the weapon (blank parent
  cell, which resolves to the actor of the pack), deletes the actor from the pack window's context menu, then applies;
  `Cannot update Item documents under parent "<actor id>"` shows and the pack stays empty (`phase-6/stale-1.log`; with
  the message changed the test fails, `phase-6/mutations/logs/M12-run.log`).

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
whose default you have verified.

**Run e2e from a foreground shell (machine-local)** — launching Playwright from a DETACHED background
shell on this machine crashes its worker processes at startup with Windows status `0xC0000142`
(process-initialization failure), so the run dies before any test executes. Always run
`npm run test:e2e` from a foreground shell.

**Multi-client harness** — `tests/e2e/multiClient.js` provides two helpers for tests that require simultaneous
Foundry sessions: `withClients(browser, clientSpec, fn)` creates one independent `BrowserContext` per entry in
`clientSpec` (a `{label: userName}` map), logs each in via `login()`, then calls `fn(pages)` where `pages` maps each
label to its `Page`, then flushes each client's errors (`flushPageErrors`) for the harness gate. All contexts are
closed in `finally` even if the callback or a login throws. `awaitUsersActive(page, userNames)` polls
`game.users.getName(name)?.active` inside `page.waitForFunction` (1000 ms timeout) until all named users are active on
that client. `character-sheet-rows.spec.js`, `effect-tray.spec.js`, `player-hud.spec.js`, `spell-sheet.spec.js` and
`multi-client.spec.js` call `withClients`; `combat-turns.spec.js` and `ownership.spec.js` open their extra clients in
contexts of their own. Because `playwright.config.mjs` uses `workers: 1`, logins are sequential and there are no race
conditions on the `/join` form. The smoke test is `tests/e2e/multi-client.spec.js`, which also holds the compendium
permissions test.

**npm scripts** — `npm test` runs `vitest run` (single pass); `npm run test:watch` runs Vitest in watch
mode; `npm run test:e2e` runs the Playwright suite above (its `global-setup.js` builds the test bundles into
`test/build/` first) and is THROTTLED by default — it wraps `playwright test` in
`tests/e2e/run-e2e-throttled.ps1` (BelowNormal process priority, affinity limited to half the cores; filter
args pass through) so a full run does not starve the machine. `npm run test:e2e:fast` is the unthrottled
`playwright test` escape hatch; `npm run test:e2e:headed` and `npm run test:e2e:ui` run `playwright test --headed` and
`--ui`. `npm run build:e2e` (`vite build --config vite.probe.config.mjs`) builds just
the standalone component-probe IIFE (see next entry).

**Component-probe harness (externalized, test-only)** — `src/test-probe/` lets Playwright mount a single base
Svelte primitive in isolation inside the live Foundry runtime, with controlled props, to assert its
interaction contract independent of any sheet. `registerProbe.js` installs `game.titan._probe =
{ components, helpers, mount(name, props?, context?), unmount(id), unmountAll() }`; `helpers` holds system helpers
that read the live canvas (`getTargetedCharacters`, `getTargetedCharacterTokens`, `measureTokenDistance`) for specs that
call them on real tokens (`target-helpers.spec.js`); `mount` creates a detached
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
`ready` hook. Playwright injects it on demand: `componentProbe.js`'s `mountProbe` → `ensureProbe(page)` (exported) adds
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
element with no `rounding`. `PAYLOAD` (also exported by `componentProbe.js`) is the cleaning-probe string, a paragraph
and an image with an `onerror` handler.

**Coverage:** `componentRegistry.js` holds 91 entries: all 88 `.svelte` files under `src/helpers/svelte-components/**`
and the three rules-element settings editors `ItemSheetConditionalCheckModifierSettings`, `ItemSheetMulBaseSettings` and
`ItemSheetMulSumSettings` (measured: a count of the registry's object keys and of the files, and a per-file check that
each file's name is a key). The probes are three specs, one world boot each (each describe = one component):
`tests/e2e/component-probe-inputs.spec.js` (8 `input/` non-select primitives, the editors above, the invalid-data
probes, `SelectList` (mounted with instrumented `floatingContent`, `onhover` and `onselect` callbacks; its rows are
portaled to the body, so the list is located by its `<testId>-list` test id), and the 17 `input/select/` typed wrappers:
16 run from one table of `{component, options, testId, supportsNone, wrapperTestId}` whose options are the `src/`
constants the components build their lists from (`ATTRIBUTES`, `SKILLS`, `RARITIES`, ..., `ARMOR_TRAITS`,
`ATTACK_TRAITS`, `SHIELD_TRAITS`; imported through the `~/` alias), so a constant change cannot meet a stale hand count,
and `DamageReducedBySelect`, whose list depends on two flags, is written out); `-buttons-tags.spec.js` (14 `button/`
primitives, `HudButton` among them, 17 `tag/` primitives incl. `EditDeleteTag` whose probe also locks in the FontAwesome
`font-family` regression, with the `SpellAspectTags` entries built by `selectDisplayedSpellAspects` (a selector change
fails the test, `M4-spellaspects-run.log`), and the tooltip HTML-cleaning probes: an `EffectTag` and a `Tag` mounted
with an event-handler payload; the `EffectTag` one is the suite's one real-hover test); `-display.spec.js` (core
`Button`, `TextInput`, `NumberInput`, `IntegerInput`, `CheckboxInput`, `Select`, `LabelTag`; the 5 `label/` primitives;
`RichText`, the `EffectTag` family (suppressed entries included) + its six duration-variant wrappers,
`SuppressedEffectTag`, `CondensedCheckButton`, `ProseMirrorEditor`;
`Meter`, `Text`, `Tabs`, `ScrollingContainer`, `LabeledElement`, `BorderedColumnList`, `TagContainer`; `DragHandle` and
`InsertionLine` of `drag-reorder/`; and the `RichText` HTML-cleaning probe). The cleaning probes use synthetic props
because a real flow cannot carry an event handler into these sinks (ProseMirror drops `on*` attributes on input); each
fails when `foundry.utils.cleanHTML` is replaced by the identity in the page before the mount
(`.superpowers/sdd/test-suite-rewrite/phase-6/partB/mutations/M1-richtext-uncleaned-page-run.log`, `M2-...`, `M2b-...`),
and the table fails when a select drops an option (`M3-attacktrait-slice-run.log`: `AttackTraitSelect` without its first
trait fails 2 tests). Each probe of `HudButton`, `DragHandle`, `InsertionLine` and `SelectList` fails when one line of
its component is mutated (eight mutations, one saved log each,
`.superpowers/sdd/2026-10-01-test-suite-real-data/phase-8/ mutations/M1-…` through `M8-…`; sources restored and compared
with HEAD). Every primitive carries a `testId` (`data-testid` passthrough) **except `Text`, `DragHandle` and
`InsertionLine`**, which have no root that takes one (`Text` renders `{processTextData(text)}` inline, and a wrapper
would change its DOM contract), so their probes locate via the probe container selector, `[data-drag-handle]` and
`.insertion-line`; `SelectList` takes `testId` as the `<testId>-list` id of its list root. Wrapper components forward
`testId` to their inner primitive's rendered root (e.g. wrapper selects → the
`AttributeInput`/`RarityInput`/`ResistanceInput` div; bare selects → the inner `<Select>`'s combobox button
(`[role="combobox"]`); `ImagePicker` → `ImageButton`'s `<button>`). To probe a new primitive: add it to
`componentRegistry.js`, add a `testId` prop on its root if it lacks one (never add a wrapper element solely to host it),
append a describe block, then re-run the spec — `test:e2e`'s global-setup rebuilds `test/build/probe.iife.js` and the
harness re-injects it (no `dist/` rebuild needed).

**Gotcha — Foundry global `.disabled`:** Foundry's `foundry2.css` defines `.disabled { pointer-events: none; }`.
Never use `disabled` as a CSS class on an element wrapping interactive content — it silently blocks all
pointer events on descendants. Use a non-colliding name (e.g. `not-enabled`, the off-state class of
`ToggleOptionButton`).

**Logic layer — Playwright + fast-check** — The in-client logic tier uses Playwright `page.evaluate`
calls against the live v14 runtime (no external module dependency). `tests/e2e/fast-check.js` injects the
`fast-check` library as the `fc` page global (`injectFastCheck`); the only property run in the page is the trivial one
of `logic/fast-check-smoke.spec.js`, which checks the injection (the flat-modifier stacking property runs in vitest, see
the rules-element spec below). Quench is not used: its `runBatches` executes 0 tests under Foundry v14 (the
async-`describe` / ApplicationV2 timing mismatch causes all batch registrations to be skipped silently). Measured:
`grep -rli quench src tests package.json system.json` matches nothing.

**Derived-data (rules-element) E2E spec** — `tests/e2e/logic/rules-elements.spec.js` builds every rules element in the
Rules Elements tab (`addRulesElement`) of an ability, an effect or an owned item of actors made through the flows, and
reads the result where a user does: the sheet's derived attribute value (flat modifiers, Multiply Base, Multiply Sum,
Set Sum, rounding), the dialogs of a casting check and an item check, and the posted parameters of rolled checks
(damage, healing, Advantage, Automatic Failure), and the bucket each source fills (an owned weapon, equipment item,
shield and armor fill `equipment` only while equipped; a permanent effect fills `effect` only while enabled; each test
reads Body's value and `mod` buckets with the source absent, present, then absent again). Abilities apply their rules
elements on mere ownership (no equip), making them the canonical fixture type for derived-stat assertions. The
flat-modifier stacking invariant (Body = max(0, 1 + sum) for any list of flat modifiers) is a vitest property,
`tests/unit/RulesElementStacking.property.test.js`:
it builds a bare model (`Object.create(CharacterDataModel.prototype)`) with hand-set stats and a parent holding one
ability with the generated flat-modifier rules elements, runs the model's `_applyRulesElements` and `_applyMods`, and
compares Body's `value` with the formula. It does not run Foundry's data preparation or a document. Measured: with
`Math.max(stat.value + mod, 0)` in `_applyMods` replaced by `stat.value + mod` the property fails with the
counterexample `[[-2]]` (`.superpowers/sdd/test-suite-rewrite/phase-4/stacking-engine-mutation.log`); the unmutated
code passes (`stacking-unmutated.log`).

**`checkDialog.js`** — `tests/e2e/checkDialog.js` drives the check dialogs. `openCheckDialog(page, type, uuid, { button,
index })` opens the sheet of the actor (Attribute and Resistance checks: the header button named for the attribute or
resistance) or of the owned item (Attack, Casting and Item checks: the `index`-th roll button of the sidebar) and clicks
the button; the `getCheckOptions` setting must make the click open a dialog. `moveDialogAside` drags a dialog to the
left edge of the page so that it leaves the controls of the sheet behind it uncovered. `setNumberField`,
`setSelectField`, `setCheckbox`, `readSummary`, `clickRoll` and `readNewestCheckFlags` set a field, read a summary, roll
and read the posted message by the dialog's test ids (`check-field-<key>`, `check-summary-<key>`, `check-dialog-roll`).
The one dialog opened through `request<Type>Check` is the `clickRoll` test of `action-helpers.spec.js`
(`requestAttributeCheck`), because that test is of the click helper and not of a document.

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
