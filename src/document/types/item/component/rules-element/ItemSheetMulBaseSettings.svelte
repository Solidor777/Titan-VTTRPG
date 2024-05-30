<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {slide} from 'svelte/transition';
   import DocumentSelect from '~/document/components/select/DocumentSelect.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentSkillSelect from '~/document/components/select/DocumentSkillSelect.svelte';
   import DocumentAttributeSelect from '~/document/components/select/DocumentAttributeSelect.svelte';
   import DocumentModSelect from '~/document/components/select/DocumentModSelect.svelte';
   import DocumentRatingSelect from '~/document/components/select/DocumentRatingSelect.svelte';
   import DocumentResistanceSelect from '~/document/components/select/DocumentResistanceSelect.svelte';
   import DocumentResourceSelect from '~/document/components/select/DocumentResourceSelect.svelte';
   import DocumentSpeedSelect from '~/document/components/select/DocumentSpeedSelect.svelte';
   import onRulesElementOperationChanged
      from '~/document/types/item/component/rules-element/RulesElementUpdateOperation';
   import DocumentFloatInput from '~/document/components/input/DocumentFloatInput.svelte';
   import {DELETE_ICON} from '~/system/Icons.js';

   // Setup context variables
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
            <DocumentFloatInput bind:value={element.value}/>
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
