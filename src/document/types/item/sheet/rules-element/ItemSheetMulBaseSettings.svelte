<script>
   import { getContext } from 'svelte';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentSkillSelect from '~/document/svelte-components/select/DocumentSkillSelect.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentModSelect from '~/document/svelte-components/select/DocumentModSelect.svelte';
   import DocumentRatingSelect from '~/document/svelte-components/select/DocumentRatingSelect.svelte';
   import DocumentResistanceSelect from '~/document/svelte-components/select/DocumentResistanceSelect.svelte';
   import DocumentResourceSelect from '~/document/svelte-components/select/DocumentResourceSelect.svelte';
   import DocumentSpeedSelect from '~/document/svelte-components/select/DocumentSpeedSelect.svelte';
   import assert from '~/helpers/utility-functions/Assert.js';
   import DocumentNumberInput from '~/document/svelte-components/input/DocumentNumberInput.svelte';

   /** @type {number} The index of the rules element in the item's rules elements array. */
   export let idx = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

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
         switch ($document.system.rulesElement[idx].selector) {
            case 'attribute': {
               $document.system.rulesElement[idx].key = 'body';
               break;
            }
            case 'training':
            case 'expertise': {
               $document.system.rulesElement[idx].key = 'arcana';
               break;
            }
            case 'mod': {
               $document.system.rulesElement[idx].key = 'armor';
               break;
            }
            case 'rating': {
               $document.system.rulesElement[idx].key = 'awareness';
               break;
            }
            case 'resistance': {
               $document.system.rulesElement[idx].key = 'reflexes';
               break;
            }
            case 'resource': {
               $document.system.rulesElement[idx].key = 'resolve';
               break;
            }
            case 'speed': {
               $document.system.rulesElement[idx].key = 'burrow';
               break;
            }

            default: {
               break;
            }
         }

         $document.update({
            system: structuredClone($document.system),
         });
      }
   }

   /**
    * Returns the appropriate select component for the current selector type.
    * @returns {object | undefined} The select component, or undefined if no case matches.
    */
   function getSelector() {
      switch ($document.system.rulesElement[idx].selector) {
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

<!--Operation settings-->
<div class="settings">

   <!--Selector-->
   <div class="field select">
      <DocumentSelect
         bind:value={$document.system.rulesElement[idx].selector}
         on:change={onSelectorChange}
         options={selectorOptions}
      />
   </div>

   <!--Key-->
   <div class="field select">
      <svelte:component bind:value={$document.system.rulesElement[idx].key} this={getSelector()}/>
   </div>

   <!--Value-->
   <div class="field number">
      <DocumentNumberInput bind:value={$document.system.rulesElement[idx].value}/>
   </div>
</div>

<style lang="scss">
   .settings {
      @include tag-container;
      @include flex-group-left;

      width: 100%;

      .field {
         @include flex-row;

         &.select {
            @include flex-group-left;
         }

         &.number {
            @include flex-group-center;
         }
      }
   }
</style>
