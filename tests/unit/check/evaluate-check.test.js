import { afterEach, describe, expect, it, vi } from 'vitest';
import { dice } from './check-test-helpers.js';

// The rolled dice come from this helper, mocked so each test fixes the faces it evaluates.
vi.mock('~/helpers/utility-functions/RollCheckDice.js', () => ({ default: vi.fn() }));

import rollCheckDice from '~/helpers/utility-functions/RollCheckDice.js';
import TitanCheck from '~/check/Check.js';
import AttackCheck from '~/check/types/attack-check/AttackCheck.js';

afterEach(() => {
   vi.mocked(rollCheckDice).mockReset();
});

/**
 * Evaluates a check whose dice roll the given faces and returns its results.
 * @param {TitanCheck} check - The check to evaluate.
 * @param {number[]} faces - The rolled faces, sorted from largest to smallest.
 * @returns {Promise<CheckResults>} The check's results.
 */
async function evaluate(check, faces) {
   vi.mocked(rollCheckDice).mockResolvedValue(dice(faces));
   await check.evaluateCheck();
   return check.results;
}

describe('evaluateCheck — Expertise and Automatic Failure', () => {
   /** @type {object} A 4:1 check with 2 Expertise. */
   const parameters = {
      complexity: 1,
      difficulty: 4,
      extraFailureOnCritical: false,
      extraSuccessOnCritical: false,
      totalDice: 2,
      totalExpertise: 2,
   };

   it('spends Expertise on a normal check', async () => {
      /** @type {CheckResults} The normal check's results. */
      const results = await evaluate(new TitanCheck({ ...parameters }), [
         3,
         2,
      ]);
      expect(results.dice.map((die) => die.expertiseApplied)).toEqual([
         1,
         0,
      ]);
      expect(results.expertiseRemaining).toBe(1);
   });

   it('spends no Expertise on an automatically failed check', async () => {
      /** @type {CheckResults} The automatically failed check's results. */
      const results = await evaluate(new TitanCheck({
         ...parameters,
         automaticFailure: true,
      }), [
         3,
         2,
      ]);
      expect(results.dice).toEqual(dice([
         3,
         2,
      ]));
      expect(results.expertiseRemaining).toBe(2);
      expect(results.successes).toBe(0);
   });

   it('spends no Expertise on an automatically failed Cleave attack', async () => {
      /** @type {object} Attack parameters whose Cleave would spend leftover Expertise toward 6s. */
      const attackParameters = {
         ...parameters,
         automaticFailure: true,
         cleave: true,
      };

      /** @type {CheckResults} The automatically failed attack's results. */
      const results = await evaluate(new AttackCheck(attackParameters), [
         5,
         4,
      ]);
      expect(results.dice.map((die) => die.expertiseApplied)).toEqual([
         0,
         0,
      ]);
      expect(results.expertiseRemaining).toBe(2);
   });
});
