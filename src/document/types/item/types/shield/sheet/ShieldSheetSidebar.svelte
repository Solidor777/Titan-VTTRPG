<script>
   import { getContext } from 'svelte';
   import ItemSheetSidebarChecks from '~/document/types/item/sheet/check/ItemSheetSidebarChecks.svelte';
   import ItemSheetSidebarSections from '~/document/types/item/sheet/ItemSheetSidebarSections.svelte';
   import ShieldSheetSidebarTraits from '~/document/types/item/types/shield/sheet/ShieldSheetSidebarTraits.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   $: sections =
      $document.system.check.length > 0
         ? [
            ShieldSheetSidebarTraits,
            ItemSheetSidebarChecks,
         ]
         : [ShieldSheetSidebarTraits];
</script>

<ItemSheetSidebarSections {sections}/>
