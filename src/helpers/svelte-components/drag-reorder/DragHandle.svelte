<script>
   import { DRAG_HANDLE_ICON } from '~/system/Icons.js';
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} DragHandleProps
    * @property {string} [label] - Accessible title for the handle.
    */

   /** @type {DragHandleProps} */
   const { label = localize('dragToReorder') } = $props();
</script>

<!--Drag handle: marks the row draggable; the draggableRow action only grabs when the press starts here.-->
<span
   class="drag-handle"
   data-drag-handle
   title={label}
   aria-label={label}
>
   <i class={DRAG_HANDLE_ICON}></i>
</span>

<style lang="scss">
   .drag-handle {
      @include flex-row;
      @include flex-group-center;

      cursor: grab;
      padding: 0 var(--titan-spacing-standard);

      // Inherit the row's own text color so the grip stays legible on attribute-coloured check/attack
      // headers as well as plain panels; a hardcoded app colour washes out on the bright headers.
      color: inherit;
      opacity: 0.55;
      transition: opacity 0.1s ease;

      &:hover {
         opacity: 1;
      }

      &:active {
         cursor: grabbing;
      }
   }
</style>
