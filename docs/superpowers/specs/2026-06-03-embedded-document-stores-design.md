# Embedded Document Stores — Design

**Date:** 2026-06-03 (refreshed 2026-06-05)
**Status:** Design — approved, pending implementation plan
**Scope:** Pattern + a durable shared-`AttackTags` proof — one component rendering a weapon's intrinsic attack tags across the weapon item-sheet sidebar, the character sheet, and the weapon item chat card. Decomposed; see Follow-up work.

> **2026-06-05 refresh:** the chat-message-subtypes conversion (Phases 1-4 + follow-ups B/D) has
> since shipped, so the weapon item card already reads `document.data.system.attack` (a snapshot
> with path parity to the weapon document). The chat card therefore joins the proof as the third
> `AttackTags` consumer (it was deferred when this spec was first written). Deltas are folded in
> inline; the core machinery (bridge / provider / two-context convention) is unchanged.

## Problem

Every Svelte component in the system reads `getContext('document')` to reach its
data. That context resolves to a *different* document depending on the sheet:

- **On an item sheet** `'document'` is the item, so the weapon attack editor
  (`WeaponSheetAttackSettings.svelte`) reads `document.data.system.attack[idx]`
  and writes back through `refreshSystemDocument(document.data)`.
- **On the character sheet** `'document'` is the *actor*, so a parallel component
  (`CharacterSheetWeaponAttack.svelte`) must read
  `document.data.items.get(item._id).system.attack[attackIdx]` and thread both
  `item` and `attackIdx` through every layer.

The result is two parallel component trees (`WeaponSheet*` vs.
`CharacterSheetWeapon*`) doing the same job against the same data, differing only
in **how they reach the embedded document**. A component written for one sheet
cannot run on the other.

The goal: be able to **pass an embedded document itself** (the weapon, an effect)
to a component and have its reads stay reactive and its writes persist — so a
component depends only on "the current document" and runs unchanged whether that
document is a top-level sheet document or an embedded child. This spec builds that
machinery and proves it with one **durable** de-dup (the shared `AttackTags`
component); broader feature reuse is decomposed to Follow-up work.

## Reactivity constraint (why the chosen mechanism)

Reactivity in this codebase comes from reading a bridge's `.data` getter, which
calls `createSubscriber()` (see `ReactiveDocument.svelte.js`). Raw Foundry
documents are not Svelte-reactive, and the existing character-sheet code already
re-reads embedded data through `document.data.items.get(id)…` on every change —
its comments note *"its identity changes on every update"* and *"re-read through
`document.data` so the footer updates in place."* Conclusion: **an embedded
wrapper must re-resolve the live document through an ancestor bridge on every
read; holding a fixed reference goes stale.** This rules out wrapping each
embedded document in its own independent `ReactiveDocument` (fixed reference +
hook multiplication) and drives the delegating design below.

## Goals

- A reactive bridge for embedded documents (`Item` / `ActiveEffect`) that
  re-resolves the live document each read and inherits reactivity from the
  nearest ancestor bridge — no new hooks, no stale references.
- A provider component that hands an embedded document to a subtree via context
  so existing context-reading components and inputs work **unchanged**.
- A documented two-context convention that gives actor-coupled components an
  escape hatch to the owning sheet document.
- A **durable** proof: one shared `AttackTags` component that renders a weapon's
  intrinsic attack tags from `getContext('document').data.system.attack[idx]`,
  consumed unchanged by the weapon item-sheet sidebar (top-level weapon), the
  character sheet (embedded weapon via the provider), and the weapon item chat
  card (snapshot via path parity) — deleting the duplicated intrinsic-tag markup
  from all three.

## Non-goals (decomposed to follow-up specs)

- Migrating the **actor-derived** attack display (dice pool / training /
  expertise) or the attack-**roll** button to a shared component — these stay on
  the character sheet (refactored to read the actor via `'sheetDocument'`, not
  extracted). One deliberate exception: the actor's **damage modifier** reaches
  the shared component as the optional `damageMod` prop (see Proof case), so the
  character sheet's damage tag keeps showing modified damage.
- Generalizing the pattern to the checks tab, rules-elements tab, commodity, or
  effect rows.
- Deleting the `CharacterSheetWeapon*` components — they are **refactored** (to
  source the weapon via the embedded provider and render the shared `AttackTags`),
  not removed.
- **Any chat-message schema or producer change.** Chat-message path parity (item
  cards snapshotting `system.*`, deep check-chat schemas, the
  `buildSchemaFromShape` helper) **shipped with the chat-message-subtypes
  conversion** (closed 2026-06-05), so `document.data.system.attack[index]`
  already resolves on the weapon card. This spec only swaps the card's
  hand-rendered stats row onto the shared `AttackTags`; schemas, producers, and
  message data are untouched.

## Architecture

### 1. `EmbeddedDocument` bridge — `src/document/reactive/EmbeddedDocument.svelte.js`

A sibling to `ReactiveDocument`. It holds the nearest ancestor bridge plus a
collection name and an embedded id, and re-resolves the live embedded document on
every read:

```js
export default class EmbeddedDocument {
   #parent;       // ReactiveDocument | EmbeddedDocument — the nearest ancestor bridge
   #collection;   // 'items' | 'effects'
   #id;           // embedded document id

   constructor(parent, collection, id) { /* assign */ }

   // Reactive: reading parent.data subscribes via the parent bridge's createSubscriber.
   get data() { return this.#parent.data?.[this.#collection]?.get(this.#id); }

   // Raw (non-subscribing) live doc, for write-back call sites (refreshSystemDocument).
   get doc()  { return this.#parent.doc?.[this.#collection]?.get(this.#id); }

   destroy() {}   // no-op; the ancestor bridge owns the hooks
}
```

Properties:

- **No hooks of its own.** Reactivity comes entirely from reading `parent.data`,
  which fires the ancestor bridge's existing `createSubscriber`.
- **Always live.** Resolving by id every read means it never holds a stale
  reference — matching the existing "re-read through `document.data`" pattern.
- **`.data` / `.doc` parity** with `ReactiveDocument`: `.data` is the reactive
  read; `.doc` is the raw live document for write-back call sites (e.g.
  `DocumentBoundEditorInput` uses `documentBridge.doc`).
- **Nesting works for free.** An effect-on-item-on-actor chains
  `actorBridge → itemEmbedded → effectEmbedded`; every link resolves through the
  one above it, all driven by the actor's single subscription.

### 2. `EmbeddedDocumentProvider.svelte` — `src/document/reactive/`

A wrapper component. It takes the live embedded document, builds the bridge from
the ancestor `'document'` context, and shadows `'document'` for its children:

```svelte
<script>
   import { getContext, setContext } from 'svelte';
   import EmbeddedDocument from '~/document/reactive/EmbeddedDocument.svelte.js';

   let { doc, children } = $props();

   const COLLECTION_BY_DOCUMENT_NAME = { Item: 'items', ActiveEffect: 'effects' };

   const parent = getContext('document');                 // actor (or item) bridge
   const collection = COLLECTION_BY_DOCUMENT_NAME[doc.documentName];
   // collection undefined → warn; bridge resolves to undefined and children guard.

   const embedded = new EmbeddedDocument(parent, collection, doc.id);
   setContext('document', embedded);
</script>

{@render children?.()}
```

Usage — *pass the embedded document itself*:

```svelte
<EmbeddedDocumentProvider doc={weapon}>
   <!-- any descendant reads getContext('document') === the weapon -->
</EmbeddedDocumentProvider>
```

`getContext('document')` inside the provider reads the **ancestor** value (the
actor bridge); `setContext('document', …)` shadows it for descendants only.

### 3. Two-context convention

| Context key | Points to | Shadowed by providers? |
|---|---|---|
| `'document'` | the **current / nearest** document (top-level sheet doc, or an embedded doc inside a provider) | **Yes** |
| `'sheetDocument'` | the **owning sheet** document (always the top-level bridge) | **No — set once, never shadowed** |

`DocumentSheetShell.svelte` gains one line —
`setContext('sheetDocument', document)` — alongside the existing
`setContext('document', document)`. Providers shadow only `'document'`.

- Reusable components that touch only the current document's own fields keep
  reading `'document'` (so they run on either sheet).
- Components that need the owning actor (roll buttons, etc.) read
  `'sheetDocument'`.

**This spec exercises the convention for real.** The character-sheet weapon
attack row moves inside an `EmbeddedDocumentProvider`, so its intrinsic-tag reads
use `'document'` (the embedded weapon) while its actor-derived tags (dice pool,
training, expertise) and the attack-roll button read `'sheetDocument'` (the
actor). The item-sheet sidebar needs no provider — its top-level `'document'` is
already the weapon.

## Data flow — bridge read/write mechanics (illustrative)

The durable proof below uses only the **read** path; the write path is shown here
for completeness (it is what future editor reuse will rely on, and what
`refreshSystemDocument` already does through the same accessor).

1. The character sheet mounts with `'document'` = `ReactiveDocument(actor)` and
   `'sheetDocument'` = the same bridge.
2. A weapon's attack list renders `<EmbeddedDocumentProvider doc={weapon}>`,
   shadowing `'document'` = `EmbeddedDocument(actorBridge, 'items', weaponId)`.
3. **Read:** a descendant reads `getContext('document').data.system.attack[idx]`
   → resolves `actorBridge.data.items.get(weaponId).system.attack[idx]`, reactive
   via the actor's subscription.
4. **Write (future editors):** a context-reading input mutates the live field and
   calls `refreshSystemDocument(document.data)` → `weapon.update({ system: … })`.
5. Foundry fires `updateItem` → the actor bridge's subscriber invalidates → the
   embedded read re-runs → UI updates. **No new component code is touched** — the
   same context-reading component runs on the item sheet and the character sheet.

## Proof case (durable): one shared `AttackTags` across document types

Today the same intrinsic attack tags (damage, type, range, attribute/skill,
traits, custom traits) are rendered by **three** near-identical blocks:
`CharacterSheetWeaponAttack.svelte` (character sheet), `WeaponSheetSidebarAttacks
.svelte` (weapon item-sheet sidebar), and `WeaponChatAttacks.svelte` (weapon item
chat card). They differ only in how they reach the attack and in minor tag-
component choices (`IconTag` vs `Tag` for type; `TraitTag` vs `StatTag` for
numeric traits).

**New shared component — `AttackTags.svelte`** (location:
`src/document/types/item/types/weapon/components/`, shared across sheets/chat). It
reads the attack from context by index and renders only the **intrinsic** tags:

```svelte
let { idx = undefined, damageMod = 0 } = $props();
const document = getContext('document');   // weapon (top-level or embedded) or chat-message snapshot
const attack = $derived(document.data?.system.attack[idx]);
{#if attack}
   <!-- damage, type, range, AttributeCheckTag, traits, customTraits -->
{/if}
```

Canonical tag order and components (the normalization): **damage (`IconStatTag`,
value `attack.damage + damageMod`, with the `+ <extra successes>` suffix when
`plusExtraSuccessDamage`) → type (`IconTag`, melee/accuracy icon) → range
(`IconStatTag`, hidden at 1) → attribute/skill (`AttributeCheckTag`) → traits
(`TraitTag`) → custom traits (`Tag`)**. `TraitTag` already encapsulates the
`typeof value === 'number' ? StatTag : Tag` branch all three call sites
hand-write, so trait rendering is visually unchanged everywhere; the sidebar's
type tag gains the icon it lacked (it used a plain `Tag`) and its stat order
shifts slightly (it led with type).

**One escape hatch — `damageMod` (number, default 0).** The character sheet's
damage tag today shows `attack.damage + getAttackCheckMod('damage', item,
attack, multiAttack)` — an actor-derived modifier the original intrinsic/actor
split overlooked. Rather than render two damage tags or silently drop the
modified value, `AttackTags` adds the optional prop into its damage value; the
character-sheet row computes the mod through `'sheetDocument'` and passes it,
while the sidebar and chat card omit it (intrinsic damage). Rendered values on
all three surfaces are exactly today's.

**Consumed unchanged in three places:**

- **Weapon item-sheet sidebar** (`WeaponSheetSidebarAttacks`): `'document'` is
  already the top-level weapon — iterate and render `<AttackTags {idx} />`.
- **Character sheet** (`CharacterSheetWeaponAttacks` / `…Attack`): wrap the
  weapon's attack list in `<EmbeddedDocumentProvider doc={weapon}>`, so
  `'document'` becomes the embedded weapon and `<AttackTags {idx} />` renders
  identically. The row's **actor-derived** tags and **roll** button switch to
  `getContext('sheetDocument')` (the actor) — e.g.
  `sheetDocument.data.system.requestAttackCheck({ itemId: document.data.id, attackIdx: idx })`.

- **Weapon item chat card** (`WeaponChatAttacks`): the chat tree's `'document'`
  context is the message bridge, and path parity (chat-subtypes Phase 2) makes
  `document.data.system.attack[idx]` resolve on the message's snapshot — so
  `<AttackTags {idx} />` needs **no provider and no schema change**. The
  component keeps its chrome (the `<ol>`, per-attack name header) and replaces
  only its hand-rendered stats row. Snapshot semantics are preserved
  automatically: the message bridge wraps the message, not the live weapon, so
  the card never mutates when the weapon is later edited or deleted.

All three call sites delete their duplicated intrinsic markup. Tag-component
choices are normalized in `AttackTags` (the small, accepted visual change made
concrete above), and the character-sheet tag order shifts slightly because the
intrinsic tags now render as one block. The provider is **keyed by weapon id**
(the weapon list already is).

## Edge cases & error handling

- **Embedded doc deleted while open** → `parent.data.items.get(id)` returns
  `undefined`; `EmbeddedDocument.data` is `undefined`. The provider and proof
  component guard with `?.` / `{#if document.data}`. The keyed row unmounts on
  delete, so it is transient.
- **Provider identity in lists** → providers must be **keyed by `doc.id`**
  wherever they appear in an `{#each}` (context is captured at init; a reused
  instance pointing at a new id would be wrong). The weapon row is already
  id-keyed. Documented as a rule in `references/conventions.md`.
- **Unknown `documentName`** → `COLLECTION_BY_DOCUMENT_NAME` covers
  `Item` / `ActiveEffect`; anything else logs a `warn` and yields a
  null-resolving bridge (components already guard).
- **Permissions** → unchanged. `refreshSystemDocument` already gates on
  `document?.isOwner`; an embedded weapon's `isOwner` derives from actor
  ownership, so non-owners cannot write.

## Testing

- **Unit (`EmbeddedDocument`):** feed a stub parent bridge whose `.data`/`.doc`
  return a fake `{ items: Map, effects: Map }`. Assert `.data`/`.doc` resolve the
  right document, return `undefined` safely for a missing id, and that the
  collection mapping is correct. Pure JS — no Svelte runtime needed.
- **E2E (Playwright, world-launch-gated):** with a character owning a weapon with
  ≥1 attack —
  - open the **weapon item sheet** and the **character sheet** (weapon expanded);
    assert the same intrinsic attack tags (damage / type / range / attribute /
    skill / traits) render in both `AttackTags` instances with matching values;
  - **reactivity:** edit the attack (e.g. its damage) on the weapon item sheet and
    assert the character sheet's `AttackTags` updates live (the embedded bridge
    re-resolves through the actor's subscription);
  - **two-context:** assert the character-sheet row still shows actor-derived tags
    (dice pool / training / expertise), that its damage tag still includes the
    actor's damage modifier (the `damageMod` prop), and that the roll button
    fires `requestAttackCheck` on the actor (via `'sheetDocument'`);
  - **chat (snapshot parity + non-reactivity):** send the weapon to chat; assert
    the card's `AttackTags` renders the same intrinsic tags as the sheets; then
    edit the attack on the weapon item sheet and assert the chat card does
    **not** change (snapshot semantics — the inverse of the sheet reactivity
    assertion).

## Implementation routing

- All `.js` / `.svelte` work routes through the `titan-svelte-dev` subagent with
  `svelte-5`, `foundry-vtt`, and `foundry-svelte` skills loaded.
- On completion, update the `titan-codebase` skill
  (`references/abstractions.md` / `references/data-flow.md` /
  `references/conventions.md`) to document `EmbeddedDocument`, the provider, the
  two-context convention, the list-keying rule, and the shared `AttackTags`
  component + its call sites.

## Follow-up work (decomposed, out of scope here)

Each becomes its own spec + plan when picked up:

### Sheet-side reuse

- Offer inline attack **editing** on the character sheet by reusing
  `WeaponSheetAttackSettings` inside the same `EmbeddedDocumentProvider` (the
  write path the shared `AttackTags` proof leaves unexercised).
- Generalize the embedded-provider treatment to the shared checks tab and
  rules-elements tab on the character sheet.
- Migrate commodity / effect rows off the `item._id`-lookup pattern.

### Chat-message path parity — DELIVERED (chat-subtypes effort, closed 2026-06-05)

Everything this section originally deferred has shipped via the
chat-message-subtypes conversion (Phases 1-4 + follow-ups B/D): all 26 chat
messages are first-class `system`-based subtypes; `buildSchemaFromShape`
(`src/helpers/utility-functions/`) feeds the item document schemas, the item
cards, the check chat schemas, and the effect card from single-source shapes.
The weapon card reads `document.data.system.attack[index]` (parity with the
weapon document) — which is exactly what lets the chat card join this spec's
proof as the third `AttackTags` consumer. Same *path*, different *backing*
(snapshot, not a live bridge), as originally designed.

**Remaining north-star** — progressively move **all** fields on **all**
documents (and their chat-message counterparts) onto consistent `system.*`
paths so display/edit components are universally reusable — is tracked as
`docs/TODO.md` #12.
