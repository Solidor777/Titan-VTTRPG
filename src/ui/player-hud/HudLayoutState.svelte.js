import { createDefaultHudLayout } from '~/ui/player-hud/PlayerHudDefaults.js';

/**
 * Shared Player HUD layout/UI state, preserved across shell remounts. Persistence is injected so
 * the class stays settings-agnostic (and unit-testable).
 * @class HudLayoutState
 */
export default class HudLayoutState {
   /** @type {{left: number, top: number, width: number, height: number}} The usable canvas rect. */
   rect = $state({ left: 0, top: 0, width: 0, height: 0 });

   /** @type {object} Per-element anchored positions, keyed by element key. */
   positions = $state({});

   /** @type {{width: number, height: number}} The effects panel's user-set size. */
   effectsPanelSize = $state({ width: 300, height: 320 });

   /** @type {object} Per-element minimized flags, keyed by element key. */
   minimized = $state({});

   /** @type {boolean} Whether layout-edit mode is active. */
   editMode = $state(false);

   /** @type {boolean} Whether an active combat encounter has started. */
   combatActive = $state(false);

   /** @type {string | null} The open action-menu category key, or null when closed. */
   openCategory = $state(null);

   /** @type {Function} Receives a plain layout snapshot to persist. */
   #onSave;

   /**
    * Builds the state from a stored layout.
    * @param {object} params - Construction inputs.
    * @param {object} params.layout - The effective stored layout (already merged over defaults).
    * @param {Function} params.onSave - Called with a plain layout snapshot to persist.
    */
   constructor({ layout, onSave }) {
      this.#onSave = onSave;
      this.#load(layout);
   }

   /**
    * Loads layout fields into the rune state.
    * @param {object} layout - The layout to load.
    * @returns {void}
    */
   #load(layout) {
      this.positions = layout.positions;
      this.effectsPanelSize = layout.effectsPanelSize;
      this.minimized = layout.minimized;
   }

   /**
    * Persists the current layout via the injected saver.
    * @returns {void}
    */
   persist() {
      this.#onSave($state.snapshot({
         effectsPanelSize: this.effectsPanelSize,
         minimized: this.minimized,
         positions: this.positions,
      }));
   }

   /**
    * Toggles an element's minimized state and persists.
    * @param {string} elementKey - The layout key of the element to toggle.
    * @returns {void}
    */
   toggleMinimized(elementKey) {
      this.minimized[elementKey] = !this.minimized[elementKey];
      this.persist();
   }

   /**
    * Restores the default layout and persists.
    * @returns {void}
    */
   reset() {
      this.#load(createDefaultHudLayout());
      this.persist();
   }
}
