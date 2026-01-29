<script>
   import { getContext } from 'svelte';
   import ItemSheetSidebarChecks from '~/document/types/item/sheet/check/ItemSheetSidebarChecks.svelte';
   import ItemSheetSidebarCustomTraits from '~/document/types/item/sheet/ItemSheetSidebarCustomTraits.svelte';
   import ItemSheetSidebarSections from '~/document/types/item/sheet/ItemSheetSidebarSections.svelte';
   import SpellSheetSidebarCastingCheck
      from '~/document/types/item/types/spell/sheet/SpellSheetSidebarCastingCheck.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   $: sections =
      $document.system.check.length > 0
         ? [
            ItemSheetSidebarCustomTraits,
            SpellSheetSidebarCastingCheck,
            ItemSheetSidebarChecks,
         ]
         : [ItemSheetSidebarCustomTraits, SpellSheetSidebarCastingCheck];
</script>

<ItemSheetSidebarSections {sections}/>
