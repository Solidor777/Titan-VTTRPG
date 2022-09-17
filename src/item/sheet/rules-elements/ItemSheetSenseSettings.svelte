<script>
   import { getContext } from "svelte";
   import DocumentSelect from "~/documents/components/DocumentSelect.svelte";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");

   // Application reference
   const application = getContext("external").application;

   export let operationOptions = void 0;

   export let idx = void 0;
   $: element = $document.system.rulesElement[idx];

   // Setup tabs
</script>

{#if element && element.operation === "sense"}
   Iam
   <div class="element">
      <div class="row">
         <!--Element Operation-->
         <div class="input">
            <DocumentSelect options={operationOptions} bind:value={element.operation} />
         </div>

         <!--Delete Element-->
         <div>
            <IconButton
               icon={"fas fa-trash"}
               on:click={() => {
                  application.removeRulesElement(idx);
               }}
            />
         </div>
      </div>
   </div>
{/if}

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .element {
      @include flex-column;
      @include flex-group-top;
      @include border;
      width: 100%;
      padding: 0.5rem;
      background-color: var(--label-background-color);

      &:not(:first-child) {
         margin-top: 0.5rem;
      }

      .row {
         @include flex-row;
         @include flex-group-left;
         width: 100%;

         div {
            &:not(:first-child) {
               margin-left: 0.5rem;
            }
         }
      }
   }
</style>
