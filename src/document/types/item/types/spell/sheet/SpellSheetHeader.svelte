<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import ItemSheetRaritySelect from '~/document/types/item/sheet/ItemSheetRaritySelect.svelte';
   import ItemSheetHeader from '~/document/types/item/sheet/ItemSheetHeader.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<ItemSheetHeader>
   <!--Rarity-->
   <div class="stat">
      <div class="label">
         {localize('rarity')}
      </div>
      <div class="input">
         <ItemSheetRaritySelect/>
      </div>
   </div>

   <!--XP Cost-->
   <div class="stat">
      <div class="label">
         {localize('xp')}
      </div>
      <div class="input number">
         <DocumentIntegerInput
            bind:value={$document.system.xpCost}
            min={0}
         />
      </div>
   </div>

   <!--Tradition-->
   <div class="stat text">
      <div class="label">
         {localize('tradition')}
      </div>
      <div class="input text">
         <DocumentTextInput bind:value={$document.system.tradition}/>
      </div>
   </div>
</ItemSheetHeader>
