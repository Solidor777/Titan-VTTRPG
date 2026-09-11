<script>
   import CharacterSheetSpeed from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetSpeed.svelte';
   import BorderedColumnList from '~/helpers/svelte-components/BorderedColumnList.svelte';
</script>

<BorderedColumnList
   entries={[
      {speed: 'stride'},
      {speed: 'fly'},
      {speed: 'swim'},
      {speed: 'climb'},
      {speed: 'burrow'},
   ]}
   entryComponent={CharacterSheetSpeed}
/>