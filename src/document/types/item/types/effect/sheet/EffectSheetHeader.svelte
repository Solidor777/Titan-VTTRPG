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
            bind:value={$document.system.duration.type}
            options={durationOptions}
         />
      </div>
   </div>

   {#if $document.system.duration.type === 'custom'}
      <!--Custom Duration Label-->
      <div class="stat text" transition:slide|local>
         <div class="input text">
            <DocumentTextInput
               bind:value={$document.system.duration.custom}
            />
         </div>
      </div>
   {:else if $document.system.duration.type === 'initiative'}
      <div class="stat" transition:slide|local>
         <div class="input number">
            <DocumentIntegerInput
               min={0}
               bind:value={$document.system.duration.initiative}
            />
         </div>
      </div>
   {/if}

   <!--Duration Remaining-->
   {#if $document.system.duration.type !== 'permanent'}
      <div class="stat" transition:slide|local>
         <div class="label">
            {localize('remaining')}
         </div>
         <div class="input number">
            <DocumentIntegerIncrementInput
               min={0}
               bind:value={$document.system.duration.remaining}
            />
         </div>
      </div>
   {/if}
</ItemSheetHeader>
