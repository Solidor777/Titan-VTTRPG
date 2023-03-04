export class TitanMacros {
   rollAttackCheck(itemName, attackIdx) {
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
               const items = actor.items.filter((item) => item.name === itemName);
               if (items.length > 0) {

                  // Roll the item check

                  character.rollAttackCheck({ itemId: items[0]._id, attackIdx: attackIdx });
               }
            }
         }
      });
   }

   rollCastingCheck(itemName) {
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
               const items = actor.items.filter((item) => item.name === itemName);
               if (items.length > 0) {

                  // Roll the item check

                  character.rollCastingCheck({ itemId: items[0]._id });
               }
            }
         }
      });
   }

   rollItemCheck(itemName, checkIdx) {
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
               const items = actor.items.filter((item) => item.name === itemName);
               if (items.length > 0) {

                  // Roll the item check

                  character.rollItemCheck({ itemId: items[0]._id, checkIdx: checkIdx });
               }
            }
         }
      });
   }
}

export function createItemMacro(data, slot) {
   // Ensure the object is an item
   if (data.type !== 'Item') {
      return;
   }
   // Get the actor
   const uuidData = data.uuid.split('.');
   const macroActor = Actor.get(uuidData[1]);
   if (!macroActor) {
      return;
   }

   // Get the item from the actir
   const item = macroActor.items.get(uuidData[3]);
   if (!item) {
      return;
   }

   // Get the appropriate macro type
   switch (item.type) {
      case 'weapon': {
         // If the item has attacks, create an attack check macro
         if (item.system.attack.length > 0) {
            createAttackCheckMacro(item, slot);
            return false;
         }

         // Otherwise, if the item has checks, create an item check macro
         if (item.system.check.length > 0) {
            createItemCheckMacro(item, slot);
            return false;
         }
         break;
      }
      case 'spell': {
         // Create a spell check macro
         createCastingCheckMacro(item, slot);
         return false;
      }
      default: {
         // If the item has checks, create an item check macro
         if (item.system.check.length > 0) {
            createItemCheckMacro(item, slot);
            return false;
         }
         break;
      }
   }

   return true;
}

async function createAttackCheckMacro(item, slot) {
   const command = `game.titan.macros.rollAttackCheck('${item.name}', 0)`;
   let retVal = await game.macros.find((macro) => macro.name === item.name && macro.command === command && macro.author.isSelf);
   if (!retVal) {
      retVal = await Macro.create({
         name: item.name,
         type: 'script',
         img: item.img,
         command: command,
         flags: {
            titan: {
               macroType: 'attackCheck'
            }
         }
      });
   }

   game.user.assignHotbarMacro(retVal, slot);
}

async function createCastingCheckMacro(item, slot) {
   const command = `game.titan.macros.rollCastingCheck('${item.name}')`;
   let retVal = await game.macros.find((macro) => macro.name === item.name && macro.command === command && macro.author.isSelf);
   if (!retVal) {
      retVal = await Macro.create({
         name: item.name,
         type: 'script',
         img: item.img,
         command: command,
         flags: {
            titan: {
               macroType: 'castingCheck'
            }
         }
      });
   }

   game.user.assignHotbarMacro(retVal, slot);
}

async function createItemCheckMacro(item, slot) {
   const command = `game.titan.macros.rollItemCheck('${item.name}', 0)`;
   let retVal = await game.macros.find((macro) => macro.name === item.name && macro.command === command && macro.author.isSelf);
   if (!retVal) {
      retVal = await Macro.create({
         name: item.name,
         type: 'script',
         img: item.img,
         command: command,
         flags: {
            titan: {
               macroType: 'itemCheck'
            }
         }
      });
   }

   game.user.assignHotbarMacro(retVal, slot);
}