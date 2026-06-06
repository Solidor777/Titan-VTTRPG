# Embedded-Context Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert every remaining embedded-document consumer on the character sheet (all item rows, all effect rows, the Effect HUD row) from `item`/`effect` prop-threading + `document.data.items.get(id)…` lookups onto the embedded-document context (`EmbeddedDocumentProvider` at list level + the `'document'`/`'sheetDocument'` two-context convention), and extract ONE shared read-only `CheckTags` display consumed by the item-sheet sidebar, character-sheet item rows, effect rows, and the Effect HUD.

**Architecture:** The lists wrap each row in an id-keyed `EmbeddedDocumentProvider`; inside a row subtree `getContext('document')` IS the embedded item/effect (display via `document.data.system.*`, document methods via the non-subscribing `document.doc`), and actor engine calls route through the never-shadowed `getContext('sheetDocument')`. Wrap + conversion are atomic per family (the provider *shadows* `'document'`, so a wrapped-but-unconverted reader breaks): Stage 1 = effects family, Stage 2 = item family in one mechanical task, Stage 3 = `CheckTags`.

**Tech Stack:** Svelte 5 (runes), Foundry v14 ApplicationV2, Vitest + @testing-library/svelte (happy-dom), Playwright (shared-world harness).

**Spec:** `docs/superpowers/specs/2026-06-06-embedded-context-conversion-design.md`.

## Buddy-check directives

Standing rule (user-confirmed 2026-06-05, carried forward 2026-06-06): **no buddy checks** — every task
gets the standard two-stage review (spec-compliance reviewer, then code-quality reviewer), plus the final
holistic review after all tasks. No task is flagged. The user may override per-task (Task 3 is the widest
diff if they ever want one).

## Plan-time corrections to the spec (user-approved at plan handoff)

1. **Effect HUD provider site:** the spec says `EffectHudRow` self-wraps "(it has no list parent)" — it
   DOES have one: `EffectHudSection` renders rows in an id-keyed `{#each}` (`EffectHudSection.svelte:16`).
   The provider therefore wraps there, exactly matching the list-level convention. `EffectHudShell` also
   gains the `'sheetDocument'` context (one line) — without it the converted check/delete leaves have no
   actor escape hatch on the HUD surface.
2. **Two dead components deleted, not converted:** `CharacterSheetItemTradition.svelte` and
   `CharacterSheetItemFooter.svelte` have zero consumers (grep-proven). They are deleted in Task 3.
   This drops the spec's "29 files" Stage-2 count to 27 touched + 2 deleted.

---

## Project rules the implementer MUST follow (from `.claude/CLAUDE.md` + handoff)

- Route all `.js`/`.svelte` work through the `titan-svelte-dev` subagent with `svelte-5`, `foundry-vtt`, `foundry-svelte` skills loaded.
- Code style: 120-char wrap; multi-line `{}` for all conditionals; multi-line objects (>1 property); Svelte components with >1 prop are multi-line with `>` / `/>` on a new line; every variable typed + single-line comment; every function has a multi-line typed JSDoc comment. NO `:global` CSS.
- Unit runner is **`npm test`** (filter positionally, e.g. `npm test -- CheckTags`). E2E: `npm run build` first, then `npm run test:e2e -- <pattern>` (throttled default). **The e2e world must be launched by the user at `:30000`** — ask before running e2e. **NEVER run `npm run build` while an e2e run is in flight** (probe boot-window strand, `OPEN_BUGS.md` #6).
- `git add` explicit paths only — NEVER stage `packs/`, `.claude/settings.local.json`, or `.claude/scheduled_tasks.lock`.
- Tests source lives in `tests/` (plural). No test code in shipping builds.
- E2E helpers must NOT blind-toggle expanders (weapon sidebar attacks seed EXPANDED, `WeaponSheetData.js:44`).

## The conversion recipe (shared vocabulary for Tasks 1, 3, 5)

Every file conversion applies these uniform rules. Task steps below give the per-file specifics; when in
doubt, the rule wins:

- **R1 — display reads:** `document.data.items.get(item._id)?.system.X` → `document.data?.system.X`
  (same for `effects.get`). Top-level document fields: `document.data?.name`, `document.data?.img`,
  `document.data?.description`, `document.data?.type`.
- **R2 — ids for engine-call args:** `item._id` / `effect.id` → `document.data?._id` in reactive
  positions; in one-shot captures (options objects built once at init) use `document.doc._id` /
  `document.doc.id` (non-subscribing; the id is stable for the provider's lifetime — instances are
  id-keyed).
- **R3 — document methods / writes:** `item.sendToChat()` → `document.doc?.sendToChat()`;
  `item.sheet.render(true)` → `document.doc?.sheet.render(true)`;
  `item.update({...})` / `effect.update({...})` → `document.doc?.update({...})`. *(Idiom settled by
  the Task 1 quality review: handler-time `.doc` method calls are `?.`-guarded so a click landing in
  the deletion window no-ops instead of throwing.)*
- **R4 — actor engine calls:** any `document.data.system.<actorMethod>(...)` in a row subtree (e.g.
  `requestItemDeletion`, `toggleEquipped`, `toggleEffectActive`, `requestEffectDeletion`,
  `requestAttackCheck`, `requestItemCheck`, `requestCastingCheck`, `getItemCheckParameters`,
  `initializeItemCheckOptions`, `getAttackCheckParameters`, `initializeAttackCheckOptions`,
  `getCastingCheckParameters`, `initializeCastingCheckOptions`, `spendResolve`, `toggleMultiAttack`) →
  `const sheetDocument = getContext('sheetDocument');` + `sheetDocument.data.system.<actorMethod>(...)`.
  Actor STATE reads too: `document.data.system.equipped.armor` → `sheetDocument.data.system.equipped.armor`.
- **R5 — owner gates stay on the nearest `'document'`:** `document.data?.isOwner` (and
  `DocumentOwnerButton`/`DocumentOwnerIconButton`, unchanged) keep reading the shadowed context — an
  embedded document's `isOwner` delegates to its parent actor, so the gate is preserved. Do NOT rewrite
  these to `sheetDocument`. *(Idiom settled by the Task 1 quality review: converted in-row `isOwner`
  reads carry the R6 `?.` guard.)*
- **R6 — guards:** every converted read keeps a `?.` after `.data` (`document.data?.system.X`) — the
  embedded document can vanish in the deletion window before the list unmounts the row.
- **R7 — props dropped:** the `item`/`effect`/`itemId`/`effectId` props disappear from the whole subtree.
  Surviving props: `bind:isExpanded` (UI state, bound at list level), indices (`attackIdx`, `checkIdx`,
  `idx`), and computed data values (e.g. `equipped` on the equip button).
- **R8 — keying rule:** every `{#each}` that mounts an `EmbeddedDocumentProvider` MUST stay keyed by the
  document id (the provider captures its target at init). All four wrap sites in this plan already are.

## File map

| Task | Action | Path | Responsibility |
|---|---|---|---|
| 1 | Modify | `src/ui/effect-hud/EffectHudShell.svelte` | +`'sheetDocument'` context |
| 1 | Modify | `src/ui/effect-hud/EffectHudSection.svelte` | Provider wrap per HUD row |
| 1 | Modify | `src/ui/effect-hud/EffectHudRow.svelte` | Context-sourced; `effect` prop dropped |
| 1 | Modify | `…/sheet/items/effect/CharacterSheetEffectList.svelte` | Provider wrap per effect row |
| 1 | Modify | `…/sheet/items/effect/CharacterSheetEffect.svelte` | Context-sourced row |
| 1 | Modify | `…/sheet/items/effect/CharacterSheetEffectChecks.svelte` | Context-sourced; prop dropped |
| 1 | Modify | `…/sheet/items/effect/CharacterSheetEffectCheck.svelte` | Two-context refactor |
| 1 | Modify | `…/sheet/items/effect/CharacterSheetEffectToggleActiveButton.svelte` | Two-context refactor |
| 2 | Create | `tests/e2e/embedded-context-effects.spec.js` | Effects-family reactivity + functional e2e |
| 3 | Modify | `…/sheet/items/CharacterSheetMultiItemList.svelte` | Provider wrap per item row |
| 3 | Modify | `…/sheet/items/CharacterSheetItemList.svelte` | Provider wrap per item row |
| 3 | Modify | `…/sheet/items/CharacterSheetItem.svelte` | Shell; `item` prop dropped |
| 3 | Modify | `…/sheet/items/CharacterSheetItemImage.svelte` | Context-sourced |
| 3 | Modify | `…/sheet/items/CharacterSheetItemExpandButton.svelte` | Context-sourced |
| 3 | Modify | `…/sheet/items/CharacterSheetItemSendToChatButton.svelte` | `document.doc` |
| 3 | Modify | `…/sheet/items/CharacterSheetItemEditButton.svelte` | `document.doc` |
| 3 | Modify | `…/sheet/items/CharacterSheetItemDeleteButton.svelte` | Two-context refactor |
| 3 | Modify | `…/sheet/items/CharacterSheetItemEquipButton.svelte` | Two-context refactor |
| 3 | Modify | `…/sheet/items/CharacterSheetItemChecks.svelte` | Context-sourced; prop dropped |
| 3 | Modify | `…/sheet/items/CharacterSheetItemCheck.svelte` | Two-context refactor |
| 3 | Modify | `…/sheet/items/CharacterSheetCondensedItemCheckButton.svelte` | Two-context refactor |
| 3 | Modify | `…/sheet/items/CharacterSheetCondensedAttackCheckButton.svelte` | Two-context refactor |
| 3 | Modify | `…/sheet/items/spell/CharacterSheetCondensedCastingCheckButton.svelte` | Two-context refactor |
| 3 | Modify | `…/sheet/items/weapon/CharacterSheetWeapon.svelte` | Context-sourced row |
| 3 | Modify | `…/sheet/items/weapon/CharacterSheetWeaponAttacks.svelte` | Own provider dissolved |
| 3 | Modify | `…/sheet/items/weapon/CharacterSheetWeaponMultiAttackButton.svelte` | Two-context refactor |
| 3 | Modify | `…/sheet/items/armor/CharacterSheetArmor.svelte` | Context-sourced row (actor equip state) |
| 3 | Modify | `…/sheet/items/armor/CharacterSheetArmorStats.svelte` | Context-sourced |
| 3 | Modify | `…/sheet/items/shield/CharacterSheetShield.svelte` | Context-sourced row (actor equip state) |
| 3 | Modify | `…/sheet/items/shield/CharacterSheetShieldStats.svelte` | Context-sourced |
| 3 | Modify | `…/sheet/items/equipment/CharacterSheetEquipment.svelte` | Context-sourced row |
| 3 | Modify | `…/sheet/items/commodity/CharacterSheetCommodity.svelte` | Context-sourced row |
| 3 | Modify | `…/sheet/items/spell/CharacterSheetSpell.svelte` | Context-sourced row |
| 3 | Modify | `…/sheet/items/spell/CharacterSheetSpellCastingCheck.svelte` | Two-context refactor |
| 3 | Modify | `…/sheet/items/ability/CharacterSheetAbility.svelte` | Context-sourced row |
| 3 | Modify | `…/sheet/items/effect/CharacterSheetEffect.svelte` | Drop the temporary shell prop |
| 3 | Delete | `…/sheet/items/CharacterSheetItemTradition.svelte` | Dead (zero consumers) |
| 3 | Delete | `…/sheet/items/CharacterSheetItemFooter.svelte` | Dead (zero consumers) |
| 4 | Create | `tests/e2e/embedded-context-items.spec.js` | Per-type functional sweep e2e |
| 5 | Create | `src/document/svelte-components/check/CheckTags.svelte` | Shared intrinsic check-tag row |
| 5 | Create | `tests/unit/CheckTags.test.js` | CheckTags unit suite |
| 5 | Modify | `src/document/types/item/sheet/check/ItemSheetSidebarCheck.svelte` | Consumer (sidebar converges) |
| 5 | Modify | `…/sheet/items/CharacterSheetItemCheck.svelte` | Consumer (intrinsic tags → CheckTags) |
| 5 | Modify | `…/sheet/items/effect/CharacterSheetEffectCheck.svelte` | Consumer (intrinsic tags → CheckTags) |
| 6 | Create | `tests/e2e/embedded-context-check-parity.spec.js` | Cross-surface check-tag parity e2e |
| 7 | Modify | `.claude/skills/titan-codebase/references/{abstractions,data-flow,conventions}.md` + `docs/TODO.md` | Docs |

`…` = `src/document/types/actor/types/character`.

**Reference files to read before starting:** `src/document/reactive/EmbeddedDocument.svelte.js` +
`EmbeddedDocumentProvider.svelte` (the machinery), `…/sheet/items/weapon/CharacterSheetWeaponAttack.svelte`
(the finished two-context exemplar), `tests/unit/AttackTags.test.js` (context-Map unit harness),
`tests/e2e/attack-tags.spec.js` (sheet-driving e2e model), `tests/e2e/world.js` + one shared-world spec
(harness pattern), `tests/e2e/interaction-dialogs.spec.js` (delete-confirm flow selectors).

---

### Task 1: Stage 1 — effects family conversion

**Files:** the eight Stage-1 paths in the file map above (modify only; no creates).

**Greenness argument:** every converted leaf in this family (`EffectChecks`, `EffectCheck`,
`ToggleActiveButton`) is consumed ONLY by `CharacterSheetEffect` and `EffectHudRow` — both wrapped in the
same task. The shared `CharacterSheetItem` shell is NOT converted here (item rows still feed it props);
`CharacterSheetEffect` passes it `item={document.data}` until Task 3 converts the shell for everyone.

- [ ] **Step 1: `EffectHudShell.svelte` — add the `'sheetDocument'` context**

Directly after the existing `setContext('document', documentStore);` line, add:

```js
   // 'sheetDocument' mirrors DocumentSheetShell: the HUD's top-level actor bridge, never shadowed by
   // embedded-document providers, so actor-coupled leaves (checks, delete) keep an escape hatch.
   // svelte-ignore state_referenced_locally
   setContext('sheetDocument', documentStore);
```

- [ ] **Step 2: `EffectHudSection.svelte` — wrap each row in the provider**

Add the import:

```js
   import EmbeddedDocumentProvider from '~/document/reactive/EmbeddedDocumentProvider.svelte';
```

Replace the `{#each}` body (the `{#each}` stays keyed by `effect.id` — rule R8):

```svelte
   {#each effects as effect (effect.id)}
      <EmbeddedDocumentProvider doc={effect}>
         <EffectHudRow/>
      </EmbeddedDocumentProvider>
   {/each}
```

- [ ] **Step 3: `EffectHudRow.svelte` — convert to context reads**

Replace the script block with:

```svelte
<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import DurationTag from '~/helpers/svelte-components/tag/DurationTag.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentOwnerIconButton from '~/document/svelte-components/DocumentOwnerIconButton.svelte';
   import CharacterSheetEffectChecks
      from '~/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectChecks.svelte';
   import { DELETE_ICON, SEND_TO_CHAT_ICON } from '~/system/Icons.js';

   /** @type {object} The embedded effect bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The HUD's top-level actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /** @type {boolean} Whether this row is expanded to show its detail. */
   let isExpanded = $state(false);

   /** @type {boolean} Whether this entry is a full effect (vs an inert condition). */
   const isEffect = $derived(document.data?.type === 'effect');

   /** @type {string} The entry's description HTML, sourced per subtype. */
   const description = $derived(
      isEffect
         ? (document.data?.description ?? '')
         : (document.data?.flags?.titan?.description ?? ''),
   );

   /** @type {number} The effect's embedded-check count (conditions have none). */
   const checkLength = $derived(isEffect ? (document.data?.system.check.length ?? 0) : 0);

   /** @type {string} The effect's duration type (effects only; defaults to permanent when absent). */
   const durationType = $derived(
      isEffect ? (document.data?.system.duration.type ?? 'permanent') : 'permanent',
   );

   /** @type {number} The effect's remaining duration (effects only; conditions carry no duration). */
   const durationRemaining = $derived(isEffect ? document.data?.system.duration?.remaining : undefined);
</script>
```

Template edits (everything else unchanged):

- `aria-label={`${effect.name}: …`}` → `aria-label={`${document.data?.name}: ${localize(isExpanded ? 'collapse' : 'expand')}`}`
- `src={effect.img}` → `src={document.data?.img}`; `alt={effect.name}` → `alt={document.data?.name}`
- `<span class="name">{effect.name}</span>` → `<span class="name">{document.data?.name}</span>`
- `<CharacterSheetEffectChecks {effect}/>` → `<CharacterSheetEffectChecks/>`
- send-to-chat `onclick={() => effect.sendToChat()}` → `onclick={() => document.doc.sendToChat()}` (R3)
- delete `onclick={() => document.data.system.requestEffectDeletion(effect.id)}` →
  `onclick={() => sheetDocument.data.system.requestEffectDeletion(document.data?.id)}` (R4)

- [ ] **Step 4: `CharacterSheetEffectList.svelte` — wrap each row in the provider**

Add the import:

```js
   import EmbeddedDocumentProvider from '~/document/reactive/EmbeddedDocumentProvider.svelte';
```

Inside the `<li>` (the `{#each effects as effect (effect.id)}` and the drag handlers on `<li>` are
unchanged — list-script code stays on the actor bridge), replace:

```svelte
            <CharacterSheetEffect
               {effect}
               bind:isExpanded={$appState.tabs.effects.isExpanded[effect.id]}
            />
```

with:

```svelte
            <EmbeddedDocumentProvider doc={effect}>
               <CharacterSheetEffect bind:isExpanded={$appState.tabs.effects.isExpanded[effect.id]}/>
            </EmbeddedDocumentProvider>
```

- [ ] **Step 5: `CharacterSheetEffect.svelte` — convert the row**

Replace the script's props/deriveds section (imports and the rest unchanged) with:

```js
   /**
    * @typedef {object} CharacterSheetEffectProps
    * @property {boolean} [isExpanded] - Whether this effect is currently expanded.
    */

   /** @type {CharacterSheetEffectProps} */
   let { isExpanded = $bindable(undefined) } = $props();

   /** @type {object} The embedded effect bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /** @type {string} The effect's duration type, read reactively through the embedded bridge. */
   const durationType = $derived(document.data?.system.duration.type);

   /** @type {string} The effect's custom duration label, read reactively through the embedded bridge. */
   const durationCustom = $derived(document.data?.system.duration.custom);

   /** @type {number} The effect's remaining duration, read reactively through the embedded bridge. */
   const durationRemaining = $derived(document.data?.system.duration.remaining);

   /** @type {boolean} Whether the effect is expired, read reactively through the embedded bridge. */
   const isExpired = $derived(document.data?.system.isExpired);

   /** @type {string} The effect's rich-text description, read reactively through the embedded bridge. */
   const description = $derived(document.data?.description ?? '');

   /** @type {number} The effect's check count, read reactively through the embedded bridge. */
   const checkLength = $derived(document.data?.system.check.length ?? 0);

   /** @type {Array<object>} The effect's custom traits, read reactively through the embedded bridge. */
   const customTrait = $derived(document.data?.system.customTrait ?? []);
```

Template edits:

- `<CharacterSheetItem item={effect} bind:isExpanded>` → `<CharacterSheetItem item={document.data} bind:isExpanded>`
  (TEMPORARY: the shared shell is still prop-driven until Task 3 converts it; passing the live re-resolved
  document keeps this row fully context-sourced. Task 3 Step 16 drops this prop.)
- Initiative input binding →
  `bind:value={() => document.data?.system.duration.initiative ?? 0, (newValue) => document.doc.update({ system: { duration: { initiative: newValue } } })}`
- Remaining-duration input binding →
  `bind:value={() => document.data?.system.duration.remaining ?? 0, (newValue) => document.doc.update({ system: { duration: { remaining: newValue } } })}`
- `<CharacterSheetEffectToggleActiveButton {effect}/>` → `<CharacterSheetEffectToggleActiveButton/>`
- send-to-chat `onclick={() => effect.sendToChat()}` → `onclick={() => document.doc.sendToChat()}`
- edit button `onclick={() => effect.sheet.render(true)}` → `onclick={() => document.doc.sheet.render(true)}`
  (the `document.data.isOwner` icon/label/tooltip reads are unchanged — R5: the embedded effect's
  `isOwner` delegates to the actor)
- delete `onclick={() => document.data.system.requestEffectDeletion(effect.id)}` →
  `onclick={() => sheetDocument.data.system.requestEffectDeletion(document.data?.id)}`
- `<CharacterSheetEffectChecks {effect}/>` → `<CharacterSheetEffectChecks/>`

- [ ] **Step 6: `CharacterSheetEffectChecks.svelte` — convert**

Replace the full contents (style block unchanged) with:

```svelte
<script>
   import { getContext } from 'svelte';
   import CharacterSheetEffectCheck
      from '~/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectCheck.svelte';

   /** @type {object} The embedded effect bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');
</script>

<!--Checks-->
<div class="checks">

   <!--Each Check-->
   {#each document.data?.system.check ?? [] as check, checkIdx (check.uuid)}
      <div class="check">
         <CharacterSheetEffectCheck {checkIdx}/>
      </div>
   {/each}

</div>
```

- [ ] **Step 7: `CharacterSheetEffectCheck.svelte` — two-context refactor**

Replace the script's context/props/logic section (tag imports and template unchanged in this task) with:

```js
   /** @type {object} The embedded effect bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /**
    * @typedef {object} CharacterSheetEffectCheckProps
    * @property {number} [checkIdx] The index of the check in the checks array.
    */

   /** @type {CharacterSheetEffectCheckProps} */
   const { checkIdx = undefined } = $props();

   /** @type {boolean} Whether to automatically spend the resolve for checks. */
   const autoSpendResolve = autoSpendResolveChecks();

   /**
    * Builds the Check Options for this effect check, resolving fresh roll data from the effect.
    * The shared item-check engine cannot resolve an effect from the item collection, so the
    * effect's roll data is supplied directly via the engine's itemRollData passthrough branch.
    * @returns {ItemCheckOptions | undefined} The check options, or undefined if the effect or check is invalid.
    */
   function getCheckOptions() {
      // Resolve the live effect through the embedded bridge and ensure the check index is valid.
      const effect = document.data;
      if (effect?.system.check.length > checkIdx) {
         return {
            itemRollData: effect.getRollData(),
            checkIdx: checkIdx,
         };
      }
      return undefined;
   }

   /** @type {ItemCheckParameters | undefined} Calculated item check parameters. */
   let checkParameters = $derived.by(() => {

      // Build the options from current effect roll data, then calculate the display parameters.
      const checkOptions = getCheckOptions();
      if (checkOptions) {
         return sheetDocument.data.system.getItemCheckParameters(
            sheetDocument.data.system.initializeItemCheckOptions(checkOptions),
         );
      }
      return undefined;
   });

   /**
    * Rolls the effect's Check via the shared item-check engine.
    */
   function rollEffectCheck() {
      // Build options fresh at roll time so the roll captures the effect's current state.
      const checkOptions = getCheckOptions();
      if (checkOptions) {
         sheetDocument.data.system.requestItemCheck(checkOptions);
      }
   }
```

Template edits: the three `disabled={!document.data.isOwner}` reads are unchanged (R5); the
spend-resolve button becomes
`onclick={() => sheetDocument.data.system.spendResolve(checkParameters.resolveCost)}` (R4).

- [ ] **Step 8: `CharacterSheetEffectToggleActiveButton.svelte` — two-context refactor**

Replace the full contents with:

```svelte
<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import ToggleButton from '~/helpers/svelte-components/button/ToggleButton.svelte';

   /** @type {object} The embedded effect bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /** @type {boolean} The effect's active state, read reactively through the embedded bridge. */
   const isActive = $derived(document.data?.system.isActive ?? false);
</script>

<ToggleButton
   active={isActive}
   disabled={!document.data?.isOwner}
   label={localize('active')}
   onclick={() => sheetDocument.data.system.toggleEffectActive(document.data?.id)}
/>
```

- [ ] **Step 9: Verify Stage 1**

Run: `npm run build`
Expected: clean (no unresolved imports, single-chunk shipping bundle).
Run: `npm test`
Expected: all unit suites green (177 baseline).
Run (user-gated, world launched): `npm run test:e2e -- effect-hud effect-checks effect-reactivity reactive-effect-rows interaction-dialogs effect-chat-card`
Expected: all green — these specs ARE the effects-family parity lock.

- [ ] **Step 10: Commit**

```powershell
git add src/ui/effect-hud/EffectHudShell.svelte src/ui/effect-hud/EffectHudSection.svelte src/ui/effect-hud/EffectHudRow.svelte src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectList.svelte src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectChecks.svelte src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectCheck.svelte src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectToggleActiveButton.svelte
git commit -m "refactor(character-sheet): effect rows and Effect HUD read the embedded effect via EmbeddedDocumentProvider"
```

---

### Task 2: Stage 1 e2e — effects-family cross-surface spec

**Files:**
- Create: `tests/e2e/embedded-context-effects.spec.js`

**Model:** `tests/e2e/attack-tags.spec.js` (shared-world boot, fixture seeding, titanWait). The Effect HUD
needs a CONTROLLED TOKEN for the GM (first-selected-token rule) — model the token fixture on
`tests/e2e/effect-hud.spec.js`.

- [ ] **Step 1: Write the spec**

Cases (one `test.describe`, shared seeded actor+effect fixture per the model specs):

1. **Effect-row cross-sheet reactivity:** seed an actor with one `effect`-subtype AE carrying a check
   (`system.check: [...]` via `createEmbeddedDocuments('ActiveEffect', …)`); open the character sheet
   Effects tab; expand the effect row; `effect.update({ name, system: { duration: { type: 'turnEnd',
   remaining: 3 } } })` through the live document; assert the row's name text and `DurationTag` update in
   place (auto-retrying `expect(locator)`).
2. **Effect-row functional sweep:** toggle-active button flips `system.isActive` (assert via
   `expect.poll(() => page.evaluate(…effect.system.isActive))`); send-to-chat posts a message with
   `type === 'effect'`; the embedded check's roll button (with `getCheckOptions` setting false) posts a
   message with `type === 'itemCheck'`; delete button with `confirmDeletingEffects` ON mounts the confirm
   dialog and the effect survives until confirmed (reuse the `interaction-dialogs.spec.js` selectors).
3. **HUD-row reactivity + functional:** seed a scene token for the actor, control it (per
   `effect-hud.spec.js` fixture); expand the HUD row for the effect; assert the description and embedded
   check render; `effect.update({ name: … })` and assert the HUD row header updates in place (the row
   header is now context-sourced — this is NEW behavior the conversion adds and locks); the HUD delete
   button owner-gates and deletes after confirm.

Restore any changed settings (`getCheckOptions`, `confirmDeletingEffects`) in `afterAll` — the e2e
gotcha from the suite history: never leave check-dialog settings flipped for later files.

- [ ] **Step 2: Build, then run the spec against the launched world**

Run: `npm run build` (NOT during any e2e run), then `npm run test:e2e -- embedded-context-effects`
Expected: all cases green. Fix locators against the live DOM if a selector misses — NO fixed sleeps.

- [ ] **Step 3: Commit**

```powershell
git add tests/e2e/embedded-context-effects.spec.js
git commit -m "test(e2e): effects-family embedded-context reactivity and functional coverage"
```

---

### Task 3: Stage 2 — item family conversion (one atomic task)

**Files:** the 26 modify + 2 delete Stage-2 paths in the file map. **This task is wide but uniform** —
every edit applies the recipe rules R1–R8. Work through the steps in order; the suite is only expected
green again at Step 17 (wrap + conversion are atomic — intermediate states are NOT committed).

- [ ] **Step 1: Wrap rows in both lists**

In `CharacterSheetMultiItemList.svelte` AND `CharacterSheetItemList.svelte`, add the import:

```js
   import EmbeddedDocumentProvider from '~/document/reactive/EmbeddedDocumentProvider.svelte';
```

In `CharacterSheetMultiItemList.svelte`, replace the component mount inside the `<li>`:

```svelte
            {#each [itemComponents[item.type]] as ItemComponent}
               <ItemComponent
                  {item}
                  bind:isExpanded={$appState.tabs[tabKey].isExpanded[item._id]}
               />
            {/each}
```

with:

```svelte
            <EmbeddedDocumentProvider doc={item}>
               {#each [itemComponents[item.type]] as ItemComponent}
                  <ItemComponent bind:isExpanded={$appState.tabs[tabKey].isExpanded[item._id]}/>
               {/each}
            </EmbeddedDocumentProvider>
```

In `CharacterSheetItemList.svelte`, replace the equivalent mount (`[itemComponent]`) the same way:

```svelte
            <EmbeddedDocumentProvider doc={item}>
               {#each [itemComponent] as ItemComponent}
                  <ItemComponent bind:isExpanded={$appState.tabs[tabKey].isExpanded[item._id]}/>
               {/each}
            </EmbeddedDocumentProvider>
```

Everything else in both lists (sort/filter deriveds, drag handlers reading
`document.data.items.get(id)`, the outer keyed `{#each items as item (item._id)}`) is UNCHANGED —
list-script code stays on the actor bridge.

- [ ] **Step 2: Shell trio — `CharacterSheetItem.svelte`, `CharacterSheetItemImage.svelte`, `CharacterSheetItemExpandButton.svelte`**

`CharacterSheetItem.svelte` script: drop `item` from the typedef and props
(`let { isExpanded = $bindable(undefined), controls, children } = $props();`); template:
`<CharacterSheetItemImage {item}/>` → `<CharacterSheetItemImage/>` and
`<CharacterSheetItemExpandButton bind:isExpanded {item}/>` → `<CharacterSheetItemExpandButton bind:isExpanded/>`.

`CharacterSheetItemImage.svelte` — replace the full contents (style unchanged) with:

```svelte
<script>
   import { getContext } from 'svelte';

   /** @type {object} The embedded document bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');
</script>

<img class="item-image" src={document.data?.img} alt="item"/>
```

`CharacterSheetItemExpandButton.svelte` — replace the script and the two `item` reads:

```svelte
<script>
   import { getContext } from 'svelte';
   import DocumentOwnerButton from '~/document/svelte-components/DocumentOwnerButton.svelte';
   import { COLLAPSED_ICON, EXPANDED_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} CharacterSheetItemExpandButtonProps
    * @property {boolean} [isExpanded] Whether this Item is currently expanded.
    * @property {boolean} [name] Optional override for the name text.
    */

   /** @type {CharacterSheetItemExpandButtonProps} */
   let { isExpanded = $bindable(undefined), name = false } = $props();

   /** @type {object} The embedded document bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');
</script>
```

Template: the click guard `if (item && !item.isMarkedForDeletion)` →
`if (document.doc && !document.doc.isMarkedForDeletion)` (one-shot read in a handler — R2/R3);
`{name === false ? item.name : name}` → `{name === false ? document.data?.name : name}`.

- [ ] **Step 3: Shared action buttons**

`CharacterSheetItemSendToChatButton.svelte` — drop the `item` prop; add
`const document = getContext('document');`; `onclick={() => item.sendToChat()}` →
`onclick={() => document.doc?.sendToChat()}`.

`CharacterSheetItemEditButton.svelte` — drop the `item` prop;
`onclick={() => item.sheet.render(true)}` → `onclick={() => document.doc?.sheet.render(true)}`.
The `document.data.isOwner` icon/label/tooltip reads are unchanged (R5 — the embedded item's `isOwner`
delegates to the actor, so owners still see Edit and observers see View).

`CharacterSheetItemDeleteButton.svelte` — drop the `itemId` prop; add
`const sheetDocument = getContext('sheetDocument');`;
`onclick={() => document.data.system.requestItemDeletion(itemId)}` →
`onclick={() => sheetDocument.data.system.requestItemDeletion(document.data?._id)}` (R4). The
`DocumentOwnerIconButton` wrapper is unchanged (R5).

`CharacterSheetItemEquipButton.svelte` — drop the `item` prop (KEEP the `equipped` data prop); add
`const sheetDocument = getContext('sheetDocument');`;
`onclick={() => document.data.system.toggleEquipped(item._id)}` →
`onclick={() => sheetDocument.data.system.toggleEquipped(document.data?._id)}`.

- [ ] **Step 4: `CharacterSheetItemChecks.svelte` + `CharacterSheetItemCheck.svelte`**

`CharacterSheetItemChecks.svelte` — replace the full contents (style unchanged) with:

```svelte
<script>
   import { getContext } from 'svelte';
   import CharacterSheetItemCheck
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemCheck.svelte';

   /** @type {object} The embedded item bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');
</script>

<!--Checks-->
<div class="checks">

   <!--Each Check-->
   {#each document.data?.system.check ?? [] as check, checkIdx (check.uuid)}
      <div class="check">
         <CharacterSheetItemCheck {checkIdx}/>
      </div>
   {/each}

</div>
```

`CharacterSheetItemCheck.svelte` — replace the script's context/props/logic section with (template tag
markup unchanged in this task; Task 5 revisits it):

```js
   /** @type {object} The embedded item bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /**
    * @typedef {object} CharacterSheetItemCheckProps
    * @property {number} [checkIdx] The index of the check in the checks array.
    */

   /** @type {CharacterSheetItemCheckProps} */
   const { checkIdx = undefined } = $props();

   // The id and index are fixed for this component's lifetime (provider instances are id-keyed); the
   // checkOptions object is intentionally built once and reused across derived reads and event handlers.
   /** @type {ItemCheckOptions} Options for the check. */
   const checkOptions = {
      itemId: document.doc._id,
      checkIdx: checkIdx,
   };

   /** @type {boolean} Whether to automatically spend the resolve for checks. */
   const autoSpendResolve = autoSpendResolveChecks();

   /** @type {ItemCheckParameters} Calculated item check parameters. */
   let checkParameters = $derived.by(() => {

      // Ensure the item and check are valid.
      if (document.data?.system.check.length > checkIdx) {

         // Update the check parameters.
         return sheetDocument.data.system.getItemCheckParameters(
            sheetDocument.data.system.initializeItemCheckOptions(checkOptions)
         );
      }
      return undefined;
   });

   /**
    * Rolls the Item Check.
    */
   function rollItemCheck() {
      sheetDocument.data.system.requestItemCheck(checkOptions);
   }
```

Template: the `disabled` owner gates stay on the nearest `'document'` and gain the R6 guard
(`disabled={!document.data?.isOwner}`); the spend-resolve button becomes
`onclick={() => sheetDocument.data.system.spendResolve(checkParameters.resolveCost)}` (R4).

- [ ] **Step 5: The three condensed check buttons**

All three follow the same shape. `CharacterSheetCondensedItemCheckButton.svelte` — replace the script
body (imports unchanged) with:

```js
   /** @type {object} The embedded item bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   // The item id is fixed for this component's lifetime (provider instances are id-keyed); capturing
   // once in checkOptions is intentional.
   /** @type {ItemCheckOptions} Base options for the Item Check. */
   const checkOptions = {
      itemId: document.doc._id,
   };

   /** @type {ItemCheckParameters} Resolved dice and modifiers for the item check this button rolls. */
   let checkParameters = $derived.by(() => {

      // Ensure the item and check are valid.
      if (document.data?.system.check.length > 0) {

         // Update the parameters.
         return sheetDocument.data.system.getItemCheckParameters(
            sheetDocument.data.system.initializeItemCheckOptions(checkOptions)
         );
      }
      return undefined;
   });

   /** @type {string} Calculated tooltipAction. */
   let tooltip = $derived(
      checkParameters ? getItemCheckParametersTooltip(checkParameters) : undefined
   );
```

…and `onclick={() => document.data.system.requestItemCheck(checkOptions)}` →
`onclick={() => sheetDocument.data.system.requestItemCheck(checkOptions)}`. The `itemId` prop and its
typedef are deleted.

`CharacterSheetCondensedAttackCheckButton.svelte` — identical treatment with the attack flavor: the
guard is `document.data?.system.attack.length > 0`; the engine pair is
`sheetDocument.data.system.getAttackCheckParameters(sheetDocument.data.system.initializeAttackCheckOptions(checkOptions))`;
the click is `sheetDocument.data.system.requestAttackCheck(checkOptions)`.

`CharacterSheetCondensedCastingCheckButton.svelte` — identical with the casting flavor: the guard is
`if (document.data) {`; the engine pair is
`sheetDocument.data.system.getCastingCheckParameters(sheetDocument.data.system.initializeCastingCheckOptions(checkOptions))`;
the click is `sheetDocument.data.system.requestCastingCheck(checkOptions)`.

- [ ] **Step 6: Weapon row family**

`CharacterSheetWeapon.svelte` — script: drop `item` from the typedef/props; the eight deriveds convert
per R1 (`const equipped = $derived(document.data?.system.equipped);` etc. — same names, same comments
reworded to "read reactively through the embedded bridge"). Template: every `{item}` / `itemId={item._id}`
prop pass disappears (`CharacterSheetItemEquipButton` keeps `{equipped}`;
`CharacterSheetCondensedAttackCheckButton`, `CharacterSheetItemSendToChatButton`,
`CharacterSheetItemEditButton`, `CharacterSheetItemDeleteButton`, `CharacterSheetWeaponMultiAttackButton`,
`CharacterSheetWeaponAttacks`, `CharacterSheetItemChecks` all become bare); the shell opens as
`<CharacterSheetItem bind:isExpanded>`.

`CharacterSheetWeaponAttacks.svelte` — its own provider dissolves. Replace the full contents (style
unchanged) with:

```svelte
<script>
   import { getContext } from 'svelte';
   import CharacterSheetWeaponAttack
      from '~/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttack.svelte';

   /** @type {object} The embedded weapon bridge provided by the list-level EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {string[]} The Attack array indices, read reactively through the embedded bridge. */
   const attackKeys = $derived(Object.keys(document.data?.system.attack ?? []));
</script>

<ol>
   <!--Each Attack-->
   {#each attackKeys as attackIdx}
      <li>
         <CharacterSheetWeaponAttack attackIdx={Number(attackIdx)}/>
      </li>
   {/each}
</ol>
```

`CharacterSheetWeaponAttack.svelte` is UNTOUCHED — it already reads the embedded weapon from
`'document'` and the actor from `'sheetDocument'`; only the provider's mount point moved.

`CharacterSheetWeaponMultiAttackButton.svelte` — drop the `item` prop; add `sheetDocument`;
`const multiAttack = $derived(document.data?.system.multiAttack);`;
`onclick={() => sheetDocument.data.system.toggleMultiAttack(document.data?._id)}`.

- [ ] **Step 7: Armor + ArmorStats**

`CharacterSheetArmor.svelte` — drop `item` prop; add `sheetDocument`; deriveds per R1
(`check`, `description`). The ACTOR equip-state reads convert per R4:
`document.data.system.equipped.armor === item._id` →
`sheetDocument.data.system.equipped.armor === document.data?._id` (both the controls gate and the two
`equipped={…}` prop computations). `<CharacterSheetArmorStats {item}/>` → `<CharacterSheetArmorStats/>`;
all other prop passes drop as in Step 6.

`CharacterSheetArmorStats.svelte` — drop the `item` prop; the six deriveds convert per R1
(`document.data?.system.armor.value`, `.armor.max`, `.rarity`, `.value`, `.trait ?? []`,
`.customTrait ?? []`). Template unchanged.

- [ ] **Step 8: Shield + ShieldStats**

Identical treatment to Step 7 with the shield fields: row equip-state reads become
`sheetDocument.data.system.equipped.shield === document.data?._id`; stats deriveds are `defense`,
`rarity`, `value`, `trait`, `customTrait` per R1.

- [ ] **Step 9: Equipment**

`CharacterSheetEquipment.svelte` — drop `item` prop; deriveds per R1 (`equipped`, `checkLength`,
`description`, `rarity`, `value`, `customTrait`); prop passes drop; the equip button keeps `{equipped}`.

- [ ] **Step 10: Commodity**

`CharacterSheetCommodity.svelte` — drop `item` prop; deriveds per R1; the quantity input binding becomes:

```svelte
            bind:value={
               () => document.data?.system.quantity ?? 0,
               (newValue) => document.doc?.update({ system: { quantity: newValue } })
            }
```

- [ ] **Step 11: Spell + SpellCastingCheck**

`CharacterSheetSpell.svelte` — drop `item` prop; the nine deriveds convert per R1; prop passes drop
(`CharacterSheetSpellCastingCheck`, `CharacterSheetCondensedCastingCheckButton`, the shared buttons,
`CharacterSheetItemChecks`).

`CharacterSheetSpellCastingCheck.svelte` — same shape as the condensed casting button (Step 5):
`document` + `sheetDocument` contexts; `checkOptions = { itemId: document.doc._id };`; the derived
guards on `if (document.data) {` and routes both engine calls through `sheetDocument.data.system.*`;
the `item` prop and typedef are deleted. Template unchanged.

- [ ] **Step 12: Ability**

`CharacterSheetAbility.svelte` — drop `item` prop; DELETE the `reactiveItem()` helper and its long
rationale comment (the embedded bridge makes it obsolete — context reads re-resolve through the actor
subscription by construction); every `reactiveItem()?.system.X` template read becomes
`document.data?.system.X`; prop passes drop as in Step 6.

- [ ] **Step 13: Delete the two dead components**

```powershell
git rm src/document/types/actor/types/character/sheet/items/CharacterSheetItemTradition.svelte src/document/types/actor/types/character/sheet/items/CharacterSheetItemFooter.svelte
```

(Zero consumers, grep-proven at plan time — re-verify before deleting:
`git grep -n "ItemTradition\|ItemFooter" -- src` must return only the two files themselves.)

- [ ] **Step 14: Drop the Stage-1 temporary shell prop**

In `CharacterSheetEffect.svelte`: `<CharacterSheetItem item={document.data} bind:isExpanded>` →
`<CharacterSheetItem bind:isExpanded>`.

- [ ] **Step 15: Grep gates (the task's own definition of converted)**

Run: `git grep -n "items.get(item._id)\|items.get(itemId)" -- src`
Expected: ZERO hits.
Run: `git grep -nE "\bitem = undefined|\bitemId = undefined" -- src/document/types/actor/types/character/sheet/items`
Expected: ZERO hits (no live-doc props left in the row subtrees).
Run: `git grep -n "document.data.items.get" -- src/document/types/actor/types/character/sheet/items`
Expected: hits ONLY in `CharacterSheetMultiItemList.svelte` and `CharacterSheetItemList.svelte`
(the sanctioned list-script drag handlers).

- [ ] **Step 16: Verify Stage 2**

Run: `npm run build`
Expected: clean.
Run: `npm test`
Expected: all green — pay attention to `CharacterSheetWeaponAttack.test.js` and `AttackTags.test.js`
(their injected context shape is unchanged by this task; if either fails, the conversion broke a
contract, not the test).
Run (user-gated): `npm run test:e2e -- reactive-weapon reactive-armor-shield reactive-spell reactive-ability reactive-inventory-basic reactive-expanded-toggle attack-tags checks-dialog item-cards interaction-dialogs filtered-list-checks spells-filter localization`
Expected: all green — the existing suite is the parity lock for the item family.

- [ ] **Step 17: Commit**

```powershell
git add src/document/types/actor/types/character/sheet/items
git commit -m "refactor(character-sheet): item rows read the embedded item via list-level EmbeddedDocumentProvider"
```

(`git add` of the `items/` directory is acceptable here — every file in it was deliberately touched or
deleted this task; nothing outside `src/document/types/actor/types/character/sheet/items/` changed except
deletions already staged by `git rm`.)

---

### Task 4: Stage 2 e2e — per-type functional sweep

**Files:**
- Create: `tests/e2e/embedded-context-items.spec.js`

**Coverage note (honest accounting):** cross-sheet reactivity for weapon / armor+shield / spell / ability
/ effect rows and expand-state behavior are ALREADY locked by the `reactive-*` family (kept green in Task
3 Step 16) — do not duplicate them. This spec adds what the suite lacks: a per-type BUTTON/functional
sweep and an API-edit reactivity probe for the two types without a dedicated reactive spec (equipment,
commodity).

- [ ] **Step 1: Write the spec**

Table-driven over the seven item types. Shared fixture seeds one actor with one item per type
(`createEmbeddedDocuments('Item', [{ name, type }, …])`, weapon equipped, each item given one check via
its `system.check` array where the type supports it — weapon/armor/shield/equipment/ability/commodity
checks, spell casting check is intrinsic). Set `game.settings.set('titan', 'getCheckOptions', false)` in
`beforeAll` and restore in `afterAll`. Tab routing: weapon/armor/shield/equipment/commodity → Inventory;
ability → Abilities; spell → Spells.

Per-type cases (one `test` per type, asserting in sequence):

1. **Row renders + expander:** the row `[data-item-id]` for the seeded item is visible; click the expand
   button (`.header .label .button button`); the expandable content mounts.
2. **API-edit reactivity probe:** update one type-distinctive field through the live item
   (`item.update({ system: { … } })` — rarity for weapon/armor/shield/equipment, quantity for commodity,
   tradition for spell, xpCost for ability) and assert the expanded row's rendered value updates in place.
3. **Send-to-chat:** click the row's send-to-chat button; `expect.poll` the newest message;
   `message.type` equals the item's type (the item-card subtypes shipped in chat-subtypes Phase 2).
4. **Edit button:** click; assert a `.titan-document-sheet` application for the item mounts (detect via
   `foundry.applications.instances` — NOT `ui.windows`); close it.
5. **Roll button:** weapon → condensed attack button posts `type === 'attackCheck'`; spell → condensed
   casting button posts `type === 'castingCheck'`; the others → the expanded row's check button posts
   `type === 'itemCheck'`.
6. **Equip toggles (where applicable):** weapon/equipment → click equip, `expect.poll` the item's
   `system.equipped` flips; armor/shield → `expect.poll` the ACTOR's `system.equipped.armor|shield`
   becomes the item id.
7. **Delete confirm flow (one representative type — weapon):** with `confirmDeletingItems` ON, delete
   mounts the confirm dialog, cancel preserves, confirm deletes (selectors per
   `interaction-dialogs.spec.js`); restore the setting.

- [ ] **Step 2: Build, then run against the launched world**

Run: `npm run build`, then `npm run test:e2e -- embedded-context-items`
Expected: 7 type cases + the delete case green.

- [ ] **Step 3: Commit**

```powershell
git add tests/e2e/embedded-context-items.spec.js
git commit -m "test(e2e): per-type embedded-context functional sweep for character-sheet item rows"
```

---

### Task 5: Stage 3 — shared `CheckTags` component + consumers

**Files:**
- Create: `tests/unit/CheckTags.test.js`
- Create: `src/document/svelte-components/check/CheckTags.svelte` (new `check/` directory)
- Modify: `src/document/types/item/sheet/check/ItemSheetSidebarCheck.svelte`
- Modify: `…/sheet/items/CharacterSheetItemCheck.svelte`
- Modify: `…/sheet/items/effect/CharacterSheetEffectCheck.svelte`

**Intrinsic-field provenance (verified at plan time, `CharacterDataModel.js:3438-3476` + `:3620-3676`):**
`difficulty`/`complexity`/`resolveCost`/`resistanceCheck`/`opposedCheck` reach the character sheet's
`checkParameters` VERBATIM from the check config; only `attribute` can differ (config `'default'` is
actor-resolved to the skill's default attribute in `_initializeAttributeBasedCheck`). `CheckTags`
therefore reads the config from the `'document'` context and takes ONE optional `attribute` override
prop, which the character-sheet consumers pass from `checkParameters` — exact value parity on every
surface.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/CheckTags.test.js`:

```js
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CheckTags from '~/document/svelte-components/check/CheckTags.svelte';

/**
 * Builds a stub document bridge exposing one check at `data.system.check[0]`, mirroring the shape both
 * item and effect documents share.
 * @param {object} [checkOverrides] - Field overrides merged onto the default check.
 * @returns {object} The stub bridge for the 'document' context.
 */
function makeBridge(checkOverrides = {}) {
   /** @type {object} The default intrinsic check config used across the cases. */
   const check = {
      label: 'Test Check',
      attribute: 'body',
      skill: 'athletics',
      difficulty: 4,
      complexity: 2,
      resolveCost: 0,
      resistanceCheck: 'none',
      opposedCheck: {
         enabled: false,
         attribute: 'body',
         skill: 'athletics',
      },
      ...checkOverrides,
   };

   return {
      data: {
         system: {
            check: [check],
         },
      },
   };
}

describe('CheckTags', () => {
   beforeEach(() => {
      // localize() routes through game.i18n; identity-stub it for unit renders.
      globalThis.game = {
         i18n: {
            localize: (key) => key,
         },
      };
   });

   it('renders the attribute check tag from the config', () => {
      render(CheckTags, {
         props: { idx: 0 },
         context: new Map([['document', makeBridge()]]),
      });

      expect(screen.getByTestId('check-tags-attribute')).toBeTruthy();
      expect(screen.queryByTestId('check-tags-resolve-cost')).toBeNull();
      expect(screen.queryByTestId('check-tags-resisted-by')).toBeNull();
      expect(screen.queryByTestId('check-tags-opposed')).toBeNull();
   });

   it('renders resolve cost, resisted-by, and opposed tags when configured', () => {
      render(CheckTags, {
         props: { idx: 0 },
         context: new Map([['document', makeBridge({
            resolveCost: 2,
            resistanceCheck: 'reflexes',
            opposedCheck: {
               enabled: true,
               attribute: 'mind',
               skill: 'perception',
            },
         })]]),
      });

      expect(screen.getByTestId('check-tags-resolve-cost').querySelector('.value').textContent).toBe('2');
      expect(screen.getByTestId('check-tags-resisted-by')).toBeTruthy();
      expect(screen.getByTestId('check-tags-opposed')).toBeTruthy();
   });

   it('prefers the actor-resolved attribute override over the config attribute', () => {
      render(CheckTags, {
         props: {
            idx: 0,
            attribute: 'mind',
         },
         context: new Map([['document', makeBridge({ attribute: 'default' })]]),
      });

      /** @type {string} The rendered attribute tag text. */
      const text = screen.getByTestId('check-tags-attribute').textContent;
      expect(text).toContain('mind');
      expect(text).not.toContain('default');
   });

   it('renders nothing for a missing check index', () => {
      const { container } = render(CheckTags, {
         props: { idx: 7 },
         context: new Map([['document', makeBridge()]]),
      });
      expect(container.querySelector('.check-tags')).toBeNull();
   });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- CheckTags`
Expected: FAIL — cannot resolve `~/document/svelte-components/check/CheckTags.svelte`.

- [ ] **Step 3: Implement the component**

Create `src/document/svelte-components/check/CheckTags.svelte`:

```svelte
<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';
   import ResistedByTag from '~/helpers/svelte-components/tag/ResistedByTag.svelte';
   import OpposedCheckTag from '~/helpers/svelte-components/tag/OpposedCheckTag.svelte';
   import { SPEND_RESOLVE_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} CheckTagsProps
    * @property {number} [idx] - The index of the check in the current document's `system.check` array.
    * @property {string} [attribute] - Optional actor-resolved attribute overriding the config attribute.
    */

   /** @type {CheckTagsProps} */
   const { idx = undefined, attribute = undefined } = $props();

   /** @type {object} The nearest document bridge (item, effect, or embedded document via a provider). */
   const document = getContext('document');

   /** @type {object|undefined} The current check config, re-read reactively through the document bridge. */
   const check = $derived(document.data?.system.check[idx]);
</script>

{#if check}
   <div class="check-tags">
      <!--Attribute, Skill, Difficulty, and Complexity-->
      <div class="stat">
         <AttributeCheckTag
            attribute={attribute ?? check.attribute}
            complexity={check.complexity}
            difficulty={check.difficulty}
            skill={check.skill}
            testId={'check-tags-attribute'}
         />
      </div>

      <!--Resolve Cost-->
      {#if check.resolveCost > 0}
         <div class="stat">
            <IconStatTag
               icon={SPEND_RESOLVE_ICON}
               label={localize('resolveCost')}
               testId={'check-tags-resolve-cost'}
               value={check.resolveCost}
            />
         </div>
      {/if}

      <!--Resistance Check-->
      {#if check.resistanceCheck !== 'none'}
         <div class="stat">
            <ResistedByTag
               resistance={check.resistanceCheck}
               testId={'check-tags-resisted-by'}
            />
         </div>
      {/if}

      <!--Opposed Check-->
      {#if check.opposedCheck.enabled}
         <div class="stat">
            <OpposedCheckTag
               attribute={check.opposedCheck.attribute}
               skill={check.opposedCheck.skill}
               testId={'check-tags-opposed'}
            />
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   .check-tags {
      @include flex-row;
      @include flex-group-center;
      @include font-size-small;

      flex-wrap: wrap;

      .stat {
         @include tag-container-child-margin;
      }
   }
</style>
```

(`AttributeCheckTag`, `ResistedByTag`, and `OpposedCheckTag` all already accept `testId` — verified at
plan time. `IconStatTag` does too, per `AttackTags.svelte`.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- CheckTags`
Expected: PASS (4 tests).

- [ ] **Step 5: Consumer — `CharacterSheetItemCheck.svelte`**

Replace the four intrinsic tag blocks in the `.stats` div — the `AttributeCheckTag` stat, the
resolve-cost `IconStatTag` stat, the `ResistedByTag` stat, and the `OpposedCheckTag` stat — with one
leading `CheckTags` mount, keeping the dice/training/expertise stats:

```svelte
   <div class="stats">
      <!--Intrinsic check tags (shared component; attribute carries the actor-resolved value)-->
      <CheckTags
         attribute={checkParameters.attribute}
         idx={checkIdx}
      />

      <!--Dice-->
      <div class="stat">
         <IconStatTag
            icon={DICE_ICON}
            label={localize('dice')}
            value={checkParameters.totalDice}
         />
      </div>

      <!--Training-->
      {#if checkParameters.totalTrainingDice}
         <div class="stat">
            <IconStatTag
               label={localize('training')}
               value={checkParameters.totalTrainingDice}
               icon={TRAINING_ICON}
            />
         </div>
      {/if}

      <!--Expertise-->
      {#if checkParameters.totalExpertise}
         <div class="stat">
            <IconStatTag
               label={localize('expertise')}
               value={checkParameters.totalExpertise}
               icon={EXPERTISE_ICON}
            />
         </div>
      {/if}
   </div>
```

Imports: add `CheckTags` (`~/document/svelte-components/check/CheckTags.svelte`); remove the now-unused
`AttributeCheckTag`, `OpposedCheckTag`, `ResistedByTag`, and `SPEND_RESOLVE_ICON` imports (keep
`SpendResolveButton` — the resolve-spend BUTTON is unchanged). Accepted visual delta (spec Decision 7
family): the intrinsic tags now lead the row, so dice/training/expertise shift after them.

- [ ] **Step 6: Consumer — `CharacterSheetEffectCheck.svelte`**

Identical replacement in its `.stats` div (same four intrinsic tag blocks → leading
`<CheckTags attribute={checkParameters.attribute} idx={checkIdx}/>`, dice/training/expertise kept; same
import adjustments). The Effect HUD inherits this through its reuse of the component — zero HUD edits.

- [ ] **Step 7: Consumer — `ItemSheetSidebarCheck.svelte` (the deliberate sidebar convergence)**

Mirroring the weapon sidebar's `AttackTags` adoption (name header + expander survive; the body becomes
the shared tags):

1. Keep the `.label` block (IconLabel name) — but DELETE the `.rolled-stats` div (its information now
   renders inside `CheckTags`' attribute tag).
2. The `ExpandButton` renders UNCONDITIONALLY (the expanded body always has at least the attribute tag):

```svelte
      <!--Expand Button-->
      <ExpandButton bind:expanded={$appState.sidebar.checks.isExpanded[idx]}/>
```

3. Replace the entire `{#if $appState.sidebar.checks.isExpanded[idx] && (…)}` advanced-details block with:

```svelte
      <!--Check tags (shared component)-->
      {#if $appState.sidebar.checks.isExpanded[idx]}
         <div class="stats" transition:slide|local>
            <CheckTags {idx}/>
         </div>
      {/if}
```

4. Imports: add `CheckTags`; remove the now-unused `ResistanceTag`, `StatTag`, `AttributeCheckTag`, and
   `localize` imports (keep `IconLabel`, `ExpandButton`, `slide`, `DICE_ICON`).
5. Styles: delete the dead `.rolled-stats` and `.advanced-details` rules; add:

```scss
      .stats {
         @include border-bottom;
         @include flex-row;
         @include flex-group-center;
         @include padding-standard;

         width: 100%;
      }
```

Accepted visual deltas (spec Decision 7): the at-a-glance "Attribute (Skill) D:C" text line moves into
the expanded tag row; advanced details render as tags instead of a labeled column; the expander is
always present.

- [ ] **Step 8: Verify**

Run: `npm run build` then `npm test`
Expected: clean build; all unit suites green (177 baseline + 4 new).
Run (user-gated): `npm run test:e2e -- embedded-context-effects embedded-context-items checks-dialog effect-checks localization`
Expected: green (the item-sheet sidebar change is exercised by `localization` and the item-sheet renders
inside the other specs; full parity lock lands in Task 6).

- [ ] **Step 9: Commit**

```powershell
git add src/document/svelte-components/check/CheckTags.svelte tests/unit/CheckTags.test.js src/document/types/item/sheet/check/ItemSheetSidebarCheck.svelte src/document/types/actor/types/character/sheet/items/CharacterSheetItemCheck.svelte src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectCheck.svelte
git commit -m "feat(check): shared CheckTags intrinsic display across item sheet, character sheet, and effect checks"
```

---

### Task 6: Stage 3 e2e — cross-surface check-tag parity

**Files:**
- Create: `tests/e2e/embedded-context-check-parity.spec.js`

**Model:** the `attack-tags.spec.js` parity structure (same component, multiple surfaces, matching
testIds).

- [ ] **Step 1: Write the spec**

Fixture: one actor; one equipment item whose `system.check[0]` is seeded with the full intrinsic set
(`resolveCost: 2`, `resistanceCheck: 'reflexes'`, `opposedCheck: { enabled: true, attribute: 'mind',
skill: 'perception' }`); one `effect`-subtype AE with the same check config; a controlled token (for the
HUD case). Cases:

1. **Item check parity (sidebar ↔ character sheet):** open the equipment item sheet, expand the sidebar
   check; capture the four `check-tags-*` testId values. Open the character sheet Inventory tab, expand
   the equipment row; assert the SAME four testIds render with the SAME text values.
2. **Effect check parity (row ↔ HUD):** open the Effects tab, expand the effect row; capture its
   `check-tags-*` values; open the Effect HUD row for the same effect; assert identical values.
3. **Roll-from-character-sheet (functionality criterion 4b):** with `getCheckOptions` false, click the
   character-sheet equipment check's roll button; `expect.poll` the newest message;
   `message.type === 'itemCheck'` and the message renders a non-empty card. Restore the setting.

- [ ] **Step 2: Build, then run against the launched world**

Run: `npm run build`, then `npm run test:e2e -- embedded-context-check-parity`
Expected: 3 cases green.

- [ ] **Step 3: Commit**

```powershell
git add tests/e2e/embedded-context-check-parity.spec.js
git commit -m "test(e2e): CheckTags cross-surface parity and roll-from-sheet coverage"
```

---

### Task 7: Docs, skill update, TODO closure, full verification

**Files:**
- Modify: `.claude/skills/titan-codebase/references/abstractions.md`
- Modify: `.claude/skills/titan-codebase/references/data-flow.md`
- Modify: `.claude/skills/titan-codebase/references/conventions.md`
- Modify: `docs/TODO.md`

- [ ] **Step 1: Update the titan-codebase skill (current-state wording)**

- `abstractions.md`: `CheckTags.svelte` (`src/document/svelte-components/check/`) — intrinsic check
  display from the `'document'` context with the optional actor-resolved `attribute` override; consumers
  = item-sheet sidebar check, character-sheet item check, character-sheet effect check (and the Effect
  HUD via reuse). Note the two deleted dead components.
- `data-flow.md`: the character sheet's item/effect rows and the Effect HUD rows now resolve their
  embedded document through list-level `EmbeddedDocumentProvider` wraps (`CharacterSheetMultiItemList`,
  `CharacterSheetItemList`, `CharacterSheetEffectList`, `EffectHudSection`); `EffectHudShell` sets
  `'sheetDocument'` alongside `'document'`.
- `conventions.md`: update the embedded-document convention — inside a row subtree `'document'` IS the
  embedded document (R1-R7 summarized: display via `data?.system.*`, methods via `.doc`, actor calls via
  `'sheetDocument'`, owner gates on the nearest `'document'`, no live-doc props); list-script code
  (sort/filter/drag) stays on the actor bridge; the keying rule now has four wrap sites.

- [ ] **Step 2: Update `docs/TODO.md`**

- DELETE entries **#21** and **#22** (shipped by this plan).
- Update **#20**'s text: the provider now wraps every weapon row at list level, so the inline-editing
  follow-up needs only the `WeaponSheetAttackSettings` mount + write-path verification.

- [ ] **Step 3: Full verification**

Run: `npm test`
Expected: all unit suites green (177 baseline + 4 CheckTags).
Run: `npm run build`
Expected: clean, probe-free (`grep` the bundle for `titanProbe` if in doubt).
Run (user-gated, world launched, NO concurrent build; full run ~15 min): `npm run test:e2e`
Expected: 386 baseline + the three new spec files green.

- [ ] **Step 4: Commit**

```powershell
git add .claude/skills/titan-codebase/references/abstractions.md .claude/skills/titan-codebase/references/data-flow.md .claude/skills/titan-codebase/references/conventions.md docs/TODO.md
git commit -m "docs: embedded-context conversion — skill map, conventions, TODO #21/#22 closed"
```

---

## Definition of done

- [ ] Zero `items.get(item._id)`-pattern reads in `.svelte` files under the character sheet's `items/`
  subtree and `src/ui/effect-hud/` (list-script drag/sort code excepted; grep gates in Task 3 Step 15).
- [ ] Zero live-document props threaded through those subtrees (only `bind:isExpanded`, indices, and
  data values survive).
- [ ] Four provider wrap sites, all id-keyed: `CharacterSheetMultiItemList`, `CharacterSheetItemList`,
  `CharacterSheetEffectList`, `EffectHudSection`; `EffectHudShell` provides `'sheetDocument'`.
- [ ] ONE `CheckTags` renders the intrinsic check tags on the item-sheet sidebar, character-sheet item
  rows, effect rows, and the Effect HUD — e2e-proven value parity.
- [ ] Cross-sheet reactivity and full button functionality e2e-locked per type (criteria 4a/4b).
- [ ] `CharacterSheetItemTradition.svelte` + `CharacterSheetItemFooter.svelte` deleted.
- [ ] Full unit + e2e suites green; build clean and probe-free.
- [ ] titan-codebase skill updated; `docs/TODO.md` #21/#22 deleted, #20 amended.
