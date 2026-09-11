<script>
   import CharacterSheetMod from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetMod.svelte';
   import BorderedColumnList from '~/helpers/svelte-components/BorderedColumnList.svelte';
</script>

<BorderedColumnList
   entries={[
      {mod: 'armor'},
      {mod: 'damage'},
      {mod: 'healing'}
   ]}
   entryComponent={CharacterSheetMod}
/>