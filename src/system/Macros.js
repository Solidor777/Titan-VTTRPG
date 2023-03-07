import CreateItemMacroDialog from '~/item/dialog/CreateItemMacroDialog';

export class TitanMacros {
   rollAttackCheck(id, idMethod, attackIdx) {
      // For each controlled token
      const controlledTokens = Array.from(canvas.tokens.controlled);
      controlledTokens.forEach((token) => {

         // Get the actor
         const actor = token.actor;
         if (actor) {

            // Get the character
            const character = actor.character;
            if (character) {

               // Get the item
               const item = this.getMacroItemFromID(actor, id, idMethod);
               if (item && item.type === 'weapon' && item.system.attack.length > attackIdx) {

                  // Roll the check
                  character.rollAttackCheck({ itemId: item._id, attackIdx: attackIdx });
               }
            }
         }
      });
   }

   rollCastingCheck(id, idMethod) {
      // For each controller token
      const controlledTokens = Array.from(canvas.tokens.controlled);
      controlledTokens.forEach((token) => {

         // Get the actor
         const actor = token.actor;
         if (actor) {

            // Get the character
            const character = actor.character;
            if (character) {

               // Get the item
               const item = this.getMacroItemFromID(actor, id, idMethod);
               if (item && item.type === 'spell') {

                  // Roll the check
                  character.rollCastingCheck({ itemId: item._id });
               }
            }
         }
      });
   }

   rollItemCheck(id, idMethod, checkIdx) {
      // For each controller token
      const controlledTokens = Array.from(canvas.tokens.controlled);
      controlledTokens.forEach((token) => {

         // Get the actor
         const actor = token.actor;
         if (actor) {

            // Get the character
            const character = actor.character;
            if (character) {

               // Get the item
               const item = this.getMacroItemFromID(actor, id, idMethod);
               if (item && item.system.check.length > 0) {

                  // Roll the check
                  character.rollItemCheck({ itemId: item._id, checkIdx: checkIdx });
               }
            }
         }
      });
   }

   toggleEffectActive(id, idMethod) {
      // For each controller token
      const controlledTokens = Array.from(canvas.tokens.controlled);
      controlledTokens.forEach((token) => {

         // Get the actor
         const actor = token.actor;
         if (actor) {

            // Get the character
            const character = actor.character;
            if (character) {

               // Get the item
               const item = this.getMacroItemFromID(actor, id, idMethod);
               if (item && item.type === 'effect' && item.system.duration.type === 'permanent') {

                  // Toggle active
                  character.toggleEffectActive(item._id);
               }
            }
         }
      });
   }

   async getAttackCheckMacro(item, name, img, idMethod, attackIdx) {
      // If this is a valid macro
      if (item && item.isOwner && item.type === 'weapon' && item.system.attack.length > attackIdx) {

         // Get the id for the macro
         const id = this.getMacroID(item, idMethod);

         // Get the command
         const command = `game.titan.macros.rollAttackCheck('${id}', '${idMethod}', ${attackIdx})`;

         // Check if this macro already exists
         let retVal = await game.macros.find((macro) => macro.name === name && macro.command === command && macro.author.isSelf);
         if (!retVal) {

            // If not, create a new macro
            retVal = await Macro.create({
               name: name,
               type: 'script',
               img: img,
               command: command,
               flags: {
                  titan: {
                     macroType: 'attackCheck'
                  }
               }
            });
         }

         return retVal;
      }
   }

   async getCastingCheckMacro(item, name, img, idMethod) {
      // If this is a valid macro
      if (item && item.isOwner && item.type === 'spell') {

         // Get the id for the macro
         const id = this.getMacroID(item, idMethod);

         // Get the command
         const command = `game.titan.macros.rollCastingCheck('${id}', '${idMethod}')`;

         // Check if this macro already exists
         let retVal = await game.macros.find((macro) => macro.name === name && macro.command === command && macro.author.isSelf);
         if (!retVal) {

            // If not, create a new macro
            retVal = await Macro.create({
               name: name,
               type: 'script',
               img: img,
               command: command,
               flags: {
                  titan: {
                     macroType: 'castingCheck'
                  }
               }
            });
         }

         return retVal;
      }
   }

   async getItemCheckMacro(item, name, img, idMethod, checkIdx) {
      // If this is a valid macro
      if (item && item.isOwner && item.system.check.length > checkIdx) {

         // Get the id for the macro
         const id = this.getMacroID(item, idMethod);

         // Get the command
         const command = `game.titan.macros.rollItemCheck('${id}', '${idMethod}', ${checkIdx})`;

         // Check if this macro already exists
         let retVal = await game.macros.find((macro) => macro.name === name && macro.command === command && macro.author.isSelf);
         if (!retVal) {

            // If not, create a new macro
            retVal = await Macro.create({
               name: name,
               type: 'script',
               img: img,
               command: command,
               flags: {
                  titan: {
                     macroType: 'itemCheck'
                  }
               }
            });
         }

         return retVal;
      }
   }

   async getToggleEffectActiveMacro(item, name, img, idMethod) {
      // If this is a valid macro
      if (item && item.isOwner && item.type === 'effect' && item.system.duration.type === 'permanent') {

         // Get the id for the macro
         const id = this.getMacroID(item, idMethod);

         // Get the command
         const command = `game.titan.macros.toggleEffectActive('${id}', '${idMethod}')`;

         // Check if this macro already exists
         let retVal = await game.macros.find((macro) => macro.name === name && macro.command === command && macro.author.isSelf);
         if (!retVal) {

            // If not, create a new macro
            retVal = await Macro.create({
               name: name,
               type: 'script',
               img: img,
               command: command,
               flags: {
                  titan: {
                     macroType: 'toggleEffectActive'
                  }
               }
            });
         }

         return retVal;
      }
   }

   async getToggleDocumentSheetMacro(name, img, uuid) {
      // Get the command
      const command = `Hotbar.toggleDocumentSheet('${uuid}')`;

      // Check if this macro already exists
      let retVal = await game.macros.find((macro) => macro.name === name && macro.command === command && macro.author.isSelf);
      if (!retVal) {

         // If not, create a new macro
         retVal = await Macro.create({
            name: name,
            type: 'script',
            img: img,
            command: command,
            flags: {
               titan: {
                  macroType: 'toggleDocumentSheet'
               }
            }
         });
      }

      return retVal;
   }

   getMacroID(item, idMethod) {
      switch (idMethod) {
         case 'name': {
            return item.name;
         }
         case 'id': {
            return item._id;
         }
         default: {
            return item.flags.titan.uuid;
         }
      }
   }

   getMacroItemFromID(actor, id, idMethod) {
      let retVal = false;
      switch (idMethod) {
         case 'name': {
            for (const item of actor.items) {
               if (item.name === id) {
                  retVal = item;
                  break;
               }
            }

            break;
         }

         case 'id': {
            retVal = actor.items.get(id);
            break;
         }

         default: {
            for (const item of actor.items) {
               if (item.flags?.titan?.uuid === id) {
                  retVal = item;
                  break;
               }
            }

            break;
         }
      }

      return retVal;
   }
}

export function onHotbarDrop(data, slot) {
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

   createToggleDocumentSheetMacro(macroItem.name, macroItem.img, data.uuid, slot);
   return false;
}

async function createToggleDocumentSheetMacro(name, img, uuid, slot) {
   const macro = await game.titan.macros.getToggleDocumentSheetMacro(name, img, uuid);
   game.user.assignHotbarMacro(macro, slot);

   return;
}