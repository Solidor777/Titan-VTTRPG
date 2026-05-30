import onHotbarDrop from '~/hooks/OnHotbarDrop.js';
import { worldNeedsMigration, migrateWorld } from '~/helpers/migration/MigrateWorld.js';
import ConfirmMigrateWorldDialog from '~/helpers/migration/ConfirmMigrateWorldDialog.js';

/**
 * Attached to the Ready hook.
 * Runs the GM world migration (which also performs the idempotent legacy-effect-to-Active-Effect conversion), and
 * sets up hot-bar dropping. The migration mode setting only gates the version-chain migration: in prompt mode with
 * pending version migrations, the GM is asked to confirm via dialog; otherwise migrateWorld is awaited directly so
 * the one-shot effect converter always runs on world load even when no version migration is pending.
 * @returns {Promise<void>}
 */
export default async function onceReady() {
   // Handle migration based on the configured migration mode setting.
   if (game.user.isGM) {
      /** @type {string} - The configured migration mode ('automatic' or 'prompt'). */
      const mode = game.settings.get('titan', 'migrationMode');

      // In prompt mode with a pending version migration, defer the version chain to the confirmation dialog.
      if (mode === 'prompt' && worldNeedsMigration()) {
         new ConfirmMigrateWorldDialog().render(true);
      }

      // Otherwise run migrateWorld directly so the idempotent effect converter always executes on world load.
      else {
         await migrateWorld();
      }
   }

   // Register sub-hooks.
   Hooks.on('hotbarDrop', onHotbarDrop);
}
