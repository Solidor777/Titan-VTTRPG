# TITAN E2E Phase 4 — Multi-User Permissions + 2-Client Socket Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright e2e coverage for TITAN's two multi-user surfaces — cross-client replication of
Combat turn-change effects (the `system.titan` socket), and document permission/visibility behavior for
Player vs GM clients.

**Architecture:** All tests run inside the live Foundry browser on `:30000` via `page.evaluate`. Two
simultaneous clients are modeled as **two browser contexts inside one test** (the config is
`workers: 1, fullyParallel: false`). A reusable harness (`withClients`) owns context creation/login/cleanup.
Combat turn effects are applied by exactly one client — the **best owner** (first active GM, else first
active player owner) — and replicate to other clients via Foundry's native document socket; the
`system.titan` socket's job is to relay the `combatNextTurn`/`combatPreviousTurn` hook (with computed
combatant args) so the best owner applies effects regardless of which client advanced the turn.

**Tech Stack:** Playwright (`@playwright/test`), Foundry VTT v14 (ApplicationV2 / DocumentSheetV2,
DataModel), the existing `tests/shared/builders.js` fixtures, `tests/e2e/fixtures.js` `login()`. Turn
effects are flat rules-element values — **no dice / no `forceDice`**.

**Design spec:** `docs/superpowers/specs/2026-06-01-titan-e2e-phase4-multiuser-design.md`.

---

## Ground-truth facts (verified against source — do not re-derive)

- **`login(page, user)`** (`tests/e2e/fixtures.js:17`): goes to `/join`, `selectOption('select[name="userid"]', { label: user })`, clicks `button[name="join"]`, `waitForURL('**/game')`, then `waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 60_000 })`. Test world has no passwords.
- **Users** (`tests/e2e/users.js`): display names `E2E GM 1`, `E2E GM 2`, `E2E Player 1`, `E2E Player 2`. `DEFAULT_GM = 'E2E GM 1'`.
- **Config** (`playwright.config.mjs`): `workers: 1`, `fullyParallel: false`, `baseURL: 'http://localhost:30000'`, `webServer.reuseExistingServer: true`. **No existing spec uses `browser.newContext`** — Phase 4 introduces it.
- **Actor creation pattern** (`tests/e2e/checks-integration.spec.js`): inside `page.evaluate`, `const stale = game.actors.getName(NAME); if (stale) await stale.delete(); const actor = await Actor.create(actorData); await actor.createEmbeddedDocuments('Item', itemData);`. Builders return plain create-payloads (Node side); all `game.*` calls happen in-page.
- **Sheet render check** (v14): `actor.sheet?.rendered === true`; visibility `actor.sheet.isVisible` (= `testUserPermission(game.user, viewPermission=LIMITED)`); editability `actor.sheet.isEditable` (= OWNER). NONE → `isVisible === false`, render is a no-op.
- **Ability rules elements apply on mere ownership** (no equip) — `CharacterDataModel._applyRulesElements` `case 'ability'`. Element entry shape: `{ operation, selector, key?, value, uuid }`.
- **fastHealing / persistentDamage** rules-element ops (`src/document/types/item/rules-element/{FastHealing,PersistentDamage}.js`): `{ operation: 'fastHealing'|'persistentDamage', selector: 'turnStart'|'turnEnd', value: <number>, uuid: <string> }`. **resolveRegain is NOT an op** — it is a mod: author via `{ operation: 'flatModifier', selector: 'mod', key: 'resolveRegain', value: <n>, uuid }`.
- **Resources** (`CharacterDataModel`): `actor.system.resource.{stamina,resolve,wounds}.value`. fastHealing heals `stamina.value` (capped at max), persistentDamage reduces `stamina.value` (overflow to `wounds.value`), resolveRegain raises `resolve.value` up to `resolveBaseRegain() + mod.resolveRegain.value`. **Healing/regain only move a resource that is below its cap** → pre-seed those actors low.
- **Best owner** (`src/helpers/utility-functions/IsCurrentUserBestOwner.js`): first active GM if any GM active, else first active player owner. The resource `actor.update(...)` is gated by this; other clients observe via native replication.
- **Socket** (`src/helpers/SocketManager.js` + `TitanCombat.js`): `nextTurn()`/`previousTurn()` (only when `turns.length > 1`) call `triggerSocketHook('combatNextTurn'|'combatPreviousTurn', current, previous, combat)` which runs the hook locally AND `game.socket.emit`s it; receivers run `Hooks.callAll(id, ...args)`. Handlers `src/hooks/OnCombat{Next,Previous}Turn.js` call `actor.system.onTurnStart/onTurnEnd` (and `onInitiative*`/`*Reverted`).
- **Settings** (`src/system/SystemSettings.js`): world-scope (GM writes), default `'enabled'`, choices `enabled|showButton|disabled`, **`requiresReload: true`** — but accessors read `game.settings.get` LIVE each turn, so a `set` takes effect without reload: `autoApplyFastHealing`, `autoApplyPersistentDamage`, `autoRevertFastHealing`, `autoRevertPersistentDamage`, `autoRegainResolve`, `autoRevertResolveRegain`. **Client-scope** (per-client, no propagation): `autoOpenCharacterSheetsGM` (choices `npcsOnly|pcsOnly|all|disabled`, default `npcsOnly`), `autoOpenCharacterSheetsPlayer` (Boolean, default `true`).
- **Combat advancement is GM-only** — players cannot call `nextTurn()`.
- **Combatant.actor resolution** (v14 `combatant.mjs`): `get actor() { if (this.token) return this.token.actor; return game.actors.get(this.actorId) || null; }` → needs a token on a scene. Create token via `(await actor.getTokenDocument({x,y})).toObject()` then `scene.createEmbeddedDocuments('Token', [data])`; combatant via `combat.createEmbeddedDocuments('Combatant', [{ tokenId, sceneId, initiative }])`.
- **Ownership update** (v14): `actor.update({ ownership: { [userId]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER } })`. Levels: NONE 0, LIMITED 1, OBSERVER 2, OWNER 3.
- **effects pack** (`system.json`): `ownership: { PLAYER: 'OBSERVER', ASSISTANT: 'OWNER' }`, `type: 'ActiveEffect'`. `socket: true`. `grid: { units: 'sp', diagonals: 4 }`.

---

## File structure

| File | Responsibility |
|---|---|
| `tests/e2e/multiClient.js` (new) | `withClients(browser, spec, fn)` — create N contexts, log each in, yield page map, cleanup in `finally`; plus `awaitUsersActive`. |
| `tests/e2e/settings.js` (new) | `setWorldSetting(page,key,value)`, `setClientSetting(page,key,value)`, `getSetting(page,key)` — thin wrappers over `game.settings`. |
| `tests/shared/combat.js` (new) | `seedCombatEncounter(opts)` + `teardownCombatEncounter(ids)` — self-contained async fns passed to `page.evaluate` (reference only in-page globals). |
| `tests/shared/builders.js` (edit) | Add turn-effect actor + ability builders (fastHealing / persistentDamage / resolveRegain) and a plain target actor. |
| `tests/e2e/multi-client.spec.js` (new) | Harness smoke test (Task 1). |
| `tests/e2e/combat-seed.spec.js` (new) | Seeding smoke test — de-risks token/scene/combatant resolution (Task 4). |
| `tests/e2e/socket-sync.spec.js` (new) | Group A: A1–A5 (Tasks 5–9). |
| `tests/e2e/permissions-ownership.spec.js` (new) | Group B1 (Task 10). |
| `tests/e2e/permissions-compendium.spec.js` (new) | Group B3 (Task 11). |
| `tests/e2e/permissions-auto-open.spec.js` (new) | Group B4 (Task 12). |

**Build discipline:** these specs are test-only (no `src/` changes) until/unless a real bug is found — so they do **not** require a rebuild. If a bug fix touches `src/`, run `npm run build:e2e` before re-running. Run specs with Foundry up on `:30000`.

---

## Phase 0 — Harness foundation

### Task 1: Two-client harness (`withClients`) + smoke test

**Files:**
- Create: `tests/e2e/multiClient.js`
- Test: `tests/e2e/multi-client.spec.js`

- [ ] **Step 1: Write the harness**

Create `tests/e2e/multiClient.js`:

```javascript
import { login } from './fixtures.js';

/**
 * Runs a callback with several simultaneous, independent Foundry clients.
 * Each client is its own browser context (separate session/cookies), logged in as the named user.
 * @param {import('@playwright/test').Browser} browser - The Playwright browser from the test fixture.
 * @param {Object<string, string>} clientSpec - Map of label to Foundry user display name.
 * @param {(pages: Object<string, import('@playwright/test').Page>) => Promise<void>} fn - Callback receiving the page map.
 * @returns {Promise<void>} Resolves once the callback completes and all contexts are closed.
 */
export async function withClients(browser, clientSpec, fn) {
   /** @type {import('@playwright/test').BrowserContext[]} */
   const contexts = [];

   /** @type {Object<string, import('@playwright/test').Page>} */
   const pages = {};

   try {
      // Create and log in each client sequentially (single-worker world).
      for (const [label, userName] of Object.entries(clientSpec)) {
         const context = await browser.newContext();
         const page = await context.newPage();
         await login(page, userName);
         contexts.push(context);
         pages[label] = page;
      }

      await fn(pages);
   }
   finally {
      // Always tear down every context, even if the callback threw.
      for (const context of contexts) {
         await context.close();
      }
   }
}

/**
 * Waits until the given client's world reports the named users as active.
 * @param {import('@playwright/test').Page} page - The client to poll.
 * @param {string[]} userNames - Display names that must be active.
 * @returns {Promise<void>} Resolves once all named users are active on that client.
 */
export async function awaitUsersActive(page, userNames) {
   await page.waitForFunction(
      (names) => names.every((name) => game.users.getName(name)?.active === true),
      userNames,
      { timeout: 30_000 },
   );
}
```

- [ ] **Step 2: Write the failing smoke test**

Create `tests/e2e/multi-client.spec.js`:

```javascript
import { expect, test } from '@playwright/test';
import { withClients, awaitUsersActive } from './multiClient.js';

test.describe('multi-client harness', () => {
   test('two contexts log in as distinct users and both see each other active', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         // Each client must reach a ready world.
         expect(await gm.evaluate(() => game.ready)).toBe(true);
         expect(await player.evaluate(() => game.ready)).toBe(true);

         // Each client is the user it logged in as.
         expect(await gm.evaluate(() => game.user.name)).toBe('E2E GM 1');
         expect(await player.evaluate(() => game.user.name)).toBe('E2E Player 1');

         // Both users become active and each client observes the other.
         await awaitUsersActive(gm, ['E2E GM 1', 'E2E Player 1']);
         await awaitUsersActive(player, ['E2E GM 1', 'E2E Player 1']);
      });
   });
});
```

- [ ] **Step 3: Run the test — verify it passes**

Run: `npx playwright test multi-client.spec.js --reporter=list`
Expected: 1 passed. (If `awaitUsersActive` times out, the active-flag propagation is the issue — increase the timeout, do not add a fixed sleep.)

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/multiClient.js tests/e2e/multi-client.spec.js
git commit -m "test(e2e): 4 — two-client harness (withClients + awaitUsersActive)"
```

---

### Task 2: Settings helper

**Files:**
- Create: `tests/e2e/settings.js`

- [ ] **Step 1: Write the helper**

Create `tests/e2e/settings.js`:

```javascript
/**
 * Sets a world-scope TITAN setting from a GM client (world scope requires a GM writer).
 * The setting is read live by system code, so no reload is needed for it to take effect.
 * @param {import('@playwright/test').Page} pageGm - A logged-in GM client.
 * @param {string} key - The setting key (without the 'titan.' namespace).
 * @param {*} value - The value to store.
 * @returns {Promise<void>} Resolves once the setting is written.
 */
export async function setWorldSetting(pageGm, key, value) {
   await pageGm.evaluate(
      ({ key, value }) => game.settings.set('titan', key, value),
      { key, value },
   );
}

/**
 * Sets a client-scope TITAN setting on a specific client (each client holds its own value).
 * @param {import('@playwright/test').Page} page - The client whose setting to change.
 * @param {string} key - The setting key (without the 'titan.' namespace).
 * @param {*} value - The value to store.
 * @returns {Promise<void>} Resolves once the setting is written.
 */
export async function setClientSetting(page, key, value) {
   await page.evaluate(
      ({ key, value }) => game.settings.set('titan', key, value),
      { key, value },
   );
}

/**
 * Reads a TITAN setting value from a client.
 * @param {import('@playwright/test').Page} page - The client to read from.
 * @param {string} key - The setting key (without the 'titan.' namespace).
 * @returns {Promise<*>} The current value of the setting on that client.
 */
export async function getSetting(page, key) {
   return page.evaluate((key) => game.settings.get('titan', key), key);
}
```

- [ ] **Step 2: Sanity-check it via the harness (no new spec)**

This helper is exercised by Tasks 5–9 and 12; it has no standalone test. Verify it imports cleanly:

Run: `node --input-type=module -e "import('./tests/e2e/settings.js').then(m => console.log(Object.keys(m)))"`
Expected: prints `[ 'setWorldSetting', 'setClientSetting', 'getSetting' ]`.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/settings.js
git commit -m "test(e2e): 4 — world/client settings helpers"
```

---

### Task 3: Turn-effect builders

**Files:**
- Modify: `tests/shared/builders.js` (append exports)

- [ ] **Step 1: Add the builders**

Append to `tests/shared/builders.js`:

```javascript
/**
 * Builds create-data for a character actor used in turn-effect socket tests.
 * @param {string} name - The actor name.
 * @param {('player'|'npc')} [type] - The actor subtype (defaults to 'player').
 * @returns {object} The Actor.create payload.
 */
export function buildTurnEffectActorData(name, type = 'player') {
   return {
      name: name,
      type: type,
   };
}

/**
 * Builds an ability item that heals stamina at the start (or end) of the owner's turn.
 * @param {string} name - The item name.
 * @param {number} value - The amount healed per turn.
 * @param {('turnStart'|'turnEnd')} [selector] - When the effect fires (defaults to 'turnStart').
 * @returns {object} The Item.create payload.
 */
export function buildFastHealingAbilityData(name, value, selector = 'turnStart') {
   return {
      name: name,
      type: 'ability',
      system: {
         rulesElement: [
            {
               operation: 'fastHealing',
               selector: selector,
               value: value,
               uuid: 'e2e-fast-healing-0',
            },
         ],
      },
   };
}

/**
 * Builds an ability item that deals stamina damage at the start (or end) of the owner's turn.
 * @param {string} name - The item name.
 * @param {number} value - The amount of damage per turn.
 * @param {('turnStart'|'turnEnd')} [selector] - When the effect fires (defaults to 'turnStart').
 * @returns {object} The Item.create payload.
 */
export function buildPersistentDamageAbilityData(name, value, selector = 'turnStart') {
   return {
      name: name,
      type: 'ability',
      system: {
         rulesElement: [
            {
               operation: 'persistentDamage',
               selector: selector,
               value: value,
               uuid: 'e2e-persistent-damage-0',
            },
         ],
      },
   };
}

/**
 * Builds an ability item that increases the owner's per-turn resolve regain (a mod, not an op).
 * @param {string} name - The item name.
 * @param {number} value - The bonus to resolve regain.
 * @returns {object} The Item.create payload.
 */
export function buildResolveRegainAbilityData(name, value) {
   return {
      name: name,
      type: 'ability',
      system: {
         rulesElement: [
            {
               operation: 'flatModifier',
               selector: 'mod',
               key: 'resolveRegain',
               value: value,
               uuid: 'e2e-resolve-regain-0',
            },
         ],
      },
   };
}
```

- [ ] **Step 2: Verify the module parses**

Run: `node --input-type=module -e "import('./tests/shared/builders.js').then(m => console.log(typeof m.buildFastHealingAbilityData, typeof m.buildPersistentDamageAbilityData, typeof m.buildResolveRegainAbilityData, typeof m.buildTurnEffectActorData))"`
Expected: prints `function function function function`.

- [ ] **Step 3: Commit**

```bash
git add tests/shared/builders.js
git commit -m "test(e2e): 4 — turn-effect actor/ability builders"
```

---

### Task 4: Combat seeding helper + seeding smoke test (de-risks scene/token/combatant)

**Files:**
- Create: `tests/shared/combat.js`
- Test: `tests/e2e/combat-seed.spec.js`

- [ ] **Step 1: Write the seeding helper**

Create `tests/shared/combat.js`. These two exports are **self-contained async functions** passed directly to `page.evaluate` — they may reference only in-page globals (`game`, `Scene`, `Combat`, `Actor`, `CONST`) and their single `opts`/`ids` argument:

```javascript
/**
 * Seeds a two-combatant encounter inside the live Foundry world. The effect actor is placed at the
 * LOWER initiative (turn index 1) so a single nextTurn() from the started state begins its turn.
 * Designed to be passed to page.evaluate — references only in-page globals.
 * @param {object} opts - The seeding options.
 * @param {string} opts.sceneName - Name for the throwaway scene.
 * @param {object} opts.effectActor - Actor.create payload for the effect-bearing actor.
 * @param {object[]} [opts.effectAbilities] - Item.create payloads (ability rules elements) for the effect actor.
 * @param {object} opts.otherActor - Actor.create payload for the other combatant.
 * @param {number} opts.effectInitiative - Initiative for the effect actor (use the LOWER value).
 * @param {number} opts.otherInitiative - Initiative for the other actor (use the HIGHER value).
 * @param {number} [opts.staminaValue] - If set, the effect actor's stamina is pre-seeded to this value.
 * @param {number} [opts.resolveValue] - If set, the effect actor's resolve is pre-seeded to this value.
 * @param {string} [opts.observerUserName] - If set, this user is granted OWNER on the effect actor.
 * @returns {Promise<{sceneId: string, combatId: string, effectActorId: string, otherActorId: string, effectCombatantId: string}>} The created document ids.
 */
export const seedCombatEncounter = async (opts) => {
   const {
      sceneName,
      effectActor,
      effectAbilities,
      otherActor,
      effectInitiative,
      otherInitiative,
      staminaValue,
      resolveValue,
      observerUserName,
   } = opts;

   // Grant the observer OWNER on the effect actor so a non-GM client can read its resources.
   const ownership = {};
   if (observerUserName) {
      const observer = game.users.getName(observerUserName);
      if (observer) {
         ownership[observer.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
      }
   }

   // Create the two actors and the effect actor's abilities.
   const effect = await Actor.create({ ...effectActor, ownership: ownership });
   if (effectAbilities && effectAbilities.length > 0) {
      await effect.createEmbeddedDocuments('Item', effectAbilities);
   }
   const other = await Actor.create(otherActor);

   // Pre-seed resources so healing/regain (which only move a below-cap resource) is observable.
   const resource = {};
   if (typeof staminaValue === 'number') {
      resource.stamina = { value: staminaValue };
   }
   if (typeof resolveValue === 'number') {
      resource.resolve = { value: resolveValue };
   }
   if (Object.keys(resource).length > 0) {
      await effect.update({ system: { resource: resource } });
   }

   // Create a scene and place a token for each actor (required for Combatant.actor to resolve).
   const scene = await Scene.create({ name: sceneName, width: 2000, height: 2000 });
   const effectTokenData = (await effect.getTokenDocument({ x: 500, y: 500 })).toObject();
   const otherTokenData = (await other.getTokenDocument({ x: 1000, y: 500 })).toObject();
   const [effectToken] = await scene.createEmbeddedDocuments('Token', [effectTokenData]);
   const [otherToken] = await scene.createEmbeddedDocuments('Token', [otherTokenData]);

   // Create combat bound to the scene with explicit (deterministic) initiative.
   const combat = await Combat.create({ scene: scene.id });
   const [effectCombatant] = await combat.createEmbeddedDocuments('Combatant', [
      { tokenId: effectToken.id, sceneId: scene.id, initiative: effectInitiative },
   ]);
   await combat.createEmbeddedDocuments('Combatant', [
      { tokenId: otherToken.id, sceneId: scene.id, initiative: otherInitiative },
   ]);

   // Start the encounter at round 1, turn 0 (highest initiative first = the OTHER actor).
   if (typeof combat.startCombat === 'function') {
      await combat.startCombat();
   }
   else {
      await combat.update({ active: true, round: 1, turn: 0 });
   }

   return {
      sceneId: scene.id,
      combatId: combat.id,
      effectActorId: effect.id,
      otherActorId: other.id,
      effectCombatantId: effectCombatant.id,
   };
};

/**
 * Deletes everything seedCombatEncounter created. Designed to be passed to page.evaluate.
 * @param {object} ids - The ids returned by seedCombatEncounter.
 * @param {string} ids.sceneId - The scene id.
 * @param {string} ids.combatId - The combat id.
 * @param {string} ids.effectActorId - The effect actor id.
 * @param {string} ids.otherActorId - The other actor id.
 * @returns {Promise<void>} Resolves once all created documents are deleted.
 */
export const teardownCombatEncounter = async (ids) => {
   const combat = game.combats.get(ids.combatId);
   if (combat) {
      await combat.delete();
   }
   const scene = game.scenes.get(ids.sceneId);
   if (scene) {
      await scene.delete();
   }
   for (const actorId of [ids.effectActorId, ids.otherActorId]) {
      const actor = game.actors.get(actorId);
      if (actor) {
         await actor.delete();
      }
   }
};
```

- [ ] **Step 2: Write the failing seeding smoke test**

Create `tests/e2e/combat-seed.spec.js`:

```javascript
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { seedCombatEncounter, teardownCombatEncounter } from '../shared/combat.js';
import { buildTurnEffectActorData, buildPersistentDamageAbilityData } from '../shared/builders.js';

test.describe('combat seeding', () => {
   test('seeds two combatants whose actors resolve and produce >1 turn', async ({ page }) => {
      await login(page, 'E2E GM 1');

      const seed = {
         sceneName: 'E2E Seed Scene',
         effectActor: buildTurnEffectActorData('E2E Effect Actor'),
         effectAbilities: [buildPersistentDamageAbilityData('E2E PD', 1)],
         otherActor: buildTurnEffectActorData('E2E Other Actor'),
         effectInitiative: 10,
         otherInitiative: 20,
      };

      const ids = await page.evaluate(seedCombatEncounter, seed);

      try {
         const probe = await page.evaluate((ids) => {
            const combat = game.combats.get(ids.combatId);
            const effectCombatant = combat.combatants.get(ids.effectCombatantId);
            return {
               turnCount: combat.turns.length,
               actorResolves: effectCombatant.actor?.id === ids.effectActorId,
               isCharacter: effectCombatant.actor?.system.isCharacter === true,
               characterCombatants: combat.getCharacterCombatants().length,
               startedTurn: combat.turn,
            };
         }, ids);

         // Two combatants → more than one turn (required for the socket emit guard).
         expect(probe.turnCount).toBe(2);
         // The token-based combatant resolves back to the effect actor and is a character.
         expect(probe.actorResolves, 'combatant.actor must resolve to the effect actor').toBe(true);
         expect(probe.isCharacter, 'effect actor must be a character').toBe(true);
         expect(probe.characterCombatants).toBe(2);
         // Combat starts at turn 0 (the higher-initiative OTHER actor).
         expect(probe.startedTurn).toBe(0);
      }
      finally {
         await page.evaluate(teardownCombatEncounter, ids);
      }
   });
});
```

- [ ] **Step 3: Run the test — verify behavior**

Run: `npx playwright test combat-seed.spec.js --reporter=list`
Expected: PASS. If `actorResolves` is false, the token/scene wiring is wrong — fix the `getTokenDocument`/`createEmbeddedDocuments` calls before proceeding (this de-risks the rest of Phase 4). If `startedTurn` is not 0, adjust the start logic (initiative ordering / `startCombat` vs the `update` fallback).

- [ ] **Step 4: Commit**

```bash
git add tests/shared/combat.js tests/e2e/combat-seed.spec.js
git commit -m "test(e2e): 4 — combat seeding helper + smoke test (token/scene/combatant)"
```

---

## Phase A — Socket sync (replicated document state)

All Group A tests share the seed/teardown helpers. The applier is the **best owner** (first active GM);
other clients observe via native replication. World auto-apply settings default to `'enabled'`, but each
test pins them on the applying GM client for determinism.

### Task 5: A1 — persistent damage replicates to the observing client

**Files:**
- Create: `tests/e2e/socket-sync.spec.js`

- [ ] **Step 1: Write the failing test**

Create `tests/e2e/socket-sync.spec.js`:

```javascript
import { expect, test } from '@playwright/test';
import { withClients } from './multiClient.js';
import { setWorldSetting } from './settings.js';
import { seedCombatEncounter, teardownCombatEncounter } from '../shared/combat.js';
import {
   buildTurnEffectActorData,
   buildPersistentDamageAbilityData,
   buildFastHealingAbilityData,
   buildResolveRegainAbilityData,
} from '../shared/builders.js';

test.describe('socket sync — replicated turn-effect state', () => {
   test('A1: persistent damage applied by the GM replicates to the player client', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         // Determinism: auto-apply persistent damage on the applying (GM) client.
         await setWorldSetting(gm, 'autoApplyPersistentDamage', 'enabled');

         // Effect actor (lower initiative → turn 1) carries persistent damage 1; observer = the player.
         const seed = {
            sceneName: 'A1 Scene',
            effectActor: buildTurnEffectActorData('A1 Effect Actor'),
            effectAbilities: [buildPersistentDamageAbilityData('A1 PD', 1)],
            otherActor: buildTurnEffectActorData('A1 Other Actor'),
            effectInitiative: 10,
            otherInitiative: 20,
            observerUserName: 'E2E Player 1',
         };
         const ids = await gm.evaluate(seedCombatEncounter, seed);

         try {
            // Stamina starts at its full default (3 for a base player) — record the pre value on the GM.
            const before = await gm.evaluate(
               (id) => game.actors.get(id).system.resource.stamina.value,
               ids.effectActorId,
            );

            // GM (best owner) advances the turn → effect actor's turn starts → persistent damage applies.
            await gm.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);

            // The PLAYER client observes the replicated stamina decrease (poll the document, no sleep).
            await player.waitForFunction(
               ({ id, expected }) => game.actors.get(id)?.system.resource.stamina.value === expected,
               { id: ids.effectActorId, expected: before - 1 },
               { timeout: 15_000 },
            );

            // Confirm exactly-once: the value is before-1, not before-2.
            const after = await player.evaluate(
               (id) => game.actors.get(id).system.resource.stamina.value,
               ids.effectActorId,
            );
            expect(after).toBe(before - 1);
         }
         finally {
            await gm.evaluate(teardownCombatEncounter, ids);
         }
      });
   });
});
```

- [ ] **Step 2: Run the test — verify behavior**

Run: `npx playwright test socket-sync.spec.js -g "A1" --reporter=list`
Expected: PASS. If `before` is not 3, that's fine — the assertion uses `before - 1` relatively. If the player never observes the change, check: (a) the player has OWNER (seed `observerUserName`), (b) `autoApplyPersistentDamage` actually took effect (if not, the `requiresReload` flag matters — `await gm.reload()` then re-login, or pin the value before the world loads). Capture the real failure before adjusting.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/socket-sync.spec.js
git commit -m "test(e2e): 4a — A1 persistent damage replicates to observing client"
```

---

### Task 6: A2 — fast healing replicates (pre-seeded low stamina)

**Files:**
- Modify: `tests/e2e/socket-sync.spec.js` (add test to the existing describe)

- [ ] **Step 1: Write the failing test**

Add inside the `socket sync — replicated turn-effect state` describe in `tests/e2e/socket-sync.spec.js`:

```javascript
   test('A2: fast healing applied by the GM replicates to the player client', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         await setWorldSetting(gm, 'autoApplyFastHealing', 'enabled');

         // Pre-seed stamina to 1 so a +2 heal is observable (heal is capped at max).
         const seed = {
            sceneName: 'A2 Scene',
            effectActor: buildTurnEffectActorData('A2 Effect Actor'),
            effectAbilities: [buildFastHealingAbilityData('A2 FH', 2)],
            otherActor: buildTurnEffectActorData('A2 Other Actor'),
            effectInitiative: 10,
            otherInitiative: 20,
            staminaValue: 1,
            observerUserName: 'E2E Player 1',
         };
         const ids = await gm.evaluate(seedCombatEncounter, seed);

         try {
            // Confirm the pre-seed landed on the player client.
            await player.waitForFunction(
               ({ id }) => game.actors.get(id)?.system.resource.stamina.value === 1,
               { id: ids.effectActorId },
               { timeout: 15_000 },
            );

            await gm.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);

            // Player observes the heal: 1 → 3 (1 + 2), assuming a base player stamina max >= 3.
            await player.waitForFunction(
               ({ id }) => game.actors.get(id)?.system.resource.stamina.value === 3,
               { id: ids.effectActorId },
               { timeout: 15_000 },
            );
         }
         finally {
            await gm.evaluate(teardownCombatEncounter, ids);
         }
      });
   });
```

- [ ] **Step 2: Run the test — verify behavior**

Run: `npx playwright test socket-sync.spec.js -g "A2" --reporter=list`
Expected: PASS. If the healed value is not 3, read the actor's `system.resource.stamina` max on the GM client (`game.actors.get(id).system.resource.stamina` — inspect the schema's max) and adjust the seed/expected so the heal stays under the cap (e.g. seed 0, heal 2 → 2).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/socket-sync.spec.js
git commit -m "test(e2e): 4a — A2 fast healing replicates to observing client"
```

---

### Task 7: A3 — resolve regain replicates (pre-spent resolve)

**Files:**
- Modify: `tests/e2e/socket-sync.spec.js`

- [ ] **Step 1: Confirm resolve-regain semantics, then write the test**

First confirm how `_calculateResolveRegain` moves `resolve.value` (read `CharacterDataModel.js` around the `_calculateResolveRegain` / `regainResolve` definitions): note `resolveBaseRegain()` and whether regain adds up to `resolveBaseRegain() + mod.resolveRegain.value` or sets toward a cap. Use that to choose `resolveValue` (pre-spent) and the expected post value.

Add inside the describe in `tests/e2e/socket-sync.spec.js`. The test first asserts a strict increase (`> before`); Step 2 then tightens it to the exact deterministic post-regain value once the semantics check above pins it:

```javascript
   test('A3: resolve regain applied by the GM replicates to the player client', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         await setWorldSetting(gm, 'autoRegainResolve', 'enabled');

         // Pre-spend resolve to 0 so a regain is observable (regain only raises a below-cap resource).
         const seed = {
            sceneName: 'A3 Scene',
            effectActor: buildTurnEffectActorData('A3 Effect Actor'),
            effectAbilities: [buildResolveRegainAbilityData('A3 RR', 1)],
            otherActor: buildTurnEffectActorData('A3 Other Actor'),
            effectInitiative: 10,
            otherInitiative: 20,
            resolveValue: 0,
            observerUserName: 'E2E Player 1',
         };
         const ids = await gm.evaluate(seedCombatEncounter, seed);

         try {
            await player.waitForFunction(
               ({ id }) => game.actors.get(id)?.system.resource.resolve.value === 0,
               { id: ids.effectActorId },
               { timeout: 15_000 },
            );

            const before = await gm.evaluate(
               (id) => game.actors.get(id).system.resource.resolve.value,
               ids.effectActorId,
            );

            await gm.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);

            // Player observes a strictly higher resolve (regain occurred and replicated).
            await player.waitForFunction(
               ({ id, before }) => game.actors.get(id)?.system.resource.resolve.value > before,
               { id: ids.effectActorId, before },
               { timeout: 15_000 },
            );
         }
         finally {
            await gm.evaluate(teardownCombatEncounter, ids);
         }
      });
   });
```

- [ ] **Step 2: Run the test — verify behavior**

Run: `npx playwright test socket-sync.spec.js -g "A3" --reporter=list`
Expected: PASS. If resolve does not increase, the regain cap math differs from the assumption — read `_calculateResolveRegain` and set `resolveValue` lower / confirm the `mod.resolveRegain` flatModifier actually feeds `this.mod.resolveRegain.value`. Tighten the `> before` to the exact expected value once confirmed.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/socket-sync.spec.js
git commit -m "test(e2e): 4a — A3 resolve regain replicates to observing client"
```

---

### Task 8: A4 — reversion replicates (previousTurn)

**Files:**
- Modify: `tests/e2e/socket-sync.spec.js`

- [ ] **Step 1: Write the failing test**

Add inside the describe in `tests/e2e/socket-sync.spec.js`:

```javascript
   test('A4: previousTurn reverts the applied effect and replicates to the player client', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         await setWorldSetting(gm, 'autoApplyPersistentDamage', 'enabled');
         await setWorldSetting(gm, 'autoRevertPersistentDamage', 'enabled');

         const seed = {
            sceneName: 'A4 Scene',
            effectActor: buildTurnEffectActorData('A4 Effect Actor'),
            effectAbilities: [buildPersistentDamageAbilityData('A4 PD', 1)],
            otherActor: buildTurnEffectActorData('A4 Other Actor'),
            effectInitiative: 10,
            otherInitiative: 20,
            observerUserName: 'E2E Player 1',
         };
         const ids = await gm.evaluate(seedCombatEncounter, seed);

         try {
            const before = await gm.evaluate(
               (id) => game.actors.get(id).system.resource.stamina.value,
               ids.effectActorId,
            );

            // Forward: apply the persistent damage.
            await gm.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);
            await player.waitForFunction(
               ({ id, expected }) => game.actors.get(id)?.system.resource.stamina.value === expected,
               { id: ids.effectActorId, expected: before - 1 },
               { timeout: 15_000 },
            );

            // Backward: previousTurn reverts the damage.
            await gm.evaluate((combatId) => game.combats.get(combatId).previousTurn(), ids.combatId);
            await player.waitForFunction(
               ({ id, expected }) => game.actors.get(id)?.system.resource.stamina.value === expected,
               { id: ids.effectActorId, expected: before },
               { timeout: 15_000 },
            );
         }
         finally {
            await gm.evaluate(teardownCombatEncounter, ids);
         }
      });
   });
```

- [ ] **Step 2: Run the test — verify behavior**

Run: `npx playwright test socket-sync.spec.js -g "A4" --reporter=list`
Expected: PASS. Note: `previousTurn` only emits when `turns.length > 1` and moves from turn 1 back to turn 0; the revert path (`onTurnStartReverted`) targets the displaced (effect) combatant. If the revert does not restore `before`, confirm the auto-revert setting and that the forward step actually advanced to turn 1.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/socket-sync.spec.js
git commit -m "test(e2e): 4a — A4 previousTurn reversion replicates"
```

---

### Task 9: A5 — system-socket relay + exactly-once (two GM clients)

**Files:**
- Modify: `tests/e2e/socket-sync.spec.js`

This is the load-bearing test: a **non-best-owner GM** (GM 2) advances the turn; the `system.titan` socket
relays `combatNextTurn` to the **best owner** (GM 1), who applies the effect exactly once.

- [ ] **Step 1: Write the failing test**

Add inside the describe in `tests/e2e/socket-sync.spec.js`:

```javascript
   test('A5: a non-best-owner GM advancing the turn triggers exactly one apply by the best owner', async ({ browser }) => {
      await withClients(browser, { gm1: 'E2E GM 1', gm2: 'E2E GM 2' }, async ({ gm1, gm2 }) => {
         // GM 1 is the first active GM → the best owner / sole applier. Pin the setting on it.
         await setWorldSetting(gm1, 'autoApplyPersistentDamage', 'enabled');

         // Confirm best-owner identity from GM 1's perspective.
         const gm1IsBestOwner = await gm1.evaluate(() => {
            const activeGMs = game.users.filter((u) => u.active && u.isGM);
            return activeGMs.length > 0 && activeGMs[0].id === game.user.id;
         });
         expect(gm1IsBestOwner, 'GM 1 must be the first active GM').toBe(true);

         const seed = {
            sceneName: 'A5 Scene',
            effectActor: buildTurnEffectActorData('A5 Effect Actor'),
            effectAbilities: [buildPersistentDamageAbilityData('A5 PD', 1)],
            otherActor: buildTurnEffectActorData('A5 Other Actor'),
            effectInitiative: 10,
            otherInitiative: 20,
         };
         const ids = await gm1.evaluate(seedCombatEncounter, seed);

         try {
            const before = await gm1.evaluate(
               (id) => game.actors.get(id).system.resource.stamina.value,
               ids.effectActorId,
            );

            // GM 2 (NOT the best owner) advances the turn.
            await gm2.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);

            // The effect is applied exactly once (before - 1), observed on GM 2's client (replicated).
            await gm2.waitForFunction(
               ({ id, expected }) => game.actors.get(id)?.system.resource.stamina.value === expected,
               { id: ids.effectActorId, expected: before - 1 },
               { timeout: 15_000 },
            );

            // Re-read on GM 1 to confirm no double-apply (still before - 1, not before - 2).
            const onGm1 = await gm1.evaluate(
               (id) => game.actors.get(id).system.resource.stamina.value,
               ids.effectActorId,
            );
            expect(onGm1).toBe(before - 1);
         }
         finally {
            await gm1.evaluate(teardownCombatEncounter, ids);
         }
      });
   });
```

- [ ] **Step 2: Run the test — verify behavior**

Run: `npx playwright test socket-sync.spec.js -g "A5" --reporter=list`
Expected: PASS. This proves the relay: GM 2 advanced but GM 1 applied. If the value never changes, the `system.titan` socket relay is broken (GM 2 ran the hook locally but isn't best owner, GM 1 never received it). If the value is `before - 2`, both GMs applied — a real exactly-once bug; log it and follow the prior-phase bug-fix flow.

- [ ] **Step 3: Run the whole Group A file**

Run: `npx playwright test socket-sync.spec.js --reporter=list`
Expected: 5 passed (A1–A5).

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/socket-sync.spec.js
git commit -m "test(e2e): 4a — A5 system-socket relay + exactly-once write (two GM clients)"
```

---

## Phase B — Permissions / visibility

### Task 10: B1 — sheet ownership levels

**Files:**
- Create: `tests/e2e/permissions-ownership.spec.js`

Assert via app/document state (robust) rather than DOM: a Player at each ownership level on an actor sees
the correct sheet visibility/editability.

- [ ] **Step 1: Write the failing tests**

Create `tests/e2e/permissions-ownership.spec.js`:

```javascript
import { expect, test } from '@playwright/test';
import { withClients } from './multiClient.js';
import { buildTurnEffectActorData } from '../shared/builders.js';

test.describe('permissions — sheet ownership levels', () => {
   /**
    * Seeds one actor with a specific ownership level for the named player, on the GM client.
    * @param {import('@playwright/test').Page} gm - The GM client.
    * @param {string} actorName - The actor name.
    * @param {string} playerName - The player display name to grant the level to.
    * @param {string} levelKey - One of NONE/LIMITED/OBSERVER/OWNER.
    * @returns {Promise<string>} The created actor id.
    */
   async function seedOwnedActor(gm, actorName, playerName, levelKey) {
      return gm.evaluate(
         async ({ actorName, playerName, levelKey }) => {
            const stale = game.actors.getName(actorName);
            if (stale) {
               await stale.delete();
            }
            const player = game.users.getName(playerName);
            const level = CONST.DOCUMENT_OWNERSHIP_LEVELS[levelKey];
            const actor = await Actor.create({
               name: actorName,
               type: 'player',
               ownership: { [player.id]: level },
            });
            return actor.id;
         },
         { actorName, playerName, levelKey },
      );
   }

   /**
    * Reads the player client's view of an actor's sheet permission state.
    * @param {import('@playwright/test').Page} player - The player client.
    * @param {string} actorId - The actor id.
    * @returns {Promise<{visible: boolean, editable: boolean, rendered: boolean}>} The sheet state.
    */
   async function readSheetState(player, actorId) {
      return player.evaluate(async (id) => {
         const actor = game.actors.get(id);
         // testUserPermission is the source of truth; render to confirm visibility gating.
         const visible = actor ? actor.testUserPermission(game.user, 'OBSERVER') : false;
         const editable = actor ? actor.testUserPermission(game.user, 'OWNER') : false;
         let rendered = false;
         if (actor) {
            await actor.sheet.render(true);
            await new Promise((resolve) => setTimeout(resolve, 400));
            rendered = actor.sheet.rendered === true && actor.sheet.isVisible === true;
            await actor.sheet.close();
         }
         return { visible, editable, rendered };
      }, actorId);
   }

   test('OWNER: player can view and edit', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         const id = await seedOwnedActor(gm, 'B1 Owner Actor', 'E2E Player 1', 'OWNER');
         try {
            await player.waitForFunction((id) => !!game.actors.get(id), id, { timeout: 15_000 });
            const state = await readSheetState(player, id);
            expect(state.visible).toBe(true);
            expect(state.editable).toBe(true);
            expect(state.rendered).toBe(true);
         }
         finally {
            await gm.evaluate((id) => game.actors.get(id)?.delete(), id);
         }
      });
   });

   test('OBSERVER: player can view but not edit', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         const id = await seedOwnedActor(gm, 'B1 Observer Actor', 'E2E Player 1', 'OBSERVER');
         try {
            await player.waitForFunction((id) => !!game.actors.get(id), id, { timeout: 15_000 });
            const state = await readSheetState(player, id);
            expect(state.visible).toBe(true);
            expect(state.editable).toBe(false);
            expect(state.rendered).toBe(true);
         }
         finally {
            await gm.evaluate((id) => game.actors.get(id)?.delete(), id);
         }
      });
   });

   test('LIMITED: player can view (limited) but not edit', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         const id = await seedOwnedActor(gm, 'B1 Limited Actor', 'E2E Player 1', 'LIMITED');
         try {
            await player.waitForFunction((id) => !!game.actors.get(id), id, { timeout: 15_000 });
            // LIMITED meets the default viewPermission (LIMITED) so the sheet is visible, but not editable.
            const state = await player.evaluate((id) => {
               const actor = game.actors.get(id);
               return {
                  view: actor.testUserPermission(game.user, 'LIMITED'),
                  observer: actor.testUserPermission(game.user, 'OBSERVER'),
                  editable: actor.testUserPermission(game.user, 'OWNER'),
               };
            }, id);
            expect(state.view).toBe(true);
            expect(state.observer).toBe(false);
            expect(state.editable).toBe(false);
         }
         finally {
            await gm.evaluate((id) => game.actors.get(id)?.delete(), id);
         }
      });
   });

   test('NONE: player cannot see the actor', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         const id = await seedOwnedActor(gm, 'B1 None Actor', 'E2E Player 1', 'NONE');
         try {
            // With NONE (and no default ownership), the player should not even have the actor in their collection.
            const state = await player.evaluate((id) => {
               const actor = game.actors.get(id);
               if (!actor) {
                  return { present: false, view: false };
               }
               return { present: true, view: actor.testUserPermission(game.user, 'LIMITED') };
            }, id);
            expect(state.view).toBe(false);
         }
         finally {
            await gm.evaluate((id) => game.actors.get(id)?.delete(), id);
         }
      });
   });
});
```

- [ ] **Step 2: Run the tests — verify behavior**

Run: `npx playwright test permissions-ownership.spec.js --reporter=list`
Expected: 4 passed. If NONE shows the actor as present-and-viewable, the world's default Actor ownership is not NONE — read the actor's `ownership.default` and assert on `testUserPermission` accordingly (the player must resolve to below LIMITED). If `readSheetState` errors on a TITAN sheet at LIMITED/OBSERVER, capture the error — it may be a real bug in the sheet's limited-mode handling; log and follow the bug-fix flow.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/permissions-ownership.spec.js
git commit -m "test(e2e): 4b — B1 sheet ownership levels (NONE/LIMITED/OBSERVER/OWNER)"
```

---

### Task 11: B3 — compendium ownership (manifest vs runtime)

**Files:**
- Create: `tests/e2e/permissions-compendium.spec.js`

- [ ] **Step 1: Write the failing test**

Create `tests/e2e/permissions-compendium.spec.js`. It parses `system.json` via Node `fs` (Phase 3c
pattern) for the ground-truth declared ownership, then asserts the live per-client level:

```javascript
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { withClients } from './multiClient.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SYSTEM_JSON = resolve(HERE, '../../system.json');

test.describe('permissions — compendium ownership', () => {
   test('effects pack declares PLAYER:OBSERVER and a player client resolves OBSERVER (not OWNER)', async ({ browser }) => {
      // Ground truth from the manifest.
      const manifest = JSON.parse(readFileSync(SYSTEM_JSON, 'utf8'));
      const effectsPack = manifest.packs.find((p) => p.name === 'effects');
      expect(effectsPack, 'effects pack must be declared').toBeTruthy();
      expect(effectsPack.ownership.PLAYER).toBe('OBSERVER');
      expect(effectsPack.ownership.ASSISTANT).toBe('OWNER');

      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         // The GM (gamemaster role) is always OWNER (level 3) on system packs.
         const gmLevel = await gm.evaluate(() => game.packs.get('titan.effects').getUserLevel(game.user));
         expect(gmLevel).toBe(3);

         // A basic player resolves the declared PLAYER level: OBSERVER (2), not OWNER (3).
         const playerLevel = await player.evaluate(() => game.packs.get('titan.effects').getUserLevel(game.user));
         expect(playerLevel).toBe(2);
         expect(playerLevel).toBeLessThan(3);
      });
   });
});
```

- [ ] **Step 2: Run the test — verify behavior**

Run: `npx playwright test permissions-compendium.spec.js --reporter=list`
Expected: PASS. If `getUserLevel` is not a function in v14, switch to the v14-correct accessor — read `CompendiumCollection` in the Foundry source (`C:\FoundryVTT\V14\foundry\client\documents\collections\compendium-collection.mjs`) for the method that returns a user's permission level (e.g. `getUserLevel` / `testUserPermission`), and adjust. If the basic player resolves something other than OBSERVER(2), reconcile against `effectsPack.ownership.PLAYER`.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/permissions-compendium.spec.js
git commit -m "test(e2e): 4b — B3 compendium ownership (manifest vs runtime, per client)"
```

---

### Task 12: B4 — auto-open sheet settings (client scope)

**Files:**
- Create: `tests/e2e/permissions-auto-open.spec.js`

`autoOpenCharacterSheetsGM` / `autoOpenCharacterSheetsPlayer` are **client scope** — set on the specific
client whose behavior is tested. Auto-open happens in `onTurnStart` for whichever character's turn begins.

- [ ] **Step 1: Write the failing tests**

Create `tests/e2e/permissions-auto-open.spec.js`:

```javascript
import { expect, test } from '@playwright/test';
import { withClients } from './multiClient.js';
import { setClientSetting } from './settings.js';
import { seedCombatEncounter, teardownCombatEncounter } from '../shared/combat.js';
import { buildTurnEffectActorData } from '../shared/builders.js';

test.describe('permissions — auto-open character sheets', () => {
   test('GM "all": the current actor sheet auto-opens on the GM client at turn start', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1' }, async ({ gm }) => {
         await setClientSetting(gm, 'autoOpenCharacterSheetsGM', 'all');

         // Effect actor at lower initiative → its turn starts after one nextTurn.
         const seed = {
            sceneName: 'B4 All Scene',
            effectActor: buildTurnEffectActorData('B4 All Actor'),
            otherActor: buildTurnEffectActorData('B4 All Other'),
            effectInitiative: 10,
            otherInitiative: 20,
         };
         const ids = await gm.evaluate(seedCombatEncounter, seed);

         try {
            // Ensure no sheet is open beforehand.
            await gm.evaluate((id) => game.actors.get(id).sheet.close(), ids.effectActorId);

            await gm.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);

            // The effect actor's sheet auto-renders on the GM client.
            await gm.waitForFunction(
               (id) => game.actors.get(id)?.sheet?.rendered === true,
               ids.effectActorId,
               { timeout: 15_000 },
            );
         }
         finally {
            await gm.evaluate((id) => game.actors.get(id)?.sheet?.close(), ids.effectActorId);
            await gm.evaluate(teardownCombatEncounter, ids);
         }
      });
   });

   test('GM "disabled": no sheet auto-opens on the GM client at turn start', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1' }, async ({ gm }) => {
         await setClientSetting(gm, 'autoOpenCharacterSheetsGM', 'disabled');

         const seed = {
            sceneName: 'B4 Off Scene',
            effectActor: buildTurnEffectActorData('B4 Off Actor'),
            otherActor: buildTurnEffectActorData('B4 Off Other'),
            effectInitiative: 10,
            otherInitiative: 20,
         };
         const ids = await gm.evaluate(seedCombatEncounter, seed);

         try {
            await gm.evaluate((id) => game.actors.get(id).sheet.close(), ids.effectActorId);
            await gm.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);

            // Give the turn-start handler time to run, then assert the sheet stayed closed.
            await gm.evaluate(() => new Promise((r) => setTimeout(r, 1000)));
            const rendered = await gm.evaluate(
               (id) => game.actors.get(id)?.sheet?.rendered === true,
               ids.effectActorId,
            );
            expect(rendered).toBe(false);
         }
         finally {
            await gm.evaluate((id) => game.actors.get(id)?.sheet?.close(), ids.effectActorId);
            await gm.evaluate(teardownCombatEncounter, ids);
         }
      });
   });
});
```

- [ ] **Step 2: Run the tests — verify behavior**

Run: `npx playwright test permissions-auto-open.spec.js --reporter=list`
Expected: 2 passed. Note: `autoOpenCharacterSheetsGM: 'all'` opens for any character; `'npcsOnly'`/`'pcsOnly'` branch on `hasPlayerOwner` — if you extend coverage to those, seed the effect actor with/without a player OWNER accordingly. The `'disabled'` test uses a bounded settle (1s) because it asserts a non-event; this is acceptable for a negative assertion.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/permissions-auto-open.spec.js
git commit -m "test(e2e): 4b — B4 auto-open sheet settings (client scope, GM all/disabled)"
```

---

## Finalize

### Task 13: Full suite, docs, status update

**Files:**
- Modify: `docs/superpowers/e2e-suite-status.md`
- Modify: `.claude/skills/titan-codebase/references/conventions.md` (if a reusable gotcha emerged)

- [ ] **Step 1: Run the unit suite**

Run: `npx vitest run`
Expected: 35 passing (unchanged — Phase 4 adds no unit tests).

- [ ] **Step 2: Run the full e2e suite on the e2e bundle**

Run: `npm run build:e2e` then `npx playwright test --reporter=list`
Expected: prior 298 + new Phase 4 tests. New count: 1 (Task1) + 1 (Task4) + 5 (A1–A5) + 4 (B1) + 1 (B3) + 2 (B4) = **14 new → ~312 passing**. Record the exact number observed.

- [ ] **Step 3: Update the status doc**

Edit `docs/superpowers/e2e-suite-status.md`: flip the header "Next action" to a Phase 4 DONE summary, add a "Phase 4 — DONE" section describing the two-client harness (`multiClient.js`/`settings.js`/`combat.js`), the socket-relay finding (A5: best owner applies; system socket relays the hook), the B1/B3/B4 permission coverage, and any bugs found (with the bug-log entry). Update the suite total to the observed number.

- [ ] **Step 4: Update conventions (only if a durable gotcha emerged)**

If a reusable fact surfaced (e.g. the exact resolve-regain cap math, a v14 compendium permission API, or a real bug), add it to `.claude/skills/titan-codebase/references/conventions.md` and report the one-line change.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/e2e-suite-status.md .claude/skills/titan-codebase/references/conventions.md
git commit -m "docs(e2e): Phase 4 complete — multi-user permissions + socket sync (~312 e2e)"
```

---

## Notes for the implementer

- **Run each spec with Foundry up on `:30000`** (or let the `webServer` config launch it). These are
  test-only files — no `npm run build:e2e` needed unless a bug fix touches `src/`.
- **Never add fixed sleeps for positive assertions** — poll the document with `page.waitForFunction`.
  The only bounded sleep allowed is the B4 `'disabled'` negative-assertion settle.
- **Two GM sessions** (A5) is intentional and supported — distinct contexts, distinct sessions.
- **If a test reveals a real engine bug**, stop and follow the prior-phase flow: TDD red→green, route
  the `src/` fix through the `titan-svelte-dev` subagent, rebuild with `npm run build:e2e`, log the bug
  in the status doc's bug list.
- **Empirical values** (base stamina/resolve max, resolve-regain math, the v14 compendium permission
  method) are pinned by a "run, read the real value, lock the assertion" step inside the relevant task —
  these are integration realities to confirm against the live world, not placeholders to invent.
