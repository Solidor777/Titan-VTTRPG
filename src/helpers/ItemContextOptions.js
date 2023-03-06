import { localize, getSetting } from '~/helpers/Utility.js';
import ConfirmRegenerateUUIDDialog from './dialogs/ConfirmRegenerateUUIDDialog';

export default function registerItemContextOptions(html, options) {
   function canRegenerateUUID(li) {
      const itemId = li.data('document-id');
      const item = game.items.get(itemId);

      if (item) {
         return true;
      }

      return false;
   }

   if (game.user.isGM) {
      options.push({
         name: localize('regenerateUUID'),
         icon: '<i class="fas fa-id-card"></i>',
         condition: canRegenerateUUID,
         callback: regenerateUUID
      });
   }
}

async function regenerateUUID(li) {
   const itemId = li.data('document-id');
   const item = game.items.get(itemId);

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
