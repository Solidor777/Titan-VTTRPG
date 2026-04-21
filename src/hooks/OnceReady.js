import onHotbarDrop from '~/hooks/OnHotbarDrop.js';
import { worldNeedsMigration } from '~/helpers/migration/MigrateWorld.js';
import ConfirmMigrateWorldDialog from '~/helpers/migration/ConfirmMigrateWorldDialog.js';

/**
 * Attached to the Ready hook.
 * Prompts the GM to migrate world documents if any are out of date, and sets up hot-bar dropping.
 */
export default function onceReady() {
   // Prompt the GM to migrate if any documents are out of date.
   if (game.user.isGM && worldNeedsMigration()) {
      new ConfirmMigrateWorldDialog().render(true);
   }

   // Register sub-hooks.
   Hooks.on('hotbarDrop', onHotbarDrop);
}
