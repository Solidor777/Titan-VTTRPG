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
               subButtons: 'right',
               subOptions: 'right',
               subOptionsFlow: 'up',
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
 * Creates the default per-user HUD layout (positions are canvas-rect anchored). The portrait
 * defaults to the right of the core players list and scene controls in the bottom-left corner; the
 * action menu sits immediately to the portrait's right (bottom-aligned), its flyout opening rightward.
 * @returns {object} A fresh layout object (safe to mutate).
 */
export function createDefaultHudLayout() {
   return {
      effectsPanelSize: {
         height: 320,
         width: 300,
      },
      minimized: {
         actionMenu: false,
         effectsPanel: false,
         portrait: false,
      },
      positions: {
         actionMenu: {
            anchorX: 'left',
            anchorY: 'bottom',
            dx: 466,
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
            dx: 250,
            dy: 16,
         },
      },
   };
}
