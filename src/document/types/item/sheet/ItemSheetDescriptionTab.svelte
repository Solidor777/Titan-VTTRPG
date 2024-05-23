<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import DocumentBoundEditorInput from "~/document/components/input/DocumentBoundEditorInput.svelte";

   // Setup context variables
   const appState = getContext('applicationState');
</script>

<div class="tab">
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.description}>
      <!--Description-->
      <div class="description">
         <!--Header-->
         <h3>
            {localize('description')}
         </h3>

         <!--Body-->
         <div class="body">
            <DocumentBoundEditorInput bind:value={$document.system.description}/>
         </div>
      </div>
   </ScrollingContainer>
</div>

<style lang="scss">
   .tab {
      @include flex-column;
      @include flex-group-center;
      @include panel-2;

      height: 100%;
      width: 100%;

      @include font-size-normal;

      .description {
         @include flex-column;
         @include flex-group-top;

         padding: var(--padding-large);
         width: 100%;
         height: 100%;

         h3 {
            @include flex-row;
            @include flex-group-left;

            width: 100%;
            margin-bottom: 0;
         }

         .body {
            @include flex-row;
            @include flex-group-left;

            margin-top: var(--padding-standard);
            flex-wrap: wrap;
            width: 100%;
            flex-grow: 2;
         }
      }
   }
</style>
