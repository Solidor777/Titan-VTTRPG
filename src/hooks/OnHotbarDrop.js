import CreateItemMacroDialog from '~/document/types/item/dialog/CreateItemMacroDialog';

export default function onHotbarDrop(bar, data, slot) {
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

async function createToggleDocumentSheetMacro(name, img, uuid, slot) {
   const macro = await game.titan.macros.getToggleDocumentSheetMacro(name, img, uuid);
   game.user.assignHotbarMacro(macro, slot);

   return;
}