import onHotbarDrop from '~/hooks/OnHotbarDrop.js';
import error from '~/helpers/utility-functions/Error.js';
import { migrateWorld, resolveMigrationAction, worldNeedsMigration } from '~/helpers/migration/MigrateWorld.js';
import ConfirmMigrateWorldDialog from '~/helpers/migration/ConfirmMigrateWorldDialog.js';
import TitanPlayerHud from '~/ui/player-hud/TitanPlayerHud.js';
import PlayerHudSettingsApplication from '~/ui/player-hud/settings/PlayerHudSettingsApplication.js';

/**
 * Attached to the Ready hook.
 * On the active GM's client (one GM migrates, however many are connected), acts on any pending migration as the
 * migration mode setting decides: disabled scans and writes nothing; prompt scans the world and, when anything needs
 * migration, shows a dialog that migrates only on confirmation; automatic scans and migrates now. The migration
 * (migrateWorld) converts legacy effect Items and syncs condition effects in every stored actor, then runs the version
 * chains. A failure anywhere in that attempt is reported and never stops the load. Then, for every user, registers the
 * hot-bar drop hook and builds the Player HUD; on the active GM's client both happen after the migration attempt,
 * whether or not it succeeded.
 * @returns {Promise<void>}
 */
export default async function onceReady() {
   if (game.users.activeGM?.isSelf) {
      try {
         switch (await resolveMigrationAction(game.settings.get('titan', 'migrationMode'), worldNeedsMigration)) {
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
