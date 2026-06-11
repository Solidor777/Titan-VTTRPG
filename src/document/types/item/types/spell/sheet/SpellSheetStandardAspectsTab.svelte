<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import SpellAspects from '~/document/types/item/types/spell/SpellAspects.js';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/input/TopFilter.svelte';
   import SpellSheetStandardAspectSettings
      from '~/document/types/item/types/spell/sheet/SpellSheetStandardAspectSettings.svelte';

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   // Aspect Options. Option labels stay raw i18n keys: the Select's Text leaf localizes them, and
   // pre-localized text would be localized a second time there.
   const aspectOptions = structuredClone(SpellAspects);
</script>

<div class="standard-aspects-tab">
   <!--Filter-->
   <TopFilter bind:value={$appState.tabs.standardAspects.filter}/>

   <!--Scrolling aspects list-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.tabs.standardAspects.scrollTop}>
         <ol>
            <!--Each Aspect-->
            {#each Object.values(aspectOptions) as aspectOptions}
               {#if localize(aspectOptions.template.label)
                  .toLowerCase()
                  .indexOf($appState.tabs.standardAspects.filter.toLowerCase()) !== -1}
                  <!--Filter the Aspects-->
                  <li>
                     <SpellSheetStandardAspectSettings {aspectOptions}/>
                  </li>
               {/if}
            {/each}
         </ol>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   .standard-aspects-tab {
      @include flex-column;
      @include flex-group-top;
      @include panel-2;

      width: 100%;
      height: 100%;

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;

         width: 100%;
         height: 100%;

         ol {
            @include flex-column;
            @include flex-group-top;

            list-style: none;
            padding: 0;
            margin: 0;
            width: 100%;

            li {
               @include flex-row;
               @include flex-group-center;

               width: 100%;

               @include margin-top-large;
            }
         }
      }
   }
</style>
