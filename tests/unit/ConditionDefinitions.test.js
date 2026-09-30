import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { buildConditionDefinitions } from '~/system/Conditions.js';
import { CANONICAL_SITUATIONS } from '~/system/CanonicalSituations.js';

/** @type {object} The parsed English localization file. */
const lang = JSON.parse(readFileSync(
   path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../lang/en.json'),
   'utf-8',
));

/**
 * Returns the condition definition with the given id from buildConditionDefinitions().
 * @param {string} id - The condition id.
 * @returns {object} The matching definition.
 */
function def(id) {
   return buildConditionDefinitions().find((condition) => condition.id === id);
}

/**
 * Builds the expected "-¼ of base value, rounded up" element: `mulBase` 0.75, rounded up.
 * @param {string} id - The condition id.
 * @param {string} selector - The stat type.
 * @param {string} key - The stat key.
 * @param {string} [uuidSuffix] - The uuid's last segment; defaults to the key.
 * @returns {object} The expected element.
 */
function quarterPenalty(id, selector, key, uuidSuffix = key) {
   return {
      operation: 'mulBase',
      selector,
      key,
      value: 0.75,
      rounding: 'up',
      uuid: `condition-${id}-${uuidSuffix}`,
   };
}

/**
 * Builds the expected "automatically fails Perception checks that rely on <sense>" situation.
 * @param {string} id - The condition id.
 * @param {string} labelKey - The situation's localization key (a CANONICAL_SITUATIONS key).
 * @param {string} uuidSuffix - The uuid's last segment.
 * @returns {object} The expected element.
 */
function senseFailure(id, labelKey, uuidSuffix) {
   return {
      checkType: 'any',
      key: CANONICAL_SITUATIONS[labelKey],
      labelKey,
      modifierType: 'automaticFailure',
      operation: 'conditionalCheckModifier',
      selector: 'situation',
      skill: 'perception',
      uuid: `condition-${id}-${uuidSuffix}`,
      value: 1,
   };
}

/**
 * Builds the expected "automatically fails Reflexes checks" element.
 * @param {string} id - The condition id.
 * @returns {object} The expected element.
 */
function reflexesFailure(id) {
   return {
      checkType: 'resistance',
      key: 'reflexes',
      modifierType: 'automaticFailure',
      operation: 'conditionalCheckModifier',
      selector: 'resistance',
      skill: '',
      uuid: `condition-${id}-reflexes`,
      value: 1,
   };
}

describe('buildConditionDefinitions', () => {
   it('marks every condition as the condition subtype named by its LOCAL key', () => {
      for (const condition of buildConditionDefinitions()) {
         expect(condition.type, `${condition.id} should be the condition subtype`).toBe('condition');
         expect(condition.name).toBe(`LOCAL.${condition.id}.text`);
      }
   });

   it('localizes every condition name and description', () => {
      for (const condition of buildConditionDefinitions()) {
         expect(lang.LOCAL[`${condition.id}.text`], `${condition.id}.text`).toBeTypeOf('string');
         expect(lang.LOCAL[`${condition.id}.desc.text`], `${condition.id}.desc.text`).toBeTypeOf('string');
      }
   });

   it('gives every rules element a unique condition-<id>- uuid', () => {
      /** @type {string[]} Every rules element uuid across the definitions. */
      const uuids = [];
      for (const condition of buildConditionDefinitions()) {
         for (const element of condition.system?.rulesElement ?? []) {
            expect(element.uuid.startsWith(`condition-${condition.id}-`), element.uuid).toBe(true);
            uuids.push(element.uuid);
         }
      }
      expect(new Set(uuids).size).toBe(uuids.length);
   });

   it('seeds blinded with -¼ of base melee, accuracy, and defense and a sight-reliant Perception failure', () => {
      expect(def('blinded').system.rulesElement).toEqual([
         quarterPenalty('blinded', 'rating', 'melee'),
         quarterPenalty('blinded', 'rating', 'accuracy'),
         quarterPenalty('blinded', 'rating', 'defense'),
         senseFailure('blinded', 'situationReliesOnSight', 'sight'),
      ]);
   });

   it('seeds deafened with a hearing-reliant Perception failure', () => {
      expect(def('deafened').system.rulesElement).toEqual([
         senseFailure('deafened', 'situationReliesOnHearing', 'hearing'),
      ]);
   });

   it('seeds frightened with Disadvantage on every check', () => {
      expect(def('frightened').system.rulesElement).toEqual([
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
      ]);
   });

   it('seeds incapacitated with a Reflexes check failure', () => {
      expect(def('incapacitated').system.rulesElement).toEqual([reflexesFailure('incapacitated')]);
   });

   it('keys every condition situation by its canonical string', () => {
      for (const condition of buildConditionDefinitions()) {
         for (const element of condition.system?.rulesElement ?? []) {
            if (element.selector === 'situation') {
               expect(element.key, element.uuid).toBe(CANONICAL_SITUATIONS[element.labelKey]);
               expect(element.label, `${element.uuid} stores no client-localized label`).toBeUndefined();
            }
         }
      }
   });

   it('seeds contaminated with -¼ of every base attribute and resistance', () => {
      expect(def('contaminated').system.rulesElement).toEqual([
         quarterPenalty('contaminated', 'attribute', 'all', 'attributes'),
         quarterPenalty('contaminated', 'resistance', 'all', 'resistances'),
      ]);
   });

   it('defines off-balance with the daze icon and -¼ of base accuracy, awareness, melee, and defense', () => {
      expect(def('offBalance')).toMatchObject({
         img: 'icons/svg/daze.svg',
         name: 'LOCAL.offBalance.text',
         type: 'condition',
      });
      expect(def('offBalance').system.rulesElement).toEqual([
         quarterPenalty('offBalance', 'rating', 'accuracy'),
         quarterPenalty('offBalance', 'rating', 'awareness'),
         quarterPenalty('offBalance', 'rating', 'melee'),
         quarterPenalty('offBalance', 'rating', 'defense'),
      ]);
   });

   it('seeds prone with halved speed (round up) and -¼ of base melee and accuracy', () => {
      expect(def('prone').system.rulesElement).toEqual([
         {
            operation: 'mulSum',
            selector: 'speed',
            key: 'all',
            value: 0.5,
            rounding: 'up',
            uuid: 'condition-prone-speed',
         },
         quarterPenalty('prone', 'rating', 'melee'),
         quarterPenalty('prone', 'rating', 'accuracy'),
      ]);
   });

   it('seeds restrained with -¼ of base melee, accuracy, and defense, speed 0, and a Reflexes check failure', () => {
      expect(def('restrained').system.rulesElement).toEqual([
         quarterPenalty('restrained', 'rating', 'melee'),
         quarterPenalty('restrained', 'rating', 'accuracy'),
         quarterPenalty('restrained', 'rating', 'defense'),
         {
            operation: 'setSum',
            selector: 'speed',
            key: 'all',
            value: 0,
            mode: 'set',
            uuid: 'condition-restrained-speed',
         },
         reflexesFailure('restrained'),
      ]);
   });

   it('seeds stunned with -¼ of base defense', () => {
      expect(def('stunned').system.rulesElement).toEqual([
         quarterPenalty('stunned', 'rating', 'defense'),
      ]);
   });

   it('seeds sleeping with halved awareness (round up)', () => {
      expect(def('sleeping').system.rulesElement).toEqual([
         {
            operation: 'mulSum',
            selector: 'rating',
            key: 'awareness',
            value: 0.5,
            rounding: 'up',
            uuid: 'condition-sleeping-awareness',
         },
      ]);
   });

   it('leaves dead and unconscious without rules elements', () => {
      for (const id of [
         'dead',
         'unconscious',
      ]) {
         expect(def(id).system, `${id} should have no system.rulesElement`).toBeUndefined();
      }
   });
});
