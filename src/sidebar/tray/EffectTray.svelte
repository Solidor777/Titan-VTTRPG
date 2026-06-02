<script>
   import { getContext } from 'svelte';
   import EffectTrayHeader from '~/sidebar/tray/EffectTrayHeader.svelte';
   import EffectTrayList from '~/sidebar/tray/EffectTrayList.svelte';

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
</script>

<div
   class="titan-effect-tray"
   data-testid="effect-tray"
   ondragover={onDragOver}
   ondrop={onDrop}
   role="region"
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
