/**
 * The card-control change of a casting check message: a signed number of steps on ONE scaling aspect. A change names
 * the aspect and the steps, never values, so it applies to whatever the card holds when it is applied: two changes to
 * different aspects, or a GM's edit made in between, all stay.
 */

/**
 * Applies a signed number of steps of one scaling aspect to stored results the way the card's controls do: an aspect
 * moves in whole steps of `max(initialValue, 1)` and never below its initial value, each step costs the aspect's `cost`
 * extra successes and never more than the card has, and a step of a damage or healing aspect moves the damage or
 * healing by the step.
 * @param {object} stored - The message's stored `system.results`.
 * @param {number} index - The position of the aspect among the scaling aspects.
 * @param {number} steps - The signed number of steps: positive spends extra successes, negative refunds them.
 * @returns {{scalingAspect: object[], extraSuccessesRemaining: number, damage: number, healing: number}} The fields to
 * write.
 * @throws {Error} When the change is not a legal state of the card.
 */
export function applyScalingSteps(stored, index, steps) {
   const aspect = stored.scalingAspect?.[index];
   if (!stored.succeeded || !aspect || !Number.isInteger(index) || !Number.isInteger(steps) || steps === 0) {
      throw new Error('The change does not match the scaling aspects of the card.');
   }
   const step = Math.max(aspect.initialValue, 1);
   const value = aspect.currentValue + (steps * step);
   if (value < aspect.initialValue) {
      throw new Error(`The ${aspect.label} aspect cannot go below its starting value.`);
   }
   const remaining = stored.extraSuccessesRemaining - (steps * aspect.cost);
   if (remaining < 0 || remaining > stored.extraSuccesses) {
      throw new Error('The change spends more extra successes than the card has.');
   }
   const moved = steps * step;
   return {
      scalingAspect: stored.scalingAspect.map((entry, position) => (position === index ?
         {
            ...entry,
            currentValue: value,
         } :
         entry)),
      extraSuccessesRemaining: remaining,
      damage: stored.damage + (aspect.isDamage ? moved : 0),
      healing: stored.healing + (aspect.isHealing ? moved : 0),
   };
}
