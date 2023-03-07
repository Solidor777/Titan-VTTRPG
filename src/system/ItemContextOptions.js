import { localize, getSetting } from '~/helpers/Utility.js';
import ConfirmRegenerateUUIDDialog from '~/documents/dialogs/ConfirmRegenerateUUIDDialog';
import EditUUIDDialog from '~/documents/dialogs/EditUUIDDialog';

export default function registerItemContextOptions(html, options) {
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

function getItem(li) {
   const itemId = li.data('document-id');
   return game.items.get(itemId);
}

function canEditUUID(li) {
   return getItem(li) ? true : false;
}

async function regenerateUUID(li) {
   const item = getItem(li);
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
   const item = getItem(li);
   if (item) {
      const dialog = new EditUUIDDialog(item);
      dialog.render(true);
   }

   return;
}
