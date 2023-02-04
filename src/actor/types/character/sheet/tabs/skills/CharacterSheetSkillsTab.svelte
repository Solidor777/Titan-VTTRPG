<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/Utility.js';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/TopFilter.svelte';
   import CharacterSheetSkill from './CharacterSheetSkill.svelte';

   // Document reference
   const document = getContext('DocumentStore');

   // Application reference
   const appState = getContext('ApplicationStateStore');
   const application = getContext('external').application;

   // Filtered Skill list
   const skillList = $document.system.skill;
   $: filteredList = Object.entries(skillList).filter(
      ([key]) =>
         localize(key)
            .toLowerCase()
            .indexOf($appState.filter.skills.toLowerCase()) !== -1
   );
</script>

<div class="skill-tab">
   <!--Filter-->
   <TopFilter bind:filter={$appState.filter.skills} />

   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.skills}>
         <ol>
            <!--Each skill-->
            {#each filteredList as [key]}
               <li>
                  <CharacterSheetSkill {key} />
               </li>
            {/each}
         </ol>
      </ScrollingContainer>
   </div>

   <!--Each skill-->
</div>

<style lang="scss">
   @import '../../../../../../Styles/Mixins.scss';
   .skill-tab {
      @include flex-column;
      @include flex-group-center;
      position: relative;
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
            margin-bottom: 0.25rem;
            padding: 0 0.25rem;

            li {
               @include flex-row;
               @include flex-group-center;
               width: 100%;
               margin-top: 0.5rem;
            }
         }
      }
   }
</style>
