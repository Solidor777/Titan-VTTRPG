<script>
   import { TJSProseMirror } from '@typhonjs-fvtt/svelte-standard/component';
   import { getContext } from 'svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} Path to the value that this input should modify. */
   export let path = void 0;

   /** @type {boolean} Whether editing this input should be disabled. */
   export let disabled = false;

   /** @type {string | TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<div
   class={$document.isOwner ? 'editor rich-text' : 'editor rich-text not-owner'}
   use:tooltipAction={tooltip}
>
   <TJSProseMirror options={{
      document: $document,
      fieldName: path,
      editable: $document.isOwner && !disabled
   }}/>
</div>

<style lang="scss">
   .editor {
      @include flex-row;
      @include flex-group-left;

      width: 100%;
      height: 100%;
   }
</style>
