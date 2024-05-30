<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/TopFilter.svelte';
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

<div class="skill-tab">
   <!--Filter-->
   <TopFilter bind:filter={$appState.filter.skills}/>

   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.skills}>
         <ol>
            <!--Each skill-->
            {#each filteredList as [key]}
               <li>
                  <CharacterSheetSkill {key}/>
               </li>
            {/each}
         </ol>
      </ScrollingContainer>
   </div>

   <!--Each skill-->
</div>

<style lang="scss">
   .skill-tab {
      @include flex-column;
      @include flex-group-center;

      width: 100%;
      height: 100%;

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         @include panel-2;

         width: 100%;
         height: 100%;

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
               margin-top: var(--titan-padding-large);
            }
         }
      }
   }
</style>
