<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import { ARMOR_ICON, CURRENCY_ICON } from '~/system/Icons.js';
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

   <!--Armor-->
   <div class="stat">
      <i class="{ARMOR_ICON}e"/>
      <div class="label">
         {localize('armor')}
      </div>
      <div class="input number">
         <DocumentIntegerInput
            bind:value={$document.system.armor.value}
            max={$document.system.armor.max}
            min={0}
         />
      </div>
      <div class="divider">/</div>
      <div class="input number">
         <DocumentIntegerInput
            bind:value={$document.system.armor.max}
            min={0}
         />
      </div>
   </div>
</ItemSheetHeader>
