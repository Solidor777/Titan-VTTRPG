import getBestCharactersToUpdate from '~/helpers/utility-functions/GetBestCharactersToUpdate.js';

/**
 * Rends the user's available combat targets.
 * @param {number} rend - Amount of rend to apply.
 * @param {RendOptions?} options - Options for applying the rend.
 * @returns {Promise<void>} Returns after the rend has been applied.
 */
export default async function applyRendToTargets(rend, options) {
   // Get targets
   const targets = getBestCharactersToUpdate();

   // Rend each target
   for (const target of targets) {
      await target.system.applyRend(rend, options);
   }
}
