<script>
   import ItemSheetBase from '~/document/types/item/sheet/ItemSheetBase.svelte';
   import ItemSheetSidebar from '~/document/types/item/sheet/ItemSheetSidebar.svelte';
   import AbilitySheetHeader from '~/document/types/item/types/ability/sheet/AbilitySheetHeader.svelte';
   import AbilitySheetTabs from '~/document/types/item/types/ability/sheet/AbilitySheetTabs.svelte';
</script>

<ItemSheetBase
   header={AbilitySheetHeader}
   sidebar={ItemSheetSidebar}
   tabs={AbilitySheetTabs}
/>
