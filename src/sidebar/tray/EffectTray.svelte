<script>
   import { getContext } from 'svelte';
   import EffectTrayHeader from '~/sidebar/tray/EffectTrayHeader.svelte';
   import EffectTrayList from '~/sidebar/tray/EffectTrayList.svelte';
   import buildEffectRowContextMenu from '~/sidebar/tray/EffectRowContextMenu.js';
   import buildEffectFolderContextMenu from '~/sidebar/tray/EffectFolderContextMenu.js';
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
    * Handles a drop anywhere on the tray as core's directory `_onDrop` does: parses the Foundry drag data
    * and hands it to the tray state with the `.directory-item` under the pointer (null over the list root
    * or the header), which moves, sorts, imports, or stashes the dropped folder or effect.
    * @param {DragEvent} event - The drop on the tray or any element inside it.
    * @returns {void}
    */
   function onDrop(event) {
      event.preventDefault();

      /** @type {object} The parsed Foundry drag data (an empty object when the payload is not JSON). */
      const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
      if (!data?.type) {
         return;
      }

      /** @type {HTMLElement | null} The folder or effect item under the drop, or null for the root. */
      const target = event.target.closest('.directory-item') ?? null;
      void trayState.dropOnDirectory(target, data);
   }

   /**
    * Svelte action attaching Foundry ContextMenus to the tray root: one targeting effect rows by their
    * `data-effect-id`, one targeting folder headers. Entries read the live tray state for permission
    * gating and document resolution. Torn down with the component.
    * @param {HTMLElement} node - The tray root element the menus delegate from.
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
         {
            jQuery: false,
            fixed: true,
         },
      );

      /** @type {object} The Foundry context menu bound to the tray's folder headers. */
      const folderMenu = new foundry.applications.ux.ContextMenu(
         node,
         '.folder-header',
         buildEffectFolderContextMenu(trayState),
         {
            jQuery: false,
            fixed: true,
         },
      );

      return {
         destroy() {
            menu.close?.({ animate: false });
            folderMenu.close?.({ animate: false });
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
   // A plain column like the core directory tab: children stretch to full width and keep core text alignment.
   .titan-effect-tray {
      @include flex-column;

      flex: 1;
      width: 100%;
      min-height: 0;
      overflow: hidden;
   }
</style>
