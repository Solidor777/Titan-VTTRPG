import CreateItemMacroDialog from '~/document/types/item/dialog/CreateItemMacroDialog';

/**
 * Called when an object is dropped on the user's Hotbar.
 * @param {Hotbar} hotbar - The hotbar the object was dropped on.
 * @param {data} data - The data extracted from the drop event.
 * @param {number} slot - The hotbar slot that the item was dropped on.
 * @returns {boolean|void} - Returns Void if the default action should be performed. Otherwise, returns False.
 */
export default function onHotbarDrop(hotbar, data, slot) {
   // Ensure the object is an item
   if (data.type !== 'Item') {
      return;
   }

   // Get the item from an actor
   const uuidData = data.uuid.split('.');
   let macroItem;
   if (uuidData[0] === 'Actor') {
      // Get the actor
      const macroActor = Actor.get(uuidData[1]);
      if (!macroActor) {
         return;
      }

      // Get the item from the actor's item
      macroItem = macroActor.items.get(uuidData[3]);
      if (!macroItem) {
         return;
      }
   }

   // Get the item from the items collection
   else {
      macroItem = Item.get(uuidData[1]);
      if (!macroItem) {
         return;
      }
   }

   // Create a dialog if this item has any associated checks
   if (macroItem.system.check.length > 0) {
      const dialog = new CreateItemMacroDialog(macroItem, slot, data.uuid);
      dialog.render(true);

      return false;
   }

   // If the item supports a macro dialog, create one
   switch (macroItem.type) {
      case 'weapon': {
         if (macroItem.system.attack.length > 0) {
            const dialog = new CreateItemMacroDialog(macroItem, slot, data.uuid);
            dialog.render(true);

            return false;
         }

         break;
      }

      case 'spell':
      case 'effect': {
         const dialog = new CreateItemMacroDialog(macroItem, slot, data.uuid);
         dialog.render(true);

         return false;
      }

      default: {
         break;
      }
   }

   // This is a separate function because if onHotbarDrop does not return immediately,
   // the default macro will be created
   createToggleDocumentSheetMacro(macroItem.name, macroItem.img, data.uuid, slot);
   return false;
}

/**
 * Creates a macro for toggling a Document's sheet.
 * @param {string} name - The name of the macro.
 * @param {string} img - The source image path for the macro.
 * @param {string} uuid - The Foundry UUID of the item.
 * @param {number} slot - The slot on the user's hotbar to add the macro to.
 */
async function createToggleDocumentSheetMacro(name, img, uuid, slot) {
   const macro = await game.titan.macros.getToggleDocumentSheetMacro(name, img, uuid);
   await game.user.assignHotbarMacro(macro, slot);
}