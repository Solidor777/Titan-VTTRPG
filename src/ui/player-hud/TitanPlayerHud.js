import { mount, unmount } from 'svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import PlayerHudShell from '~/ui/player-hud/PlayerHudShell.svelte';
import HudLayoutState from '~/ui/player-hud/HudLayoutState.svelte.js';
import resolveHudActors from '~/ui/player-hud/ResolveHudActors.js';
import { computeCanvasRect } from '~/ui/player-hud/HudGeometry.js';
import enablePlayerHud from '~/helpers/Settings/EnablePlayerHud.js';
import showFoundryHotbar from '~/helpers/Settings/ShowFoundryHotbar.js';
import playerHudOptions from '~/helpers/Settings/PlayerHudOptions.js';
import playerHudLayout from '~/helpers/Settings/PlayerHudLayout.js';

/**
 * Singleton controller for the Player HUD. Owns the full-viewport pass-through layer, wires the
 * reactivity hooks, resolves the displayed actors, controls the core hotbar's visibility, and
 * mounts/unmounts the Svelte tree.
 * @class TitanPlayerHud
 */
export default class TitanPlayerHud {
   /** @type {HTMLElement | undefined} The full-viewport layer appended to the UI. */
   #element;

   /** @type {object | undefined} The active Svelte mount handle. */
   #handle;

   /** @type {ReactiveDocument | undefined} Bridge around the current primary actor. */
   #bridge;

   /** @type {string | undefined} Identity key of the currently-mounted actor set. */
   #mountKey;

   /** @type {HudLayoutState | undefined} Shared layout state, preserved across remounts. */
   #layoutState;

   /**
    * Initializes the HUD: builds the layer, wires hooks, applies hotbar visibility, renders once.
    * @returns {void}
    */
   init() {
      // Guard against double-initialization so hooks and the layer are never duplicated.
      if (this.#element) {
         return;
      }

      this.#layoutState = new HudLayoutState({
         layout: playerHudLayout(),
         onSave: (layout) => game.settings.set('titan', 'playerHudLayout', layout),
      });

      // The layer itself never captures pointer events; element frames opt back in.
      this.#element = window.document.createElement('div');
      this.#element.id = 'titan-player-hud';
      this.#element.style.cssText = [
         'position: fixed',
         'inset: 0',
         'z-index: 60',
         'pointer-events: none',
      ].join(';');
      (window.document.getElementById('interface') ?? window.document.body).appendChild(this.#element);

      Hooks.on('controlToken', () => this.refresh());
      Hooks.on('canvasReady', () => {
         this.#measureRect();
         this.refresh();
      });
      Hooks.on('updateUser', (user) => {
         if (user.id === game.user.id) {
            this.refresh();
         }
      });
      Hooks.on('combatStart', () => this.#updateCombatActive());
      Hooks.on('updateCombat', () => this.#updateCombatActive());
      Hooks.on('deleteCombat', () => this.#updateCombatActive());
      Hooks.on('renderHotbar', () => this.applyHotbarVisibility());
      window.addEventListener('resize', () => this.#measureRect());

      this.#measureRect();
      this.#updateCombatActive();
      this.applyHotbarVisibility();
      this.refresh();
   }

   /**
    * The shared layout/UI state (positions, sizes, edit mode), for the settings application and
    * the edit toolbar.
    * @returns {HudLayoutState | undefined} The layout state, once initialized.
    */
   get layoutState() {
      return this.#layoutState;
   }

   /**
    * Restores the default layout (positions, effects panel size, minimized states) and persists.
    * @returns {void}
    */
   resetLayout() {
      this.#layoutState?.reset();
   }

   /**
    * Shows or hides the core macro hotbar per the user setting.
    * @returns {void}
    */
   applyHotbarVisibility() {
      /** @type {HTMLElement | undefined} The hotbar's root element. */
      const hotbar = ui.hotbar?.element;
      if (hotbar) {
         hotbar.style.display = showFoundryHotbar() ? '' : 'none';
      }
   }

   /**
    * Toggles layout-edit mode.
    * @returns {void}
    */
   toggleEditMode() {
      if (this.#layoutState) {
         this.#layoutState.editMode = !this.#layoutState.editMode;
      }
   }

   /**
    * Resolves the actors the HUD should display for the current user.
    * @returns {{actors: Array<Actor>, primary: Actor | null}} The resolved actors.
    */
   resolveActors() {
      /**
       * Tests whether a value is a TITAN character actor.
       * @param {Actor | null | undefined} actor - The actor to test.
       * @returns {boolean} Whether the actor is a TITAN character actor.
       */
      const isCharacter = (actor) => actor?.system?.isCharacter === true;

      /** @type {Array<Actor>} Character actors of selected tokens, in selection order. */
      const selected = Array.from(canvas?.tokens?.controlled ?? [])
         .map((token) => token.actor)
         .filter(isCharacter);

      /** @type {Array<Actor>} Character actors the user owns on the scene. */
      const owned = Array.from(canvas?.tokens?.placeables ?? [])
         .map((token) => token.actor)
         .filter((actor) => isCharacter(actor) && actor.isOwner);

      /** @type {Actor | null} The user's assigned character, if it is a character actor. */
      const assigned = isCharacter(game.user.character) ? game.user.character : null;

      return resolveHudActors({ isGM: game.user.isGM, selected, owned, assigned });
   }

   /**
    * Reconciles the mounted HUD with the enable setting and the resolved actor set.
    * @param {object} [options] - Controls how the refresh reconciles.
    * @param {boolean} [options.force] - Remounts even when the actor set is unchanged.
    * @returns {void}
    */
   refresh({ force = false } = {}) {
      if (!enablePlayerHud() || !canvas?.scene) {
         this.#unmount();
         return;
      }

      // While editing the layout, keep the current mount regardless of token selection so the HUD
      // stays visible to edit; selection-driven actor changes resume once edit mode exits.
      if (this.#layoutState?.editMode && this.#mountKey !== undefined) {
         return;
      }

      const { actors, primary } = this.resolveActors();

      /** @type {string} Identity of the resolved set; membership changes force a remount. */
      const mountKey = actors.map((actor) => actor.id).join('|');
      if (!force && mountKey === (this.#mountKey ?? '')) {
         return;
      }
      this.#mountActors(actors, primary, mountKey);
   }

   /**
    * Mounts the shell for the resolved actors, tearing down any previous mount first.
    * @param {Array<Actor>} actors - The resolved actors.
    * @param {Actor | null} primary - The primary actor.
    * @param {string} mountKey - The identity key of the actor set.
    * @returns {void}
    */
   #mountActors(actors, primary, mountKey) {
      this.#unmount();
      if (!primary) {
         return;
      }

      this.#bridge = new ReactiveDocument(primary);
      this.#mountKey = mountKey;
      this.#handle = mount(PlayerHudShell, {
         target: this.#element,
         props: {
            documentStore: this.#bridge,
            actors: actors,
            layoutState: this.#layoutState,
            options: playerHudOptions(),
         },
      });
   }

   /**
    * Unmounts the current HUD tree, if any.
    * @returns {void}
    */
   #unmount() {
      if (this.#handle) {
         unmount(this.#handle);
         this.#handle = undefined;
      }
      this.#bridge = undefined;
      this.#mountKey = undefined;
   }

   /**
    * Measures the usable canvas rect: the viewport minus the sidebar at its EXPANDED width, so HUD
    * elements anchor to the left of the open sidebar and stay put when it collapses (chat
    * notifications still surface in the freed space). `ui.sidebar.element` is the whole `#sidebar`
    * (rail plus content when expanded); while collapsed it is the rail alone, so the expanded content
    * panel's width (the `--sidebar-width` custom property) is added back to keep the rect stable.
    * @returns {void}
    */
   #measureRect() {
      /** @type {HTMLElement | undefined} The sidebar root element. */
      const sidebarEl = ui.sidebar?.element;

      /** @type {number} The sidebar's current rendered width (rail alone collapsed; rail + content expanded). */
      const currentWidth = sidebarEl?.getBoundingClientRect()?.width ?? 0;

      /** @type {number} The expanded content panel width, added back while collapsed so the rect never moves. */
      const contentWidth = sidebarEl
         ? parseFloat(getComputedStyle(sidebarEl).getPropertyValue('--sidebar-width')) || 0
         : 0;

      /** @type {number} The sidebar width as if always expanded. */
      const sidebarWidth = ui.sidebar?.expanded ? currentWidth : currentWidth + contentWidth;

      if (this.#layoutState) {
         this.#layoutState.rect = computeCanvasRect({
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            sidebarWidth: sidebarWidth,
         });
      }
   }

   /**
    * Mirrors the active combat's started state into the layout state.
    * @returns {void}
    */
   #updateCombatActive() {
      if (this.#layoutState) {
         this.#layoutState.combatActive = game.combat?.started === true;
      }
   }
}
