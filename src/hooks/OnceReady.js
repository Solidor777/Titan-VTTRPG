import onHotbarDrop from '~/hooks/OnHotbarDrop.js';
import error from '~/helpers/utility-functions/Error.js';
import { migrateWorld, resolveMigrationAction, worldNeedsMigration } from '~/helpers/migration/MigrateWorld.js';
import convertEffectItemsToActiveEffects from '~/helpers/migration/ConvertEffectItemsToActiveEffects.js';
import ConfirmMigrateWorldDialog from '~/helpers/migration/ConfirmMigrateWorldDialog.js';
import TitanPlayerHud from '~/ui/player-hud/TitanPlayerHud.js';
import PlayerHudSettingsApplication from '~/ui/player-hud/settings/PlayerHudSettingsApplication.js';

/**
 * Attached to the Ready hook.
 * For the GM, runs the one-shot legacy-effect-to-Active-Effect converter unconditionally (it self-guards on GM and is
 * idempotent), then acts on any pending migration (version chains and condition-effect sync) as the migration mode
 * setting decides: prompt asks the GM through a dialog, automatic migrates now, disabled skips migration without
 * scanning the world. A failure anywhere in that migration attempt is reported and never stops the load. Then, for
 * every user, registers the hot-bar drop hook and builds the Player HUD; on the GM's client both happen after the
 * migration attempt, whether or not it succeeded.
 * @returns {Promise<void>}
 */
export default async function onceReady() {
   if (game.user.isGM) {
      try {
         await convertEffectItemsToActiveEffects();

         switch (resolveMigrationAction(game.settings.get('titan', 'migrationMode'), worldNeedsMigration)) {
            case 'prompt': {
               new ConfirmMigrateWorldDialog().render(true);
               break;
            }
            case 'migrate': {
               await migrateWorld();
               break;
            }
            default: {
               break;
            }
         }
      }
      catch (reason) {
         error('The world migration failed; the world loads without it.', reason);
      }
   }

   // Register sub-hooks.
   Hooks.on('hotbarDrop', onHotbarDrop);

   // Build and attach the Player HUD and its shared configuration window.
   game.titan.playerHud = new TitanPlayerHud();
   game.titan.playerHud.init();
   game.titan.playerHudSettings = new PlayerHudSettingsApplication();
}
