<script>
   import { getContext } from 'svelte';
   import EffectTrayHeader from '~/sidebar/tray/EffectTrayHeader.svelte';
   import EffectTrayList from '~/sidebar/tray/EffectTrayList.svelte';
   import buildEffectRowContextMenu from '~/sidebar/tray/EffectRowContextMenu.js';
   import MoveEffectToFolderDialog from '~/sidebar/tray/MoveEffectToFolderDialog.js';

   /**
    * @type {import('~/sidebar/tray/EffectTrayState.svelte.js').default} The reactive tray state from
    *    context.
    */
   const trayState = getContext('trayState');

   /**
    * Allows a drop on the tray by preventing the default dragover handling.
    * @param {DragEvent} event - The dragover event.
    * @returns {void}
    */
   function onDragOver(event) {
      event.preventDefault();
   }

   /**
    * Stashes a dropped effect into the selected pack. Parses the standard Foundry drag data from the
    * transfer and forwards it to the tray state, which guards editability and the data type.
    * @param {DragEvent} event - The drop event.
    * @returns {void}
    */
   function onDrop(event) {
      event.preventDefault();

      /** @type {string} The raw drag-data payload from the transfer. */
      const raw = event.dataTransfer?.getData('text/plain');
      if (!raw) {
         return;
      }

      /** @type {object | undefined} The parsed Foundry drag data, or undefined when malformed. */
      let dragData = void 0;
      try {
         dragData = JSON.parse(raw);
      }
      catch {
         return;
      }

      void trayState.stashFromDragData(dragData);
   }

   /**
    * Svelte action attaching a Foundry ContextMenu to the tray root, targeting effect rows by their
    * `data-effect-id`. Entries read the live tray state for permission gating and effect resolution.
    * Torn down with the component.
    * @param {HTMLElement} node - The tray root element the menu delegates from.
    * @returns {{ destroy: () => void }} The action lifecycle handle.
    */
   function effectContextMenu(node) {
      /**
       * Opens the move-to-folder picker for an effect. Defined here so the menu module carries no
       * AppV2-dialog import (keeping it unit-testable); the dialog is statically imported above.
       * @param {object} effect - The effect to relocate.
       * @returns {void}
       */
      const openMoveToFolder = (effect) => {
         new MoveEffectToFolderDialog(effect, trayState).render(true);
      };

      /** @type {object} The Foundry context menu bound to the tray's effect rows. */
      const menu = new foundry.applications.ux.ContextMenu(
         node,
         '[data-effect-id]',
         buildEffectRowContextMenu(trayState, openMoveToFolder),
         { jQuery: false, fixed: true },
      );

      return {
         destroy() {
            menu.close?.({ animate: false });
         },
      };
   }
</script>

<div
   class="titan-effect-tray"
   data-testid="effect-tray"
   ondragover={onDragOver}
   ondrop={onDrop}
   role="region"
   use:effectContextMenu
>
   <EffectTrayHeader />
   <EffectTrayList />
</div>

<style lang="scss">
   .titan-effect-tray {
      @include flex-column;
      @include flex-group-top;

      width: 100%;
      height: 100%;
      overflow: hidden;
   }
</style>
