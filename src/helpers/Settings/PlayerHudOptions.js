import getSetting from '~/helpers/utility-functions/GetSetting.js';
import { createDefaultHudOptions } from '~/ui/player-hud/PlayerHudDefaults.js';

/**
 * Reads the stored Player HUD options merged over the defaults.
 * @returns {object} The effective HUD options.
 */
export default function playerHudOptions() {
   return foundry.utils.mergeObject(
      createDefaultHudOptions(),
      getSetting('playerHudOptions') ?? {},
      { inplace: false },
   );
}
