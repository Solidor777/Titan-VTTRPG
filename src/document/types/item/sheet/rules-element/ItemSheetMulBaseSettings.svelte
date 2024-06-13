<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {slide} from 'svelte/transition';
   import DocumentSelect from '~/document/sheet/select/DocumentSelect.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentSkillSelect from '~/document/sheet/select/DocumentSkillSelect.svelte';
   import DocumentAttributeSelect from '~/document/sheet/select/DocumentAttributeSelect.svelte';
   import DocumentModSelect from '~/document/sheet/select/DocumentModSelect.svelte';
   import DocumentRatingSelect from '~/document/sheet/select/DocumentRatingSelect.svelte';
   import DocumentResistanceSelect from '~/document/sheet/select/DocumentResistanceSelect.svelte';
   import DocumentResourceSelect from '~/document/sheet/select/DocumentResourceSelect.svelte';
   import DocumentSpeedSelect from '~/document/sheet/select/DocumentSpeedSelect.svelte';
   import onRulesElementOperationChanged
      from '~/document/types/item/sheet/rules-element/OnRulesElementOperationChanged.js';
   import {DELETE_ICON} from '~/system/Icons.js';
   import DocumentNumberInput from '~/document/sheet/input/DocumentNumberInput.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   export let operationOptions = void 0;
   export let idx = void 0;
   export let element = void 0;

   // Selector options
   const selectorOptions = [
      {
         label: localize('attribute'),
         value: 'attribute',
      },
      {
         label: localize('expertise'),
         value: 'expertise',
      },
      {
         label: localize('rating'),
         value: 'rating',
      },
      {
         label: localize('resistance'),
         value: 'resistance',
      },
      {
         label: localize('resource'),
         value: 'resource',
      },
      {
         label: localize('speed'),
         value: 'speed',
      },
      {
         label: localize('training'),
         value: 'training',
      },
   ];

   // Updates the key when the selector changes
   /**
    *
    */
   function onSelectorChange() {
      if ($document?.isOwner) {
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
    *
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
               $document.system.removeRulesElement(idx);
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
         margin-bottom: var(--titan-padding-large);

         .field {
            @include flex-row;

            margin: var(--titan-padding-large) var(--titan-padding-standard) 0 var(--titan-padding-standard);

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
         margin: var(--titan-padding-large) var(--titan-padding-standard) 0 0;
      }
   }
</style>
