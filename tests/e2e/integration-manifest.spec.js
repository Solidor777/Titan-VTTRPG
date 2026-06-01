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
         expect(found, `pack titan.${entry.name} resolved`).toBeDefined();
         expect(found.missing, `pack titan.${entry.name} must be loaded`).toBeFalsy();
         expect(found.type, `pack titan.${entry.name} type`).toBe(entry.type);
         expect(found.packageName, `pack titan.${entry.name} packageName`).toBe('titan');
      }
   });

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

   // The runtime document classes must be Titan subclasses that override the Foundry base classes in
   // OnceInit. The production build minifies class names, so identity is checked structurally (a proper
   // subclass of, and not equal to, the Foundry base) rather than by constructor name.
   test('base documents are overridden by Titan subclasses', async ({ page }) => {
      // For each base document, whether CONFIG's class overrides and subclasses the Foundry base global.
      const result = await page.evaluate(() => {
         // Reports whether a configured document class overrides and subclasses the given base class.
         const check = (configClass, baseClass) => ({
            overridden: configClass !== baseClass,
            subclass: configClass.prototype instanceof baseClass,
         });
         return {
            Actor: check(CONFIG.Actor.documentClass, Actor),
            Item: check(CONFIG.Item.documentClass, Item),
            ActiveEffect: check(CONFIG.ActiveEffect.documentClass, ActiveEffect),
            ChatMessage: check(CONFIG.ChatMessage.documentClass, ChatMessage),
            Combat: check(CONFIG.Combat.documentClass, Combat),
         };
      });

      // Every base document must be overridden by a proper Titan subclass.
      for (const documentName of ['Actor', 'Item', 'ActiveEffect', 'ChatMessage', 'Combat']) {
         expect(result[documentName].overridden, `${documentName} documentClass overridden`).toBe(true);
         expect(result[documentName].subclass, `${documentName} documentClass subclasses the base`).toBe(true);
      }
   });

   // Every declared Actor/Item subtype must have a titan-scoped sheet registered AND set as the default,
   // the core AppV1 sheets must be unregistered, and the ActiveEffect titan sheet must be default. Class
   // names are minified in the build, so a titan sheet is identified by its `titan.`-scoped registration
   // id prefix rather than an exact class name.
   test('per-subtype Titan sheets are registered as default and core sheets are unregistered', async ({ page }) => {
      // The declared Actor/Item subtypes whose default-sheet registration is asserted.
      const subtypes = {
         Actor: ['player', 'npc'],
         Item: ['ability', 'armor', 'commodity', 'equipment', 'shield', 'spell', 'weapon'],
      };

      // Inspect the live sheet-registration maps (CONFIG[doc].sheetClasses[subtype]).
      const result = await page.evaluate(({ subtypes }) => {
         // Summarises one subtype's registration: a default titan-scoped sheet present, core sheets absent.
         const inspect = (documentName, subtype) => {
            const map = CONFIG[documentName].sheetClasses[subtype] ?? {};
            const titanEntries = Object.entries(map).filter(([id]) => id.startsWith('titan.'));
            return {
               hasTitanSheet: titanEntries.length > 0,
               titanIsDefault: titanEntries.some(([, cfg]) => cfg.default === true),
               hasCoreActorSheet: 'core.ActorSheet' in map,
               hasCoreItemSheet: 'core.ItemSheet' in map,
            };
         };

         const out = { Actor: {}, Item: {}, ActiveEffect: {} };
         for (const subtype of subtypes.Actor) {
            out.Actor[subtype] = inspect('Actor', subtype);
         }
         for (const subtype of subtypes.Item) {
            out.Item[subtype] = inspect('Item', subtype);
         }
         // The ActiveEffect sheet is registered with no types, so it lands under the 'effect' subtype map.
         out.ActiveEffect.effect = inspect('ActiveEffect', 'effect');
         return out;
      }, { subtypes });

      // Every declared Actor/Item subtype: a titan-scoped sheet is registered AND is the default.
      for (const documentName of ['Actor', 'Item']) {
         for (const subtype of subtypes[documentName]) {
            const r = result[documentName][subtype];
            expect(r.hasTitanSheet, `${documentName}.${subtype} titan sheet registered`).toBe(true);
            expect(r.titanIsDefault, `${documentName}.${subtype} titan sheet is default`).toBe(true);
         }
      }

      // The core AppV1 sheets are unregistered (sampled on one subtype per base document).
      expect(result.Actor.player.hasCoreActorSheet, 'core ActorSheet unregistered').toBe(false);
      expect(result.Item.weapon.hasCoreItemSheet, 'core ItemSheet unregistered').toBe(false);

      // The ActiveEffect titan sheet is registered + default.
      expect(result.ActiveEffect.effect.hasTitanSheet, 'effect sheet registered').toBe(true);
      expect(result.ActiveEffect.effect.titanIsDefault, 'effect sheet is default').toBe(true);
   });

   // Runtime-only wiring set in OnceInit (not declared in the manifest): round time, the disabled legacy
   // effect transferral, and the custom initiative formula.
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
});
