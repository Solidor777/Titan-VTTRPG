/**
 * @typedef {object} CharacterSheetData Data representing the state of a
 *    Character Sheet.
 * @property {object} tabs State for the sheet Tabs.
 * @property {string} tabs.activeTab The currently active sheet tab.
 * @property {object} tabs.abilities State for the Abilities tab.
 * @property {string} tabs.abilities.filter The current filter text for the
 *    Abilities tab.
 * @property {object} tabs.abilities.filterOptions Object containing the state
 *    of the filter options for the
 *    Abilities tab.
 * @property {boolean} tabs.abilities.filterOptions.action Whether to filter the
 *    Abilities tab for Action abilities.
 * @property {boolean} tabs.abilities.filterOptions.reaction Whether to filter
 *    the Abilities tab for Reaction
 *    abilities.
 * @property {boolean} tabs.abilities.filterOptions.passive Whether to filter
 *    the Abilities tab for Passive
 *    abilities.
 * @property {Object.<string, boolean>} tabs.abilities.isExpanded Object of
 *    booleans representing whether an Ability
 *    is expanded, arranged by Item ID.
 * @property {number} tabs.abilities.scrollTop The current top of the scrollbar
 *    for the Abilities tab.
 * @property {object} tabs.inventory State for the Inventory tab.
 * @property {string} tabs.inventory.filter The current filter text for the
 *    Inventory tab.
 * @property {object} tabs.inventory.filterOptions Object containing the state
 *    of the filter options for the
 *    Inventory tab.
 * @property {boolean} tabs.inventory.filterOptions.armor Whether to filter the
 *    Inventory Tab for Armor items.
 * @property {boolean} tabs.inventory.filterOptions.commodity Whether to filter
 *    the Inventory Tab for Commodity
 *    items.
 * @property {boolean} tabs.inventory.filterOptions.equipment Whether to filter
 *    the Inventory Tab for Equipment
 *    items.
 * @property {boolean} tabs.inventory.filterOptions.shield Whether to filter the
 *    Inventory Tab for Shield items.
 * @property {boolean} tabs.inventory.filterOptions.weapon Whether to filter the
 *    Inventory Tab for Weapon items.
 * @property {Object.<string, boolean>} tabs.inventory.isExpanded Object of
 *    booleans representing whether an item is
 *    expanded, arranged by Item ID.
 * @property {number} tabs.inventory.scrollTop The current top of the scrollbar
 *    for the Inventory tab.
 * @property {object} tabs.notes State for the Notes tab.
 * @property {number} tabs.notes.scrollTop The current top of the scrollbar for
 *    the Notes tab.
 * @property {object} tabs.skills State for the Skills tab.
 * @property {string} tabs.skills.filter The current filter text for the Skills
 *    tab.
 * @property {number} tabs.skills.scrollTop The current top of the scrollbar for
 *    the Skills tab.
 * @property {object} tabs.spells State for the Spells tab.
 * @property {string} tabs.spells.filter The current filter text for the Spells
 *    tab.
 * @property {Object.<string, boolean>} tabs.spells.isExpanded Object of
 *    booleans representing whether a Spell is
 *    expanded, arranged by Item ID.
 * @property {number} tabs.spells.scrollTop The current top of the scrollbar for
 *    the Spells tab.
 */

/**
 * Initializes data for a Character Sheet.
 * @param {TitanActor} actor - The Actor this sheet belongs to.
 * @returns {CharacterSheetData} The newly created Character Sheet Data.
 */
export default function createCharacterSheetData(actor) {
   /** @type {CharacterSheetData} */
   const retVal = {
      tabs: {
         activeTab: 'skills',
         abilities: {
            filter: '',
            filterOptions: {
               action: false,
               reaction: false,
               passive: false,
            },
            isExpanded: {},
            scrollTop: 0,
         },
         inventory: {
            filter: '',
            filterOptions: {
               armor: false,
               commodity: false,
               equipment: false,
               shield: false,
               weapon: false,
            },
            isExpanded: {},
            scrollTop: 0,
         },
         notes: {
            scrollTop: 0,
         },
         skills: {
            filter: '',
            scrollTop: 0,
         },
         spells: {
            filter: '',
            isExpanded: {},
            scrollTop: 0,
         }
      }
   };

   // Initialize the expanded state map.
   for (const item of actor.items) {
      switch (item.type) {
         case 'ability' : {
            retVal.tabs.abilities.isExpanded[item._id] = false;
            break;
         }
         case 'armor':
         case 'commodity':
         case 'equipment':
         case 'shield':
         case 'weapon': {
            retVal.tabs.inventory.isExpanded[item._id] = false;
            break;
         }
         case 'spell': {
            retVal.tabs.spells.isExpanded[item._id] = false;
            break;
         }
         default: {
            break;
         }
      }
   }

   return retVal;
}
