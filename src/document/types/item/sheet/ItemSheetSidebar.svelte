<script>
   import {getContext} from 'svelte';
   import ItemSheetSidebarChecks from '~/document/types/item/sheet/check/ItemSheetSidebarChecks.svelte';
   import ItemSheetSidebarTraits from '~/document/types/item/sheet/ItemSheetSidebarTraits.svelte';
   import ItemSheetSidebarBase from '~/document/types/item/sheet/ItemSheetSidebarBase.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   $: sections =
      $document.system.check.length > 0
         ? [ItemSheetSidebarTraits, ItemSheetSidebarChecks]
         : [ItemSheetSidebarTraits];
</script>

<ItemSheetSidebarBase {sections}/>
