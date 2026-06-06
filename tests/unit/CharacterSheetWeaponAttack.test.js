import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CharacterSheetWeaponAttack
   from '~/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttack.svelte';

/**
 * Builds a stub embedded-weapon bridge for the 'document' context, exposing one attack at
 * `data.system.attack[0]`. Renders unequipped so the header takes the plain-label branch.
 * @param {object} [options] - Optional overrides for the weapon stub.
 * @param {object} [options.attackOverrides] - Field overrides merged onto the default attack.
 * @param {boolean} [options.multiAttack] - Whether the weapon is multi attacking.
 * @param {object[]} [options.customTrait] - Weapon-level custom traits.
 * @returns {object} The stub bridge for the 'document' context.
 */
function makeWeaponBridge({ attackOverrides = {}, multiAttack = false, customTrait = [] } = {}) {
   /** @type {object} The default attack used across the cases. */
   const attack = {
      label: 'Strike',
      type: 'melee',
      damage: 3,
      plusExtraSuccessDamage: false,
      range: 1,
      attribute: 'body',
      skill: 'meleeWeapons',
      trait: [
         {
            name: 'piercing',
            value: false,
         },
      ],
      customTrait: [],
      ...attackOverrides,
   };

   return {
      data: {
         _id: 'w1',
         isOwner: true,
         system: {
            attack: [attack],
            multiAttack: multiAttack,
            equipped: false,
            customTrait: customTrait,
         },
      },
   };
}

/**
 * Builds a stub actor bridge for the 'sheetDocument' context.
 * @param {object} [options] - Optional overrides for the actor stub.
 * @param {number} [options.bodyValue] - The Body attribute value.
 * @param {Function} [options.getAttackCheckMod] - The conditional-check-modifier stub.
 * @returns {object} The stub bridge for the 'sheetDocument' context.
 */
function makeActorBridge({ bodyValue = 2, getAttackCheckMod = () => 0 } = {}) {
   return {
      data: {
         id: 'a1',
         system: {
            attribute: {
               body: {
                  value: bodyValue,
               },
            },
            skill: {
               meleeWeapons: {
                  training: {
                     value: 1,
                  },
                  expertise: {
                     value: 2,
                  },
               },
            },
            getAttackCheckMod: getAttackCheckMod,
         },
      },
   };
}

/**
 * Builds a recording getAttackCheckMod stub returning a distinct value per modifier type.
 * @returns {Function} A vi.fn returning dice=1, training=10, expertise=2, damage=4.
 */
function makeCheckModStub() {
   /** @type {Record<string, number>} Distinct conditional mod per modifier type. */
   const mods = {
      dice: 1,
      training: 10,
      expertise: 2,
      damage: 4,
   };
   return vi.fn((modifierType) => mods[modifierType] ?? 0);
}

/**
 * Renders the attack row with both context bridges.
 * @param {object} weapon - The 'document' (embedded weapon) bridge stub.
 * @param {object} actor - The 'sheetDocument' (actor) bridge stub.
 * @returns {object} The testing-library render result.
 */
function renderRow(weapon, actor) {
   return render(CharacterSheetWeaponAttack, {
      props: {
         attackIdx: 0,
      },
      context: new Map([
         ['document', weapon],
         ['sheetDocument', actor],
      ]),
   });
}

describe('CharacterSheetWeaponAttack', () => {
   beforeEach(() => {
      // localize() routes through game.i18n; identity-stub it for unit renders.
      globalThis.game = {
         i18n: {
            localize: (key) => key,
         },
      };
   });

   it('requests every conditional mod with the engine call shape', () => {
      /** @type {Function} Recording conditional-mod stub. */
      const getAttackCheckMod = makeCheckModStub();
      renderRow(
         makeWeaponBridge({
            customTrait: [
               {
                  name: 'Big Trait',
               },
            ],
         }),
         makeActorBridge({ getAttackCheckMod }),
      );

      // Every modifier type is requested with (type, attribute, skill, multiAttack, attackType, traits, customs).
      for (const modifierType of ['dice', 'training', 'expertise', 'damage']) {
         expect(getAttackCheckMod).toHaveBeenCalledWith(
            modifierType,
            'body',
            'meleeWeapons',
            false,
            'melee',
            ['piercing'],
            ['bigTrait'],
         );
      }
   });

   it('routes each conditional mod into the matching tag value', () => {
      renderRow(
         makeWeaponBridge(),
         makeActorBridge({ getAttackCheckMod: makeCheckModStub() }),
      );

      // Dice = body 2 + trainingDice (1 + 10) + dice mod 1.
      expect(screen.getByTestId('attack-row-dice').querySelector('.value').textContent).toBe('14');

      // Training = skill training 1 + training mod 10, folded in before any halving.
      expect(screen.getByTestId('attack-row-training').querySelector('.value').textContent).toBe('11');

      // Expertise = skill expertise 2 + expertise mod 2.
      expect(screen.getByTestId('attack-row-expertise').querySelector('.value').textContent).toBe('4');

      // Damage = intrinsic 3 + damage mod 4, rendered by the shared AttackTags.
      expect(screen.getByTestId('attack-tags-damage').querySelector('.value').textContent).toBe('7');
   });

   it('rounds the halved multi-attack pool up with flurry and down without', () => {
      // Base pool = body 3 + trainingDice (1 + 10) + dice mod 1 = 15 (odd, so ceil and floor differ).
      /** @type {object} Render of the flurry multi-attack case. */
      const flurryRender = renderRow(
         makeWeaponBridge({
            multiAttack: true,
            attackOverrides: {
               trait: [
                  {
                     name: 'flurry',
                     value: false,
                  },
               ],
            },
         }),
         makeActorBridge({
            bodyValue: 3,
            getAttackCheckMod: makeCheckModStub(),
         }),
      );
      expect(screen.getByTestId('attack-row-dice').querySelector('.value').textContent).toBe('8');
      flurryRender.unmount();

      renderRow(
         makeWeaponBridge({ multiAttack: true }),
         makeActorBridge({
            bodyValue: 3,
            getAttackCheckMod: makeCheckModStub(),
         }),
      );
      expect(screen.getByTestId('attack-row-dice').querySelector('.value').textContent).toBe('7');
   });
});
