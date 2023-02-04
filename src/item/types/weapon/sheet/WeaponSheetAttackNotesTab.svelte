<script>
   import ItemSheetDescriptionTab from '~/item/sheet/ItemSheetDescriptionTab.svelte';
   import { localize } from '~/helpers/Utility.js';
</script>

<ItemSheetDescriptionTab
   header={localize('attackNotes')}
   fieldName={'system.attackNotes'}
/>
