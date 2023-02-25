<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import { localize } from '~/helpers/Utility.js';
   import DocumentSelect from '~/documents/components/select/DocumentSelect.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import onRulesElementOperationChanged from './RulesElementUpdateOperation';
   import DocumentBoundEditorInput from '~/documents/components/input/DocumentBoundEditorInput.svelte';

   // Setup context variables
   const document = getContext('DocumentStore');

   export let operationOptions = void 0;
   export let idx = void 0;

   const selectorOptions = [
      {
         label: localize('turnStart'),
         value: 'turnStart',
      },
      {
         label: localize('turnEnd'),
         value: 'turnEnd',
      },
   ];

   // Dynamic element
   $: element = $document.system.rulesElement[idx];

   // Setup tabs
</script>

{#if element && element.operation === 'turnMessage'}
   <div class="element" transition:slide|local>
      <!--Element Operation-->
      <div class="settings">
         <div class="field select">
            <DocumentSelect
               options={operationOptions}
               bind:value={element.operation}
               on:change={() => {
                  onRulesElementOperationChanged($document, idx);
               }}
            />
         </div>

         <!--Selector-->
         <div class="field select">
            <DocumentSelect
               options={selectorOptions}
               bind:value={element.selector}
            />
         </div>

         <!--Message text-->
         <div class="message">
            <DocumentBoundEditorInput bind:value={element.message} />
         </div>
      </div>

      <!--Delete Element-->
      <div class="delete-button">
         <IconButton
            icon={'fas fa-trash'}
            on:click={() => {
               $document.typeComponent.removeRulesElement(idx);
            }}
         />
      </div>
   </div>
{/if}

<style lang="scss">
   @import '../../../Styles/Mixins.scss';

   .element {
      @include flex-row;
      @include flex-space-between;
      @include border;
      @include panel-1;
      width: 100%;
      height: 100%;
      min-height: 15rem;

      .settings {
         @include flex-row;
         @include flex-group-top-left;
         width: 100%;
         height: 100%;
         margin-bottom: 0.5rem;
         flex-wrap: wrap;

         .field {
            @include flex-row;
            margin: 0.5rem 0.25rem 0 0.25rem;

            &.select {
               @include flex-group-left;
            }
         }

         .message {
            margin-top: 0.25rem;
            @include flex-column;
            width: 100%;
            height: 100%;
         }
      }

      .delete-button {
         @include flex-column;
         @include flex-group-top;
         height: 100%;
         margin: 0.5rem 0.25rem 0 0;
      }
   }
</style>
