<script>
   import { getContext } from 'svelte';
   import ItemSheetSidebarChecks from '~/document/types/item/component/check/ItemSheetSidebarChecks.svelte';
   import ItemSheetSidebarTraits from '~/document/types/item/sheet/ItemSheetSidebarTraits.svelte';
   import ItemSheetSidebarBase from '~/document/types/item/sheet/ItemSheetSidebarBase.svelte';
   import SpellSheetSidebarCastingCheck from '~/document/types/item/types/spell/sheet/SpellSheetSidebarCastingCheck.svelte';

   // Application statee reference
   const document = getContext('document');

   $: sections =
      $document.system.check.length > 0
         ? [
              ItemSheetSidebarTraits,
              SpellSheetSidebarCastingCheck,
              ItemSheetSidebarChecks,
           ]
         : [ItemSheetSidebarTraits, SpellSheetSidebarCastingCheck];
</script>

<ItemSheetSidebarBase {sections} />
