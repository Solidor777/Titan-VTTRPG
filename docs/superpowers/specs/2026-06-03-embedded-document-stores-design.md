# Embedded Document Stores — Design

**Date:** 2026-06-03
**Status:** Design — approved, pending implementation plan
**Scope:** Pattern + a durable shared-`AttackTags` proof — one component rendering a weapon's intrinsic attack tags across the weapon item-sheet sidebar and the character sheet (chat card joins after chat parity). Decomposed; see Follow-up work.

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
  consumed unchanged by the weapon item-sheet sidebar (top-level weapon) and the
  character sheet (embedded weapon via the provider) — deleting the duplicated
  intrinsic-tag markup from both.

## Non-goals (decomposed to follow-up specs)

- Migrating the **actor-derived** attack display (dice pool / training /
  expertise) or the attack-**roll** button to a shared component — these stay on
  the character sheet (refactored to read the actor via `'sheetDocument'`, not
  extracted).
- Generalizing the pattern to the checks tab, rules-elements tab, commodity, or
  effect rows.
- Deleting the `CharacterSheetWeapon*` components — they are **refactored** (to
  source the weapon via the embedded provider and render the shared `AttackTags`),
  not removed.
- **Any chat-message change.** Chat-message path parity (showing attacks on the
  weapon *item* card via `document.data.system.attack[index]`, and deep
  check-chat schemas) is **deferred until the in-flight chat-message-subtypes
  conversion finishes**, and is built on a schema-from-shape helper. Captured in
  Follow-up work; no chat code lands in this spec.

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
let { idx = undefined } = $props();
const document = getContext('document');                  // weapon (top-level or embedded)
const attack = $derived(document.data?.system.attack[idx]);
{#if attack}
   <!-- damage, type, range, AttributeCheckTag, traits, customTraits -->
{/if}
```

**Consumed unchanged in two places now:**

- **Weapon item-sheet sidebar** (`WeaponSheetSidebarAttacks`): `'document'` is
  already the top-level weapon — iterate and render `<AttackTags {idx} />`.
- **Character sheet** (`CharacterSheetWeaponAttacks` / `…Attack`): wrap the
  weapon's attack list in `<EmbeddedDocumentProvider doc={weapon}>`, so
  `'document'` becomes the embedded weapon and `<AttackTags {idx} />` renders
  identically. The row's **actor-derived** tags and **roll** button switch to
  `getContext('sheetDocument')` (the actor) — e.g.
  `sheetDocument.data.system.requestAttackCheck({ itemId: document.data.id, attackIdx: idx })`.

Both call sites delete their duplicated intrinsic markup. Tag-component choices
are normalized in `AttackTags` (a small, accepted visual change), and the
character-sheet tag order shifts slightly because the intrinsic tags now render as
one block. The provider is **keyed by weapon id** (the weapon list already is).

**Chat card (deferred):** `WeaponChatAttacks` still reads `flags.titan.attack`; it
becomes the third `AttackTags` consumer once chat path-parity exposes
`system.attack[index]` on the item card (Follow-up work). The component is built
now so adopting it there is a one-line swap.

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
    (dice pool / training / expertise) and that the roll button fires
    `requestAttackCheck` on the actor (via `'sheetDocument'`).

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
- Make `WeaponChatAttacks` the third `AttackTags` consumer once chat path-parity
  (below) exposes `system.attack[index]` on the item card.

### Chat-message path parity (after the chat-message-subtypes conversion)

**Sequencing:** do not start until the in-flight chat-message-subtypes
conversion (`feat/chat-message-subtypes-phase1` and its later phases) finishes,
so item/report/effect cards are already first-class `system`-based subtypes.

**Why path parity, not a live bridge:** a chat card is a historical snapshot —
it must not mutate when the source weapon is later edited or deleted. So chat
parity is achieved by **data shape** (the message carries the data at the same
`system.*` path as its source document), not by the live `EmbeddedDocument`
re-resolution used on sheets. Same *path*, different *backing*. No data
migration: new messages carry the parity shape; historical messages are not
retrofitted.

**Schema-from-shape helper (the unifying mechanism).** A helper —
`buildSchemaFromShape(shape)` (name TBD) — that recursively converts a canonical
plain-object shape into an appropriate Foundry schema: strings →
`StringField`, numbers → `NumberField`, booleans → `BooleanField`, arrays →
`ArrayField` over the inferred element schema, nested objects → `SchemaField`.
One shape definition then feeds **both** the source document's schema **and** the
chat-message document's schema. Differentiating fields are added or overridden on
top of the shared base shape where a particular document needs them. This also
**unlocks deep schemas for check chat messages**: instead of today's opaque
`parameters` / `results` `ObjectField`s, the check-chat schema can adopt the same
shape as the actual `CheckParameters` / `CheckResults`, giving fully-typed check
chat data.

**Concrete targets:**

- **Weapon item card** (the "send weapon to chat" message): show the weapon's
  attacks via `document.data.system.attack[index]` — parity with the weapon item
  *document* — and reuse one read-only attack-row display component across the
  weapon sheet, the character sheet, and the item card.
- **Attack-check chat message:** parity with the **attack check** — its
  `parameters` / `results` become deep schemas derived from the same shapes the
  check classes use.

**North-star:** progressively move **all** fields on **all** documents (and their
chat-message counterparts) onto consistent `system.*` paths via the
schema-from-shape helper, so display/edit components are universally reusable
across item sheets, character sheets, and chat — no data migration required.
