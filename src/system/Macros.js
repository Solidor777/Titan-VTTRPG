export default class TitanMacros {
   rollAttackCheck(id, idMethod, attackIdx) {
      // For each controlled token
      const controlledTokens = Array.from(canvas.tokens.controlled);
      controlledTokens.forEach((token) => {

         // Get the actor
         const actor = token.actor;
         if (actor && actor.system.isCharacter) {

            // Get the item
            const item = this.getMacroItemFromID(actor, id, idMethod);
            if (item && item.type === 'weapon' && item.system.attack.length > attackIdx) {

               // Roll the check
               actor.system.requestAttackCheck({ itemId: item._id, attackIdx: attackIdx });
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
         if (actor && actor.system.isCharacter) {

            // Get the item
            const item = this.getMacroItemFromID(actor, id, idMethod);
            if (item && item.type === 'spell') {

               // Roll the check
               actor.system.requestCastingCheck({ itemId: item._id });
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
         if (actor && actor.system.isCharacter) {

            // Get the item
            const item = this.getMacroItemFromID(actor, id, idMethod);
            if (item && item.system.check.length > 0) {

               // Roll the check
               actor.system.requestItemCheck({ itemId: item._id, checkIdx: checkIdx });
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
         if (actor && actor.system.isCharacter) {

            // Get the item
            const item = this.getMacroItemFromID(actor, id, idMethod);
            if (item && item.type === 'effect' && item.system.duration.type === 'permanent') {

               // Toggle active
               actor.system.toggleEffectActive(item._id);
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
         const command = `game.titan.macros.requestAttackCheck('${id}', '${idMethod}', ${attackIdx})`;

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
                     macroType: 'attackCheck',
                  },
               },
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
                     macroType: 'castingCheck',
                  },
               },
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
                     macroType: 'itemCheck',
                  },
               },
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
                     macroType: 'toggleEffectActive',
                  },
               },
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
                  macroType: 'toggleDocumentSheet',
               },
            },
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
