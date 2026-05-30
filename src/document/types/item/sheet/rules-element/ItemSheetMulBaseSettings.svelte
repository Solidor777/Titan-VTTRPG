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

   /**
    * @typedef {object} ItemSheetMulBaseSettingsProps
    * @property {number} [idx] The index of the rules element in the item's rules elements array.
    */

   /** @type {ItemSheetMulBaseSettingsProps} */
   const { idx = undefined } = $props();

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
         switch (document.data.system.rulesElement[idx].selector) {
            case 'attribute': {
               document.data.system.rulesElement[idx].key = 'body';
               break;
            }
            case 'training':
            case 'expertise': {
               document.data.system.rulesElement[idx].key = 'arcana';
               break;
            }
            case 'mod': {
               document.data.system.rulesElement[idx].key = 'armor';
               break;
            }
            case 'rating': {
               document.data.system.rulesElement[idx].key = 'awareness';
               break;
            }
            case 'resistance': {
               document.data.system.rulesElement[idx].key = 'reflexes';
               break;
            }
            case 'resource': {
               document.data.system.rulesElement[idx].key = 'resolve';
               break;
            }
            case 'speed': {
               document.data.system.rulesElement[idx].key = 'burrow';
               break;
            }

            default: {
               break;
            }
         }

         document.data.update({
            system: structuredClone(document.data.system),
         });
      }
   }

   /**
    * Returns the appropriate select component for the current selector type.
    * @returns {object | undefined} The select component, or undefined if no case matches.
    */
   function getSelector() {
      switch (document.data.system.rulesElement[idx].selector) {
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
         bind:value={document.data.system.rulesElement[idx].selector}
         onchange={onSelectorChange}
         options={selectorOptions}
      />
   </div>

   <!--Key-->
   <div class="field select">
      {#if getSelector()}
         {@const Selector = getSelector()}
         <Selector bind:value={document.data.system.rulesElement[idx].key}/>
      {/if}
   </div>

   <!--Value-->
   <div class="field number">
      <DocumentNumberInput bind:value={document.data.system.rulesElement[idx].value}/>
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
