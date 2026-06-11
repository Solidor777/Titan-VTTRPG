/** @type {Array<string>} The HUD element keys, in render order. */
export const HUD_ELEMENT_KEYS = ['portrait', 'actionMenu', 'effectsPanel'];

/**
 * Creates the default per-user HUD options.
 * @returns {object} A fresh defaults object (safe to mutate).
 */
export function createDefaultHudOptions() {
   return {
      portrait: {
         combatOnly: false,
         enabled: true,
         style: 'panelCard',
      },
      actionMenu: {
         categories: {
            abilities: true,
            effects: true,
            inventory: true,
            resistances: true,
            skills: true,
            spells: true,
            utility: true,
            weapons: true,
         },
         combatOnly: false,
         directions: {
            horizontal: {
               subButtons: 'right',
               subOptions: 'up',
            },
            vertical: {
               subButtons: 'left',
               subOptions: 'left',
            },
         },
         enabled: true,
         filters: {
            abilitiesWithChecks: true,
            effectsWithChecks: true,
            inventoryWithChecks: true,
            weaponsWithActions: true,
         },
         layout: 'vertical',
         subButtons: {
            attacks: true,
            checks: true,
            duration: true,
            equipped: true,
            openSheet: true,
            quantity: true,
            remove: true,
            sendToChat: true,
         },
         windowSize: 8,
      },
      effectsPanel: {
         combatOnly: false,
         enabled: true,
         style: 'list',
      },
   };
}

/**
 * Creates the default per-user HUD layout (positions are canvas-rect anchored).
 * @returns {object} A fresh layout object (safe to mutate).
 */
export function createDefaultHudLayout() {
   return {
      effectsPanelSize: {
         height: 320,
         width: 260,
      },
      minimized: {
         actionMenu: false,
         effectsPanel: false,
         portrait: false,
      },
      positions: {
         actionMenu: {
            anchorX: 'right',
            anchorY: 'bottom',
            dx: 16,
            dy: 16,
         },
         effectsPanel: {
            anchorX: 'right',
            anchorY: 'top',
            dx: 16,
            dy: 16,
         },
         portrait: {
            anchorX: 'left',
            anchorY: 'bottom',
            dx: 16,
            dy: 16,
         },
      },
   };
}
