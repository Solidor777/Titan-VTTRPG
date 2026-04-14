<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import { DELETE_ICON } from '~/system/Icons.js';
   import ItemSheetRulesElementOperationSelect
      from '~/document/types/item/sheet/rules-element/ItemSheetRulesElementOperationSelect.svelte';

   /**
    * @type {number}
    * The index of the rules element in the item's rules elements array.
    */
   export let idx = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Rules Element object. */
   $: element = $document?.rulesElement[idx];
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
</script>

{#if element && element.operation === 'persistentDamage'}
   <div class="element" transition:slide|local>
      <!--Element Operation-->
      <div class="settings">
         <div class="field select">
            <ItemSheetRulesElementOperationSelect {idx}/>
         </div>

         <!--Selector-->
         <div class="field select">
            <DocumentSelect
               options={selectorOptions}
               bind:value={element.selector}
            />
         </div>

         <!--Value-->
         <div class="field number">
            <DocumentIntegerInput bind:value={element.value} min={1}/>
         </div>
      </div>

      <!--Delete Element-->
      <div class="delete-button">
         <IconButton
            icon={DELETE_ICON}
            on:click={() => {
               $document.system.deleteRulesElement(idx);
            }}
         />
      </div>
   </div>
{/if}

<style lang="scss">
   .element {
      @include flex-row;
      @include flex-space-between;
      @include border;
      @include panel-1;

      width: 100%;
      height: 100%;

      .settings {
         @include flex-row;
         @include flex-group-left;

         flex-wrap: wrap;
         width: 100%;
         margin-bottom: var(--titan-spacing-large);

         .field {
            @include flex-row;

            margin: var(--titan-spacing-large) var(--titan-spacing-standard) 0 var(--titan-spacing-standard);

            &.select {
               @include flex-group-left;
            }

            &.number {
               @include flex-group-center;

               width: 32px;
            }
         }
      }

      .delete-button {
         @include flex-column;
         @include flex-group-top;

         height: 100%;
         margin: var(--titan-spacing-large) var(--titan-spacing-standard) 0 0;
      }
   }
</style>
