<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import SpellAspects from '~/document/types/item/types/spell/SpellAspects.js';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/TopFilter.svelte';
   import SpellSheetStandardAspectSettings
      from '~/document/types/item/types/spell/sheet/SpellSheetStandardAspectSettings.svelte';

   /** @type object Reference to the Application State store. */
   const appState = getContext('applicationState');

   // Aspect Options
   const aspectOptions = foundry.utils.deepClone(SpellAspects);

   // Localize Option Labels
   for (const aspect of Object.values(aspectOptions)) {
      // Localize value options
      if (aspect.settings?.initialValueOptions) {
         aspect.settings.initialValueOptions.forEach((option) => {
            if (typeof option.label === 'string') {
               option.label = localize(option.label);
            }
         });
      }

      // Localize unit options
      if (aspect.settings?.unitOptions) {
         aspect.settings.unitOptions.forEach((option) => {
            if (typeof option.label === 'string') {
               option.label = localize(option.label);
            }
         });
      }
   }
</script>

<div class="standard-aspects-tab">
   <!--Filter-->
   <TopFilter bind:value={$appState.filter.standardAspects}/>

   <!--Scrolling aspects list-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.standardAspects}>
         <ol>
            <!--Each Aspect-->
            {#each Object.values(aspectOptions) as aspectOptions}
               {#if localize(aspectOptions.template.label)
                  .toLowerCase()
                  .indexOf($appState.filter.standardAspects.toLowerCase()) !== -1}
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
               margin-top: var(--titan-padding-large);
            }
         }
      }
   }
</style>
