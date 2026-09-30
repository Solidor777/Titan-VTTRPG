import localize from '~/helpers/utility-functions/Localize.js';
import sortAscending from '~/helpers/utility-functions/SortAscending.js';

/**
 * Builds a condition's "-¼ of their base value, rounded up" penalty: a `mulBase` element scaling the stat's base by ¾
 * and rounding the resulting value up (base 4 → 3, base 5 → 4; bases 1-3 keep their value). `mulBase` adds
 * `base × (value − 1)` per element, rounded per element, so two such conditions on one stat each subtract their own
 * rounded quarter of the base (base 8 → 4, base 6 → 4, base 7 → 5), the same as rounding each condition's resulting
 * value in sequence. Source: TITAN Rules Compendium, "Conditions" ("-¼ of base value, rounded up").
 * @param {string} conditionId - The condition id, which names the element's uuid (`condition-<id>-<uuidSuffix>`).
 * @param {string} selector - The stat type (`rating`, `attribute`, or `resistance`).
 * @param {string} key - The stat key, or `all` for every stat under the selector.
 * @param {string} [uuidSuffix] - The uuid's last segment; defaults to the key.
 * @returns {MulBaseElement} The element.
 */
function createQuarterBasePenalty(conditionId, selector, key, uuidSuffix = key) {
   return {
      operation: 'mulBase',
      selector,
      key,
      value: 0.75,
      rounding: 'up',
      uuid: `condition-${conditionId}-${uuidSuffix}`,
   };
}

/**
 * Builds the static list of TITAN condition definitions for CONFIG.statusEffects. Every condition is the
 * 'condition' Active Effect subtype; the mechanically-active conditions also carry a `system.rulesElement`
 * array expressing their stat effects (applied through the shared rules-element pipeline). This function is
 * pure (no game/localization access) so it can be unit-tested.
 * @returns {object[]} The condition definitions, each with id, name (localization key), img, type, and —
 * for mechanically-active conditions — system.rulesElement.
 */
export function buildConditionDefinitions() {
   return [
      {
         id: 'blinded',
         name: 'LOCAL.blinded.text',
         img: 'icons/svg/blind.svg',
         type: 'condition',
         system: {
            rulesElement: [
               createQuarterBasePenalty('blinded', 'rating', 'melee'),
               createQuarterBasePenalty('blinded', 'rating', 'accuracy'),
               createQuarterBasePenalty('blinded', 'rating', 'defense'),
            ],
         },
      },
      {
         id: 'contaminated',
         name: 'LOCAL.contaminated.text',
         img: 'icons/svg/poison.svg',
         type: 'condition',
         system: {
            rulesElement: [
               createQuarterBasePenalty('contaminated', 'attribute', 'all', 'attributes'),
               createQuarterBasePenalty('contaminated', 'resistance', 'all', 'resistances'),
            ],
         },
      },
      {
         id: 'dead',
         name: 'LOCAL.dead.text',
         img: 'icons/svg/skull.svg',
         type: 'condition',
      },
      {
         id: 'deafened',
         name: 'LOCAL.deafened.text',
         img: 'icons/svg/deaf.svg',
         type: 'condition',
      },
      {
         id: 'frightened',
         name: 'LOCAL.frightened.text',
         img: 'icons/svg/terror.svg',
         type: 'condition',
      },
      {
         id: 'incapacitated',
         name: 'LOCAL.incapacitated.text',
         img: 'icons/svg/paralysis.svg',
         type: 'condition',
      },
      {
         id: 'offBalance',
         name: 'LOCAL.offBalance.text',
         img: 'icons/svg/daze.svg',
         type: 'condition',
         system: {
            rulesElement: [
               createQuarterBasePenalty('offBalance', 'rating', 'accuracy'),
               createQuarterBasePenalty('offBalance', 'rating', 'awareness'),
               createQuarterBasePenalty('offBalance', 'rating', 'melee'),
               createQuarterBasePenalty('offBalance', 'rating', 'defense'),
            ],
         },
      },
      {
         id: 'prone',
         name: 'LOCAL.prone.text',
         img: 'icons/svg/falling.svg',
         type: 'condition',
         system: {
            rulesElement: [
               {
                  operation: 'mulSum',
                  selector: 'speed',
                  key: 'all',
                  value: 0.5,
                  rounding: 'up',
                  uuid: 'condition-prone-speed',
               },
               createQuarterBasePenalty('prone', 'rating', 'melee'),
               createQuarterBasePenalty('prone', 'rating', 'accuracy'),
            ],
         },
      },
      {
         id: 'restrained',
         name: 'LOCAL.restrained.text',
         img: 'icons/svg/net.svg',
         type: 'condition',
         system: {
            rulesElement: [
               createQuarterBasePenalty('restrained', 'rating', 'melee'),
               createQuarterBasePenalty('restrained', 'rating', 'accuracy'),
               createQuarterBasePenalty('restrained', 'rating', 'defense'),
               {
                  operation: 'setSum',
                  selector: 'speed',
                  key: 'all',
                  value: 0,
                  mode: 'set',
                  uuid: 'condition-restrained-speed',
               },
            ],
         },
      },
      {
         id: 'stunned',
         name: 'LOCAL.stunned.text',
         img: 'icons/svg/stoned.svg',
         type: 'condition',
         system: {
            rulesElement: [
               createQuarterBasePenalty('stunned', 'rating', 'defense'),
            ],
         },
      },
      {
         id: 'sleeping',
         name: 'LOCAL.sleeping.text',
         img: 'icons/svg/sleep.svg',
         type: 'condition',
         system: {
            rulesElement: [
               {
                  operation: 'mulSum',
                  selector: 'rating',
                  key: 'awareness',
                  value: 0.5,
                  rounding: 'up',
                  uuid: 'condition-sleeping-awareness',
               },
            ],
         },
      },
      {
         id: 'unconscious',
         name: 'LOCAL.unconscious.text',
         img: 'icons/svg/unconscious.svg',
         type: 'condition',
      },
   ];
}

/**
 * Sets up the system conditions, registering each as a CONFIG.statusEffects entry with its localized
 * description.
 * @returns {void}
 */
export default function setupConditions() {
   // Get the static condition definitions.
   const conditions = buildConditionDefinitions();

   // Sort conditions by localized name.
   conditions.sort((a, b) => sortAscending(game.i18n.localize(a.name), game.i18n.localize(b.name)));

   // For each condition.
   for (const condition of conditions) {

      // Set the description.
      const description = localize(`${condition.id}.desc`);

      // Set the titan flags carrying the condition's description and subtype. The HUD reads
      // flags.titan.description for conditions (which have no native description field).
      condition.flags = {
         titan: {
            description: description,
            type: 'condition',
         },
      };
   }
   CONFIG.statusEffects = conditions;
}
