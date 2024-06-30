<script>
   import {getContext} from 'svelte';
   import TopFilter from '~/helpers/svelte-components/TopFilter.svelte';
   import CharacterSheetSkillsList
      from '~/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkillsList.svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';

   /** @type object Reference to the Application State store. */
   const appState = getContext('applicationState');
</script>

<div class="skill-tab">
   <!--Filter-->
   <div class="header">
      <TopFilter bind:filter={$appState.filter.skills}/>
   </div>

   <div class="scrolling-container">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.skills}>
         <CharacterSheetSkillsList/>
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

      .header {
         width: 100%;
      }

      .scrolling-container {
         position: relative;
         width: 100%;
         height: 100%;
      }
   }
</style>
