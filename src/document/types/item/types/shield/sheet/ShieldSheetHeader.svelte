<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import { CURRENCY_ICON, DEFENSE_ICON } from '~/system/Icons.js';
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

   <!--Value-->
   <div class="stat">
      <i class={CURRENCY_ICON}/>
      <div class="label">
         {localize('value')}
      </div>
      <div class="input large-number">
         <DocumentIntegerInput
            bind:value={$document.system.value}
            min={0}
         />
      </div>
   </div>

   <!--Defense-->
   <div class="stat">
      <i class={DEFENSE_ICON}/>
      <div class="label">
         {localize('defense')}
      </div>
      <div class="input number">
         <DocumentIntegerInput
            bind:value={$document.system.defense}
            min={0}
         />
      </div>
   </div>
</ItemSheetHeader>
