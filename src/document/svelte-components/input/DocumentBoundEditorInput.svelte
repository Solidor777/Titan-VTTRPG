<script>
   import { getContext } from 'svelte';
   import { TJSProseMirror } from '@typhonjs-fvtt/standard/component/fvtt/editor';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} - The value that this input should modify. */
   export let value = void 0;

   /** @type {boolean} - Whether editing should be disabled for this component. */
   export let disabled = false;

   /** @type {string|TooltipAction} - The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<div
   class={$document.isOwner ? 'editor rich-text' : 'editor rich-text not-owner'}
   use:tooltipAction={tooltip}
>
   <TJSProseMirror
      bind:content={value}
      on:editor:save={() => refreshSystemDocument($document, disabled)}
      options={{editable: $document.isOwner && !disabled}}
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
