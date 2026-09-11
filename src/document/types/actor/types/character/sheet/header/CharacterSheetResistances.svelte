<script>
   import CharacterSheetResistance
   from '~/document/types/actor/types/character/sheet/header/CharacterSheetResistance.svelte';
   import BorderedColumnList from '~/helpers/svelte-components/BorderedColumnList.svelte';
</script>

<BorderedColumnList
   entries={[
      {resistance: 'reflexes'},
      {resistance: 'resilience'},
      {resistance: 'willpower'},
   ]}
   entryComponent={CharacterSheetResistance}
></BorderedColumnList>
