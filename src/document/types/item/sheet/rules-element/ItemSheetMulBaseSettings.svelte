<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentSkillSelect from '~/document/svelte-components/select/DocumentSkillSelect.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentModSelect from '~/document/svelte-components/select/DocumentModSelect.svelte';
   import DocumentRatingSelect from '~/document/svelte-components/select/DocumentRatingSelect.svelte';
   import DocumentResistanceSelect from '~/document/svelte-components/select/DocumentResistanceSelect.svelte';
   import DocumentResourceSelect from '~/document/svelte-components/select/DocumentResourceSelect.svelte';
   import DocumentSpeedSelect from '~/document/svelte-components/select/DocumentSpeedSelect.svelte';
   import { DELETE_ICON } from '~/system/Icons.js';
   import assert from '~/helpers/utility-functions/Assert.js';
   import DocumentNumberInput from '~/document/svelte-components/input/DocumentNumberInput.svelte';
   import ItemSheetRulesElementOperationSelect
      from '~/document/types/item/sheet/rules-element/ItemSheetRulesElementOperationSelect.svelte';

   /** @type {number} The index of the rules element in the item's rules elements array. */
   export let idx = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Rules Element object. */
   let element;
   $: element = $document?.system.rulesElement[idx];

   /** @type {string[]} Options for selecting the stat the multiplier applies to. */
   const selectorOptions = [
      'attribute',
      'expertise',
      'rating',
      'resistance',
      'resource',
      'speed',
      'training',
   ];

   /**
    * Updates the element key to a sensible default when the selector changes.
    * @returns {void}
    */
   function onSelectorChange() {
      if (assert(
         document?.isOwner,
         'Cannot modify document %s if not owner.',
         document?.name,
      )) {
         switch (element.selector) {
            case 'attribute': {
               element.key = 'body';
               break;
            }
            case 'training':
            case 'expertise': {
               element.key = 'arcana';
               break;
            }
            case 'mod': {
               element.key = 'armor';
               break;
            }
            case 'rating': {
               element.key = 'awareness';
               break;
            }
            case 'resistance': {
               element.key = 'reflexes';
               break;
            }
            case 'resource': {
               element.key = 'resolve';
               break;
            }
            case 'speed': {
               element.key = 'burrow';
               break;
            }

            default: {
               break;
            }
         }

         $document.update({
            system: $document.system,
         });
      }
   }

   /**
    * Returns the appropriate select component for the current selector type.
    * @returns {object | undefined} The select component, or undefined if no case matches.
    */
   function getSelector() {
      switch (element.selector) {
         case 'attribute': {
            return DocumentAttributeSelect;
         }
         case 'training':
         case 'expertise': {
            return DocumentSkillSelect;
         }
         case 'mod': {
            return DocumentModSelect;
         }
         case 'rating': {
            return DocumentRatingSelect;
         }
         case 'resistance': {
            return DocumentResistanceSelect;
         }
         case 'resource': {
            return DocumentResourceSelect;
         }
         case 'speed': {
            return DocumentSpeedSelect;
         }

         default: {
            break;
         }
      }
   }
</script>

{#if element && element.operation === 'mulBase'}
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
               on:change={onSelectorChange}
            />
         </div>

         <!--Key-->
         <div class="field select">
            <svelte:component this={getSelector()} bind:value={element.key}/>
         </div>

         <!--Value-->
         <div class="field number">
            <DocumentNumberInput bind:value={element.value}/>
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

            margin: var(--titan-spacing-large) var(--titan-spacing-standard) 0;

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
