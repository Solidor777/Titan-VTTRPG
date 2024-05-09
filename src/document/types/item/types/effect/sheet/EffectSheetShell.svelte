<script>
   import ItemSheetSidebar from '~/document/types/item/sheet/ItemSheetSidebar.svelte';
   import ItemSheetBase from '~/document/types/item/sheet/ItemSheetBase.svelte';
   import EffectSheetTabs from '~/document/types/item/types/effect/sheet/EffectSheetTabs.svelte';
   import EffectSheetHeader from '~/document/types/item/types/effect/sheet/EffectSheetHeader.svelte';
</script>

<ItemSheetBase
   header={EffectSheetHeader}
   sidebar={ItemSheetSidebar}
   tabs={EffectSheetTabs}
/>
