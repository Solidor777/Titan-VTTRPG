<script>
   import { getContext } from 'svelte';
   import ItemSheetSidebarChecks from '~/document/types/item/sheet/check/ItemSheetSidebarChecks.svelte';
   import ArmorSheetSidebarTraits from '~/document/types/item/types/armor/sheet/ArmorSheetSidebarTraits.svelte';
   import ItemSheetSidebarSections from '~/document/types/item/sheet/ItemSheetSidebarSections.svelte';

   /**@type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   $: sections =
      $document.system.check.length > 0
         ? [ArmorSheetSidebarTraits, ItemSheetSidebarChecks]
         : [ArmorSheetSidebarTraits];
</script>

<ItemSheetSidebarSections {sections}/>
