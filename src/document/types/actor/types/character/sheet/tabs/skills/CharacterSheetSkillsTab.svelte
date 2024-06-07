<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
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
      <div class={`scrolling-content${scrollClass}`} on:scroll={onScroll} use:initialScroll>
         <ol>
            <!--Each skill-->
            {#each filteredList as [key]}
               <li>
                  <CharacterSheetSkill {key}/>
               </li>
            {/each}
         </ol>
      </div>
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

         .scrolling-content {
            @include flex-column;
            @include flex-group-top;
            @include panel-2;

            position: absolute;
            width: 100%;
            height: 100%;
            overflow: clip auto;

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


            --top-mask-size: 0px;
            --bottom-mask-size: 0px;

            &.top-overflowing {
               --top-mask-size: 12px;
            }

            &.bottom-overflowing {
               --bottom-mask-size: 12px;
            }

            &.faded {
               mask-image: linear-gradient(
                     to bottom,
                     transparent 0,
                     black var(--top-mask-size, 0),
                     black calc(100% - var(--bottom-mask-size, 0)),
                     transparent 100%
               );
            }
         }
      }
   }
</style>
