<script>
   import { getContext } from 'svelte';
   import ItemSheetSidebarChecks from '~/document/types/item/component/check/ItemSheetSidebarChecks.svelte';
   import ArmorSheetSidebarTraits from '~/document/types/item/types/armor/sheet/ArmorSheetSidebarTraits.svelte';
   import ItemSheetSidebarBase from '~/document/types/item/sheet/ItemSheetSidebarBase.svelte';

   // Application statee reference
   const document = getContext('document');

   $: sections =
      $document.system.check.length > 0
         ? [ArmorSheetSidebarTraits, ItemSheetSidebarChecks]
         : [ArmorSheetSidebarTraits];
</script>

<ItemSheetSidebarBase {sections} />
