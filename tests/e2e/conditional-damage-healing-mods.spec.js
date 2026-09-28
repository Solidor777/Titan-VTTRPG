import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { deleteFixtureActor } from './world.js';

/**
 * Conditional check modifiers of type damage and healing are the system's damage and healing bonuses: an
 * any-check/any-selector modifier applies to every attack, casting, and item check, and check-specific
 * modifiers stack on top.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Damage Healing Mods Actor';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   await login(page);
});

test.afterAll(async () => {
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

test('damage and healing conditional modifiers apply to attack, casting, and item checks', async () => {
   const mods = await page.evaluate(async (actorName) => {
      const stale = game.actors.getName(actorName);
      if (stale) {
         await stale.delete();
      }
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });
      await actor.createEmbeddedDocuments('Item', [
         {
            name: 'E2E Damage Healing Source',
            type: 'ability',
            system: {
               rulesElement: [
                  {
                     operation: 'conditionalCheckModifier',
                     modifierType: 'damage',
                     checkType: 'any',
                     selector: 'any',
                     key: '',
                     value: 2,
                     uuid: 'e2e00000-0000-4000-a000-000000000021',
                  },
                  {
                     operation: 'conditionalCheckModifier',
                     modifierType: 'healing',
                     checkType: 'any',
                     selector: 'any',
                     key: '',
                     value: 3,
                     uuid: 'e2e00000-0000-4000-a000-000000000022',
                  },
                  {
                     operation: 'conditionalCheckModifier',
                     modifierType: 'damage',
                     checkType: 'attack',
                     selector: 'any',
                     key: '',
                     value: 1,
                     uuid: 'e2e00000-0000-4000-a000-000000000023',
                  },
               ],
            },
         },
         {
            name: 'E2E Mods Weapon',
            type: 'weapon',
         },
         {
            name: 'E2E Mods Spell',
            type: 'spell',
         },
         {
            name: 'E2E Mods Kit',
            type: 'ability',
            system: {
               check: [
                  {
                     attribute: 'mind',
                     complexity: 1,
                     damageReducedBy: 'none',
                     difficulty: 4,
                     initialValue: 1,
                     isDamage: true,
                     isHealing: false,
                     label: 'Treat',
                     opposedCheck: {
                        attribute: 'body',
                        enabled: false,
                        skill: 'athletics',
                     },
                     resistanceCheck: 'none',
                     resolveCost: 0,
                     scaling: false,
                     skill: 'medicine',
                     uuid: 'e2e00000-0000-4000-a000-000000000024',
                  },
               ],
            },
         },
      ]);

      const weapon = actor.items.getName('E2E Mods Weapon');
      const attack = actor.system.initializeAttackCheckOptions({
         itemId: weapon.id,
         attackIdx: 0,
      });
      const casting = actor.system.initializeCastingCheckOptions({
         itemId: actor.items.getName('E2E Mods Spell').id,
      });
      const item = actor.system.initializeItemCheckOptions({
         itemId: actor.items.getName('E2E Mods Kit').id,
         checkIdx: 0,
      });
      return {
         weaponHasAttack: weapon.system.attack.length > 0,
         attackDamage: attack.damageMod,
         castingDamage: casting.damageMod,
         castingHealing: casting.healingMod,
         itemDamage: item.damageMod,
         itemHealing: item.healingMod,
      };
   }, ACTOR_NAME);

   expect(mods).toEqual({
      weaponHasAttack: true,
      attackDamage: 3,
      castingDamage: 2,
      castingHealing: 3,
      itemDamage: 2,
      itemHealing: 3,
   });
});
