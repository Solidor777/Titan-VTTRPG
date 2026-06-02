import onHotbarDrop from '~/hooks/OnHotbarDrop.js';
import { worldNeedsMigration, migrateWorld } from '~/helpers/migration/MigrateWorld.js';
import convertEffectItemsToActiveEffects from '~/helpers/migration/ConvertEffectItemsToActiveEffects.js';
import ConfirmMigrateWorldDialog from '~/helpers/migration/ConfirmMigrateWorldDialog.js';
import TitanEffectHud from '~/ui/effect-hud/TitanEffectHud.js';

/**
 * Attached to the Ready hook.
 * For the GM, runs the one-shot legacy-effect-to-Active-Effect converter unconditionally before the version-chain
 * migration, so it always executes on world load regardless of migration mode or any pending version migration (the
 * converter self-guards on GM and is idempotent). The migration mode setting then only gates the version-chain
 * migration: in prompt mode with pending version migrations, the GM is asked to confirm via dialog; otherwise
 * migrateWorld is awaited directly. Finally registers the hot-bar drop hook for all users.
 * @returns {Promise<void>}
 */
export default async function onceReady() {
   // Handle migration based on the configured migration mode setting.
   if (game.user.isGM) {
      // Always run the one-shot effect converter on world load, independent of the version-chain migration. It is
      // GM-guarded and idempotent, so it is safe to await unconditionally before the prompt-mode branch below.
      await convertEffectItemsToActiveEffects();

      /** @type {string} - The configured migration mode ('automatic' or 'prompt'). */
      const mode = game.settings.get('titan', 'migrationMode');

      // In prompt mode with a pending version migration, defer the version chain to the confirmation dialog.
      if (mode === 'prompt' && worldNeedsMigration()) {
         new ConfirmMigrateWorldDialog().render(true);
      }

      // Otherwise run the version-chain migration directly.
      else {
         await migrateWorld();
      }
   }

   // Register sub-hooks.
   Hooks.on('hotbarDrop', onHotbarDrop);

   // Build and attach the native Effect HUD.
   game.titan.effectHud = new TitanEffectHud();
   game.titan.effectHud.init();
}
