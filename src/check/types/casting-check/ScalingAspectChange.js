/**
 * The card-control change of a casting check message: the values of its scaling aspects. These are the only fields a
 * user who did not author the card may change, and the GM's client derives every other number from them, so a request
 * can never name a damage, healing or remaining-successes figure of its own.
 */

/**
 * Compares two plain data values for deep equality.
 * @param {*} a - The first value.
 * @param {*} b - The second value.
 * @returns {boolean} Whether both hold the same data.
 */
function isSameData(a, b) {
   if (a === b) {
      return true;
   }
   if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
      return false;
   }
   const keysA = Object.keys(a);
   const keysB = Object.keys(b);
   return keysA.length === keysB.length && keysA.every((key) => isSameData(a[key], b[key]));
}

/**
 * Reads the scaling-aspect values out of an update of a casting check message, when the update is exactly what the
 * card's scaling controls write: `{ system: { results } }` where every field of `results` equals the stored one except
 * the figures the controls change (`scalingAspect[*].currentValue`, `extraSuccessesRemaining`, `damage`, `healing`).
 * @param {object} stored - The message's stored `system.results`.
 * @param {object} changes - The update, with dotted keys already expanded.
 * @returns {number[]|null} The requested `currentValue` of each scaling aspect, or null for any other update.
 */
export function extractScalingChange(stored, changes) {
   if (!changes || Object.keys(changes).join() !== 'system' || Object.keys(changes.system ?? {}).join() !== 'results') {
      return null;
   }
   const requested = changes.system.results;
   if (!Array.isArray(requested?.scalingAspect) || requested.scalingAspect.length !== stored.scalingAspect.length) {
      return null;
   }
   for (const [key, value] of Object.entries(requested)) {
      if (key === 'scalingAspect') {
         const same = value.every((aspect, index) => {
            const { currentValue, ...rest } = aspect;
            const { currentValue: ignored, ...storedRest } = stored.scalingAspect[index];
            return Number.isInteger(currentValue) && isSameData(rest, storedRest);
         });
         if (!same) {
            return null;
         }
      }
      else if (![
         'extraSuccessesRemaining',
         'damage',
         'healing',
      ].includes(key) && !isSameData(value, stored[key])) {
         return null;
      }
   }
   return requested.scalingAspect.map((aspect) => aspect.currentValue);
}

/**
 * Applies requested scaling-aspect values to stored results the way the card's controls do: each aspect moves in whole
 * steps of `max(initialValue, 1)` between its initial value and what the extra successes pay for, each step costs the
 * aspect's `cost` extra successes, and a step of a damage or healing aspect moves the damage or healing by the step.
 * @param {object} stored - The message's stored `system.results`.
 * @param {number[]} currentValues - The requested `currentValue` of each scaling aspect.
 * @returns {{scalingAspect: object[], extraSuccessesRemaining: number, damage: number, healing: number}} The fields to
 * write.
 * @throws {Error} When the request is not a legal state of the card.
 */
export function applyScalingChange(stored, currentValues) {
   if (!stored.succeeded || !Array.isArray(currentValues) || currentValues.length !== stored.scalingAspect.length) {
      throw new Error('The request does not match the scaling aspects of the card.');
   }
   let remaining = stored.extraSuccessesRemaining;
   let damage = stored.damage;
   let healing = stored.healing;
   const scalingAspect = stored.scalingAspect.map((aspect, index) => {
      const value = currentValues[index];
      const step = Math.max(aspect.initialValue, 1);
      if (!Number.isInteger(value) || value < aspect.initialValue || (value - aspect.initialValue) % step !== 0) {
         throw new Error(`The value ${value} is not a step of the ${aspect.label} aspect.`);
      }
      const moved = value - aspect.currentValue;
      remaining -= (moved / step) * aspect.cost;
      damage += aspect.isDamage ? moved : 0;
      healing += aspect.isHealing ? moved : 0;
      return {
         ...aspect,
         currentValue: value,
      };
   });
   if (remaining < 0 || remaining > stored.extraSuccesses) {
      throw new Error('The request spends more extra successes than the card has.');
   }
   return {
      scalingAspect,
      extraSuccessesRemaining: remaining,
      damage,
      healing,
   };
}
