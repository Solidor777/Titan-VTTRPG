<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import DocumentSelect from "~/documents/components/DocumentSelect.svelte";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");

   // Application reference
   const application = getContext("external").application;

   export let operationOptions = void 0;
   export let idx = void 0;

   let selectorOptions = [
      {
         label: localize("attribute"),
         value: "attribute",
      },
      {
         label: localize("expertise"),
         value: "expertise",
      },
      {
         label: localize("mod"),
         value: "mod",
      },
      {
         label: localize("rating"),
         value: "rating",
      },
      {
         label: localize("resistance"),
         value: "resistance",
      },
      {
         label: localize("resource"),
         value: "resource",
      },
      {
         label: localize("speed"),
         value: "speed",
      },
      {
         label: localize("training"),
         value: "training",
      },
   ];

   $: element = $document.system.rulesElement[idx];

   // Setup tabs
</script>

{#if element && element.operation === "flatModifier"}
   <div class="element">
      <div class="row">
         <!--Element Operation-->
         <div class="input">
            <DocumentSelect options={operationOptions} bind:value={element.operation} />
         </div>

         <div class="input">
            <DocumentSelect options={selectorOptions} bind:value={element.selector} />
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
