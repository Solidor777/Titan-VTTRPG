<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/Utility.js';
   import { slide } from 'svelte/transition';
   import DocumentSelect from '~/documents/components/select/DocumentSelect.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentSkillSelect from '~/documents/components/select/DocumentSkillSelect.svelte';
   import DocumentAttributeSelect from '~/documents/components/select/DocumentAttributeSelect.svelte';
   import DocumentModSelect from '~/documents/components/select/DocumentModSelect.svelte';
   import DocumentRatingSelect from '~/documents/components/select/DocumentRatingSelect.svelte';
   import DocumentResistanceSelect from '~/documents/components/select/DocumentResistanceSelect.svelte';
   import DocumentResourceSelect from '~/documents/components/select/DocumentResourceSelect.svelte';
   import DocumentSpeedSelect from '~/documents/components/select/DocumentSpeedSelect.svelte';
   import onRulesElementOperationChanged from './RulesElementUpdateOperation';
   import DocumentBoundEditorInput from '~/documents/components/input/DocumentBoundEditorInput.svelte';

   // Setup context variables
   const document = getContext('DocumentStore');

   export let operationOptions = void 0;
   export let idx = void 0;

   // Selector options
   const selectorOptions = [
      {
         label: localize('attribute'),
         value: 'attribute',
      },
      {
         label: localize('skill'),
         value: 'skill',
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
   ];

   // Dynamic element
   $: element = $document.system.rulesElement[idx];

   // Updates the key when the selector changes
   function onSelectorChange() {
      switch (element.selector) {
         case 'attribute': {
            element.key = 'body';
            break;
         }
         case 'resistance': {
            element.key = 'reflexes';
            break;
         }
         case 'skill': {
            element.key = 'arcana';
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

   function getSelector() {
      switch (element.selector) {
         case 'attribute': {
            return DocumentAttributeSelect;
         }
         case 'resistance': {
            return DocumentResistanceSelect;
         }
         case 'skill': {
            return DocumentSkillSelect;
         }
         default: {
            break;
         }
      }
   }
</script>

{#if element && element.operation === 'rollMessage'}
   <div class="element" transition:slide|local>
      <!--Main header-->
      <div class="header">
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
               <svelte:component
                  this={getSelector()}
                  bind:value={element.key}
               />
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
      <!--Message text-->
      <div class="message" transition:slide|local>
         <DocumentBoundEditorInput bind:value={element.message} />
      </div>
   </div>
{/if}

<style lang="scss">
   @import '../../../Styles/Mixins.scss';

   .element {
      @include flex-column;
      @include flex-group-top-left;
      @include border;
      @include panel-1;
      width: 100%;
      height: 100%;

      .header {
         @include flex-row;
         width: 100%;

         .settings {
            @include flex-row;
            @include flex-group-left;
            width: 100%;
            margin-bottom: 0.5rem;
            flex-wrap: wrap;

            .field {
               @include flex-row;
               margin: 0.5rem 0.25rem 0 0.25rem;

               &.select {
                  @include flex-group-left;
               }
            }
         }

         .delete-button {
            @include flex-column;
            @include flex-group-top;
            margin: 0.25rem 0.25rem 0 0;
         }
      }

      .message {
         @include flex-column;
         margin-top: 0.25rem;
         width: 100%;
         min-height: 10rem;
         height: 100%;
      }
   }
</style>