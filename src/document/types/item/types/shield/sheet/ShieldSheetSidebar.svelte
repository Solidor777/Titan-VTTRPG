<script>
   import {getContext} from 'svelte';
   import ItemSheetSidebarChecks from '~/document/types/item/sheet/check/ItemSheetSidebarChecks.svelte';
   import ItemSheetSidebarBase from '~/document/types/item/sheet/ItemSheetSidebarBase.svelte';
   import ShieldSheetSidebarTraits from '~/document/types/item/types/shield/sheet/ShieldSheetSidebarTraits.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   $: sections =
      $document.system.check.length > 0
         ? [ShieldSheetSidebarTraits, ItemSheetSidebarChecks]
         : [ShieldSheetSidebarTraits];
</script>

<ItemSheetSidebarBase {sections}/>
