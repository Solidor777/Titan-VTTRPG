<script>
   import { getContext } from 'svelte';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentSkillSelect from '~/document/svelte-components/select/DocumentSkillSelect.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentModSelect from '~/document/svelte-components/select/DocumentModSelect.svelte';
   import DocumentRatingSelect from '~/document/svelte-components/select/DocumentRatingSelect.svelte';
   import DocumentResistanceSelect from '~/document/svelte-components/select/DocumentResistanceSelect.svelte';
   import DocumentResourceSelect from '~/document/svelte-components/select/DocumentResourceSelect.svelte';
   import DocumentSpeedSelect from '~/document/svelte-components/select/DocumentSpeedSelect.svelte';
   import assert from '~/helpers/utility-functions/Assert.js';

   /** @type {number} The index of the rules element in the item's rules elements array. */
   export let idx = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Rules Element object. */
   let element;
   $: element = $document?.system.rulesElement[idx];

   /** @type {string[]} Options for selecting the stat the flat modifier applies to. */
   const selectorOptions = [
      'attribute',
      'expertise',
      'mod',
      'rating',
      'resistance',
      'resource',
      'speed',
      'training',
   ];

   /**
    * Updates the element key to a sensible default when the selector changes, then triggers a document update.
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
    * Returns the appropriate select component for the key, depending on the current selector type.
    * @returns {object | undefined} The select component, or undefined if no case matches.
    */
   function getKeySelect() {
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

<!--Operation settings-->
<div class="settings">

   <!--Selector-->
   <div class="field select">
      <DocumentSelect
         bind:value={element.selector}
         on:change={onSelectorChange}
         options={selectorOptions}
      />
   </div>

   <!--Key-->
   <div class="field select">
      <svelte:component bind:value={element.key} this={getKeySelect()}/>
   </div>

   <!--Value-->
   <div class="field number">
      <DocumentIntegerInput bind:value={element.value}/>
   </div>
</div>


<style lang="scss">
   .settings {
      @include tag-container;
      @include flex-group-left;

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
