import { localize, getSetting } from '~/helpers/Utility.js';
import ConfirmRegenerateUUIDDialog from '~/documents/dialogs/ConfirmRegenerateUUIDDialog';
import EditUUIDDialog from '~/documents/dialogs/EditUUIDDialog';

export default function registerActorContextOptions(html, options) {
   // Only present these options for the gm
   if (game.user.isGM) {
      // Regenerate UUID
      options.push({
         name: localize('regenerateUUID'),
         icon: '<i class="fas fa-id-card"></i>',
         condition: canEditUUID,
         callback: regenerateUUID
      });

      // Edit UUID
      options.push({
         name: localize('editUUID'),
         icon: '<i class="fas fa-id-card"></i>',
         condition: canEditUUID,
         callback: editUUID
      });
   }
}

function getActor(li) {
   const actorID = li.data('document-id');
   return game.actors.get(actorID);
}

function canEditUUID(li) {
   return getActor(li) ? true : false;
}

async function regenerateUUID(li) {
   const item = getActor(li);
   if (item) {
      if (getSetting('confirmRegenerateUUID')) {
         const dialog = new ConfirmRegenerateUUIDDialog(item);
         dialog.render(true);
      }

      else {
         regenerateUUID(item);
      }
   }

   return;
}

async function editUUID(li) {
   const item = getActor(li);
   if (item) {
      const dialog = new EditUUIDDialog(item);
      dialog.render(true);
   }

   return;
}
