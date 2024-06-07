<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import TopFilter from '~/helpers/svelte-components/TopFilter.svelte';
   import CharacterSheetSkillsList
      from '~/document/types/actor/types/character/sheet/tabs/skills/CharacterSheetSkillsList.svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';

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

   let scrollClass = '';

   /**
    * @param event
    */
   function onScroll(event) {
      $appState.scrollTop.skills = event.target.scrollTop;

      const node = event.target;
      const isScrollable = node.scrollHeight > node.clientHeight;

      // If element is not scrollable, remove all classes
      if (!isScrollable) {
         node.classList.remove('is-bottom-overflowing', 'is-top-overflowing');
         return;
      }

      // Find out which direction it is overflowing to
      const isScrolledToBottom = node.scrollHeight <= node.clientHeight + node.scrollTop + 12;

      //
      const isScrolledToTop = node.scrollTop === 0;
      if (!isScrolledToBottom) {
         scrollClass = ' faded bottom-overflowing';
         if (!isScrolledToTop) {
            scrollClass += ' top-overflowing';
         }
      }
      else if (!isScrolledToTop) {
         scrollClass = ' faded top-overflowing';
      }
      else {
         scrollClass = '';
      }
   }

   /**
    * @param node
    */
   function initialScroll(node) {
      node.scrollTop = $appState.scrollTop.skills;

      const isScrollable = node.scrollHeight > node.clientHeight;

      if (isScrollable) {
         // Find out which direction it is overflowing to
         const isScrolledToBottom = node.scrollHeight <= node.clientHeight + node.scrollTop + 12;

         //
         const isScrolledToTop = node.scrollTop === 0;
         if (!isScrolledToBottom) {
            scrollClass = ' faded bottom-overflowing';
            if (!isScrolledToTop) {
               scrollClass += ' top-overflowing';
            }
         }
         else if (!isScrolledToTop) {
            scrollClass = ' faded top-overflowing';
         }
         else {
            scrollClass = '';
         }
      }
   }
</script>

<div class="skill-tab">
   <!--Filter-->
   <div class="header">
      <TopFilter bind:filter={$appState.filter.skills}/>
   </div>

   <div class="scrolling-container">
      <ScrollingContainer>
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
