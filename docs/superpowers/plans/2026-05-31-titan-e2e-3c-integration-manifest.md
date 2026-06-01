# Phase 3c — Integration Manifest Drift Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an e2e spec that guards against drift between the shipped `system.json` manifest and the live runtime registration (`OnceInit`/`OnceSetup`), and remove the dead `testChat` ChatMessage subtype.

**Architecture:** A single Playwright spec (`tests/e2e/integration-manifest.spec.js`) parses the shipped `system.json` from disk via Node `fs` (the manifest source of truth) and compares it against the live `CONFIG`/`game` state read through `page.evaluate`. Only JSON-serialisable data crosses the Node↔page boundary; class/sheet identity is compared by `constructor.name` / registration-map keys.

**Tech Stack:** Playwright (`@playwright/test`), the live Foundry VTT v14 on `:30000` (Playwright `webServer` auto-launches it), the existing `login()` fixture (`tests/e2e/fixtures.js`).

---

## Important notes for the implementer (read first)

- **No build step is required for any task.** This spec is test-only and introspects the already-built runtime. The one `src`-area edit (Task 2, `system.json`) is **not bundled** — Foundry serves it directly and the test reads it from disk via `fs`. The current live bundle (290 passing) is fine as-is.
- The manifest edit in Task 2 fully applies to the running world only on the next Foundry boot, but **no test depends on the live world reflecting it** — Task 2's runtime assertion only checks that no `testChat` dataModel exists (which was never registered).
- **Login is `E2E GM 1`** (the `login(page)` default). A ready GM world is required for settings/conditions/sheet introspection.
- **Run a single test** with: `npx playwright test integration-manifest --reporter=list -g "<title substring>"`. Foundry must be running; the Playwright `webServer` config launches it automatically if not.
- **Verified runtime shapes** (from the v14 source, do not re-derive):
  - Sheet registration: `CONFIG[documentName].sheetClasses[subtype]` is an object keyed by `` `${scope}.${SheetClass.name}` `` (e.g. `"titan.TitanPlayerSheet"`); each value is `{ id, label, cls, default, canBeDefault, canConfigure, themes }`. `default === true` marks the makeDefault sheet. `unregisterSheet('core', ActorSheet)` deletes the `"core.ActorSheet"` key from every subtype map.
  - Pack: `game.packs.get('titan.<name>')` → `.metadata.type` (the document type, e.g. `'ActiveEffect'`), `.metadata.packageName` (`'titan'`).
  - System doc: `game.system.grid.units` / `.diagonals`, `game.system.socket`.
  - Initiative: `CONFIG.Combat.initiative.formula` = `` `@rating.initiative.value${setting}` `` where `setting` defaults to `'+2d6'`. Assert the stable prefix only.

---

## Task 1: Spec scaffold + documentTypes ↔ dataModels parity

**Files:**
- Create: `tests/e2e/integration-manifest.spec.js`

- [ ] **Step 1: Create the spec with the manifest helper and the parity test**

Create `tests/e2e/integration-manifest.spec.js`:

```js
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { login } from './fixtures.js';

// Resolve and parse the shipped system.json once. This file is the manifest "source of truth": every test
// compares the actual shipped artifact against the live runtime registration (CONFIG / game).
const here = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.resolve(here, '../../system.json'), 'utf8'));

test.describe('integration manifest drift guard', () => {
   // A ready GM world is required for settings / conditions / sheet-registration introspection.
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   // The declared subtypes (system.json) must exactly equal the registered dataModels (CONFIG), both
   // directions: no declared subtype without a dataModel, and no orphan dataModel beyond what is declared.
   test('declared documentTypes match registered dataModels (Actor/Item/ActiveEffect)', async ({ page }) => {
      // The declared subtype keys per base document, read from the shipped manifest.
      const declared = {
         Actor: Object.keys(manifest.documentTypes.Actor ?? {}),
         Item: Object.keys(manifest.documentTypes.Item ?? {}),
         ActiveEffect: Object.keys(manifest.documentTypes.ActiveEffect ?? {}),
      };

      // The registered dataModel keys per base document, read from the live CONFIG.
      const registered = await page.evaluate(() => ({
         Actor: Object.keys(CONFIG.Actor.dataModels ?? {}),
         Item: Object.keys(CONFIG.Item.dataModels ?? {}),
         ActiveEffect: Object.keys(CONFIG.ActiveEffect.dataModels ?? {}),
      }));

      // Each base document's declared subtypes must equal its registered dataModels.
      for (const documentName of ['Actor', 'Item', 'ActiveEffect']) {
         expect(
            registered[documentName].sort(),
            `${documentName} dataModels must match declared documentTypes`,
         ).toEqual(declared[documentName].sort());
      }
   });
});
```

- [ ] **Step 2: Run the test (expect PASS — current wiring is correct)**

Run: `npx playwright test integration-manifest --reporter=list -g "declared documentTypes match"`
Expected: 1 passed. (This is a characterization assertion over already-correct wiring; it goes green immediately. If it fails, a real manifest/code drift exists — investigate before proceeding.)

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/integration-manifest.spec.js
git commit -m "test(e2e): 3c — documentTypes<->dataModels parity guard"
```

---

## Task 2: ChatMessage declares no subtypes + remove dead `testChat`

This is the one genuine red→green task: the test fails first because `testChat` is still in the manifest, then passes after the manifest edit.

**Files:**
- Modify: `tests/e2e/integration-manifest.spec.js` (append a test inside the `describe`)
- Modify: `system.json:40-42` (remove the `testChat` entry from `documentTypes.ChatMessage`)

- [ ] **Step 1: Append the ChatMessage test**

Add inside the `test.describe` block, after the parity test:

```js
   // ChatMessage uses the TitanChatMessage document class but declares no system subtypes. An unused
   // declared subtype (the former `testChat`) would surface in the type picker backed by no dataModel.
   test('ChatMessage declares no document subtypes', async ({ page }) => {
      // The manifest must declare zero ChatMessage subtypes.
      const declared = Object.keys(manifest.documentTypes.ChatMessage ?? {});
      expect(declared, 'ChatMessage should declare no subtypes').toEqual([]);

      // The live CONFIG must carry no `testChat` ChatMessage dataModel.
      const registered = await page.evaluate(() => Object.keys(CONFIG.ChatMessage.dataModels ?? {}));
      expect(registered, 'no testChat ChatMessage dataModel expected').not.toContain('testChat');
   });
```

- [ ] **Step 2: Run the test (expect FAIL — `testChat` still declared)**

Run: `npx playwright test integration-manifest --reporter=list -g "ChatMessage declares no"`
Expected: FAIL on the first assertion — `expect(['testChat']).toEqual([])`.

- [ ] **Step 3: Remove `testChat` from the manifest**

In `system.json`, change:

```json
      "ChatMessage": {
         "testChat": {}
      },
```

to:

```json
      "ChatMessage": {},
```

- [ ] **Step 4: Run the test (expect PASS)**

Run: `npx playwright test integration-manifest --reporter=list -g "ChatMessage declares no"`
Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/integration-manifest.spec.js system.json
git commit -m "test(e2e)+fix(manifest): 3c — drop dead testChat ChatMessage subtype"
```

---

## Task 3: Manifest packs are loaded with matching metadata

**Files:**
- Modify: `tests/e2e/integration-manifest.spec.js` (append a test)

- [ ] **Step 1: Append the packs test**

Add inside the `test.describe` block:

```js
   // Every pack declared in the manifest must resolve in the live world under the titan package, with the
   // declared document type.
   test('every manifest pack is loaded with matching metadata', async ({ page }) => {
      // The pack descriptors declared in the manifest.
      const declaredPacks = manifest.packs ?? [];
      expect(declaredPacks.length, 'manifest declares at least one pack').toBeGreaterThan(0);

      // Resolve each declared pack from the live world and read its metadata.
      const live = await page.evaluate((packs) => packs.map((entry) => {
         const pack = game.packs.get(`titan.${entry.name}`);
         return pack
            ? { name: entry.name, type: pack.metadata.type, packageName: pack.metadata.packageName }
            : { name: entry.name, missing: true };
      }), declaredPacks);

      // Each declared pack must resolve, belong to the titan system, and carry the declared document type.
      for (const entry of declaredPacks) {
         const found = live.find((p) => p.name === entry.name);
         expect(found.missing, `pack titan.${entry.name} must be loaded`).toBeFalsy();
         expect(found.type, `pack titan.${entry.name} type`).toBe(entry.type);
         expect(found.packageName, `pack titan.${entry.name} packageName`).toBe('titan');
      }
   });
```

- [ ] **Step 2: Run the test (expect PASS)**

Run: `npx playwright test integration-manifest --reporter=list -g "every manifest pack"`
Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/integration-manifest.spec.js
git commit -m "test(e2e): 3c — manifest packs loaded with matching metadata"
```

---

## Task 4: Grid and socket match the manifest

**Files:**
- Modify: `tests/e2e/integration-manifest.spec.js` (append a test)

- [ ] **Step 1: Append the grid/socket test**

Add inside the `test.describe` block:

```js
   // The runtime System document must expose the manifest's grid + socket declarations.
   test('grid and socket configuration match the manifest', async ({ page }) => {
      // The grid units/diagonals and socket flag, read from the live System document.
      const live = await page.evaluate(() => ({
         units: game.system.grid.units,
         diagonals: game.system.grid.diagonals,
         socket: game.system.socket,
      }));

      expect(live.units, 'grid units').toBe(manifest.grid.units);
      expect(live.diagonals, 'grid diagonals').toBe(manifest.grid.diagonals);
      expect(live.socket, 'socket flag matches manifest').toBe(manifest.socket);
      expect(manifest.socket, 'manifest declares socket enabled').toBe(true);
   });
```

- [ ] **Step 2: Run the test (expect PASS)**

Run: `npx playwright test integration-manifest --reporter=list -g "grid and socket"`
Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/integration-manifest.spec.js
git commit -m "test(e2e): 3c — grid and socket match the manifest"
```

---

## Task 5: Base documents use the Titan document subclasses

**Files:**
- Modify: `tests/e2e/integration-manifest.spec.js` (append a test)

- [ ] **Step 1: Append the documentClass identity test**

Add inside the `test.describe` block:

```js
   // The runtime document classes must be the Titan subclasses wired in OnceInit. Compared by
   // constructor name so the classes never have to cross the Node<->page boundary.
   test('base documents use the Titan document subclasses', async ({ page }) => {
      // The constructor names of the live document classes.
      const names = await page.evaluate(() => ({
         Actor: CONFIG.Actor.documentClass.name,
         Item: CONFIG.Item.documentClass.name,
         ActiveEffect: CONFIG.ActiveEffect.documentClass.name,
         ChatMessage: CONFIG.ChatMessage.documentClass.name,
         Combat: CONFIG.Combat.documentClass.name,
      }));

      expect(names).toEqual({
         Actor: 'TitanActor',
         Item: 'TitanItem',
         ActiveEffect: 'TitanActiveEffect',
         ChatMessage: 'TitanChatMessage',
         Combat: 'TitanCombat',
      });
   });
```

- [ ] **Step 2: Run the test (expect PASS)**

Run: `npx playwright test integration-manifest --reporter=list -g "Titan document subclasses"`
Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/integration-manifest.spec.js
git commit -m "test(e2e): 3c — document classes are the Titan subclasses"
```

---

## Task 6: Per-subtype Titan sheets registered as default; core AppV1 sheets unregistered

**Files:**
- Modify: `tests/e2e/integration-manifest.spec.js` (append a test)

- [ ] **Step 1: Append the sheet-registration test**

Add inside the `test.describe` block:

```js
   // Every Actor/Item subtype must have its titan sheet registered AND set as the default, the core AppV1
   // sheets must be unregistered, and the ActiveEffect titan sheet must be registered + default.
   test('per-subtype Titan sheets are registered as default and core sheets are unregistered', async ({ page }) => {
      // The declared subtypes paired with their expected titan sheet class name.
      const expectations = {
         Actor: { player: 'TitanPlayerSheet', npc: 'TitanNPCSheet' },
         Item: {
            ability: 'TitanAbilitySheet',
            armor: 'TitanArmorSheet',
            commodity: 'TitanCommoditySheet',
            equipment: 'TitanEquipmentSheet',
            shield: 'TitanShieldSheet',
            spell: 'TitanSpellSheet',
            weapon: 'TitanWeaponSheet',
         },
      };

      // Inspect the live sheet-registration maps (CONFIG[doc].sheetClasses[subtype]["titan.<Sheet>"]).
      const result = await page.evaluate(({ expectations }) => {
         // Reads one subtype's registration entry for the titan-scoped sheet and the core-sheet presence.
         const inspect = (documentName, subtype, sheetName) => {
            const map = CONFIG[documentName].sheetClasses[subtype] ?? {};
            const entry = map[`titan.${sheetName}`];
            return {
               registered: !!entry,
               isDefault: entry?.default === true,
               hasCoreActorSheet: 'core.ActorSheet' in map,
               hasCoreItemSheet: 'core.ItemSheet' in map,
            };
         };

         const out = { Actor: {}, Item: {}, ActiveEffect: {} };
         for (const [subtype, sheetName] of Object.entries(expectations.Actor)) {
            out.Actor[subtype] = inspect('Actor', subtype, sheetName);
         }
         for (const [subtype, sheetName] of Object.entries(expectations.Item)) {
            out.Item[subtype] = inspect('Item', subtype, sheetName);
         }
         // The ActiveEffect sheet is registered (no types passed) under the 'effect' subtype map.
         const effMap = CONFIG.ActiveEffect.sheetClasses.effect ?? {};
         const effEntry = effMap['titan.TitanActiveEffectSheet'];
         out.ActiveEffect.effect = { registered: !!effEntry, isDefault: effEntry?.default === true };
         return out;
      }, { expectations });

      // Every declared Actor/Item subtype: titan sheet registered AND default.
      for (const documentName of ['Actor', 'Item']) {
         for (const subtype of Object.keys(expectations[documentName])) {
            const r = result[documentName][subtype];
            expect(r.registered, `${documentName}.${subtype} titan sheet registered`).toBe(true);
            expect(r.isDefault, `${documentName}.${subtype} titan sheet is default`).toBe(true);
         }
      }

      // The core AppV1 sheets are unregistered (sampled on one subtype per base document).
      expect(result.Actor.player.hasCoreActorSheet, 'core ActorSheet unregistered').toBe(false);
      expect(result.Item.weapon.hasCoreItemSheet, 'core ItemSheet unregistered').toBe(false);

      // The ActiveEffect titan sheet is registered + default.
      expect(result.ActiveEffect.effect.registered, 'effect sheet registered').toBe(true);
      expect(result.ActiveEffect.effect.isDefault, 'effect sheet is default').toBe(true);
   });
```

- [ ] **Step 2: Run the test (expect PASS)**

Run: `npx playwright test integration-manifest --reporter=list -g "Titan sheets are registered"`
Expected: 1 passed. If it fails on the `sheetClasses` accessor (shape mismatch), dump `await page.evaluate(() => Object.keys(CONFIG.Actor.sheetClasses.player))` to confirm the key format `"titan.TitanPlayerSheet"` and adjust — but the v14 source confirms this shape.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/integration-manifest.spec.js
git commit -m "test(e2e): 3c — per-subtype sheets registered default, core sheets unregistered"
```

---

## Task 7: Runtime configuration flags are set by the system

**Files:**
- Modify: `tests/e2e/integration-manifest.spec.js` (append a test)

- [ ] **Step 1: Append the runtime-flags test**

Add inside the `test.describe` block:

```js
   // Runtime-only wiring set in OnceInit (not declared in the manifest): round time, the disabled
   // legacy effect transferral, and the custom initiative formula.
   test('runtime configuration flags are set by the system', async ({ page }) => {
      // The runtime config values, read from the live CONFIG.
      const config = await page.evaluate(() => ({
         roundTime: CONFIG.time.roundTime,
         legacyTransferral: CONFIG.ActiveEffect.legacyTransferral,
         initiativeFormula: CONFIG.Combat.initiative.formula,
      }));

      expect(config.roundTime, 'round time').toBe(6);
      expect(config.legacyTransferral, 'legacy transferral disabled').toBe(false);

      // The formula is `@rating.initiative.value` plus a settings-driven suffix (default `+2d6`); assert
      // the stable code-derived prefix rather than the settings-driven tail.
      expect(config.initiativeFormula, 'initiative formula prefix').toMatch(/^@rating\.initiative\.value/);
   });
```

- [ ] **Step 2: Run the test (expect PASS)**

Run: `npx playwright test integration-manifest --reporter=list -g "runtime configuration flags"`
Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/integration-manifest.spec.js
git commit -m "test(e2e): 3c — runtime config flags (roundTime/legacyTransferral/initiative)"
```

---

## Task 8: System conditions and settings are registered

**Files:**
- Modify: `tests/e2e/integration-manifest.spec.js` (append a test)

- [ ] **Step 1: Append the conditions/settings test**

Add inside the `test.describe` block:

```js
   // The system pushes its conditions onto CONFIG.statusEffects (OnceSetup) and registers its settings
   // (OnceInit). Assert the titan conditions are present and a representative set of settings is registered.
   test('system conditions and settings are registered', async ({ page }) => {
      // The condition ids the system pushes onto CONFIG.statusEffects.
      const expectedConditions = [
         'blinded', 'contaminated', 'dead', 'deafened', 'frightened', 'incapacitated',
         'prone', 'restrained', 'stunned', 'sleeping', 'unconscious',
      ];
      // A representative sample of registered setting keys (mix of scopes and value kinds).
      const expectedSettings = [
         'titan.migrationMode', 'titan.getCheckOptions', 'titan.initiativeFormula',
         'titan.staminaBaseMultiplier', 'titan.defaultAttribute.arcana', 'titan.defaultXpCost.ability',
      ];

      // Read the live status-effect ids and which sampled settings are missing.
      const result = await page.evaluate(({ expectedSettings }) => ({
         statusIds: CONFIG.statusEffects.map((e) => e.id),
         missingSettings: expectedSettings.filter((key) => !game.settings.settings.has(key)),
      }), { expectedSettings });

      // Every titan condition is present among the status effects.
      for (const id of expectedConditions) {
         expect(result.statusIds, `status effect ${id} registered`).toContain(id);
      }

      // Every sampled setting key is registered.
      expect(result.missingSettings, 'all sampled settings registered').toEqual([]);
   });
```

- [ ] **Step 2: Run the test (expect PASS)**

Run: `npx playwright test integration-manifest --reporter=list -g "conditions and settings"`
Expected: 1 passed.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/integration-manifest.spec.js
git commit -m "test(e2e): 3c — conditions and system settings registered"
```

---

## Task 9: Full-suite verification + documentation update

**Files:**
- Modify: `docs/superpowers/e2e-suite-status.md`
- Modify: `.claude/skills/titan-codebase/conventions.md` (add the manifest-drift-guard note)

- [ ] **Step 1: Rebuild the e2e bundle and run the full e2e suite**

Run: `npm run build:e2e` then `npx playwright test --reporter=list`
Expected: all previously-passing tests still pass (290) **plus the 8 new `integration-manifest` tests** = **298 passing**. (`build:e2e` is run to match suite discipline and keep the gated component probe available; this spec itself needs no build.)

- [ ] **Step 2: Run the unit suite (unaffected, sanity check)**

Run: `npx vitest run`
Expected: 35 passing.

- [ ] **Step 3: Update the status doc**

In `docs/superpowers/e2e-suite-status.md`: mark Phase 3c **DONE**; update the suite count to **298 passing**; note `tests/e2e/integration-manifest.spec.js` (8 tests) and the `testChat` manifest removal; update the "NEXT" section (Phase 3 complete → Phase 4 multi-user is next); update the `npx playwright test` expected count in the "How to verify" section.

- [ ] **Step 4: Add the conventions note**

In `.claude/skills/titan-codebase/conventions.md`, add a short entry: the manifest is the source of truth for declared subtypes/packs/grid/socket; `tests/e2e/integration-manifest.spec.js` guards it against runtime drift by parsing `system.json` (Node `fs`) and comparing against live `CONFIG`/`game`; `ChatMessage` declares no subtypes (the dead `testChat` was removed); the v14 sheet-registration shape is `CONFIG[doc].sheetClasses[subtype]["<scope>.<SheetClass.name>"]` with a `default` boolean.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/e2e-suite-status.md .claude/skills/titan-codebase/conventions.md
git commit -m "docs(e2e): Phase 3c complete (298 e2e), manifest drift guard + conventions"
```

---

## Self-review (completed by plan author)

- **Spec coverage:** documentTypes↔dataModels parity (Task 1) · ChatMessage no-subtypes + `testChat` removal (Task 2) · packs (Task 3) · grid+socket (Task 4) · documentClass identity (Task 5) · sheet registration + makeDefault + core-unregistered (Task 6) · runtime flags roundTime/legacyTransferral/initiative (Task 7) · conditions + settings (Task 8) · verification + docs (Task 9). Every assertion-matrix row in the design maps to a task.
- **Placeholder scan:** none — every step contains the actual test code or exact edit.
- **Type/name consistency:** `manifest` and the `here`/`fs`/`path` helper are defined once in Task 1 and reused; every appended test lives inside the single `test.describe` from Task 1; sheet class names match `OnceInit.js` (`TitanPlayerSheet`, `TitanNPCSheet`, `TitanAbilitySheet`, `TitanArmorSheet`, `TitanCommoditySheet`, `TitanEquipmentSheet`, `TitanShieldSheet`, `TitanSpellSheet`, `TitanWeaponSheet`, `TitanActiveEffectSheet`); condition ids match `Conditions.js`; setting keys match `SystemSettings.js`.
