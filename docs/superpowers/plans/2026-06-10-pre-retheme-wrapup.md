# Pre-Retheme Wrap-Up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `mainline-plan-execution` (per the user's global
> Fable-class rule, which supersedes superpowers:subagent-driven-development /
> superpowers:executing-plans for execute/review phases). Tasks run mainline in this session with an
> inline enumerative spec-compliance check per task and ONE dispatched fresh-context review per
> batch branch. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear the small-item backlog (TODOs #12, #13, #16, #17, #18, #19, #24, #25 + open bugs
#1, #2, #3, #5, #6, #7, #8) in four risk-ordered batches so the retheme starts from a clean,
fully-verified `main`.

**Architecture:** Four serial branches merged to `main` (housekeeping/bugs → unit harness → e2e
fixtures → component convergence), targeted verification per batch, ONE full e2e + unit gate at the
end. Component convergence repeats the proven CheckTags/AttackTags pattern: shared components read
the nearest `'document'` Svelte context at parity `system.*` paths, working identically on sheet
rows (embedded bridge) and chat cards (message-snapshot bridge).

**Tech Stack:** Foundry v14, pure Svelte 5 (runes), Vite 8, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-10-pre-retheme-wrapup-design.md`

---

## Standing constraints (apply to every task)

- Code style per `.claude/CLAUDE.md`: 120-char wrap, typed+commented variables, multi-line `{}`,
  multi-line Svelte components with `>`/`/>` on a new line, no `:global` styles.
- NEVER stage `packs/**` (live DB). NEVER run `npm run build` concurrently with an e2e run.
- E2E needs the world launched by the user and a current `dist/` (rebuild before an e2e session
  after src changes). No fixed sleeps — only auto-retrying waits (`titanWait`, `expect.poll`).
- Commits: small, per-task, message style `fix:`/`refactor:`/`feat:`/`test:`/`docs:`.
- Per-task inline compliance check; one dispatched fresh-context review per batch before merge.
- Sub-skills for execution context: `titan-codebase`, `foundry-svelte`, `svelte-5` (loaded).

---

# Batch 1 — housekeeping & bug fixes (`chore/pre-retheme-housekeeping`)

### Task 1: Create the batch branch

- [ ] **Step 1:** `git checkout -b chore/pre-retheme-housekeeping` (from up-to-date `main`).

### Task 2: TODO #17 — lang TYPES housekeeping

**Files:**
- Modify: `lang/en.json:910-924`

- [ ] **Step 1: Remove the stale Item label and add the ActiveEffect map**

In `TYPES.Item` (line 915-924), delete the line `"effect": "Effect",` (line 919). After the
`"Actor"` map's closing brace (line 914), insert:

```json
      "ActiveEffect": {
         "condition": "Condition",
         "effect": "Effect"
      },
```

- [ ] **Step 2: Verify no reader of the removed key remains**

Run: `rg "TYPES\.Item\.effect" src lang` → expected: no matches.
Run: `npm run build` → expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add lang/en.json
git commit -m "fix: remove stale TYPES.Item.effect; add TYPES.ActiveEffect labels (TODO #17)"
```

### Task 3: Bug #8 — component hooks iterate pairs, never run

**Files:**
- Modify: `src/document/data-model/TitanDataModel.js:108,153`

- [ ] **Step 1: Fix both iterations**

Line 108: `for (const component of Object.entries(this._prototypeComponents)) {`
→ `for (const component of Object.values(this._prototypeComponents)) {`

Line 153: `for (const component of Object.entries(this.components)) {`
→ `for (const component of Object.values(this.components)) {`

(No dedicated unit test: no registered component defines either hook today — the path is dead until
one does; the frozen schema-equivalence goldens and full unit suite gate regressions.)

- [ ] **Step 2: Run unit suite**

Run: `npm run test:unit` → expected: all green.

- [ ] **Step 3: Commit**

```bash
git add src/document/data-model/TitanDataModel.js
git commit -m "fix: component prepare/migrate hooks iterate Object.values, not entries pairs (bug #8)"
```

### Task 4: Bug #3 — itemCheck `resistanceCheck` shape default `''` → `'none'`

**Files:**
- Modify: `src/check/types/item-check/ItemCheckParameters.js:43,53`
- Modify: `tests/unit/CheckChatMessageSchemaEquivalence.test.js:582`

- [ ] **Step 1: Change the shape default**

Line 53: `resistanceCheck: '',` → `resistanceCheck: 'none',`. Update the doc comment (line 43) to
name both factory constants: `The factory constants \`damageReducedBy: 'none'\` and
\`resistanceCheck: 'none'\` are kept at their canonical default values.`

- [ ] **Step 2: Update the golden**

`tests/unit/CheckChatMessageSchemaEquivalence.test.js:582`:
`resistanceCheck: stringField(''),` → `resistanceCheck: stringField('none'),`

- [ ] **Step 3: Run unit suite** — `npm run test:unit` → green (golden matches the new shape).

- [ ] **Step 4: Commit**

```bash
git add src/check/types/item-check/ItemCheckParameters.js tests/unit/CheckChatMessageSchemaEquivalence.test.js
git commit -m "fix: itemCheck resistanceCheck shape default 'none' matches template + guards (bug #3)"
```

### Task 5: Bug #5 — `addAttack` dead/mis-targeted sheet notification

**Files:**
- Modify: `src/document/types/item/types/weapon/WeaponDataModel.js:163-167`

- [ ] **Step 1: Guard on the local and dispatch the attack-expansion handler**

```js
         // Notify the sheet of the added attack.
         const sheet = this.parent._sheet;
         if (sheet) {
            sheet.addAttack();
         }
```

(Mirrors the correct sibling `deleteAttack` at lines 182-186. `WeaponSheet.addAttack()` is the
attack-expansion handler — `WeaponSheet.js:51` → `WeaponSheetState.addAttack`.)

- [ ] **Step 2: Run unit suite** — `npm run test:unit` → green.

- [ ] **Step 3: Commit**

```bash
git add src/document/types/item/types/weapon/WeaponDataModel.js
git commit -m "fix: addAttack notifies the sheet so a new attack mounts expanded (bug #5)"
```

### Task 6: Bug #2 — attack chat header `attackName` never set

**Files:**
- Modify: `src/document/types/actor/types/character/CharacterDataModel.js:2786-2793`
- Modify: `tests/e2e/checks-integration.spec.js` (new test after the CHECK_CASES loop)

- [ ] **Step 1: Set attackName from the attack data**

In `getAttackCheckParameters`, in the "Cache the item and attack stats" block, after
`parameters.attackNotes = itemRollData.attackNotes;` (line 2791) add:

```js
      parameters.attackName = attackData.label;
```

(`label` is the attack's display name — `createWeaponAttackTemplate()` defaults it to
`localize('attack')`, and `CharacterSheetWeaponAttack.svelte:143` renders the same field. No golden
change: the shape default stays `''`.)

- [ ] **Step 2: Add the e2e assertion**

In `tests/e2e/checks-integration.spec.js`, inside the `test.describe` block after the
`for (const checkCase of CHECK_CASES)` loop, add:

```js
   test('attack check carries the attack label as attackName', async () => {
      // Roll an attack check and read both the fixture's attack label and the stored parameter.
      /** @type {{expectedLabel: string, attackName: string, messageId: string}} */
      const result = await page.evaluate(async () => {
         const actor = game.actors.getName('E2E Roller');
         const weapon = actor.items.find((item) => item.type === 'weapon');
         const before = game.messages.size;
         await actor.system.rollAttackCheck({
            itemId: weapon.id,
            attackIdx: 0,
         });
         await globalThis.titanWait(() => game.messages.size > before, { message: 'attack message created' });
         const message = game.messages.contents[game.messages.size - 1];
         return {
            expectedLabel: weapon.system.attack[0].label,
            attackName: message.system.parameters.attackName,
            messageId: message.id,
         };
      });

      // Non-vacuous: the fixture label must be non-empty before the equality proves anything.
      expect(result.expectedLabel, 'fixture attack label is non-empty').not.toBe('');
      expect(result.attackName, 'attackName matches the rolled attack label').toBe(result.expectedLabel);

      // The mounted attack-check header renders the attack name as its sub-label.
      await expect(
         page
            .locator(`.message[data-message-id="${result.messageId}"]`)
            .getByText(result.expectedLabel)
            .first(),
      ).toBeVisible();
   });
```

- [ ] **Step 3: Commit** (e2e runs at the batch gate, Task 9)

```bash
git add src/document/types/actor/types/character/CharacterDataModel.js tests/e2e/checks-integration.spec.js
git commit -m "fix: attack check parameters carry attackName; header sub-label renders (bug #2)"
```

### Task 7: Bug #7 — unguarded `attack` deref in `CharacterSheetWeaponAttack`

**Files:**
- Modify: `src/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttack.svelte`

- [ ] **Step 1: Guard the deriveds**

`getCheckMod` gains an early return:

```js
   function getCheckMod(modifierType) {
      if (!attack) {
         return 0;
      }
      return sheetDocument.data.system.getAttackCheckMod(
```

`trainingDice` (line 78-80) becomes:

```js
   /** @type {number} Total training dice (skill training + training mod), folded in before multiAttack halving. */
   const trainingDice = $derived(attack
      ? sheetDocument.data.system.skill[attack.skill].training.value + getCheckMod('training')
      : 0);
```

`dicePool` and `expertise` `$derived.by` bodies gain a first line:

```js
      if (!attack) {
         return 0;
      }
```

- [ ] **Step 2: Gate the template**

Wrap the entire root in the guard (the mid-frame window between document mutation and row unmount):

```svelte
{#if attack}
   <div class="attack">
      ...existing content unchanged...
   </div>
{/if}
```

- [ ] **Step 3: Verify** — `npm run build` clean; `npx eslint .` clean; `npm run test:unit` green.

- [ ] **Step 4: Commit**

```bash
git add src/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttack.svelte
git commit -m "fix: guard the attack derived in CharacterSheetWeaponAttack (bug #7)"
```

### Task 8: Bug #1 — `state_referenced_locally` lint error

**Files:**
- Modify: `src/sidebar/tray/MoveEffectToFolderDialogShell.svelte:21-22`

- [ ] **Step 1: Suppress with rationale** (the `SpellChatAspects.svelte` precedent — `initialValue`
  never changes during the dialog's lifetime; a new dialog is constructed per move request):

```js
   // initialValue is fixed for this dialog's lifetime (a new dialog is constructed per move
   // request), so capturing only the initial prop value is intended.
   // svelte-ignore state_referenced_locally
   /** @type {string} The currently selected destination folder id ('' = pack root). */
   let selectedFolderId = $state(initialValue);
```

- [ ] **Step 2: Verify** — `npx eslint .` → expected: **0 errors** (this was the system's only one).
  `npm run build` → expected: the matching `[vite-plugin-svelte]` warning is gone.

- [ ] **Step 3: Commit**

```bash
git add src/sidebar/tray/MoveEffectToFolderDialogShell.svelte
git commit -m "fix: suppress intended initial-only state capture in MoveEffectToFolderDialogShell (bug #1)"
```

### Task 9: Batch 1 gate — verify, document, review, merge

- [ ] **Step 1:** `npm run build` + `npx eslint .` + `npm run test:unit` — all clean/green.
- [ ] **Step 2:** Rebuild is current; with the world launched, run targeted e2e:
  `npx playwright test tests/e2e/checks-integration.spec.js` → green (incl. the new attackName test).
- [ ] **Step 3: Docs.** `docs/OPEN_BUGS.md`: move #1, #2, #3, #5, #7, #8 to `docs/CLOSED_BUGS.md`
  with one-line resolution + commit refs (bug #6 STAYS — fixed in batch 3). `docs/TODO.md`: delete
  #17. Commit `docs: close bugs 1/2/3/5/7/8; complete TODO #17`.
- [ ] **Step 4:** Dispatch the batch review (fresh-context, whole branch diff vs main, per
  mainline-plan-execution). Fix findings inline.
- [ ] **Step 5:** `git checkout main && git merge chore/pre-retheme-housekeeping && git push`.
  Delete the branch after confirming with the user at session end.

---

# Batch 2 — shared fingerprint harness (`chore/shared-fingerprint-harness`)

### Task 10: Extract the shared schema-fingerprint helper (TODO #16)

**Files:**
- Create: `tests/unit/helpers/schemaFingerprint.js`
- Reference sources: `tests/unit/CheckChatMessageSchemaEquivalence.test.js:21-341` (canonical copy),
  `ItemDataModelSchemaEquivalence.test.js`, `ReportChatMessageSchemaEquivalence.test.js`,
  `EffectSchemaEquivalence.test.js`

- [ ] **Step 1: Diff the four copies first.** Compare each suite's mock classes, `kindOf`,
  `serializeInitial`, `sortObjectKeys`, `fingerprint`, `fingerprintSchema`, and golden builders
  against the Check suite's. Expected: semantically identical (comment drift allowed). **If any copy
  differs semantically, STOP and surface to the user before extracting** (a frozen golden gate may
  depend on the difference).

- [ ] **Step 2: Create the helper** — `tests/unit/helpers/schemaFingerprint.js` (NOT `*.test.js`, so
  vitest does not collect it). Content: the Check suite's blocks verbatim (lines 21-170 mock classes
  + machinery, 172-184 `fingerprintSchema`, 241-341 golden builders), each declaration `export`ed,
  plus install/restore helpers replacing the suites' inline `beforeAll`/`afterAll` bodies:

```js
/**
 * Installs the Foundry stand-ins (TypeDataModel, data fields, i18n, ApplicationV2) the schema
 * suites need before dynamically importing real data models. Call from a suite's beforeAll.
 * @returns {void}
 */
export function installSchemaMocks() {
   globalThis.game = {
      i18n: {
         localize: (key) => key,
      },
   };
   globalThis.foundry.abstract.TypeDataModel = MockTypeDataModel;
   globalThis.foundry.data = {
      fields: {
         StringField: MockStringField,
         NumberField: MockNumberField,
         BooleanField: MockBooleanField,
         ObjectField: MockObjectField,
         ArrayField: MockArrayField,
         SchemaField: MockSchemaField,
      },
   };
   globalThis.foundry.applications = { api: { ApplicationV2: class {} } };
}

/**
 * Removes the stand-ins installed by installSchemaMocks so later suites keep the shared minimal
 * mock. Call from a suite's afterAll.
 * @returns {void}
 */
export function restoreSchemaMocks() {
   delete globalThis.foundry.abstract.TypeDataModel;
   delete globalThis.foundry.data;
   delete globalThis.foundry.applications;
   delete globalThis.game;
}
```

Exports: `MockField`, `MockStringField`, `MockNumberField`, `MockBooleanField`, `MockObjectField`,
`MockArrayField`, `MockSchemaField`, `MockTypeDataModel`, `kindOf`, `serializeInitial`,
`sortObjectKeys`, `fingerprint`, `fingerprintSchema`, `installSchemaMocks`, `restoreSchemaMocks`,
`objectElement`, `emptyObjectArray`, `numberField`, `integerField`, `stringField`, `booleanField`,
`schemaField`. (If step 1 found a builder existing in only one suite with a unique shape, it stays
local to that suite.)

- [ ] **Step 3: Refactor the four suites one at a time** (Check → Item → Report → Effect): delete
  the local copies, import the needed names from `./helpers/schemaFingerprint.js`, replace the
  `beforeAll` stand-in block with `installSchemaMocks()` (keeping the suite's dynamic imports) and
  the `afterAll` body with `restoreSchemaMocks()`. **Golden masters stay inline and untouched.**
  Run `npm run test:unit` after EACH suite — green proves byte-identical fingerprints.

- [ ] **Step 4: Commit** (one commit per refactored suite, plus one for the helper)

```bash
git add tests/unit/helpers/schemaFingerprint.js
git commit -m "refactor: shared schema-fingerprint harness helper (TODO #16)"
# then per suite:
git commit -m "refactor: <Suite> uses the shared fingerprint harness (TODO #16)"
```

### Task 11: Batch 2 gate

- [ ] **Step 1:** `npm run test:unit` full → green; `npx eslint .` clean.
- [ ] **Step 2: Docs.** `docs/TODO.md`: delete #16. Commit.
- [ ] **Step 3:** Dispatch batch review; fix findings; merge to `main`; push.

---

# Batch 3 — e2e fixture hygiene (`chore/e2e-fixture-hygiene`)

### Task 12: Promote the shared fixture helpers into `tests/e2e/world.js` (TODO #24 + #18 + #19)

**Files:**
- Modify: `tests/e2e/world.js` (append; existing exports unchanged)

The hardened sources are `tests/e2e/embedded-context-check-parity.spec.js:102-121` (`buildCheck`),
`:196-215` (`deleteFixtureActor`), `:293-336` (`controlFixtureActorToken`), `:416-423`
(`newestMessageType`). The in-page `titanWait` global (installed by `tests/e2e/poll.js` via the
login fixture) THROWS on exhaustion with the supplied message — this is the #19 model.

- [ ] **Step 1: Append to `tests/e2e/world.js`:**

```js
/**
 * Builds a COMPLETE item/effect check entry mirroring createItemCheckTemplate()
 * (src/check/types/item-check/ItemCheckTemplate.js). Node-side data factory: build the object here
 * and pass it INTO page.evaluate as data (the template module is not importable in the browser
 * context, and omitting fields like opposedCheck makes getItemCheckParameters throw).
 * @param {string} label - The check's display label (rendered on its ItemCheckButton).
 * @param {string} uuid - A unique id for the check entry.
 * @param {object} [overrides] - Field overrides merged over the complete default entry.
 * @returns {object} The complete check entry.
 */
export function buildCheck(label, uuid, overrides = {}) {
   return {
      attribute: 'body',
      complexity: 1,
      damageReducedBy: 'none',
      difficulty: 4,
      initialValue: 1,
      isDamage: false,
      isHealing: false,
      label: label,
      opposedCheck: {
         attribute: 'mind',
         enabled: true,
         skill: 'perception',
      },
      resistanceCheck: 'reflexes',
      resolveCost: 2,
      scaling: true,
      skill: 'arcana',
      uuid: uuid,
      ...overrides,
   };
}

/**
 * Deletes a fixture actor by name (when present) along with any token it left on the active scene
 * (deleting an actor does NOT delete its placed tokens). Serves both the stale sweep at seed time
 * and final afterAll cleanup.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @param {string} actorName - The fixture actor's name.
 * @returns {Promise<void>} Resolves once the actor and its tokens are removed from the world.
 */
export async function deleteFixtureActor(page, actorName) {
   await page.evaluate(async (name) => {
      const actor = game.actors.getName(name);
      if (!actor) {
         return;
      }

      // Remove the actor's tokens from the active scene before deleting the actor itself.
      const scene = game.scenes.active;
      if (scene) {
         const tokenIds = scene.tokens
            .filter((token) => token.actorId === actor.id)
            .map((token) => token.id);
         if (tokenIds.length > 0) {
            await scene.deleteEmbeddedDocuments('Token', tokenIds);
         }
      }
      await actor.delete();
   }, actorName);
}

/**
 * Deletes every token on every scene whose actor no longer resolves — the orphans left behind by
 * prior runs whose fixtures deleted the actor without deleting its placed tokens. Call once per
 * spec file (beforeAll, after login) in any spec that places fixture tokens.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @returns {Promise<void>} Resolves once all orphaned tokens are deleted.
 */
export async function deleteOrphanedTokens(page) {
   await page.evaluate(async () => {
      for (const scene of game.scenes) {
         const orphanIds = scene.tokens
            .filter((token) => !token.actorId || !game.actors.get(token.actorId))
            .map((token) => token.id);
         if (orphanIds.length > 0) {
            await scene.deleteEmbeddedDocuments('Token', orphanIds);
         }
      }
   });
}

/**
 * Places a token for the named actor on the active scene (creating a fallback scene when none is
 * active), waits until the placeable is DRAWN (throwing with a clear message on exhaustion — a
 * never-drawn placeable must fail here, not at a later, less-diagnostic timeout), controls it, and
 * refreshes the Effect HUD so the GM resolution ladder (first SELECTED token) resolves the actor.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @param {object} options - Control options.
 * @param {string} options.actorName - The fixture actor's name (must already exist).
 * @param {string} options.fallbackSceneName - Name for the fallback scene if none is active.
 * @returns {Promise<string|null>} The created fallback scene's id for afterAll cleanup, or null.
 */
export async function controlFixtureActorToken(page, { actorName, fallbackSceneName }) {
   return page.evaluate(async ({ name, sceneName }) => {
      const actor = game.actors.getName(name);

      // Reuse the active scene; fall back to creating one and report its id for cleanup.
      /** @type {Scene|null} The scene hosting the fixture token. */
      let scene = game.scenes.active;
      /** @type {string|null} The created fallback scene's id, when no scene was active. */
      let fallbackId = null;
      if (!scene) {
         scene = await Scene.create({
            name: sceneName,
            active: true,
         });
         fallbackId = scene.id;
      }

      const [tokenDoc] = await scene.createEmbeddedDocuments('Token', [
         await actor.getTokenDocument({
            x: 100,
            y: 100,
         }),
      ]);

      // titanWait THROWS on exhaustion — a never-drawn placeable fails loudly right here.
      await titanWait(() => !!tokenDoc.object, { message: 'token placeable drawn' });
      tokenDoc.object.control({ releaseOthers: true });

      game.titan.effectHud.refresh();
      return fallbackId;
   }, {
      name: actorName,
      sceneName: fallbackSceneName,
   });
}

/**
 * Reads the newest chat message's subtype once a message beyond the given count exists. Returns
 * undefined while no new message has landed so `expect.poll` keeps retrying.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @param {number} before - The world message count snapshotted before the UI trigger.
 * @returns {Promise<string|undefined>} The newest message's subtype, or undefined when none landed.
 */
export function newestMessageType(page, before) {
   return page.evaluate((count) => {
      if (game.messages.size <= count) {
         return undefined;
      }
      return game.messages.contents[game.messages.size - 1]?.type;
   }, before);
}
```

(Execution check: confirm `poll.js`'s `titanWait` is installed on every logged-in page via the
`login` fixture before relying on it inside `controlFixtureActorToken`; the check-parity spec
already calls it inside `page.evaluate`, so this is expected to hold.)

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/world.js
git commit -m "test: promote shared e2e fixture helpers into world.js (TODO #24, #18, #19)"
```

### Task 13: Bug #6 — harden `ensureProbe` against mid-boot injection

**Files:**
- Modify: `tests/e2e/componentProbe.js:23-30`

- [ ] **Step 1: Rewrite `ensureProbe`:**

```js
async function ensureProbe(page) {
   // Wait for the system to finish init before injecting: a mid-boot injection skips the IIFE's
   // immediate-registration path and would strand the current test (OPEN_BUGS #6).
   await page.waitForFunction(() => !!globalThis.game?.titan);

   // Whether the probe API is already registered on this page.
   const present = await page.evaluate(() => !!globalThis.game?.titan?._probe);
   if (!present) {
      await page.addStyleTag({ path: PROBE_STYLES });
      await page.addScriptTag({ path: PROBE_BUNDLE });

      // Block until registration lands, so a ready-hook fallback registration cannot strand the
      // first probe call of the file.
      await page.waitForFunction(() => !!globalThis.game?.titan?._probe);
   }
}
```

- [ ] **Step 2: Commit**

```bash
git add tests/e2e/componentProbe.js
git commit -m "test: ensureProbe waits for system init and probe registration (bug #6)"
```

### Task 14: Retrofit the three token-control specs (TODO #18 + #19)

**Files:**
- Modify: `tests/e2e/effect-hud.spec.js`, `tests/e2e/effect-tray.spec.js`,
  `tests/e2e/effect-chat-card.spec.js`

Recipe (apply to each file):
1. Extend the `./world.js` import with `deleteFixtureActor, deleteOrphanedTokens,
   controlFixtureActorToken` (as used per file).
2. In `beforeAll` after `clearChat(page)`, add `await deleteOrphanedTokens(page);` (one-time sweep
   of prior runs' orphans).
3. Replace every bare stale-actor delete (`const stale = game.actors.getName(name); if (stale)
   { await stale.delete(); }`) with `await deleteFixtureActor(page, name);` (Node-side, before the
   evaluate that creates the actor).
4. Replace every inline 50×50ms `setInterval` canvas poll + `tokenDoc.object?.control(...)` block
   with the shared `controlFixtureActorToken` call (throws on exhaustion — #19).

- [ ] **Step 1: `effect-hud.spec.js`** — rewrite `setupControlledActor` (lines 37-83):

```js
async function setupControlledActor(page, options) {
   // Remove any stale fixture (and its tokens) so the controlled actor is deterministic.
   await deleteFixtureActor(page, options.name);

   // Create the actor, then place + control its token (throws if the placeable never draws).
   await page.evaluate(async (name) => {
      await Actor.create({
         name,
         type: 'player',
      });
   }, options.name);
   await controlFixtureActorToken(page, {
      actorName: options.name,
      fallbackSceneName: 'E2E HUD Scene',
   });

   // Seed the requested effect and condition, then refresh the HUD over the seeded content.
   await page.evaluate(async ({ name, addEffect, addCondition }) => {
      const actor = game.actors.getName(name);
      if (addEffect) {
         await actor.createEmbeddedDocuments('ActiveEffect', [{
            name: 'HUD Test Effect',
            type: 'effect',
            description: '<p>HUD description body.</p>',
         }]);
      }
      if (addCondition) {
         await actor.toggleStatusEffect('stunned');
      }
      game.titan.effectHud.refresh();
   }, options);
}
```

- [ ] **Step 2: `effect-tray.spec.js`** — the 'E2E Tray Target' site (lines ~114-140): stale delete
  → `deleteFixtureActor`; inline token/poll/control block → `controlFixtureActorToken(page,
  { actorName: 'E2E Tray Target', fallbackSceneName: 'E2E Tray Scene' })`. The 'E2E Stash Source'
  site (~305) and any other `getName(...)`-stale actor deletes → `deleteFixtureActor` (grep the file
  for `game.actors.getName` to enumerate; pack-folder fixtures are NOT actors — leave them).
- [ ] **Step 3: `effect-chat-card.spec.js`** — same recipe (grep `setInterval` and
  `game.actors.getName` to enumerate the sites; identical swaps).
- [ ] **Step 4:** With the world launched and dist current:
  `npx playwright test tests/e2e/effect-hud.spec.js tests/e2e/effect-tray.spec.js tests/e2e/effect-chat-card.spec.js`
  → green.
- [ ] **Step 5: Commit**

```bash
git add tests/e2e/effect-hud.spec.js tests/e2e/effect-tray.spec.js tests/e2e/effect-chat-card.spec.js
git commit -m "test: token-control specs use shared fixture helpers; orphan cleanup + throwing polls (TODO #18, #19)"
```

### Task 15: Retrofit the embedded-context family onto the shared helpers (TODO #24)

**Files:**
- Modify: `tests/e2e/embedded-context-check-parity.spec.js`,
  `tests/e2e/embedded-context-effects.spec.js`, `tests/e2e/embedded-context-items.spec.js`

- [ ] **Step 1:** Per file: delete the local `deleteFixtureActor` / `controlFixtureActorToken` /
  `newestMessageType` / in-evaluate `buildCheck` definitions; import the world.js versions; adapt
  call sites — `deleteFixtureActor()` → `deleteFixtureActor(page, ACTOR_NAME)`;
  `controlFixtureActorToken()` → capture `const createdSceneId = await
  controlFixtureActorToken(page, { actorName: ACTOR_NAME, fallbackSceneName: '<existing name>' });`
  preserving each file's `fallbackSceneId` bookkeeping and any spec-local pre/post assertions (e.g.
  check-parity's `hudReady` precondition stays in the spec, before the helper call);
  `newestMessageType(before)` → `newestMessageType(page, before)`. For `buildCheck`: build the check
  entries Node-side and pass them through the evaluate payload, e.g. in check-parity's seed:

```js
      fixtureIds = await page.evaluate(async ({ actorName, itemName, effectName, itemCheck, effectCheck }) => {
         // Seed the fresh player actor, its equipment item, and its effect-subtype Active Effect.
         const actor = await Actor.create({
            name: actorName,
            type: 'player',
         });
         const [item] = await actor.createEmbeddedDocuments('Item', [
            {
               name: itemName,
               type: 'equipment',
               system: {
                  check: [itemCheck],
               },
            },
         ]);
         const [effect] = await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               name: effectName,
               type: 'effect',
               disabled: false,
               system: {
                  check: [effectCheck],
               },
            },
         ]);

         // Default the gating setting off so roll clicks post straight to chat.
         await game.settings.set('titan', 'getCheckOptions', false);

         return {
            itemId: item.id,
            effectId: effect.id,
         };
      }, {
         actorName: ACTOR_NAME,
         itemName: ITEM_NAME,
         effectName: EFFECT_NAME,
         itemCheck: buildCheck(ITEM_CHECK_LABEL, 'e2e-parity-item-check'),
         effectCheck: buildCheck(EFFECT_CHECK_LABEL, 'e2e-parity-effect-check'),
      });
```

  Spec-specific check overrides in the other two files ride `buildCheck`'s `overrides` parameter.
- [ ] **Step 2:** Run the three specs → green.
- [ ] **Step 3: Commit**

```bash
git add tests/e2e/embedded-context-*.spec.js
git commit -m "test: embedded-context family uses the shared world.js fixture helpers (TODO #24)"
```

### Task 16: TODO #13 — `effectsExpiredReport` e2e coverage

**Files:**
- Modify: `tests/e2e/report-cards.spec.js`

- [ ] **Step 1:** Add the import: `import { seedCombatEncounter, teardownCombatEncounter } from
  '../shared/combat.js';`. Update the file-top NOTE comment (lines 20-24): replace the "not covered
  here" sentence with `effectsExpiredReport is covered by the combat-harness case at the end of
  this spec.`
- [ ] **Step 2:** Add the test (end of the file's describe scope). Execution check first: confirm
  the scopes of `autoDecreaseEffectDuration` / `reportEffects` (`src/helpers/Settings/*.js`
  registrations) and use the matching setter (`setWorldSetting` for world scope; a plain
  `game.settings.set` evaluate for client scope), saving and restoring prior values.

```js
   test('effects-expired report renders after an initiative effect expires', async () => {
      // Drive the deep onInitiativeAdvanced expiry path (CharacterDataModel.js ~4944): an
      // initiative-duration effect with remaining 1 at an initiative BETWEEN the two combatants'
      // values is advanced (and expires) on the first nextTurn() from the started state.
      await setWorldSetting(page, 'autoDecreaseEffectDuration', true);
      await setWorldSetting(page, 'reportEffects', true);
      await setWorldSetting(page, 'autoRemoveExpiredEffects', 'enabled');

      /** @type {object|undefined} The seeded encounter's document ids (for teardown). */
      let ids;
      try {
         ids = await page.evaluate(seedCombatEncounter, {
            sceneName: 'E2E Effects Expired Scene',
            effectActor: {
               name: 'E2E Effects Expired Actor',
               type: 'player',
            },
            otherActor: {
               name: 'E2E Effects Expired Other',
               type: 'player',
            },
            effectInitiative: 5,
            otherInitiative: 10,
         });

         /** @type {{messageId: string, messageType: string}} The expiry report's id and subtype. */
         const result = await page.evaluate(async ({ effectActorId, combatId }) => {
            const actor = game.actors.get(effectActorId);
            await actor.createEmbeddedDocuments('ActiveEffect', [{
               name: 'E2E Expiring Effect',
               type: 'effect',
               disabled: false,
               system: {
                  duration: {
                     type: 'initiative',
                     remaining: 1,
                     initiative: 7,
                  },
               },
            }]);

            // Advance from the other combatant (initiative 10) to the effect actor (initiative 5):
            // the effect's initiative 7 lies in (5, 10), so remaining decrements 1 -> 0 = expired.
            await game.combats.get(combatId).nextTurn();
            await titanWait(
               () => game.messages.contents[game.messages.size - 1]?.type === 'effectsExpiredReport',
               { message: 'effectsExpiredReport message created' },
            );
            const message = game.messages.contents[game.messages.size - 1];
            return {
               messageId: message.id,
               messageType: message.type,
            };
         }, ids);

         await expectReportCard(result, 'effectsExpiredReport');
      }
      finally {
         if (ids) {
            await page.evaluate(teardownCombatEncounter, ids);
         }

         // Restore the file's suite-wide posture (beforeAll pins autoRemoveExpiredEffects off).
         await setWorldSetting(page, 'autoRemoveExpiredEffects', 'disabled');
      }
   });
```

  Fallback (locked decision 3): if this proves genuinely flaky after honest effort (≥3 full-file
  runs with diagnosis attempts), replace with a unit-level render smoke of the leaf component, and
  re-log the e2e in `docs/TODO.md` WITH the flake findings.
- [ ] **Step 3:** `npx playwright test tests/e2e/report-cards.spec.js` → green (run twice to probe
  stability).
- [ ] **Step 4: Commit**

```bash
git add tests/e2e/report-cards.spec.js
git commit -m "test: effectsExpiredReport covered via combat-harness initiative expiry (TODO #13)"
```

### Task 17: Batch 3 gate

- [ ] **Step 1:** Run every touched spec file (checks-integration, effect-hud, effect-tray,
  effect-chat-card, embedded-context ×3, report-cards, component-probe.spec.js +
  component-probe-context.spec.js for the ensureProbe change) → green.
- [ ] **Step 2: Docs.** `docs/TODO.md`: delete #13, #18, #19, #24. `docs/OPEN_BUGS.md`: move #6 to
  CLOSED_BUGS. Commit.
- [ ] **Step 3:** Dispatch batch review; fix findings; merge to `main`; push.

---

# Batch 4 — component convergence (`feat/cross-surface-display-convergence`)

Pattern for every component in this batch (the CheckTags/AttackTags proof, third+ instances): the
shared component reads the nearest `'document'` context — the embedded item/effect bridge on sheet
rows, the chat-message bridge on cards (where path parity makes `document.data?.system.*` resolve on
the snapshot) — so NO props carry data, NO schema changes, NO producer changes. SCSS converges on
the chat cards' `tag-container` mixin form. Sheet `testId`s appear on chat cards (e2e selectors must
stay container-scoped — verify each touched spec greps clean for unscoped `getByTestId` on the
affected ids).

### Task 18: Create the branch + CastingCheckTags (TODO #25, #12 increment 2)

**Files:**
- Create: `src/document/svelte-components/check/CastingCheckTags.svelte`
- Modify: `src/document/types/item/types/spell/chat-message/SpellChatMessage.svelte:8,18-26`
- Modify: `src/document/types/actor/types/character/sheet/items/spell/CharacterSheetSpellCastingCheck.svelte`
- Modify: `src/document/types/item/types/spell/sheet/SpellSheetSidebarCastingCheck.svelte:39-79`

- [ ] **Step 1:** `git checkout -b feat/cross-surface-display-convergence`
- [ ] **Step 2: Create the shared component:**

```svelte
<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';
   import {
      DICE_ICON,
      EXPERTISE_ICON,
      TRAINING_ICON,
   } from '~/system/Icons.js';

   /**
    * @typedef {object} CastingCheckTagsProps
    * @property {object} [parameters] - Optional actor-resolved casting-check parameters
    *    (getCastingCheckParameters output). Pass from actor-context consumers to render resolved
    *    values plus dice/training/expertise stats; omit on document consumers (spell sheet, chat
    *    card), which read the spell's castingCheck config through the nearest document context.
    */

   /** @type {CastingCheckTagsProps} */
   const { parameters = undefined } = $props();

   /** @type {object} The nearest document bridge (spell document or chat-message snapshot). */
   const document = getContext('document');

   /** @type {object|undefined} The casting-check display source: resolved parameters or config. */
   const castingCheck = $derived(parameters ?? document.data?.system?.castingCheck);
</script>

{#if castingCheck}
   <div class="casting-check-tags">
      <!--Attribute, Skill, Difficulty, and Complexity-->
      <div class="stat">
         <AttributeCheckTag
            attribute={castingCheck.attribute}
            complexity={castingCheck.complexity}
            difficulty={castingCheck.difficulty}
            skill={castingCheck.skill}
            testId={'casting-check-tags-attribute'}
         />
      </div>

      {#if parameters}
         <!--Dice-->
         <div class="stat">
            <IconStatTag
               icon={DICE_ICON}
               label={localize('dice')}
               testId={'casting-check-tags-dice'}
               value={parameters.totalDice}
            />
         </div>

         <!--Training-->
         {#if parameters.totalTrainingDice}
            <div class="stat">
               <IconStatTag
                  icon={TRAINING_ICON}
                  label={localize('training')}
                  testId={'casting-check-tags-training'}
                  value={parameters.totalTrainingDice}
               />
            </div>
         {/if}

         <!--Expertise-->
         {#if parameters.totalExpertise}
            <div class="stat">
               <IconStatTag
                  icon={EXPERTISE_ICON}
                  label={localize('expertise')}
                  testId={'casting-check-tags-expertise'}
                  value={parameters.totalExpertise}
               />
            </div>
         {/if}
      {/if}
   </div>
{/if}

<style lang="scss">
   .casting-check-tags {
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

- [ ] **Step 3: Chat consumer.** `SpellChatMessage.svelte`: replace the casting-check section's
  `<AttributeCheckTag .../>` (lines 20-25) with `<CastingCheckTags/>`; swap the import (drop
  `AttributeCheckTag`, add `CastingCheckTags`).
- [ ] **Step 4: Character-sheet consumer.** `CharacterSheetSpellCastingCheck.svelte`: keep the
  `checkParameters` derived; replace the entire `.check` markup + styles with:

```svelte
<CastingCheckTags parameters={checkParameters}/>
```

  Drop the now-unused imports (`localize`, `IconStatTag`, `AttributeCheckTag`, icon constants) and
  the `<style>` block. (Display delta: tag row converges from `flex-space-evenly` to the shared
  `flex-group-center`.)
- [ ] **Step 5: Spell-sheet sidebar consumer.** `SpellSheetSidebarCastingCheck.svelte`: replace the
  two hand-built text labels (`.label-normal` / `.label-button` interiors, lines 42-47 and 71-77)
  with `<CastingCheckTags/>` (keeping the expand-button structure and the `{#if aspectsEnabled}`
  branching). **Display delta — CHECKPOINT:** the colored header's text label becomes an
  AttributeCheckTag inside the header. After building, eyeball the spell sheet in the live world; if
  the tag-in-colored-header render is visually wrong, STOP and surface options to the user before
  proceeding (consent rule).
- [ ] **Step 6:** `npm run build` + `npx eslint .` + `npm run test:unit` → clean/green.
- [ ] **Step 7: Commit**

```bash
git add src/document/svelte-components/check/CastingCheckTags.svelte src/document/types/item/types/spell/ src/document/types/actor/types/character/sheet/items/spell/
git commit -m "feat: shared CastingCheckTags across spell chat card, character sheet, and spell sheet (TODO #25)"
```

### Task 19: Shared `ItemStats` (weapon + equipment footers — identical content)

**Files:**
- Create: `src/document/types/item/components/ItemStats.svelte`
- Modify: `src/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeapon.svelte:125-147`
- Modify: `src/document/types/actor/types/character/sheet/items/equipment/CharacterSheetEquipment.svelte:102-124`
- Modify: `src/document/types/item/types/weapon/chat-message/WeaponChatMessage.svelte:7,45`
- Modify: `src/document/types/item/types/equipment/chat-message/EquipmentChatMessage.svelte:6-7,33`
- Delete: `src/document/types/item/types/weapon/chat-message/WeaponChatStats.svelte`,
  `src/document/types/item/types/equipment/chat-message/EquipmentChatStats.svelte`

- [ ] **Step 1: Create `ItemStats.svelte`** (rarity + value + custom traits — the base footer both
  types render byte-identically):

```svelte
<script>
   import { getContext } from 'svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /** @type {object} The nearest document bridge (embedded item or chat-message snapshot). */
   const document = getContext('document');

   /** @type {string} The item's rarity, read reactively through the document bridge. */
   const rarity = $derived(document.data?.system.rarity);

   /** @type {number} The item's gp value, read reactively through the document bridge. */
   const value = $derived(document.data?.system.value);

   /** @type {Array<object>} The item's custom traits, read reactively through the document bridge. */
   const customTrait = $derived(document.data?.system.customTrait ?? []);
</script>

<div class="stats">
   <!--Rarity-->
   <div class="stat">
      <RarityTag {rarity}/>
   </div>

   <!--Value-->
   {#if value}
      <div class="stat">
         <ValueTag {value}/>
      </div>
   {/if}

   <!--Custom Traits-->
   {#each customTrait as trait}
      <div class="stat">
         <Tag tooltip={{ text: trait.description, localize: false }}>
            {trait.name}
         </Tag>
      </div>
   {/each}
</div>

<style lang="scss">
   .stats {
      @include tag-container;
      @include font-size-small;

      width: 100%;
   }
</style>
```

- [ ] **Step 2: Sheet consumers.** In `CharacterSheetWeapon.svelte` and
  `CharacterSheetEquipment.svelte`, replace the footer block

```svelte
   <!--Footer-->
   <div class="section tags small-text">
      ...rarity/value/custom-trait tags...
   </div>
```

with

```svelte
   <!--Footer-->
   <div class="section">
      <ItemStats/>
   </div>
```

  Add the `ItemStats` import; drop now-unused imports (`RarityTag`, `ValueTag`, `Tag`) and the
  now-unused deriveds (`rarity`, `value`, `customTrait`) IF nothing else in the file reads them;
  prune `.tags`/`.small-text` style rules only if no other section in the file uses them.
- [ ] **Step 3: Chat consumers.** `WeaponChatMessage.svelte`: `<WeaponChatStats {item}/>` →
  `<ItemStats/>` (+import swap). Same for `EquipmentChatMessage.svelte`. Delete the two ChatStats
  files.
- [ ] **Step 4:** `npm run build` + `npx eslint .` → clean. Commit:

```bash
git add -A src/document/types/item src/document/types/actor
git commit -m "feat: shared ItemStats footer for weapon + equipment across sheet rows and chat cards (TODO #12)"
```

### Task 20: `AbilityStats`

**Files:**
- Create: `src/document/types/item/types/ability/components/AbilityStats.svelte`
- Modify: `src/document/types/actor/types/character/sheet/items/ability/CharacterSheetAbility.svelte:73-119`
- Modify: `src/document/types/item/types/ability/chat-message/AbilityChatMesssage.svelte:7,33`
- Delete: `src/document/types/item/types/ability/chat-message/AbilityChatStats.svelte`

- [ ] **Step 1: Create `AbilityStats.svelte`:**

```svelte
<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /** @type {object} The nearest document bridge (embedded ability or chat-message snapshot). */
   const document = getContext('document');

   /** @type {string} The ability's rarity, read reactively through the document bridge. */
   const rarity = $derived(document.data?.system.rarity);

   /** @type {boolean} Whether the ability is an Action, read reactively through the document bridge. */
   const action = $derived(document.data?.system.action);

   /** @type {boolean} Whether the ability is a Reaction, read reactively through the document bridge. */
   const reaction = $derived(document.data?.system.reaction);

   /** @type {boolean} Whether the ability is Passive, read reactively through the document bridge. */
   const passive = $derived(document.data?.system.passive);

   /** @type {number} The ability's XP cost, read reactively through the document bridge. */
   const xpCost = $derived(document.data?.system.xpCost);

   /** @type {Array<object>} The ability's custom traits, read reactively through the document bridge. */
   const customTrait = $derived(document.data?.system.customTrait ?? []);
</script>

<div class="stats">
   <!--Rarity-->
   <div class="stat">
      <RarityTag {rarity}/>
   </div>

   <!--Action-->
   {#if action}
      <div class="stat">
         <Tag>{localize('action')}</Tag>
      </div>
   {/if}

   <!--Reaction-->
   {#if reaction}
      <div class="stat">
         <Tag>{localize('reaction')}</Tag>
      </div>
   {/if}

   <!--Passive-->
   {#if passive}
      <div class="stat">
         <Tag>{localize('passive')}</Tag>
      </div>
   {/if}

   <!--XP Cost-->
   {#if xpCost}
      <div class="stat">
         <StatTag
            label={localize('xpCost')}
            value={xpCost}
         />
      </div>
   {/if}

   <!--Custom Traits-->
   {#each customTrait as trait}
      <div class="stat">
         <Tag tooltip={{ text: trait.description, localize: false }}>
            {trait.name}
         </Tag>
      </div>
   {/each}
</div>

<style lang="scss">
   .stats {
      @include tag-container;
      @include font-size-small;

      width: 100%;
   }
</style>
```

- [ ] **Step 2:** Sheet consumer: replace `CharacterSheetAbility.svelte`'s footer block (lines
  74-119) with `<div class="section"><AbilityStats/></div>` (multi-line per style rules); import
  swap + prune unused imports/styles as in Task 19. Chat consumer: `AbilityChatMesssage.svelte`
  `<AbilityChatStats {item}/>` → `<AbilityStats/>`; delete `AbilityChatStats.svelte`.
- [ ] **Step 3:** Build + lint clean. Commit `feat: shared AbilityStats across sheet row and chat card (TODO #12)`.

### Task 21: `ArmorStats`

**Files:**
- Create: `src/document/types/item/types/armor/components/ArmorStats.svelte`
- Modify: `src/document/types/actor/types/character/sheet/items/armor/CharacterSheetArmor.svelte:16-17,84`
- Modify: `src/document/types/item/types/armor/chat-message/ArmorChatMessage.svelte:6,18`
- Delete: `src/document/types/actor/types/character/sheet/items/armor/CharacterSheetArmorStats.svelte`,
  `src/document/types/item/types/armor/chat-message/ArmorChatStats.svelte`

- [ ] **Step 1: Create `ArmorStats.svelte`** (the sheet variant's body, context-driven; traits via
  `TraitTag`, which renders the numeric/flag conditional both surfaces hand-rolled):

```svelte
<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { ARMOR_TRAIT_DESCRIPTIONS } from '~/document/types/item/types/armor/ArmorTraits.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import TraitTag from '~/helpers/svelte-components/tag/TraitTag.svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
   import { ARMOR_ICON } from '~/system/Icons.js';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /** @type {object} The nearest document bridge (embedded armor or chat-message snapshot). */
   const document = getContext('document');

   /** @type {object} Descriptions of each armor trait. */
   const traitDescriptions = ARMOR_TRAIT_DESCRIPTIONS;

   /** @type {number} The armor's current value, read reactively through the document bridge. */
   const armorValue = $derived(document.data?.system.armor.value);

   /** @type {number} The armor's max value, read reactively through the document bridge. */
   const armorMax = $derived(document.data?.system.armor.max);

   /** @type {string} The armor's rarity, read reactively through the document bridge. */
   const rarity = $derived(document.data?.system.rarity);

   /** @type {number} The armor's gp value, read reactively through the document bridge. */
   const value = $derived(document.data?.system.value);

   /** @type {Array<object>} The armor's traits, read reactively through the document bridge. */
   const trait = $derived(document.data?.system.trait ?? []);

   /** @type {Array<object>} The armor's custom traits, read reactively through the document bridge. */
   const customTrait = $derived(document.data?.system.customTrait ?? []);
</script>

<div class="stats">
   <!--Armor-->
   <div class="stat">
      <IconStatTag
         icon={ARMOR_ICON}
         label={localize('armor')}
         tooltip={'armor.desc'}
         value={armorValue === armorMax
            ? armorValue
            : `${armorValue} / ${armorMax}`}
      />
   </div>

   <!--Rarity-->
   <div class="stat">
      <RarityTag {rarity}/>
   </div>

   <!--Value-->
   {#if value}
      <div class="stat">
         <ValueTag {value}/>
      </div>
   {/if}

   <!--Traits-->
   {#each trait as traitEntry}
      <div class="stat">
         <TraitTag
            label={localize(traitEntry.name)}
            value={traitEntry.value}
            tooltip={traitDescriptions[traitEntry.name]}
         />
      </div>
   {/each}

   <!--Custom Traits-->
   {#each customTrait as customTraitEntry}
      <div class="stat">
         <Tag tooltip={{ text: customTraitEntry.description, localize: false }}>
            {customTraitEntry.name}
         </Tag>
      </div>
   {/each}
</div>

<style lang="scss">
   .stats {
      @include tag-container;
      @include font-size-small;

      width: 100%;
   }
</style>
```

  (Known display fixes folded in: the chat card's `stat={...}` typo — `IconStatTag` has no `stat`
  prop, so the chat armor tag rendered an EMPTY label — now renders "armor"; the sheet's
  `use:tooltipAction` moves to the equivalent `tooltip` prop.)
- [ ] **Step 2:** `CharacterSheetArmor.svelte:84` `<CharacterSheetArmorStats/>` → `<ArmorStats/>`
  (+import swap); `ArmorChatMessage.svelte:18` `<ArmorChatStats {item}/>` → `<ArmorStats/>`
  (+import swap). Delete both old files.
- [ ] **Step 3:** Build + lint clean. Commit `feat: shared ArmorStats across sheet row and chat card (TODO #12)`.

### Task 22: `ShieldStats`

**Files:**
- Create: `src/document/types/item/types/shield/components/ShieldStats.svelte`
- Modify: `src/document/types/actor/types/character/sheet/items/shield/CharacterSheetShield.svelte:16-17,84`
- Modify: `src/document/types/item/types/shield/chat-message/ShieldChatMessage.svelte:6,18`
- Delete: `src/document/types/actor/types/character/sheet/items/shield/CharacterSheetShieldStats.svelte`,
  `src/document/types/item/types/shield/chat-message/ShieldChatStats.svelte`

- [ ] **Step 1:** Create `ShieldStats.svelte` — exactly the `ArmorStats.svelte` structure with:
  import `SHIELD_TRAIT_DESCRIPTIONS` from
  `~/document/types/item/types/shield/ShieldTraits.js` and `DEFENSE_ICON`; the leading stat is

```svelte
   <!--Defense-->
   <div class="stat">
      <IconStatTag
         icon={DEFENSE_ICON}
         label={localize('defense')}
         tooltip={'defense.desc'}
         value={defense}
      />
   </div>
```

  with `const defense = $derived(document.data?.system.defense);` (no max); rarity/value/traits/
  custom-traits blocks identical to ArmorStats (traits use `SHIELD_TRAIT_DESCRIPTIONS`).
- [ ] **Step 2:** Consumer swaps + deletions mirroring Task 21.
- [ ] **Step 3:** Build + lint clean. Commit `feat: shared ShieldStats across sheet row and chat card (TODO #12)`.

### Task 23: `SpellStats`

**Files:**
- Create: `src/document/types/item/types/spell/components/SpellStats.svelte`
- Modify: `src/document/types/actor/types/character/sheet/items/spell/CharacterSheetSpell.svelte:115-148`
- Modify: `src/document/types/item/types/spell/chat-message/SpellChatMessage.svelte:7,49-52`
- Delete: `src/document/types/item/types/spell/chat-message/SpellChatStats.svelte`

- [ ] **Step 1:** Create `SpellStats.svelte` — the `AbilityStats` structure with fields: rarity
  (`RarityTag`), tradition (always-rendered `StatTag` `label={localize('tradition')}
  value={tradition}`), xpCost (`{#if xpCost}` `StatTag`), custom traits. Deriveds: `rarity`,
  `tradition`, `xpCost`, `customTrait` via `document.data?.system.*`.
- [ ] **Step 2:** Sheet footer block (lines 116-148) → `<div class="section"><SpellStats/></div>`
  (multi-line); chat `<SpellChatStats {item}/>` → `<SpellStats/>`; delete `SpellChatStats.svelte`;
  prune unused imports/deriveds/styles.
- [ ] **Step 3:** Build + lint clean. Commit `feat: shared SpellStats across sheet row and chat card (TODO #12)`.

### Task 24: `CommodityStats`

**Files:**
- Create: `src/document/types/item/types/commodity/components/CommodityStats.svelte`
- Modify: `src/document/types/actor/types/character/sheet/items/commodity/CharacterSheetCommodity.svelte:93-122`
- Modify: `src/document/types/item/types/commodity/chat-message/CommodityChatMessage.svelte:6-7,33`
- Delete: `src/document/types/item/types/commodity/chat-message/CommodityChatStats.svelte`

- [ ] **Step 1:** Create `CommodityStats.svelte` — the `AbilityStats` structure with fields IN THE
  SHEET'S ORDER (locked in spec): quantity (`StatTag` `label={localize('quantity')}
  value={quantity}`), rarity, value (`{#if value}` `ValueTag`), custom traits. Deriveds:
  `quantity`, `rarity`, `value`, `customTrait`.
  (Display delta: the chat card's tag order converges to quantity/rarity/value.)
- [ ] **Step 2:** Consumer swaps + deletion as above.
- [ ] **Step 3:** Build + lint clean. Commit `feat: shared CommodityStats across sheet row and chat card (TODO #12)`.

### Task 25: `EffectStats`

**Files:**
- Create: `src/document/types/active-effect/components/EffectStats.svelte`
- Modify: `src/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte:145-170`
- Modify: `src/document/types/active-effect/chat-message/EffectChatMessage.svelte:6,32`
- Delete: `src/document/types/active-effect/chat-message/EffectChatStats.svelte`

- [ ] **Step 1: Execution check.** Read `TitanActiveEffectDataModel`'s `isExpired` definition: the
  shared component computes expiry from `duration` (the snapshot has no derived `isExpired`); the
  computed condition must match the model's definition. Expected (from `EffectChatStats.svelte:25`):
  `duration.type !== 'permanent' && duration.remaining <= 0`. If the model's `isExpired` differs
  (e.g. extra duration types), use the model's exact condition and STOP/surface if it cannot be
  computed from snapshot fields.
- [ ] **Step 2: Create `EffectStats.svelte`:**

```svelte
<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DurationTag from '~/helpers/svelte-components/tag/DurationTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /** @type {object} The nearest document bridge (embedded effect or chat-message snapshot). */
   const document = getContext('document');

   /** @type {string} The effect's duration type, read reactively through the document bridge. */
   const durationType = $derived(document.data?.system.duration.type);

   /** @type {number} The effect's remaining duration, read reactively through the document bridge. */
   const durationRemaining = $derived(document.data?.system.duration.remaining);

   /** @type {boolean} Whether the effect is expired, computed from the duration (snapshot-safe). */
   const isExpired = $derived(durationType !== 'permanent' && durationRemaining <= 0);

   /** @type {Array<object>} The effect's custom traits, read reactively through the document bridge. */
   const customTrait = $derived(document.data?.system.customTrait ?? []);
</script>

<div class="stats">
   <!--Duration-->
   <div class="stat">
      <DurationTag
         remaining={durationRemaining}
         testId={'effect-row-duration'}
         type={durationType}
      />
   </div>

   <!--Expired-->
   {#if isExpired}
      <div class="stat">
         <Tag>{localize('expired')}</Tag>
      </div>
   {/if}

   <!--Custom Traits-->
   {#each customTrait as trait}
      <div class="stat">
         <Tag tooltip={{ text: trait.description, localize: false }}>
            {trait.name}
         </Tag>
      </div>
   {/each}
</div>

<style lang="scss">
   .stats {
      @include tag-container;
      @include font-size-small;

      width: 100%;
   }
</style>
```

- [ ] **Step 3:** `CharacterSheetEffect.svelte` footer (lines 145-170) →
  `<div class="section"><EffectStats/></div>` (multi-line; prune the now-unused `isExpired`/
  `durationType`/`durationRemaining` deriveds ONLY if the controls snippet no longer reads them —
  lines 58-79 DO read `durationType`/`durationCustom`, so keep those); `EffectChatMessage.svelte`
  `<EffectChatStats {item}/>` → `<EffectStats/>`; delete `EffectChatStats.svelte`.
  **TestId delta:** `effect-row-duration` now also appears on effect chat cards — grep
  `tests/e2e` for `effect-row-duration` and scope any page-global usage to its container.
- [ ] **Step 4:** Build + lint clean. Commit `feat: shared EffectStats across sheet row and chat card (TODO #12)`.

### Task 26: Batch 4 gate — verify, document, review, merge

- [ ] **Step 1:** `npm run build` + `npx eslint .` + `npm run test:unit` → clean/green.
- [ ] **Step 2:** Rebuild `dist/`, then with the world launched run the targeted e2e set:

```
npx playwright test tests/e2e/item-cards.spec.js tests/e2e/attack-tags.spec.js \
  tests/e2e/embedded-context-items.spec.js tests/e2e/embedded-context-effects.spec.js \
  tests/e2e/embedded-context-check-parity.spec.js tests/e2e/effect-chat-card.spec.js \
  tests/e2e/effect-hud.spec.js tests/e2e/effect-tray.spec.js \
  tests/e2e/reactive-armor-shield.spec.js tests/e2e/reactive-inventory-basic.spec.js \
  tests/e2e/reactive-spell.spec.js tests/e2e/reactive-ability.spec.js \
  tests/e2e/reactive-effect-rows.spec.js tests/e2e/checks-integration.spec.js \
  tests/e2e/report-cards.spec.js
```

  → green. Eyeball the converged surfaces in the live world (item rows, chat cards, spell sheet
  sidebar — the Task 18 checkpoint).
- [ ] **Step 3: Docs.** `docs/TODO.md`: delete #25; REWRITE #12 to record: increments 1-3 shipped
  (CheckTags, CastingCheckTags, the 8 stats convergences incl. shared ItemStats), the verified
  inventory is CLOSED, the three logged rejects (weapon attack rows / sidebar traits / HUD inline
  duration) with rationale, and that future increments are retheme-driven. Update the
  `titan-codebase` skill (`references/abstractions.md` shared-components list + consumer lists;
  `references/conventions.md` if a new convention emerged). Commit.
- [ ] **Step 4:** Dispatch batch review (whole branch); fix findings; merge to `main`; push.

---

# Final gate

### Task 27: Full-suite verification on `main`

- [ ] **Step 1:** `npm run build` (fresh dist; NEVER concurrent with e2e).
- [ ] **Step 2:** `npm run test:unit` → green.
- [ ] **Step 3:** With the world launched: `npm run test:e2e` (throttled default; foreground) →
  expected: all green, count ≥ the pre-wrap-up full-run baseline (402) plus the new cases. Any
  failure: diagnose via superpowers:systematic-debugging before touching anything; a regression
  found here is fixed on a fix branch, not by reverting batches.
- [ ] **Step 4:** Push `main`. Ask the user about deleting the four batch branches.
- [ ] **Step 5:** Memory/docs sweep per project rules: titan-codebase self-update protocol gap/stale
  check; auto-memory session-log entry.
