<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";

   // Setup context variables
   const appState = getContext("ApplicationStateStore");
</script>

<div class="tab">
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.description}>
      <div class="scrolling-content">
         <!--Description-->
         <div class="description">
            <!--Header-->
            <h3 class="header">
               {localize("description")}
            </h3>

            <!--Body-->
            <div class="body">Description</div>
         </div>

         <!--Attack-->
         <div class="description">
            <!--Header-->
            <h3 class="header">
               {localize("description")}
            </h3>

            <!--Body-->
            <div class="body">Attack Description</div>
         </div>
      </div>
   </ScrollingContainer>
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";
   .tab {
      @include flex-group-center;
      @include flex-row;
      @include panel-2;
      height: 100%;
      width: 100%;
      font-size: 1rem;

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         height: 100%;
         width: 100%;
         padding: 0.5rem;

         .description {
            @include flex-column;
            @include flex-group-top;
            min-height: 10rem;
            width: 100%;

            .header {
               @include flex-row;
               @include flex-group-left;
               flex-wrap: wrap;
               width: 100%;
            }

            .body {
               @include flex-row;
               @include flex-group-left;
               flex-wrap: wrap;
               width: 100%;
            }
         }
      }
   }
</style>
