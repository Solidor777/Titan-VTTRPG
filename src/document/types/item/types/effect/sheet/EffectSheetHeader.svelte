<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { slide } from 'svelte/transition';
   import DocumentSelect from '~/document/svelte-components/select/DocumentSelect.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import DocumentIntegerIncrementInput
      from '~/document/svelte-components/input/DocumentIntegerIncrementInput.svelte';
   import ItemSheetHeader from '~/document/types/item/sheet/ItemSheetHeader.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string[]} Options for the duration type of the effect. */
   const durationOptions = [
      'turnEnd',
      'turnStart',
      'initiative',
      'permanent',
      'custom',
   ];
</script>

<ItemSheetHeader>
   <!--Duration Type-->
   <div class="stat">
      <div class="label">
         {localize('durationType')}
      </div>
      <div class="input">
         <DocumentSelect
            bind:value={document.data.system.duration.type}
            options={durationOptions}
         />
      </div>
   </div>

   {#if document.data.system.duration.type === 'custom'}
      <!--Custom Duration Label-->
      <div
         class="stat text"
         transition:slide|local
      >
         <div class="input text">
            <DocumentTextInput
               bind:value={document.data.system.duration.custom}
            />
         </div>
      </div>
   {:else if document.data.system.duration.type === 'initiative'}
      <div
         class="stat"
         transition:slide|local
      >
         <div class="input number">
            <DocumentIntegerInput
               min={0}
               bind:value={document.data.system.duration.initiative}
            />
         </div>
      </div>
   {/if}

   <!--Duration Remaining-->
   {#if document.data.system.duration.type !== 'permanent'}
      <div
         class="stat"
         transition:slide|local
      >
         <div class="label">
            {localize('remaining')}
         </div>
         <div class="input number">
            <DocumentIntegerIncrementInput
               min={0}
               bind:value={document.data.system.duration.remaining}
            />
         </div>
      </div>
   {/if}
</ItemSheetHeader>

<style lang="scss">
   .stat {
      @include flex-row;
      @include flex-group-left;

      &:not(:first-child) {
         @include separator-left-large;
      }

      &.text {
         flex: 1;
         width: 100%;
      }

      .label {
         @include flex-row;
         @include flex-group-left;

         font-weight: bold;

         @include margin-right-standard;
      }

      .input {
         @include flex-row;
         @include flex-group-center;

         &.number {
            --titan-input-width: 32px;
         }

         &.text {
            width: 100%;
         }
      }
   }
</style>
