import localize from '~/helpers/utility-functions/Localize.js';
import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog.js';
import { migrateWorld } from '~/helpers/migration/MigrateWorld.js';

/**
 * A confirmation dialog prompting the GM to migrate all world documents to the current system version.
 * @extends {ConfirmationDialog}
 */
export default class ConfirmMigrateWorldDialog extends ConfirmationDialog {

   /**
    * Constructs the dialog with the world title as the header and migrateWorld as the confirmation callback.
    */
   constructor() {
      super(
         localize('migrateWorld'),
         [game.world.title],
         localize('confirmMigrateWorld.desc'),
         localize('migrateWorld'),
         migrateWorld,
      );
   }
}
