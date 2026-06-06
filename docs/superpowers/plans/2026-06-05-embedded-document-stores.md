# Embedded Document Stores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the embedded-document context machinery (`EmbeddedDocument` bridge + `EmbeddedDocumentProvider` + the two-context convention) and prove it with one shared `AttackTags` component consumed by the weapon item-sheet sidebar, the character sheet, and the weapon chat card.

**Architecture:** A delegating bridge (`EmbeddedDocument`) re-resolves a live embedded document through the nearest ancestor `ReactiveDocument` on every read — no hooks of its own, never stale. A provider component shadows the `'document'` context for its subtree; a new never-shadowed `'sheetDocument'` context gives actor-coupled code an escape hatch. The shared `AttackTags` reads `getContext('document').data.system.attack[idx]` and renders identically on all three surfaces (the chat card works because chat path parity already shipped — the message snapshot carries `system.attack` at the same path).

**Tech Stack:** Svelte 5 (runes), Foundry v14 ApplicationV2, Vitest + @testing-library/svelte (happy-dom), Playwright (shared-world harness).

**Spec:** `docs/superpowers/specs/2026-06-03-embedded-document-stores-design.md` (refreshed 2026-06-05).

---

## Project rules the implementer MUST follow (from `.claude/CLAUDE.md` + handoff)

- Route all `.js`/`.svelte` work through the `titan-svelte-dev` subagent with `svelte-5`, `foundry-vtt`, `foundry-svelte` skills loaded.
- Code style: 120-char wrap; multi-line `{}` for all conditionals; multi-line objects (>1 property); Svelte components with >1 prop are multi-line with `>` / `/>` on a new line; every variable typed + single-line comment; every function has a multi-line typed JSDoc comment. NO `:global` CSS.
- Unit runner is **`npm test`** (filter positionally, e.g. `npm test -- EmbeddedDocument`). E2E: `npm run build` first, then `npm run test:e2e -- <pattern>` (throttled default). **The e2e world must be launched by the user at `:30000`** — ask before running e2e.
- `git add` explicit paths only — NEVER stage `packs/`, `.claude/settings.local.json`, or `.claude/scheduled_tasks.lock`.
- Tests source lives in `tests/` (plural). No test code in shipping builds.

## File map

| Action | Path | Responsibility |
|---|---|---|
| Create | `src/document/reactive/EmbeddedDocument.svelte.js` | Delegating reactive bridge for embedded docs |
| Create | `src/document/reactive/EmbeddedDocumentProvider.svelte` | Context provider that shadows `'document'` |
| Create | `src/document/types/item/types/weapon/components/AttackTags.svelte` | Shared intrinsic attack-tag row |
| Modify | `src/document/sheet/DocumentSheetShell.svelte` | +1 line: set `'sheetDocument'` context |
| Modify | `src/document/types/item/types/weapon/sheet/WeaponSheetSidebarAttacks.svelte` | Consumer 1 (top-level weapon) |
| Modify | `src/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttacks.svelte` | Provider wrap |
| Modify | `src/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttack.svelte` | Consumer 2 (two-context refactor) |
| Modify | `src/document/types/item/types/weapon/chat-message/WeaponChatAttacks.svelte` | Consumer 3 (context-reading) |
| Modify | `src/document/types/item/types/weapon/chat-message/WeaponChatMessage.svelte` | Drop the `{item}` prop pass |
| Create | `tests/components/EmbeddedProbe.svelte` | Test probe reading both contexts |
| Create | `tests/components/ProviderHarness.svelte` | Test harness wrapping the probe in a provider |
| Create | `tests/unit/EmbeddedDocument.test.js` | Bridge unit tests (pure JS stubs) |
| Create | `tests/unit/EmbeddedDocumentProvider.test.js` | Provider/shell context + reactivity tests |
| Create | `tests/unit/AttackTags.test.js` | `damageMod` math + range-hide render tests |
| Create | `tests/e2e/attack-tags.spec.js` | 3-surface parity, reactivity, two-context, snapshot |
| Modify | `.claude/skills/titan-codebase/references/{abstractions,data-flow,conventions}.md` | Document the new machinery |
| Modify | `docs/TODO.md` | Log decomposed follow-ups |

Existing reference files the implementer should read before starting: `src/document/reactive/ReactiveDocument.svelte.js` (the pattern being extended), `tests/unit/ReactiveDocument.test.js` + `tests/components/DocumentProbe.svelte` (unit harness pattern), `tests/e2e/reactive-weapon.spec.js` (character-sheet e2e driving pattern), `tests/e2e/item-cards.spec.js` (chat-card e2e pattern), `tests/e2e/checkDialog.js` (check-dialog selectors).

---

### Task 1: `EmbeddedDocument` bridge

**Files:**
- Create: `tests/unit/EmbeddedDocument.test.js`
- Create: `src/document/reactive/EmbeddedDocument.svelte.js`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/EmbeddedDocument.test.js`:

```js
import { describe, it, expect } from 'vitest';
import EmbeddedDocument from '~/document/reactive/EmbeddedDocument.svelte.js';

/**
 * Builds a stub parent bridge whose `.data` / `.doc` expose fake embedded collections, mirroring the
 * accessor shape of ReactiveDocument without any Svelte reactivity.
 * @returns {object} The stub fixture: `{ parent, weapon, effect }`.
 */
function makeParent() {
   /** @type {object} A fake embedded weapon document. */
   const weapon = {
      id: 'w1',
      system: {
         attack: [{ damage: 3 }],
      },
   };

   /** @type {object} A fake embedded effect document. */
   const effect = {
      id: 'e1',
      system: {
         duration: 2,
      },
   };

   /** @type {object} The fake parent document shape shared by both accessors. */
   const docShape = {
      items: new Map([['w1', weapon]]),
      effects: new Map([['e1', effect]]),
   };

   return {
      parent: {
         data: docShape,
         doc: docShape,
      },
      weapon,
      effect,
   };
}

describe('EmbeddedDocument', () => {
   it('resolves an embedded item by id through the parent reactive accessor', () => {
      const { parent, weapon } = makeParent();
      const bridge = new EmbeddedDocument(parent, 'items', 'w1');
      expect(bridge.data).toBe(weapon);
   });

   it('resolves an embedded effect by id through the parent reactive accessor', () => {
      const { parent, effect } = makeParent();
      const bridge = new EmbeddedDocument(parent, 'effects', 'e1');
      expect(bridge.data).toBe(effect);
   });

   it('exposes the raw document through .doc for write-back call sites', () => {
      const { parent, weapon } = makeParent();
      const bridge = new EmbeddedDocument(parent, 'items', 'w1');
      expect(bridge.doc).toBe(weapon);
   });

   it('returns undefined safely for a missing id', () => {
      const { parent } = makeParent();
      const bridge = new EmbeddedDocument(parent, 'items', 'nope');
      expect(bridge.data).toBeUndefined();
      expect(bridge.doc).toBeUndefined();
   });

   it('returns undefined safely when the parent resolves to nothing', () => {
      const empty = {
         data: undefined,
         doc: undefined,
      };
      const bridge = new EmbeddedDocument(empty, 'items', 'w1');
      expect(bridge.data).toBeUndefined();
      expect(bridge.doc).toBeUndefined();
   });

   it('chains through a nested EmbeddedDocument parent (effect on item on actor)', () => {
      const { parent, weapon } = makeParent();

      /** @type {object} A fake effect embedded on the weapon. */
      const weaponEffect = {
         id: 'we1',
         system: {
            duration: 5,
         },
      };
      weapon.effects = new Map([['we1', weaponEffect]]);

      const itemBridge = new EmbeddedDocument(parent, 'items', 'w1');
      const effectBridge = new EmbeddedDocument(itemBridge, 'effects', 'we1');
      expect(effectBridge.data).toBe(weaponEffect);
      expect(effectBridge.doc).toBe(weaponEffect);
   });

   it('re-resolves on every read so a replaced document is never stale', () => {
      const { parent } = makeParent();
      const bridge = new EmbeddedDocument(parent, 'items', 'w1');

      /** @type {object} A replacement document with the same id (identity changes on update). */
      const replacement = {
         id: 'w1',
         system: {
            attack: [{ damage: 9 }],
         },
      };
      parent.data.items.set('w1', replacement);
      expect(bridge.data).toBe(replacement);
   });

   it('destroy() is a safe no-op (the ancestor bridge owns the hooks)', () => {
      const { parent } = makeParent();
      const bridge = new EmbeddedDocument(parent, 'items', 'w1');
      expect(() => bridge.destroy()).not.toThrow();
   });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- EmbeddedDocument`
Expected: FAIL — cannot resolve `~/document/reactive/EmbeddedDocument.svelte.js`.

- [ ] **Step 3: Implement the bridge**

Create `src/document/reactive/EmbeddedDocument.svelte.js`:

```js
/**
 * @class EmbeddedDocument
 * Bridges an embedded Foundry Document (Item / ActiveEffect) into Svelte 5 reactivity by delegating to the
 * nearest ancestor bridge (ReactiveDocument or another EmbeddedDocument). It registers no hooks of its own:
 * reading `.data` resolves the live embedded document through the ancestor's reactive `.data` accessor, so
 * readers subscribe to the ancestor's createSubscriber and re-resolve by id on every invalidation — the
 * reference is never stale, and nesting (effect on item on actor) chains for free.
 */
export default class EmbeddedDocument {
   /** @type {object} The nearest ancestor bridge (ReactiveDocument | EmbeddedDocument). */
   #parent;

   /** @type {string} The embedded collection name on the parent document ('items' | 'effects'). */
   #collection;

   /** @type {string} The embedded document's id within the parent collection. */
   #id;

   /**
    * Stores the ancestor bridge, collection name, and embedded id used to re-resolve the live document.
    * @param {object} parent - The nearest ancestor bridge (ReactiveDocument | EmbeddedDocument).
    * @param {string} collection - The embedded collection name ('items' | 'effects').
    * @param {string} id - The embedded document id.
    */
   constructor(parent, collection, id) {
      this.#parent = parent;
      this.#collection = collection;
      this.#id = id;
   }

   /**
    * The live embedded document, made reactive when read in a component or `$derived`: reading the parent
    * bridge's `.data` subscribes to the ancestor document's update hooks, and the embedded document is then
    * re-resolved by id so the reference is never stale.
    * @returns {foundry.abstract.Document|undefined} The live embedded document, or undefined when missing.
    */
   get data() {
      return this.#parent.data?.[this.#collection]?.get(this.#id);
   }

   /**
    * The raw (non-subscribing) live embedded document, for write-back call sites that must not register a
    * reactive dependency (mirrors ReactiveDocument's `.doc`).
    * @returns {foundry.abstract.Document|undefined} The live embedded document, or undefined when missing.
    */
   get doc() {
      return this.#parent.doc?.[this.#collection]?.get(this.#id);
   }

   /**
    * Cleanup hook retained for accessor parity with ReactiveDocument. The ancestor bridge owns all hook
    * registration and teardown, so there is nothing to release here.
    */
   destroy() {
      // Intentionally empty — the ancestor bridge owns hook registration and teardown.
   }
}
```

Note: `ReactiveDocument.doc` is a plain public property (`this.doc = doc`), so `#parent.doc` works for both parent kinds.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- EmbeddedDocument`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```powershell
git add src/document/reactive/EmbeddedDocument.svelte.js tests/unit/EmbeddedDocument.test.js
git commit -m "feat(reactive): add EmbeddedDocument delegating bridge for embedded items/effects"
```

---

### Task 2: `EmbeddedDocumentProvider` + `'sheetDocument'` context

**Files:**
- Create: `tests/components/EmbeddedProbe.svelte`
- Create: `tests/components/ProviderHarness.svelte`
- Create: `tests/unit/EmbeddedDocumentProvider.test.js`
- Create: `src/document/reactive/EmbeddedDocumentProvider.svelte`
- Modify: `src/document/sheet/DocumentSheetShell.svelte` (after line 21)

- [ ] **Step 1: Write the test probes**

Create `tests/components/EmbeddedProbe.svelte`:

```svelte
<script>
   import { getContext } from 'svelte';

   /** @type {object} The nearest document bridge ('document' context — possibly an embedded one). */
   const document = getContext('document');

   /** @type {object|undefined} The owning sheet's top-level bridge ('sheetDocument' context). */
   const sheetDocument = getContext('sheetDocument');
</script>

<span data-testid="document-id">{document?.data?.id ?? 'missing'}</span>
<span data-testid="document-value">{document?.data?.system?.value ?? 'missing'}</span>
<span data-testid="sheet-document-id">{sheetDocument?.data?.id ?? 'missing'}</span>
```

Create `tests/components/ProviderHarness.svelte`:

```svelte
<script>
   import EmbeddedDocumentProvider from '~/document/reactive/EmbeddedDocumentProvider.svelte';
   import EmbeddedProbe from './EmbeddedProbe.svelte';

   /**
    * @typedef {object} ProviderHarnessProps
    * @property {object} doc - The live embedded document handed to the provider under test.
    */

   /** @type {ProviderHarnessProps} */
   const { doc } = $props();
</script>

<EmbeddedDocumentProvider {doc}>
   <EmbeddedProbe/>
</EmbeddedDocumentProvider>
```

- [ ] **Step 2: Write the failing tests**

Create `tests/unit/EmbeddedDocumentProvider.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { flushSync } from 'svelte';
import { render, screen } from '@testing-library/svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import DocumentSheetShell from '~/document/sheet/DocumentSheetShell.svelte';
import ProviderHarness from '../components/ProviderHarness.svelte';
import EmbeddedProbe from '../components/EmbeddedProbe.svelte';

/**
 * Builds a fake actor document carrying one embedded weapon, shaped for ReactiveDocument's hook filters
 * (`documentName`, ids, and the embedded document's `parent` back-reference).
 * @returns {object} The fixture: `{ actorDoc, weapon }`.
 */
function makeActorWithWeapon() {
   /** @type {object} The fake actor document wrapped by the top-level bridge. */
   const actorDoc = {
      id: 'a1',
      documentName: 'Actor',
      system: {
         value: 'actor',
      },
   };

   /** @type {object} The fake embedded weapon (its `parent` drives the onEmbedded hook filter). */
   const weapon = {
      id: 'w1',
      documentName: 'Item',
      parent: actorDoc,
      system: {
         value: 1,
      },
   };
   actorDoc.items = new Map([['w1', weapon]]);

   return {
      actorDoc,
      weapon,
   };
}

describe('EmbeddedDocumentProvider', () => {
   it('shadows the document context with the embedded weapon while sheetDocument stays the actor', () => {
      const { actorDoc, weapon } = makeActorWithWeapon();
      const bridge = new ReactiveDocument(actorDoc);
      render(ProviderHarness, {
         props: { doc: weapon },
         context: new Map([
            ['document', bridge],
            ['sheetDocument', bridge],
         ]),
      });

      expect(screen.getByTestId('document-id').textContent).toBe('w1');
      expect(screen.getByTestId('sheet-document-id').textContent).toBe('a1');
   });

   it('re-renders an embedded reader when the embedded item updates through the ancestor bridge', () => {
      const { actorDoc, weapon } = makeActorWithWeapon();
      const bridge = new ReactiveDocument(actorDoc);
      render(ProviderHarness, {
         props: { doc: weapon },
         context: new Map([
            ['document', bridge],
            ['sheetDocument', bridge],
         ]),
      });
      expect(screen.getByTestId('document-value').textContent).toBe('1');

      // Mutate the embedded weapon and fire the embedded-update hook the ancestor bridge listens to.
      weapon.system.value = 2;
      Hooks.call('updateItem', weapon, {}, {});
      flushSync();

      expect(screen.getByTestId('document-value').textContent).toBe('2');
   });

   it('warns and yields a null-resolving bridge for an unsupported document type', () => {
      const { actorDoc } = makeActorWithWeapon();
      const bridge = new ReactiveDocument(actorDoc);

      // Warn.js touches the `ui` notification global; define it for this test only.
      globalThis.ui = {
         notifications: {
            warn: vi.fn(),
         },
      };
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      /** @type {object} A document of a kind the provider does not support. */
      const stranger = {
         id: 's1',
         documentName: 'Scene',
      };
      render(ProviderHarness, {
         props: { doc: stranger },
         context: new Map([
            ['document', bridge],
            ['sheetDocument', bridge],
         ]),
      });

      expect(screen.getByTestId('document-id').textContent).toBe('missing');
      expect(consoleWarn).toHaveBeenCalled();
      consoleWarn.mockRestore();
      delete globalThis.ui;
   });
});

describe('DocumentSheetShell sheetDocument context', () => {
   it('sets both document and sheetDocument to the same top-level bridge', () => {
      const { actorDoc } = makeActorWithWeapon();
      const bridge = new ReactiveDocument(actorDoc);
      render(DocumentSheetShell, {
         props: {
            document: bridge,
            applicationState: {},
            shell: EmbeddedProbe,
         },
      });

      expect(screen.getByTestId('document-id').textContent).toBe('a1');
      expect(screen.getByTestId('sheet-document-id').textContent).toBe('a1');
   });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- EmbeddedDocumentProvider`
Expected: FAIL — cannot resolve `~/document/reactive/EmbeddedDocumentProvider.svelte` (first three) and `sheet-document-id` renders `missing` (shell test).

- [ ] **Step 4: Implement the provider**

Create `src/document/reactive/EmbeddedDocumentProvider.svelte`:

```svelte
<script>
   import { getContext, setContext } from 'svelte';
   import EmbeddedDocument from '~/document/reactive/EmbeddedDocument.svelte.js';
   import warn from '~/helpers/utility-functions/Warn.js';

   /**
    * @typedef {object} EmbeddedDocumentProviderProps
    * @property {foundry.abstract.Document} doc - The live embedded document to provide to descendants.
    * @property {import('svelte').Snippet} [children] - Content rendered with the shadowed 'document' context.
    */

   /** @type {EmbeddedDocumentProviderProps} */
   const { doc, children } = $props();

   /** @type {Record<string, string>} Map of embedded document class names to parent collection names. */
   const COLLECTION_BY_DOCUMENT_NAME = {
      Item: 'items',
      ActiveEffect: 'effects',
   };

   // The provider captures its target document at init by design: instances in an {#each} MUST be keyed by
   // doc.id so a new id mounts a new provider (see references/conventions.md).
   /** @type {string|undefined} The parent collection holding the embedded document. */
   // svelte-ignore state_referenced_locally
   const collection = COLLECTION_BY_DOCUMENT_NAME[doc.documentName];
   if (!collection) {
      // svelte-ignore state_referenced_locally
      warn(`EmbeddedDocumentProvider received an unsupported document type (${doc.documentName}).`);
   }

   /** @type {object} The nearest ancestor document bridge (the value this provider shadows). */
   const parent = getContext('document');

   // Shadow 'document' for descendants only; 'sheetDocument' is intentionally never shadowed.
   // svelte-ignore state_referenced_locally
   setContext('document', new EmbeddedDocument(parent, collection, doc.id));
</script>

{@render children?.()}
```

- [ ] **Step 5: Add the `'sheetDocument'` context to the shell**

Modify `src/document/sheet/DocumentSheetShell.svelte` — directly after the existing `setContext('applicationState', applicationState);` line, add:

```js
   // 'sheetDocument' always points at the owning sheet's top-level bridge; embedded-document providers
   // shadow 'document' but never this key, giving actor-coupled components a stable escape hatch.
   // svelte-ignore state_referenced_locally
   setContext('sheetDocument', document);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- EmbeddedDocumentProvider`
Expected: PASS (4 tests).

Run the full unit suite to confirm no regression: `npm test`
Expected: all suites green (158 + the new tests).

- [ ] **Step 7: Commit**

```powershell
git add src/document/reactive/EmbeddedDocumentProvider.svelte src/document/sheet/DocumentSheetShell.svelte tests/components/EmbeddedProbe.svelte tests/components/ProviderHarness.svelte tests/unit/EmbeddedDocumentProvider.test.js
git commit -m "feat(reactive): add EmbeddedDocumentProvider and the never-shadowed sheetDocument context"
```

---

### Task 3: Shared `AttackTags` component

**Files:**
- Create: `tests/unit/AttackTags.test.js`
- Create: `src/document/types/item/types/weapon/components/AttackTags.svelte` (new `components/` directory)

- [ ] **Step 1: Write the failing test**

Create `tests/unit/AttackTags.test.js`:

```js
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AttackTags from '~/document/types/item/types/weapon/components/AttackTags.svelte';

/**
 * Builds a stub document bridge exposing one weapon attack at `data.system.attack[0]`. Traits are left
 * empty so the unit render avoids tooltip-bearing tags; trait rendering is covered by the e2e parity spec.
 * @param {object} [attackOverrides] - Field overrides merged onto the default attack.
 * @returns {object} The stub bridge for the 'document' context.
 */
function makeBridge(attackOverrides = {}) {
   /** @type {object} The default intrinsic attack used across the cases. */
   const attack = {
      label: 'Strike',
      type: 'melee',
      damage: 3,
      plusExtraSuccessDamage: false,
      range: 1,
      attribute: 'body',
      skill: 'meleeWeapons',
      trait: [],
      customTrait: [],
      ...attackOverrides,
   };

   return {
      data: {
         system: {
            attack: [attack],
         },
      },
   };
}

describe('AttackTags', () => {
   beforeEach(() => {
      // localize() routes through game.i18n; identity-stub it for unit renders.
      globalThis.game = {
         i18n: {
            localize: (key) => key,
         },
      };
   });

   it('renders the damage tag with damageMod added to the intrinsic damage', () => {
      render(AttackTags, {
         props: {
            idx: 0,
            damageMod: 2,
         },
         context: new Map([['document', makeBridge()]]),
      });

      expect(screen.getByTestId('attack-tags-damage').querySelector('.value').textContent).toBe('5');
   });

   it('renders intrinsic damage when damageMod is omitted and appends the extra-successes suffix', () => {
      render(AttackTags, {
         props: { idx: 0 },
         context: new Map([['document', makeBridge({ plusExtraSuccessDamage: true })]]),
      });

      /** @type {string} The rendered damage value text. */
      const text = screen.getByTestId('attack-tags-damage').querySelector('.value').textContent;
      expect(text).toContain('3');
      expect(text).toContain('+');
   });

   it('hides the range tag at range 1 and shows it otherwise', () => {
      const first = render(AttackTags, {
         props: { idx: 0 },
         context: new Map([['document', makeBridge()]]),
      });
      expect(screen.queryByTestId('attack-tags-range')).toBeNull();
      first.unmount();

      render(AttackTags, {
         props: { idx: 0 },
         context: new Map([['document', makeBridge({ range: 4 })]]),
      });
      expect(screen.getByTestId('attack-tags-range').querySelector('.value').textContent).toBe('4');
   });

   it('renders nothing for a missing attack index', () => {
      const { container } = render(AttackTags, {
         props: { idx: 7 },
         context: new Map([['document', makeBridge()]]),
      });
      expect(container.querySelector('.attack-tags')).toBeNull();
   });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- AttackTags`
Expected: FAIL — cannot resolve the `AttackTags.svelte` import.

- [ ] **Step 3: Implement the component**

Create `src/document/types/item/types/weapon/components/AttackTags.svelte`:

```svelte
<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { ATTACK_TRAIT_DESCRIPTIONS } from '~/document/types/item/types/weapon/AttackTraits.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import IconTag from '~/helpers/svelte-components/tag/IconTag.svelte';
   import TraitTag from '~/helpers/svelte-components/tag/TraitTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';
   import {
      ACCURACY_ICON,
      DAMAGE_ICON,
      MELEE_ICON,
      RANGE_ICON,
   } from '~/system/Icons.js';

   /**
    * @typedef {object} AttackTagsProps
    * @property {number} [idx] - The index of the attack in the current document's `system.attack` array.
    * @property {number} [damageMod] - Optional actor-derived modifier added to the displayed damage.
    */

   /** @type {AttackTagsProps} */
   const { idx = undefined, damageMod = 0 } = $props();

   /** @type {object} The nearest document bridge (weapon, embedded weapon, or chat-message snapshot). */
   const document = getContext('document');

   /** @type {object|undefined} The current attack data, re-read reactively through the document bridge. */
   const attack = $derived(document.data?.system.attack[idx]);

   /** @type {Record<string, string>} Map of attack trait names to their description strings. */
   const traitDescriptions = ATTACK_TRAIT_DESCRIPTIONS;
</script>

{#if attack}
   <div class="attack-tags">
      <!--Damage-->
      <div class="stat">
         <IconStatTag
            icon={DAMAGE_ICON}
            label={localize('damage')}
            testId={'attack-tags-damage'}
            value={`${attack.damage + damageMod}${
               attack.plusExtraSuccessDamage ? ` + ${localize('extraSuccesses.short')}` : ''
            }`}
         />
      </div>

      <!--Type-->
      <div class="stat">
         <IconTag
            icon={attack.type === 'melee' ? MELEE_ICON : ACCURACY_ICON}
            label={localize(attack.type)}
            testId={'attack-tags-type'}
         />
      </div>

      <!--Range-->
      {#if attack.range !== 1}
         <div class="stat">
            <IconStatTag
               icon={RANGE_ICON}
               label={localize('range')}
               testId={'attack-tags-range'}
               value={attack.range}
            />
         </div>
      {/if}

      <!--Attribute and Skill-->
      <div class="stat">
         <AttributeCheckTag
            attribute={attack.attribute}
            skill={attack.skill}
            testId={'attack-tags-attribute'}
         />
      </div>

      <!--Traits-->
      {#each attack.trait as trait (trait.name)}
         <div class="stat">
            <TraitTag
               label={localize(trait.name)}
               tooltip={traitDescriptions[trait.name]}
               value={trait.value}
            />
         </div>
      {/each}

      <!--Custom Traits-->
      {#each attack.customTrait as trait (trait.uuid)}
         <div class="stat">
            <Tag tooltip={{ text: trait.description, localize: false }}>
               {trait.name}
            </Tag>
         </div>
      {/each}
   </div>
{/if}

<style lang="scss">
   .attack-tags {
      @include flex-row;
      @include flex-group-center;
      @include font-size-small;

      width: 100%;
      flex-wrap: wrap;

      .stat {
         @include tag-container-child-margin;
      }
   }
</style>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- AttackTags`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```powershell
git add src/document/types/item/types/weapon/components/AttackTags.svelte tests/unit/AttackTags.test.js
git commit -m "feat(weapon): add shared AttackTags intrinsic-tag component"
```

---

### Task 4: Consumer 1 — weapon item-sheet sidebar

**Files:**
- Modify: `src/document/types/item/types/weapon/sheet/WeaponSheetSidebarAttacks.svelte`

- [ ] **Step 1: Replace the expanded stats block with `AttackTags`**

In `WeaponSheetSidebarAttacks.svelte`:

1. Remove the now-unused imports: `ATTACK_TRAIT_DESCRIPTIONS`, `StatTag`, `IconStatTag`, `Tag`, `AttributeCheckTag`, and `DAMAGE_ICON` (keep `localize`, `slide`, `IconButton`, `COLLAPSED_ICON`, `EXPANDED_ICON`, `MELEE_ICON`, `RANGE_ICON` — the row header still uses them).
2. Add the import:

```js
   import AttackTags from '~/document/types/item/types/weapon/components/AttackTags.svelte';
```

3. Remove the `const traitDescriptions = ATTACK_TRAIT_DESCRIPTIONS;` line.
4. Replace the entire expanded `{#if $appState.sidebar.attacks.isExpanded[idx]} … {/if}` block (the `.stats` div and all per-stat markup) with:

```svelte
         {#if $appState.sidebar.attacks.isExpanded[idx]}
            <div class="stats" transition:slide|local>
               <AttackTags {idx}/>
            </div>
         {/if}
```

5. In the `<style>` block, simplify the `.stats` rule: keep the panel/border/width chrome, drop the now-dead `.stat` child rule and the flex/font lines AttackTags now owns:

```scss
         .stats {
            @include flex-row;
            @include flex-group-center;
            @include border-bottom-sides;
            @include panel-3;

            width: calc(100% - var(--titan-spacing-large));
            padding: 0 var(--titan-spacing-standard) var(--titan-spacing-large) var(--titan-spacing-standard);
         }
```

Accepted visual deltas (per spec): the type tag gains an icon; tag order becomes damage → type → range → attribute/skill → traits → custom traits; per-stat slide transitions inside the block are dropped (the block-level slide remains).

- [ ] **Step 2: Build and run the unit suite**

Run: `npm run build`
Expected: clean build, no unresolved imports.
Run: `npm test`
Expected: all green.

- [ ] **Step 3: Commit**

```powershell
git add src/document/types/item/types/weapon/sheet/WeaponSheetSidebarAttacks.svelte
git commit -m "refactor(weapon-sheet): render sidebar attack stats through shared AttackTags"
```

---

### Task 5: Consumer 2 — character sheet (provider + two-context refactor)

**Files:**
- Modify: `src/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttacks.svelte`
- Modify: `src/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttack.svelte`

- [ ] **Step 1: Understand the two pre-existing display bugs this task fixes**

The current `CharacterSheetWeaponAttack` mod displays are broken in two ways (both pre-existing; they
never showed because broken inputs make `getAttackCheckMod` return 0 when no conditional-check-modifier
rules elements exist):

1. **Wrong arguments.** The component calls `getAttackCheckMod('expertise', item, attack, multiAttack)`,
   but the real signature (`CharacterDataModel.js:2597`) is `getAttackCheckMod(modifierType, attribute,
   skill, multiAttack, type, attackTraits, customTraits)` — so `attribute` receives the item document,
   `skill` receives the attack object, and the trait arrays are `undefined` (which would throw on
   `customTraits.length` if a matching conditional modifier existed). The display therefore NEVER includes
   conditional check mods. The engine recipe to mirror (`CharacterDataModel.js:2440-2546`):
   `attackTraits = attack.trait.map((trait) => trait.name)`; `customTraits` = unique `camelize(name)`
   collected from the weapon's `system.customTrait` then the attack's `customTrait`; dice uses modifier
   type `'dice'` (the component wrongly used `'expertise'` in the dice pool), expertise `'expertise'`,
   damage `'damage'`; attribute/skill/type come off the attack.
2. **Dead flurry branch.** `if (trait.name === flurry)` compares a string to the boolean `false`, so the
   flurry round-UP branch never fires. The engine treats flurry as a real attack trait
   (`CharacterDataModel.js:2449-2452`); the comparison must be `trait.name === 'flurry'`.

Both fixes land in Step 3's rewrite (the lines are being rewritten for the two-context refactor anyway —
project rule: fix root causes, no papering over). Expected user-visible change: actors carrying
conditional-check-modifier rules elements now see those mods reflected in the sheet's dice / expertise /
damage tags, matching what the check dialog and chat already compute. Note both fixes in the commit
message; nothing goes to `docs/OPEN_BUGS.md` because nothing is deferred.

- [ ] **Step 2: Wrap the attack list in the provider**

Replace the full contents of `CharacterSheetWeaponAttacks.svelte` with:

```svelte
<script>
   import { getContext } from 'svelte';
   import EmbeddedDocumentProvider from '~/document/reactive/EmbeddedDocumentProvider.svelte';
   import CharacterSheetWeaponAttack
      from '~/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttack.svelte';

   /**
    * @typedef {object} CharacterSheetWeaponAttacksProps
    * @property {TitanItem} [item] The Item this component belongs to.
    */

   /** @type {CharacterSheetWeaponAttacksProps} */
   const { item = undefined } = $props();

   /** @type {object} Reference to the reactive Document store (the actor bridge; outside the provider). */
   const document = getContext('document');

   /** @type {string[]} The Attack array indices, read reactively through document.data. */
   const attackKeys = $derived(Object.keys(document.data.items.get(item._id)?.system.attack ?? []));
</script>

<!--Attacks list: descendants read the embedded weapon as their 'document' context.-->
<EmbeddedDocumentProvider doc={item}>
   <ol>
      <!--Each Attack-->
      {#each attackKeys as attackIdx}
         <li>
            <CharacterSheetWeaponAttack attackIdx={Number(attackIdx)}/>
         </li>
      {/each}
   </ol>
</EmbeddedDocumentProvider>

<style lang="scss">
   ol {
      @include flex-column;
      @include flex-group-top;
      @include list;

      width: 100%;

      li {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         &:not(:first-child) {
            @include border-top;
            @include padding-top-large;

            margin-top: 8px;
         }
      }
   }
</style>
```

Keying note: the provider instance lives inside `CharacterSheetWeapon`, which `CharacterSheetMultiItemList` already renders inside `{#each items as item (item._id)}` — the id-keyed `{#each}` satisfies the provider keying rule (verified at `CharacterSheetMultiItemList.svelte:91`).

- [ ] **Step 3: Two-context refactor of the attack row**

Replace the full contents of `CharacterSheetWeaponAttack.svelte` with:

```svelte
<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import camelize from '~/helpers/utility-functions/Camelize.js';
   import pushUnique from '~/helpers/utility-functions/PushUnique.js';
   import DocumentOwnerButton from '~/document/svelte-components/DocumentOwnerButton.svelte';
   import AttackTags from '~/document/types/item/types/weapon/components/AttackTags.svelte';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import {
      ACCURACY_ICON,
      DICE_ICON,
      EXPERTISE_ICON,
      MELEE_ICON,
      TRAINING_ICON,
   } from '~/system/Icons.js';

   /**
    * @typedef {object} CharacterSheetWeaponAttackProps
    * @property {number} [attackIdx] The index of the attack in the attacks array.
    */

   /** @type {CharacterSheetWeaponAttackProps} */
   const { attackIdx = undefined } = $props();

   /** @type {object} The embedded weapon bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /** @type {object|undefined} The current attack data, re-read reactively through the embedded bridge. */
   const attack = $derived(document.data?.system.attack[attackIdx]);

   /** @type {boolean|undefined} Whether this Weapon is multi attacking, read through the embedded bridge. */
   const multiAttack = $derived(document.data?.system.multiAttack);

   /** @type {boolean|undefined} Whether this Weapon is equipped, read through the embedded bridge. */
   const equipped = $derived(document.data?.system.equipped);

   /** @type {string[]} The attack's trait names, mirroring the engine's attack-trait extraction. */
   const attackTraitNames = $derived(attack ? attack.trait.map((trait) => trait.name) : []);

   /** @type {string[]} Unique camelized custom-trait names from the weapon then the attack (engine recipe). */
   const customTraitNames = $derived.by(() => {
      /** @type {string[]} The collected unique camelized names. */
      const names = [];
      for (const trait of document.data?.system.customTrait ?? []) {
         pushUnique(names, camelize(trait.name));
      }
      for (const trait of attack?.customTrait ?? []) {
         pushUnique(names, camelize(trait.name));
      }
      return names;
   });

   /**
    * Reads the actor's conditional check modifier for one aspect of this attack, mirroring the engine
    * call shape used by initializeAttackCheckOptions.
    * @param {string} modifierType - The modifier type to read ('dice' | 'expertise' | 'damage').
    * @returns {number} The modifier for this aspect of the attack check.
    */
   function getCheckMod(modifierType) {
      return sheetDocument.data.system.getAttackCheckMod(
         modifierType,
         attack.attribute,
         attack.skill,
         multiAttack,
         attack.type,
         attackTraitNames,
         customTraitNames,
      );
   }

   /** @type {number} Actor-derived damage modifier added to the displayed attack damage. */
   const damageMod = $derived(getCheckMod('damage'));

   // Calculate dice pool.
   /** @type {number} Calculated total dice pool for the attack. */
   let dicePool = $derived.by(() => {

      // Get base dice.
      let pool =
         sheetDocument.data.system.attribute[attack.attribute].value +
         sheetDocument.data.system.skill[attack.skill].training.value +
         getCheckMod('dice');

      // Cut the dice in half if multi attacking.
      if (multiAttack) {
         // Round up or down, depending on the flurry trait.
         /** @type {boolean} Whether the flurry trait is active. */
         let flurry = false;
         for (const trait of attack.trait) {
            if (trait.name === 'flurry') {
               flurry = true;
            }
         }

         pool = flurry
            ? Math.ceil(pool * 0.5)
            : Math.floor(pool * 0.5);
      }

      return pool;
   });

   // Calculate expertise.
   /** @type {number} Calculated total expertise for the attack. */
   let expertise = $derived.by(() => {

      // Get base expertise.
      let exp =
         sheetDocument.data.system.skill[attack.skill].expertise.value +
         getCheckMod('expertise');

      // Cut the expertise in half if multi attacking.
      if (multiAttack) {
         exp = Math.floor(exp * 0.5);
      }

      return exp;
   });
</script>

<div class="attack">
   <!--Header-->
   <div class="header {attack.attribute}">
      {#if equipped}
         <DocumentOwnerButton
            onclick={() =>
               sheetDocument.data.system.requestAttackCheck({
                  itemId: document.data._id,
                  attackIdx: attackIdx,
               })}
         >
            <i
               class={attack.type === 'melee' ? MELEE_ICON : ACCURACY_ICON}
            ></i>
            {attack.label}
         </DocumentOwnerButton>
      {:else}
         <div class="label">
            <i
               class={attack.type === 'melee' ? MELEE_ICON : ACCURACY_ICON}
            ></i>
            <div>{attack.label}</div>
         </div>
      {/if}
   </div>

   <!--Check Label-->
   <div class="check-stats">
      <!--Dice-->
      <div class="stat">
         <IconStatTag
            icon={DICE_ICON}
            label={localize('dice')}
            value={dicePool}
         />
      </div>

      <!--Training-->
      {#if sheetDocument.data.system.skill[attack.skill].training.value !== 0}
         <div class="stat">
            <IconStatTag
               icon={TRAINING_ICON}
               label={localize('training')}
               value={sheetDocument.data.system.skill[attack.skill].training.value}
            />
         </div>
      {/if}

      <!--Expertise-->
      {#if expertise !== 0}
         <div class="stat">
            <IconStatTag
               icon={EXPERTISE_ICON}
               label={localize('expertise')}
               value={expertise}
            />
         </div>
      {/if}

      <!--Intrinsic attack tags (shared component; damage carries the actor-derived modifier)-->
      <AttackTags
         {damageMod}
         idx={attackIdx}
      />
   </div>
</div>

<style lang="scss">
   .attack {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .header {
         @include flex-row;
         @include flex-group-center;
         @include attribute-button;

         height: 32px;

         .label {
            @include flex-row;
            @include flex-group-center;

            font-weight: bold;
         }

         i {
            @include margin-right-standard;
         }
      }

      .check-stats {
         @include flex-row;
         @include flex-group-center;
         @include font-size-small;

         width: 100%;
         flex-wrap: wrap;

         .stat {
            @include tag-container-child-margin;
         }
      }
   }
</style>
```

Notes:
- The `item` prop is gone: the weapon is sourced from the shadowed `'document'` context; actor reads route through `'sheetDocument'`.
- `getAttackCheckMod` is now called with its REAL signature via the local `getCheckMod` helper (Step 1, bug 1): attribute/skill/type off the attack, the engine-recipe trait arrays, and the correct `'dice'` modifier type in the dice pool.
- The flurry comparison is `'flurry'` (Step 1, bug 2).
- `DocumentOwnerButton` (unchanged) reads `'document'` → the embedded weapon; its `isOwner` derives from actor ownership, so the gate is preserved.
- The tag order shifts (damage now renders inside `AttackTags` after expertise) — the spec's accepted visual change.

- [ ] **Step 4: Build and run the unit suite**

Run: `npm run build`
Expected: clean build.
Run: `npm test`
Expected: all green.

- [ ] **Step 5: Commit**

```powershell
git add src/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttacks.svelte src/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttack.svelte
git commit -m "refactor(character-sheet): weapon attack rows read the embedded weapon via EmbeddedDocumentProvider"
```

---

### Task 6: Consumer 3 — weapon chat card

**Files:**
- Modify: `src/document/types/item/types/weapon/chat-message/WeaponChatAttacks.svelte`
- Modify: `src/document/types/item/types/weapon/chat-message/WeaponChatMessage.svelte`

- [ ] **Step 1: Make the chat attacks component context-reading**

Replace the full contents of `WeaponChatAttacks.svelte` with:

```svelte
<script>
   import { getContext } from 'svelte';
   import AttackTags from '~/document/types/item/types/weapon/components/AttackTags.svelte';
   import {
      ACCURACY_ICON,
      MELEE_ICON,
   } from '~/system/Icons.js';

   /** @type {object} Reference to the reactive Document store (the chat-message bridge). */
   const document = getContext('document');

   /** @type {object[]} The snapshot attack array carried by the chat message's system data. */
   const attacks = $derived(document.data?.system.attack ?? []);
</script>

<ol>
   {#each attacks as attack, idx (idx)}
      <!--Each attack-->
      <li>
         <div class="row header">
            <!--Attack name-->
            <div class="attack-name">
               <i class={attack.type === 'melee' ? MELEE_ICON : ACCURACY_ICON}></i>
               {attack.label}
            </div>
         </div>

         <!--Intrinsic attack tags (shared component; path parity with the weapon document)-->
         <div class="row stats">
            <AttackTags {idx}/>
         </div>
      </li>
   {/each}
</ol>

<style lang="scss">
   ol {
      @include list;
      @include flex-column;
      @include flex-group-top;
      @include font-size-small;

      width: 100%;

      li {
         @include flex-column;
         @include flex-group-top;

         width: 100%;

         &:not(:first-child) {
            @include border-top;
            @include margin-top-large;
            @include padding-top-large;
         }

         .row {
            @include flex-row;

            width: 100%;
            flex-wrap: wrap;

            &.header {
               @include flex-group-center;
            }

            &.stats {
               @include flex-group-center;
            }

            .attack-name {
               @include font-size-normal;

               font-weight: bold;
            }
         }
      }
   }
</style>
```

- [ ] **Step 2: Drop the prop pass in the message component**

In `WeaponChatMessage.svelte`, change:

```svelte
      <WeaponChatAttacks {item}/>
```

to:

```svelte
      <WeaponChatAttacks/>
```

(Everything else in `WeaponChatMessage.svelte` is unchanged — `item` is still used by the other children.)

- [ ] **Step 3: Build and run the unit suite**

Run: `npm run build`
Expected: clean build.
Run: `npm test`
Expected: all green.

- [ ] **Step 4: Commit**

```powershell
git add src/document/types/item/types/weapon/chat-message/WeaponChatAttacks.svelte src/document/types/item/types/weapon/chat-message/WeaponChatMessage.svelte
git commit -m "refactor(weapon-chat): render card attack stats through shared AttackTags via the message bridge"
```

---

### Task 7: E2E — three-surface parity, reactivity, two-context, snapshot

**Files:**
- Create: `tests/e2e/attack-tags.spec.js`

**Precondition:** the e2e world must be launched by the user at `:30000`, and `npm run build` must have run since the last `src/` change. Model: `tests/e2e/reactive-weapon.spec.js` (sheet driving) + `tests/e2e/item-cards.spec.js` (chat cards).

- [ ] **Step 1: Write the spec**

Create `tests/e2e/attack-tags.spec.js`:

```js
import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';

/**
 * Shared-AttackTags proof (embedded-document-stores spec): one component renders a weapon's intrinsic
 * attack tags on the weapon item-sheet sidebar (top-level 'document'), the character sheet (embedded
 * weapon via EmbeddedDocumentProvider), and the weapon chat card (message snapshot via path parity).
 * Asserts value parity across all three surfaces, live reactivity on the sheets, the two-context split
 * (actor-derived tags + roll button via 'sheetDocument'), and chat snapshot non-reactivity.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E AttackTags Actor';

/** @type {string} Name of the seeded weapon. */
const WEAPON_NAME = 'E2E AttackTags Weapon';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('shared AttackTags across surfaces', () => {
   test.beforeEach(async () => {
      await page.evaluate(async ({ actorName, weaponName }) => {
         // Remove any stale fixture from a prior run.
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }

         // Seed a fresh player actor owning one EQUIPPED weapon with a distinctive first attack:
         // damage 7 (intrinsic), range 3 (so the range tag renders), default attribute/skill.
         const actor = await Actor.create({ name: actorName, type: 'player' });
         await actor.createEmbeddedDocuments('Item', [
            {
               name: weaponName,
               type: 'weapon',
               system: {
                  equipped: true,
               },
            },
         ]);

         // Shape the default attack in place (clone-and-write per the array-update convention).
         const weapon = actor.items.getName(weaponName);
         const attacks = foundry.utils.deepClone(weapon.system.attack);
         attacks[0].label = 'Parity Strike';
         attacks[0].damage = 7;
         attacks[0].range = 3;
         await weapon.update({
            system: {
               attack: attacks,
            },
         });
      }, { actorName: ACTOR_NAME, weaponName: WEAPON_NAME });
   });

   /**
    * Opens the character sheet, activates the Inventory tab, and expands the weapon row.
    * @returns {Promise<import('@playwright/test').Locator>} The expanded weapon row locator.
    */
   async function openCharacterSheetWeaponRow() {
      await page.evaluate(async (actorName) => {
         const actor = game.actors.getName(actorName);
         const app = await actor.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'sheet mounted' },
         );
      }, ACTOR_NAME);

      // Activate the Inventory tab; the row click below auto-waits for the rendered row.
      await page.getByText('Inventory', { exact: true }).first().click();

      // The weapon's inventory row, then expand it (first button in the header label area).
      const row = page.locator('[data-item-id]').first();
      await row.locator('.header .label .button button').first().click();
      return row;
   }

   /**
    * Opens the weapon item sheet and expands the first sidebar attack. Closes all other apps first so
    * the `.titan-document-sheet` locator is unambiguous — call AFTER finishing with the character sheet.
    * @returns {Promise<import('@playwright/test').Locator>} The item-sheet application root locator.
    */
   async function openWeaponSheetSidebarAttack() {
      await closeAllApps(page);
      await page.evaluate(async ({ actorName, weaponName }) => {
         const weapon = game.actors.getName(actorName).items.getName(weaponName);
         const app = await weapon.sheet.render(true);
         await titanWait(
            () => !!app?.element?.querySelector('.window-content')?.children.length,
            { message: 'item sheet mounted' },
         );
      }, { actorName: ACTOR_NAME, weaponName: WEAPON_NAME });

      /** @type {import('@playwright/test').Locator} The weapon item-sheet application root (only app open). */
      const sheet = page.locator('.application.titan-document-sheet').first();

      // Expand the first sidebar attack (the expand IconButton lives in the row-header spacer).
      await sheet.locator('li .spacer button').first().click();
      return sheet;
   }

   test('intrinsic tags render with matching values on both sheets', async () => {
      const row = await openCharacterSheetWeaponRow();

      // Character sheet: intrinsic damage (no actor mods seeded → mod 0) and range from AttackTags.
      await expect(row.getByTestId('attack-tags-damage').locator('.value')).toHaveText('7');
      await expect(row.getByTestId('attack-tags-range').locator('.value')).toHaveText('3');
      await expect(row.getByTestId('attack-tags-type')).toBeVisible();
      await expect(row.getByTestId('attack-tags-attribute')).toBeVisible();

      // Weapon item sheet sidebar: the SAME component renders the SAME values.
      const sheet = await openWeaponSheetSidebarAttack();
      await expect(sheet.getByTestId('attack-tags-damage').locator('.value')).toHaveText('7');
      await expect(sheet.getByTestId('attack-tags-range').locator('.value')).toHaveText('3');
      await expect(sheet.getByTestId('attack-tags-type')).toBeVisible();

      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('character-sheet AttackTags updates live when the weapon is edited (embedded bridge)', async () => {
      const row = await openCharacterSheetWeaponRow();
      await expect(row.getByTestId('attack-tags-damage').locator('.value')).toHaveText('7');

      // Edit the attack damage IN PLACE through the live weapon document.
      await page.evaluate(async ({ actorName, weaponName }) => {
         const weapon = game.actors.getName(actorName).items.getName(weaponName);
         const attacks = foundry.utils.deepClone(weapon.system.attack);
         attacks[0].damage = 9;
         await weapon.update({
            system: {
               attack: attacks,
            },
         });
      }, { actorName: ACTOR_NAME, weaponName: WEAPON_NAME });

      // The embedded bridge re-resolves through the actor subscription: the row updates in place.
      await expect(row.getByTestId('attack-tags-damage').locator('.value')).toHaveText('9');
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('two-context: actor-derived tags render and the roll button fires requestAttackCheck', async () => {
      const row = await openCharacterSheetWeaponRow();

      // The dice tag is actor-derived (read via 'sheetDocument'); its value must match the engine math.
      /** @type {number} The expected dice pool computed from the live actor (engine-recipe call shape). */
      const expectedDice = await page.evaluate((actorName) => {
         const actor = game.actors.getName(actorName);
         const weapon = actor.items.find((item) => item.type === 'weapon');
         const attack = weapon.system.attack[0];
         const attackTraits = attack.trait.map((trait) => trait.name);
         return actor.system.attribute[attack.attribute].value +
            actor.system.skill[attack.skill].training.value +
            actor.system.getAttackCheckMod(
               'dice',
               attack.attribute,
               attack.skill,
               weapon.system.multiAttack,
               attack.type,
               attackTraits,
               [],
            );
      }, ACTOR_NAME);
      await expect(row.locator('.attack .check-stats .stat').first().locator('.value'))
         .toHaveText(String(expectedDice));

      // Enable the dialog gate, then click the roll button (the equipped attack header button).
      await page.evaluate(async () => {
         await game.settings.set('titan', 'getCheckOptions', true);
      });
      await row.locator('.attack .header button').first().click();

      // requestAttackCheck on the actor opens the attack-check dialog (selector per checkDialog.js).
      await expect(
         page.locator('.application.titan-dialog[id^="titan-attack-check-dialog-"]').first(),
      ).toBeVisible();
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });

   test('chat card renders the same tags and stays a snapshot when the weapon changes', async () => {
      // Post the weapon card.
      /** @type {string} The posted chat message id. */
      const messageId = await page.evaluate(async ({ actorName, weaponName }) => {
         const weapon = game.actors.getName(actorName).items.getName(weaponName);
         const before = game.messages.size;
         const message = await weapon.sendToChat();
         await titanWait(() => game.messages.size > before, { message: 'weapon card posted' });
         return message.id;
      }, { actorName: ACTOR_NAME, weaponName: WEAPON_NAME });

      /** @type {import('@playwright/test').Locator} The mounted weapon card (first visible mount). */
      const card = page.locator(`.message[data-message-id="${messageId}"] .item-chat-message`).first();
      await expect(card).toBeVisible();

      // Parity: the card's AttackTags shows the same intrinsic values as the sheets.
      await expect(card.getByTestId('attack-tags-damage').locator('.value')).toHaveText('7');
      await expect(card.getByTestId('attack-tags-range').locator('.value')).toHaveText('3');

      // Edit the weapon, then wait for a POSITIVE signal that the change propagated to live readers
      // (the character sheet row), so the card assertion below is not a race.
      const row = await openCharacterSheetWeaponRow();
      await page.evaluate(async ({ actorName, weaponName }) => {
         const weapon = game.actors.getName(actorName).items.getName(weaponName);
         const attacks = foundry.utils.deepClone(weapon.system.attack);
         attacks[0].damage = 11;
         await weapon.update({
            system: {
               attack: attacks,
            },
         });
      }, { actorName: ACTOR_NAME, weaponName: WEAPON_NAME });
      await expect(row.getByTestId('attack-tags-damage').locator('.value')).toHaveText('11');

      // Snapshot semantics: the chat card still shows the value at post time.
      await expect(card.getByTestId('attack-tags-damage').locator('.value')).toHaveText('7');
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
```

- [ ] **Step 2: Build, then run the spec against the launched world**

Confirm with the user that the world is launched, then:

Run: `npm run build`
Run: `npm run test:e2e -- attack-tags`
Expected: 4 passed. If a selector misses (e.g. the sidebar expand-button position), fix the locator against the live DOM — do NOT add fixed sleeps (project rule: deterministic waits only; `expect(locator)` assertions auto-retry).

- [ ] **Step 3: Commit**

```powershell
git add tests/e2e/attack-tags.spec.js
git commit -m "test(e2e): shared AttackTags parity, reactivity, two-context, and chat-snapshot coverage"
```

---

### Task 8: Docs, skill update, full verification

**Files:**
- Modify: `.claude/skills/titan-codebase/references/abstractions.md`
- Modify: `.claude/skills/titan-codebase/references/data-flow.md`
- Modify: `.claude/skills/titan-codebase/references/conventions.md`
- Modify: `docs/TODO.md`

- [ ] **Step 1: Update the titan-codebase skill**

Add (concise, current-state wording; place beside the existing `ReactiveDocument` material):

- `abstractions.md`: `EmbeddedDocument` (delegating bridge: `(parent, collection, id)`, re-resolves via `parent.data` each read, no hooks, `.data`/`.doc` parity, nests) and `EmbeddedDocumentProvider.svelte` (shadows `'document'`; `COLLECTION_BY_DOCUMENT_NAME` Item→items / ActiveEffect→effects; warns on anything else). The shared `AttackTags.svelte` (`src/document/types/item/types/weapon/components/`) and its three consumers.
- `data-flow.md`: the two-context convention — `'document'` = nearest document (shadowed by providers), `'sheetDocument'` = owning sheet bridge set once in `DocumentSheetShell` and never shadowed; embedded reads resolve `actorBridge.data.items.get(id)` through the single actor subscription.
- `conventions.md`: the keying rule — **`EmbeddedDocumentProvider` instances inside an `{#each}` MUST be keyed by `doc.id`** (context is captured at init); note the chat card needs no provider (snapshot path parity, message bridge backing).

- [ ] **Step 2: Update `docs/TODO.md`**

Add one new entry under a new `## Embedded document contexts — follow-ups` heading, listing the spec's decomposed sheet-side reuse items (inline attack editing via `WeaponSheetAttackSettings` through the provider; generalizing to the checks/rules-elements tabs; migrating commodity/effect rows off `item._id` lookups), pointing at the spec file. Update entry #12's text to note the AttackTags proof shipped (the north-star itself stays open).

- [ ] **Step 3: Full verification**

Run: `npm test`
Expected: all unit suites green (≥ 158 + 16 new).
Run: `npm run build`
Expected: clean.
Run (user-gated, world launched; background it — full run ~15 min): `npm run test:e2e`
Expected: 382 + 4 green. Pay attention to the pre-existing weapon-related specs (`reactive-weapon.spec.js`, `checks-dialog.spec.js`, `item-cards.spec.js`, `header-buttons.spec.js`) — they exercise the refactored components.

- [ ] **Step 4: Commit docs + skill**

```powershell
git add .claude/skills/titan-codebase/references/abstractions.md .claude/skills/titan-codebase/references/data-flow.md .claude/skills/titan-codebase/references/conventions.md docs/TODO.md
git commit -m "docs: document EmbeddedDocument/provider/two-context machinery and AttackTags consumers"
```

---

## Definition of done

- [ ] `EmbeddedDocument` + `EmbeddedDocumentProvider` + `'sheetDocument'` context exist with unit coverage.
- [ ] One `AttackTags` renders the intrinsic tags on all three surfaces; the duplicated markup is deleted from all three call sites.
- [ ] Character sheet keeps actor-derived tags + roll button via `'sheetDocument'`; modified damage preserved via `damageMod`.
- [ ] Chat card remains a snapshot (e2e-proven non-reactivity).
- [ ] Full unit + e2e suites green; build clean and probe-free.
- [ ] titan-codebase skill + `docs/TODO.md` updated.
