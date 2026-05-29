<script>
   import { getContext } from 'svelte';
   import ProseMirrorEditor from '~/helpers/svelte-components/editor/ProseMirrorEditor.svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} Path to the document field this input modifies, required by the editor wrapper. */
   export let path = void 0;

   /** @type {string} The value that this input should modify. */
   export let value = void 0;

   /** @type {boolean} Whether editing should be disabled for this component. */
   export let disabled = false;

   /** @type {string | TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<div
   class={$document.isOwner ? 'editor rich-text' : 'editor rich-text not-owner'}
   use:tooltipAction={tooltip}
>
   <ProseMirrorEditor
      document={$document}
      fieldName={path}
      value={value}
      editable={$document.isOwner && !disabled}
   />
</div>

<style lang="scss">
   .editor {
      @include flex-row;
      @include flex-group-left;

      width: 100%;
      height: 100%;
   }
</style>
