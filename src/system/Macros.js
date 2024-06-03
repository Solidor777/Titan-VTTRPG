import getControlledCharacters from '~/helpers/utility-functions/GetControlledCharacters.js';

const ATTACK_CHECK_MACRO_VERSION = 0;
const CASTING_CHECK_MACRO_VERSION = 0;
const ITEM_CHECK_MACRO_VERSION = 0;
const TOGGLE_EFFECT_ACTIVE_MACRO_VERSION = 0;
const TOGGLE_DOCUMENT_SHEET_MACRO_VERSION = 0;

/**
 * Object for creating and executing macros.
 */
export default class TitanMacros {
   /**
    * Rolls an Attack Check for each controlled Character using the provided Item and Attack idx.
    * @param {string} id - The ID used to identity the Item.
    * @param {string} idMethod - The method used to identity the Item (uuid, name, or documentId).
    * @param {number} attackIdx - The idx of the Attack in the item's Attack array.
    */
   rollAttackCheck(id, idMethod, attackIdx) {
      // For each controlled character actor
      const controlledCharacters = getControlledCharacters();
      for (const actor of controlledCharacters) {

         // Get the item
         const item = this.getMacroItemFromID(actor, id, idMethod);
         if (item?.system.attack?.length > attackIdx) {

            // Roll the check
            actor.system.requestAttackCheck({itemId: item._id, attackIdx: attackIdx});
         }
      }
   }

   /**
    * Rolls a Casting Check for each controlled Character using the provided Item.
    * @param {string} id - The ID used to identity the Item.
    * @param {string} idMethod - The method used to identity the Item (uuid, name, or documentId).
    */
   rollCastingCheck(id, idMethod) {
      // For each controlled character actor
      const controlledCharacters = getControlledCharacters();
      for (const actor of controlledCharacters) {

         // Get the item
         const item = this.getMacroItemFromID(actor, id, idMethod);
         if (item?.type === 'spell') {

            // Roll the check
            actor.system.requestCastingCheck({itemId: item._id});
         }
      }
   }

   /**
    * Rolls an Item Check for each controlled Character using the provided Item and Check Idx.
    * @param {string} id - The ID used to identity the Item.
    * @param {string} idMethod - The method used to identity the Item (uuid, name, or documentId).
    * @param {number} checkIdx - The idx of the Check in the Item's Checks array.
    */
   rollItemCheck(id, idMethod, checkIdx) {
      // For each controlled character actor
      const controlledCharacters = getControlledCharacters();
      for (const actor of controlledCharacters) {

         // Get the item
         const item = this.getMacroItemFromID(actor, id, idMethod);
         if (item?.system.check.length > 0) {

            // Roll the check
            actor.system.requestItemCheck({itemId: item._id, checkIdx: checkIdx});
         }
      }
   }

   /**
    * Toggles Active on an effect for each controlled Character using the provided Item.
    * @param {string} id - The ID used to identity the Item.
    * @param {string} idMethod - The method used to identity the Item (uuid, name, or documentId).
    */
   toggleEffectActive(id, idMethod) {
      // For each controlled character actor
      const controlledCharacters = getControlledCharacters();
      for (const actor of controlledCharacters) {

         // Get the item
         const item = this.getMacroItemFromID(actor, id, idMethod);
         if (item?.system.duration?.type === 'permanent') {

            // Toggle active
            actor.system.toggleEffectActive(item._id);
         }
      }
   }

   /**
    * Creates Macro for rolling an Attack Check using provided Weapon Item and Attack idx.
    * @param {TitanItem} item - The Item to create the Macro for.
    * @param {string} name - The display name for the Macro.
    * @param {string} img - The path to the image to display for the Macro.
    * @param {string} idMethod - The method used to identity the Item (uuid, name, or documentId).
    * @param {number} attackIdx - The idx of the Attack in the item's Attack array.
    * @returns {Macro} - The newly created Macro.
    */
   async getAttackCheckMacro(item, name, img, idMethod, attackIdx) {
      // Check if the input is valid
      if (item?.isOwner && item.system.attack?.length > attackIdx) {

         // Get the id depending on the id method
         const id = this.getMacroID(item, idMethod);

         // Create the command
         const command = `game.titan.macros.requestAttackCheck('${id}', '${idMethod}', ${attackIdx})`;

         // Get or create the macro
         return this.getOrCreateMacro(name, img, command, 'attackCheck', ATTACK_CHECK_MACRO_VERSION);
      }
   }

   /**
    * Creates a Macro for rolling a Casting Check using the provided Spell Item.
    * @param {TitanItem} item - The Item to create the Macro for.
    * @param {string} name - The display name for the Macro.
    * @param {string} img - The path to the image to display for the Macro.
    * @param {string} idMethod - The method used to identity the Item (uuid, name, or documentId).
    * @returns {Macro} - The newly created Macro.
    */
   async getCastingCheckMacro(item, name, img, idMethod) {
      // Check if the input is valid
      if (item?.isOwner && item.type === 'spell') {

         // Get the id depending on the id method
         const id = this.getMacroID(item, idMethod);

         // Create the command
         const command = `game.titan.macros.rollCastingCheck('${id}', '${idMethod}')`;

         // Get or create the macro
         return this.getOrCreateMacro(name, img, command, 'castingCheck', CASTING_CHECK_MACRO_VERSION);
      }
   }

   /**
    * Creates a Macro for rolling an Item Check using the provided Item and Check idx.
    * @param {TitanItem} item - The Item to create the Macro for.
    * @param {string} name - The display name for the Macro.
    * @param {string} img - The path to the image to display for the Macro.
    * @param {string} idMethod - The method used to identity the Item (uuid, name, or documentId).
    * @param {number} checkIdx - The idx of the Check in the Item's Check array.
    * @returns {Macro} - The newly created Macro.
    */
   async getItemCheckMacro(item, name, img, idMethod, checkIdx) {
      // Check if the input is valid
      if (item?.isOwner && item.system.check.length > checkIdx) {

         // Get the id depending on the id method
         const id = this.getMacroID(item, idMethod);

         // Create the command
         const command = `game.titan.macros.rollItemCheck('${id}', '${idMethod}', ${checkIdx})`;

         // Get or create the macro
         return this.getOrCreateMacro(name, img, command, 'itemCheck', ITEM_CHECK_MACRO_VERSION);
      }
   }

   /**
    * Creates a Macro for toggling whether the provided Effect is active on a Character.
    * @param {TitanItem} item - The Item to create the Macro for.
    * @param {string} name - The display name for the Macro.
    * @param {string} img - The path to the image to display for the Macro.
    * @param {string} idMethod - The method used to identity the Item (uuid, name, or documentId).
    * @returns {Macro} - The newly created Macro.
    */
   async getToggleEffectActiveMacro(item, name, img, idMethod) {
      // Check if the input is valid
      if (item?.isOwner && item.system.duration?.type === 'permanent') {

         // Get the id depending on the id method
         const id = this.getMacroID(item, idMethod);

         // Get the command
         const command = `game.titan.macros.toggleEffectActive('${id}', '${idMethod}')`;

         // Get or create the macro
         return this.getOrCreateMacro(
            name, img, command, 'toggleEffectActive', TOGGLE_EFFECT_ACTIVE_MACRO_VERSION);
      }
   }

   /**
    * Creates a Macro for toggling the sheet for a provided Document.
    * @param {string} name - The display name for the Macro.
    * @param {string} img - The path to the image to display for the Macro.
    * @param {string} uuid - The unique identifier for the Document to toggle the sheet for.
    * @returns {Macro} - The newly created Macro.
    */
   async getToggleDocumentSheetMacro(name, img, uuid) {
      // Create the command
      const command = `Hotbar.toggleDocumentSheet('${uuid}')`;

      // Get or create the macro
      return this.getOrCreateMacro(
         name, img, command, 'toggleDocumentSheet', TOGGLE_DOCUMENT_SHEET_MACRO_VERSION);
   }

   /**
    * Gets the ID to be used with the provided ID method to retrieve the document when executing the macro.
    * @param {Document} document - The Document to get the ID for.
    * @param {string} idMethod - The method that will be used to get the Document from the ID (uuid, name, or document
    * ID).
    * @returns {string} The ID to be used with the provided ID method to retrieve the document when executing the macro.
    */
   getMacroID(document, idMethod) {
      switch (idMethod) {
         case 'name': {
            return document.name;
         }
         case 'id': {
            return document._id;
         }
         default: {
            return document.flags.titan.uuid;
         }
      }
   }

   /**
    * Retrieves an Item from the provided Actor using the provided ID and ID method.
    * @param {Document} actor - The Actor to retrieve the Item from.
    * @param {string} id - The ID to be used with the provided ID method to retrieve the item.
    * @param {string} idMethod - The method that will be used to get the Item from the ID (uuid, name, or document ID).
    * @returns {TitanItem?} The retrieved Item from the provided Actor using the provided ID and ID method, if any.
    */
   getMacroItemFromID(actor, id, idMethod) {
      switch (idMethod) {
         // Get an item with a matching name
         case 'name': {
            for (const item of actor.items) {
               if (item.name === id) {
                  return item;
               }
            }

            break;
         }

         // Get an item with a matching ID
         case 'documentId': {
            return actor.items.get(id);
         }

         // Get an item with a matching UUID
         default: {
            for (const item of actor.items) {
               if (item.flags?.titan?.uuid === id) {
                  return item;
               }
            }

            break;
         }
      }
   }

   /**
    * Checks if a Macro with a matching name, image, and command already exists.
    * If so, gets and returns that Macro.
    * If not creates a new Macro with the name, image, command, and the provided type.
    * @param {string} name - The display name for the Macro.
    * @param {string} img - The path to the image to display for the Macro.
    * @param {string} command - The command for the Macro to execute.
    * @param {string} macroType - The Macro's command type.
    * @param {number} macroVersion - The current version of the Macro.
    * @returns {Macro} The newly created or already existing Macro.
    */
   async getOrCreateMacro(name, img, command, macroType, macroVersion) {
      // Get this macro if it already exists
      let retVal = await game.macros.find((macro) => {
         return macro.author.isSelf &&
            macro.name === name &&
            macro.command === command &&
            macro.img === img &&
            macro.flags.titan?.macroType === macroType &&
            macro.flags.titan.macroVersion === macroVersion;
      });

      // If not, create a new macro
      if (!retVal) {
         retVal = await Macro.create({
            name: name,
            type: 'script',
            img: img,
            command: command,
            flags: {
               titan: {
                  macroType: macroType,
                  macroVersion: macroVersion
               },
            },
         });
      }

      return retVal;
   }
}
