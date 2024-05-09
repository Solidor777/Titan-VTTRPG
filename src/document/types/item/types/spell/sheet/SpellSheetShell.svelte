<script>
   import SpellSheetSidebar from '~/document/types/item/types/spell/sheet/SpellSheetSidebar.svelte';
   import SpellSheetHeader from '~/document/types/item/types/spell/sheet/SpellSheetHeader.svelte';
   import ItemSheetBase from '~/document/types/item/sheet/ItemSheetBase.svelte';
   import SpellSheetTabs from '~/document/types/item/types/spell/sheet/SpellSheetTabs.svelte';
</script>

<ItemSheetBase
   header={SpellSheetHeader}
   sidebar={SpellSheetSidebar}
   tabs={SpellSheetTabs}
/>
