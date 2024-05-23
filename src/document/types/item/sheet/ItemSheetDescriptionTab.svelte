<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import DocumentEditorInput from '~/document/components/input/DocumentEditorInput.svelte';

   export let header = localize('description');
   export let fieldName = 'system.description';

   // Setup context variables
   const appState = getContext('applicationState');
</script>

<div class="tab">
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.description}>
      <!--Description-->
      <div class="description">
         <!--Header-->
         <h3>
            {header}
         </h3>

         <!--Body-->
         <div class="body">
            <DocumentEditorInput {fieldName}/>
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
