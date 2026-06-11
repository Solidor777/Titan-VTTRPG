import getSetting from '~/helpers/utility-functions/GetSetting.js';
import { createDefaultHudLayout } from '~/ui/player-hud/PlayerHudDefaults.js';

/**
 * Reads the stored Player HUD layout merged over the defaults.
 * @returns {object} The effective HUD layout.
 */
export default function playerHudLayout() {
   return foundry.utils.mergeObject(
      createDefaultHudLayout(),
      getSetting('playerHudLayout') ?? {},
      { inplace: false },
   );
}
