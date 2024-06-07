<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import CharacterSheetSkill
      from '~/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkill.svelte';

   // Document reference
   const document = getContext('document');

   // Application reference
   const appState = getContext('applicationState');

   // Filtered Skill list
   const skillList = $document.system.skill;
   $: filteredList = Object.entries(skillList).filter(
      ([key]) =>
         localize(key)
            .toLowerCase()
            .indexOf($appState.filter.skills.toLowerCase()) !== -1,
   );
</script>

<ol>
   <!--Each skill-->
   {#each filteredList as [key]}
      <li>
         <CharacterSheetSkill {key}/>
      </li>
   {/each}
</ol>

<style lang="scss">

   ol {
      @include flex-column;
      @include flex-group-center;
      @include list;

      width: 100%;
      margin-bottom: var(--titan-padding-standard);

      li {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         &:not(:last-child) {
            @include border-bottom;

            border-width: 4px;
         }
      }
   }
</style>
