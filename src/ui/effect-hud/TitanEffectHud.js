import { mount, unmount } from 'svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import EffectHudShell from '~/ui/effect-hud/EffectHudShell.svelte';
import EffectHudState from '~/ui/effect-hud/EffectHudState.svelte.js';
import resolveHudActor from '~/ui/effect-hud/ResolveHudActor.js';
import effectHudEnabled from '~/helpers/Settings/EffectHudEnabled.js';

/**
 * Singleton controller for the native Effect HUD. Owns the fixed-position container, wires
 * the reactivity hooks, resolves the tracked actor, and mounts/unmounts the Svelte tree.
 * @class TitanEffectHud
 */
export default class TitanEffectHud {
   /** @type {HTMLElement | undefined} The fixed-position container appended to the UI. */
   #element;

   /** @type {object | undefined} The active Svelte mount handle. */
   #handle;

   /** @type {ReactiveDocument | undefined} Bridge around the currently-tracked actor. */
   #bridge;

   /** @type {string | undefined} The id of the currently-tracked actor. */
   #actorId;

   /** @type {EffectHudState} Shared HUD UI state, preserved across remounts. */
   #state = new EffectHudState();

   /**
    * Initializes the HUD: builds the container, wires reactivity hooks, and renders once.
    * @returns {void}
    */
   init() {
      // Build the fixed-position container above the players list.
      this.#element = window.document.createElement('div');
      this.#element.id = 'titan-effect-hud';
      this.#element.style.cssText = [
         'position: fixed',
         'right: 8px',
         'bottom: 96px',
         'z-index: 60',
         'display: flex',
         'flex-direction: column',
         'align-items: flex-end',
         'pointer-events: none',
      ].join(';');
      (window.document.getElementById('interface') ?? window.document.body).appendChild(this.#element);

      // Re-resolve the tracked actor whenever selection, assignment, or scene changes.
      Hooks.on('controlToken', () => this.refresh());
      Hooks.on('canvasReady', () => this.refresh());
      Hooks.on('updateUser', (user) => {
         if (user.id === game.user.id) {
            this.refresh();
         }
      });

      this.refresh();
   }

   /**
    * Resolves the active actor for the current user via the precedence ladder.
    * @returns {Actor | null} The actor whose effects should be shown, or null.
    */
   resolveActiveActor() {
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

      return resolveHudActor({ isGM: game.user.isGM, selected, owned, assigned });
   }

   /**
    * Reconciles the mounted HUD with the current setting and resolved actor.
    * @returns {void}
    */
   refresh() {
      // Honor the enable setting: unmount and stop if disabled.
      if (!effectHudEnabled()) {
         this.#unmount();
         return;
      }

      // Only remount when the tracked actor actually changes; within one actor the bridge
      // updates the HUD reactively for effect CRUD and duration ticks.
      const actor = this.resolveActiveActor();
      if ((actor?.id ?? null) === (this.#actorId ?? null)) {
         return;
      }
      this.#mountActor(actor);
   }

   /**
    * Mounts the HUD for the given actor, tearing down any previous mount first.
    * @param {Actor | null} actor - The actor to track, or null to clear the HUD.
    * @returns {void}
    */
   #mountActor(actor) {
      this.#unmount();
      if (!actor) {
         return;
      }

      this.#bridge = new ReactiveDocument(actor);
      this.#actorId = actor.id;
      this.#handle = mount(EffectHudShell, {
         target: this.#element,
         props: {
            documentStore: this.#bridge,
            hudState: this.#state,
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
      this.#actorId = undefined;
   }
}
