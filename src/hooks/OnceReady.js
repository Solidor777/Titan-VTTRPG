import onHotbarDrop from '~/hooks/OnHotbarDrop.js';
import { worldNeedsMigration, migrateWorld } from '~/helpers/migration/MigrateWorld.js';
import ConfirmMigrateWorldDialog from '~/helpers/migration/ConfirmMigrateWorldDialog.js';

/**
 * Attached to the Ready hook.
 * Prompts the GM to migrate world documents if any are out of date, and sets up hot-bar dropping.
 */
export default function onceReady() {
   // Handle migration based on the configured migration mode setting.
   if (game.user.isGM && worldNeedsMigration()) {
      const mode = game.settings.get('titan', 'migrationMode');
      if (mode === 'automatic') {
         migrateWorld();
      }
      else if (mode === 'prompt') {
         new ConfirmMigrateWorldDialog().render(true);
      }
   }

   // Register sub-hooks.
   Hooks.on('hotbarDrop', onHotbarDrop);
}
