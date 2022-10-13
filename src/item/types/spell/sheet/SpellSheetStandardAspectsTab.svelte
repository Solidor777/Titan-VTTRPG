<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import spellAspects from "./SpellAspects.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import TopFilter from "~/helpers/svelte-components/TopFilter.svelte";
   import SpellSheetStandardAspect from "./SpellSheetStandardAspect.svelte";

   // Setup context variables
   const appState = getContext("ApplicationStateStore");

   // Aspect Options
   const aspectOptions = foundry.utils.deepClone(spellAspects);

   // Localize Option Labels
   for (const [aspectKey, aspect] of Object.entries(aspectOptions)) {
      // Localize value options
      if (aspect.settings?.initialValueOptions) {
         aspect.settings.initialValueOptions.forEach((option) => {
            if (typeof option.label === "string") {
               option.label = localize(option.label);
            }
         });
      }

      // Localize unit options
      if (aspect.settings?.unitOptions) {
         aspect.settings.unitOptions.forEach((option) => {
            if (typeof option.label === "string") {
               option.label = localize(option.label);
            }
         });
      }
   }
</script>

<div class="standard-aspects-tab">
   <!--Filter-->
   <TopFilter bind:filter={$appState.filter.standardAspects} />

   <!--Scrolling aspects list-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.standardAspects}>
         <ol>
            <!--Each Aspect-->
            {#each Object.entries(aspectOptions) as [key, aspectOptions]}
               {#if localize(aspectOptions.template.label)
                  .toLowerCase()
                  .indexOf($appState.filter.standardAspects.toLowerCase()) !== -1}
                  <!--Filter the Aspects-->
                  <li>
                     <SpellSheetStandardAspect {aspectOptions} />
                  </li>
               {/if}
            {/each}
         </ol>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

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
            @include z-index-app;
            list-style: none;
            padding: 0;
            margin: 0;
            width: 100%;

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
