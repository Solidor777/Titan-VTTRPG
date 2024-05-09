<script>
   import ArmorSheetHeader from '~/document/types/item/types/armor/sheet/ArmorSheetHeader.svelte';
   import ArmorSheetSidebar from '~/document/types/item/types/armor/sheet/ArmorSheetSidebar.svelte';
   import ArmorSheetTabs from '~/document/types/item/types/armor/sheet/ArmorSheetTabs.svelte';
   import ItemSheetBase from '~/document/types/item/sheet/ItemSheetBase.svelte';
</script>

<ItemSheetBase
   header={ArmorSheetHeader}
   sidebar={ArmorSheetSidebar}
   tabs={ArmorSheetTabs}
/>
