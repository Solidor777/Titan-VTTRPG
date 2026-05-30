<script>
   import { getContext } from 'svelte';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentBoundEditorInput from '~/document/svelte-components/input/DocumentBoundEditorInput.svelte';

   /**
    * @typedef {object} ItemSheetTurnMessageSettingsProps
    * @property {number} [idx] The index of the rules element in the item's rules elements array.
    */

   /** @type {ItemSheetTurnMessageSettingsProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string[]} Options for which turn the message is sent. */
   const selectorOptions = [
      'turnStart',
      'turnEnd',
   ];
</script>

<!--Operation settings-->
<div class="settings">

   <!--Operation Fields-->
   <div class="fields">

      <!--Selector-->
      <div class="field select">
         <DocumentSelect
            bind:value={document.data.system.rulesElement[idx].selector}
            options={selectorOptions}
         />
      </div>
   </div>

   <!--Message text-->
   <div class="message">
      <DocumentBoundEditorInput
         bind:value={document.data.system.rulesElement[idx].message}
      />
   </div>
</div>

<style lang="scss">
   .settings {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .fields {
         @include tag-container;
         @include flex-group-left;

         .field {
            @include flex-row;
            @include flex-group-left;
         }
      }

      .message {
         @include flex-row;
         @include flex-group-left;
      }
   }
</style>
