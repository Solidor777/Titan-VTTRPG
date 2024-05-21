import getBestUserTargets from "~/helpers/utility-functions/GetBestUserTargets.js";

/**
 * Applies rend to the user's available combat targets.
 * @param {number}         rend     Amount of rend to apply.
 * @param {RendOptions?}   options  Options for applying the rend.
 * @returns {Promise<void>}         Returns after the rend has been applied.
 */
export default async function applyRendToTargets(rend, options) {
   // Get targets
   const targets = getBestUserTargets();

   // Apply rend to each target
   for (const target of targets) {
      await target.system.applyRend(rend, options);
   }
}
