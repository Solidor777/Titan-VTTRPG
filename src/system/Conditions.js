import { ALL_KEY } from '~/system/AllKey.js';
import { CONDITION_TYPE } from '~/system/EffectTypes.js';
import { SET_SUM_MODE_SET } from '~/system/SetSumModes.js';
import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';
import localize from '~/helpers/utility-functions/Localize.js';
import sortAscending from '~/helpers/utility-functions/SortAscending.js';
import { CANONICAL_SITUATIONS } from '~/system/CanonicalSituations.js';

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
 * Builds a condition's "automatically fails any Awareness and Perception checks that rely on <sense>" rule: a
 * situational Automatic Failure offered on Perception checks. Awareness is a passive rating with no check of its own,
 * so Perception checks are the Awareness checks. The element stores `labelKey` and no `label`: a condition's rules
 * elements persist on its Active Effect, and the situational cache localizes `labelKey` on each client.
 * Source: TITAN Rules Compendium (09_26_2026), "Blinded" and "Deafened".
 * @param {string} conditionId - The condition id, which names the element's uuid.
 * @param {string} labelKey - The situation's CANONICAL_SITUATIONS key.
 * @param {string} uuidSuffix - The uuid's last segment.
 * @returns {ConditionalCheckModifierElement} The element.
 */
function createSenseAutomaticFailure(conditionId, labelKey, uuidSuffix) {
   return {
      checkType: 'any',
      key: CANONICAL_SITUATIONS[labelKey],
      labelKey,
      modifierType: 'automaticFailure',
      operation: 'conditionalCheckModifier',
      selector: 'situation',
      skill: 'perception',
      uuid: `condition-${conditionId}-${uuidSuffix}`,
      value: 1,
   };
}

/**
 * Builds a condition's "automatically fails Reflexes checks" rule: an always-on Automatic Failure on Reflexes
 * Resistance Checks. Source: TITAN Rules Compendium (09_26_2026), "Incapacitated" and "Restrained".
 * @param {string} conditionId - The condition id, which names the element's uuid.
 * @returns {ConditionalCheckModifierElement} The element.
 */
function createReflexesAutomaticFailure(conditionId) {
   return {
      checkType: 'resistance',
      key: 'reflexes',
      modifierType: 'automaticFailure',
      operation: 'conditionalCheckModifier',
      selector: 'resistance',
      skill: '',
      uuid: `condition-${conditionId}-reflexes`,
      value: 1,
   };
}

/**
 * Builds the static list of TITAN condition definitions for CONFIG.statusEffects. Every condition is the
 * 'condition' Active Effect subtype; every condition with mechanics carries a `system.rulesElement` array
 * expressing its stat and check rules (applied through the shared rules-element pipeline). Dead and Unconscious
 * carry none; Unconscious's companion conditions (UNCONSCIOUS_COMPANION_CONDITIONS) are applied when it is created
 * (CharacterDataModel#fallUnconscious). This function is pure (no game/localization access) so it can be unit-tested.
 * @returns {object[]} The condition definitions, each with id, name (localization key), img, type, and —
 * for mechanically-active conditions — system.rulesElement.
 */
export function buildConditionDefinitions() {
   return [
      {
         id: 'blinded',
         name: 'LOCAL.blinded.text',
         img: 'icons/svg/blind.svg',
         type: CONDITION_TYPE,
         system: {
            rulesElement: [
               createQuarterBasePenalty('blinded', 'rating', 'melee'),
               createQuarterBasePenalty('blinded', 'rating', 'accuracy'),
               createQuarterBasePenalty('blinded', 'rating', 'defense'),
               createSenseAutomaticFailure('blinded', 'situationReliesOnSight', 'sight'),
            ],
         },
      },
      {
         id: 'contaminated',
         name: 'LOCAL.contaminated.text',
         img: 'icons/svg/poison.svg',
         type: CONDITION_TYPE,
         system: {
            rulesElement: [
               createQuarterBasePenalty('contaminated', 'attribute', ALL_KEY, 'attributes'),
               createQuarterBasePenalty('contaminated', 'resistance', ALL_KEY, 'resistances'),
            ],
         },
      },
      {
         id: 'dead',
         name: 'LOCAL.dead.text',
         img: 'icons/svg/skull.svg',
         type: CONDITION_TYPE,
      },
      {
         id: 'deafened',
         name: 'LOCAL.deafened.text',
         img: 'icons/svg/deaf.svg',
         type: CONDITION_TYPE,
         system: {
            rulesElement: [
               createSenseAutomaticFailure('deafened', 'situationReliesOnHearing', 'hearing'),
            ],
         },
      },
      {
         id: 'frightened',
         name: 'LOCAL.frightened.text',
         img: 'icons/svg/terror.svg',
         type: CONDITION_TYPE,
         system: {
            rulesElement: [
               // Disadvantage on every check. The rules scope it to while the creature can detect the source of its
               // fear; the condition is applied only while that holds.
               {
                  checkType: 'any',
                  key: '',
                  modifierType: 'advantage',
                  operation: 'conditionalCheckModifier',
                  selector: 'any',
                  skill: '',
                  uuid: 'condition-frightened-checks',
                  value: -1,
               },
            ],
         },
      },
      {
         id: 'incapacitated',
         name: 'LOCAL.incapacitated.text',
         img: 'icons/svg/paralysis.svg',
         type: CONDITION_TYPE,
         system: {
            rulesElement: [
               createReflexesAutomaticFailure('incapacitated'),
            ],
         },
      },
      {
         id: 'offBalance',
         name: 'LOCAL.offBalance.text',
         img: 'icons/svg/daze.svg',
         type: CONDITION_TYPE,
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
         type: CONDITION_TYPE,
         system: {
            rulesElement: [
               {
                  operation: 'mulSum',
                  selector: 'speed',
                  key: ALL_KEY,
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
         type: CONDITION_TYPE,
         system: {
            rulesElement: [
               createQuarterBasePenalty('restrained', 'rating', 'melee'),
               createQuarterBasePenalty('restrained', 'rating', 'accuracy'),
               createQuarterBasePenalty('restrained', 'rating', 'defense'),
               {
                  operation: 'setSum',
                  selector: 'speed',
                  key: ALL_KEY,
                  value: 0,
                  mode: SET_SUM_MODE_SET,
                  uuid: 'condition-restrained-speed',
               },
               createReflexesAutomaticFailure('restrained'),
            ],
         },
      },
      {
         id: 'stunned',
         name: 'LOCAL.stunned.text',
         img: 'icons/svg/stoned.svg',
         type: CONDITION_TYPE,
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
         type: CONDITION_TYPE,
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
         type: CONDITION_TYPE,
      },
   ];
}

/**
 * Every condition id, in definition order. The options of a condition picker (the immunity editor).
 * @type {readonly string[]}
 */
export const CONDITION_IDS = Object.freeze(buildConditionDefinitions().map((condition) => condition.id));

/**
 * The conditions an Unconscious creature also has: it "falls Prone, and is Incapacitated". Applied once when
 * Unconscious is created (CharacterDataModel#fallUnconscious); removing Unconscious removes neither, since standing up
 * is a separate Move or Action. Source: TITAN Rules Compendium (09_26_2026), "Unconscious".
 * @type {readonly string[]}
 */
export const UNCONSCIOUS_COMPANION_CONDITIONS = Object.freeze([
   'prone',
   'incapacitated',
]);

/**
 * Finds the system condition an Active Effect applies, from the system's own definitions (never the mutable
 * CONFIG.statusEffects). Following core's `Actor#toggleStatusEffect`, an effect is a status's effect only when its
 * statuses hold exactly that one id, so an effect with several statuses, or with a status naming no system condition,
 * applies none.
 * @param {Iterable<string>} statuses - The effect's status ids (a Set on a document, an array in stored data).
 * @returns {object|undefined} A fresh copy of the condition's definition, or undefined when the effect applies no
 * system condition.
 */
export function findConditionDefinition(statuses) {
   /** @type {string[]} The status ids. */
   const ids = [...statuses];
   if (ids.length !== 1) {
      return undefined;
   }
   return buildConditionDefinitions().find((condition) => condition.id === ids[0]);
}

/**
 * Gets the localization key of the description of the system condition an Active Effect applies, for `localize()`.
 * Condition effects are created with no description: a stored copy would freeze its creator's language and go stale
 * when the rules text changes. A chat snapshot of an unedited condition stores this key and each reader localizes it
 * (the turn-start report); a description edited on the effect is read by getEditedConditionDescription instead.
 * @param {TitanActiveEffect} [effect] - The condition Active Effect; undefined in a row's mid-deletion frame.
 * @returns {string} The key (`<id>.desc`), or an empty string when the effect applies no system condition.
 */
export function getConditionDescriptionKey(effect) {
   /** @type {object|undefined} The condition's definition. */
   const definition = effect ? findConditionDefinition(effect.statuses ?? []) : undefined;
   return definition ? `${definition.id}.desc` : '';
}

/**
 * Gets the description a GM wrote on a condition Active Effect in its sheet. A condition effect is created with a blank
 * description, so a non-blank one is an edit, and it replaces the definition's text for every reader.
 * @param {TitanActiveEffect} [effect] - The condition Active Effect; undefined in a row's mid-deletion frame.
 * @returns {string} The edited description HTML, or an empty string when the effect's description is blank.
 */
export function getEditedConditionDescription(effect) {
   /** @type {string} The effect's own description. */
   const description = effect?.description ?? '';
   return isHTMLBlank(description) ? '' : description;
}

/**
 * Gets the description of a condition Active Effect: the one edited on the effect, else the system condition's
 * definition text, localized on this client.
 * @param {TitanActiveEffect} [effect] - The condition Active Effect; undefined in a row's mid-deletion frame.
 * @returns {string} The description HTML, or an empty string when the effect has no edit and applies no system
 * condition (`localize` returns an empty string for an empty key).
 */
export function getConditionDescription(effect) {
   return getEditedConditionDescription(effect) || localize(getConditionDescriptionKey(effect));
}

/**
 * Sets up the system conditions, registering each as a CONFIG.statusEffects entry flagged with its subtype. A
 * condition's description is not copied onto its entry, so the Active Effects core creates from the entry store none;
 * readers use the effect's own edited description, else look the definition up by status id (getConditionDescription,
 * getConditionDescriptionKey) and localize it on their own client.
 * @returns {void}
 */
export default function setupConditions() {
   /** @type {object[]} The static condition definitions. */
   const conditions = buildConditionDefinitions();

   // Sort conditions by localized name.
   conditions.sort((a, b) => sortAscending(game.i18n.localize(a.name), game.i18n.localize(b.name)));

   // Flag each condition with its subtype.
   for (const condition of conditions) {
      condition.flags = {
         titan: {
            type: CONDITION_TYPE,
         },
      };
   }
   CONFIG.statusEffects = conditions;
}
