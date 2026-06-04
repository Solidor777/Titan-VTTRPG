# Embedded Document Stores — Design

**Date:** 2026-06-03
**Status:** Design — approved, pending implementation plan
**Scope:** Pattern + minimal weapon-attacks proof case (decomposed; see Follow-up work)

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
document is a top-level sheet document or an embedded child. This unlocks future
reuse of item-sheet components on the character sheet (and vice versa); it does
**not** migrate any feature in this spec.

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
- A minimal, temporary proof on the character sheet demonstrating reactive
  read + persisted write to an embedded weapon's attack data.

## Non-goals (decomposed to follow-up specs)

- Migrating any real feature (attack roll/display, checks tab, rules-elements
  tab, commodity, effects) to the embedded-document pattern.
- Migrating any component to read `'sheetDocument'`. This spec only establishes
  the contract.
- Deleting the existing `CharacterSheetWeapon*` components.
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

**This spec adds the contract only — no consumer migrates to `'sheetDocument'`
yet.** It exists so the pattern is complete and any future actor-coupled
component placed inside a provider has a defined escape hatch.

## Data flow — edit an embedded weapon field on the character sheet

1. The character sheet mounts with `'document'` = `ReactiveDocument(actor)` and
   `'sheetDocument'` = the same bridge.
2. A weapon row renders `<EmbeddedDocumentProvider doc={weapon}>`, shadowing
   `'document'` = `EmbeddedDocument(actorBridge, 'items', weaponId)`.
3. Inside, an existing `DocumentTextInput` reads
   `getContext('document').data.system.attack[idx].label` → resolves
   `actorBridge.data.items.get(weaponId).system.attack[idx].label`, reactive via
   the actor's subscription.
4. On change it mutates the live field and calls
   `refreshSystemDocument(document.data)` → `weapon.update({ system: … })`.
5. Foundry fires `updateItem` → the actor bridge's subscriber invalidates → the
   embedded read re-runs → UI updates. **No new component code is touched** — the
   same `DocumentTextInput` that runs on the item sheet runs here.

## Proof case (temporary)

A single throwaway component — `TempEmbeddedAttackName.svelte` — reads only
`getContext('document')` and edits the attack labels of whatever document is in
context, reusing the existing `DocumentTextInput`:

```svelte
<!-- TEMPORARY: embedded-store pattern proof. Remove per docs/TODO.md. -->
const document = getContext('document');   // the embedded weapon, via the provider
{#if document.data}
   {#each document.data.system.attack as attack, idx (attack.uuid)}
      <DocumentTextInput bind:value={document.data.system.attack[idx].label} />
   {/each}
{/if}
```

Wired into `CharacterSheetWeapon.svelte`'s expandable content, clearly marked
temporary:

```svelte
<!-- TEMPORARY: embedded-store proof — remove per docs/TODO.md -->
{#if weapon}
   <EmbeddedDocumentProvider doc={weapon}>
      <TempEmbeddedAttackName />
   </EmbeddedDocumentProvider>
{/if}
```

where `weapon` is resolved the existing reactive way
(`document.data.items.get(item._id)`). The proof demonstrates that a component
written against `'document'` runs unchanged when `'document'` is an embedded
item — it would work verbatim on the item sheet too. The temp component, the
temp block, and a `docs/TODO.md` entry with explicit removal criteria are added
together so cleanup is unambiguous.

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
- **E2E (Playwright, world-launch-gated):** open a character owning a weapon with
  ≥1 attack → open the sheet → expand the weapon → type into the temp
  attack-name input → assert (a) the embedded item's `system.attack[0].label`
  actually changed on the document, and (b) the value reflects reactively and
  survives reopen. Optionally assert the weapon's own item sheet shows the new
  name, proving the write reached the real item across bridges.

## Implementation routing

- All `.js` / `.svelte` work routes through the `titan-svelte-dev` subagent with
  `svelte-5`, `foundry-vtt`, and `foundry-svelte` skills loaded.
- On completion, update the `titan-codebase` skill
  (`references/abstractions.md` / `references/data-flow.md` /
  `references/conventions.md`) to document `EmbeddedDocument`, the provider, the
  two-context convention, and the list-keying rule.
- Add the temporary proof field to `docs/TODO.md` with removal criteria when it
  is created.

## Follow-up work (decomposed, out of scope here)

Each becomes its own spec + plan when picked up:

### Sheet-side reuse

- Migrate the weapon attack **display + roll** to read the attack via an embedded
  bridge while reading actor stats via `'sheetDocument'`, and/or offer inline
  attack editing on the character sheet by reusing `WeaponSheetAttackSettings`.
- Generalize the same treatment to the shared checks tab and rules-elements tab
  on the character sheet.
- Migrate commodity / effect rows off the `item._id`-lookup pattern.
- Remove the temporary proof field once a real consumer exists.

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
