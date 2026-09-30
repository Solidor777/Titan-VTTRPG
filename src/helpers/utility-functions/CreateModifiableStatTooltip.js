import localize from '~/helpers/utility-functions/Localize.js';
import { MOD_BUCKET_LABELS } from '~/system/ModBuckets.js';

/**
 * Generates a stat's breakdown tooltip: its base value, then each non-zero modifier bucket (MOD_BUCKET_LABELS order,
 * conditions included), then any extra modifier.
 * @param {number} baseValue - The base value of the stat before any modifiers are applied.
 * @param {Record<string, number>} [mod] - The stat's modifier buckets.
 * @param {number} extraMod - Sum of bonuses and penalties from sources outside the stat (a check's conditional
 * modifiers, a value override).
 * @param {string} [baseTooltip] - Label for the base value of the stat in the tooltip.
 * @returns {string} The tooltip HTML.
 */
export default function createModifiableStatTooltip(baseValue, mod, extraMod, baseTooltip) {
   /** @type {string} The tooltip HTML. */
   let retVal = baseTooltip ? `<p>${baseTooltip}</p>` : '';

   // Base value.
   if (baseValue !== undefined) {
      retVal += `<p>${localize('base')}: ${baseValue}</p>`;
   }

   // Every non-zero modifier bucket.
   for (const [bucket, label] of Object.entries(MOD_BUCKET_LABELS)) {
      if (mod?.[bucket]) {
         retVal += `<p>${localize(label)}: ${mod[bucket]}</p>`;
      }
   }

   // Extra mod.
   if (extraMod) {
      retVal += `<p>${localize('otherModifiers')}: ${extraMod}</p>`;
   }

   return retVal;
}
