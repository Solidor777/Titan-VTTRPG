<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import DocumentSelect from "~/documents/components/DocumentSelect.svelte";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";
   import DocumentSkillSelect from "~/documents/components/DocumentSkillSelect.svelte";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";
   import DocumentAttributeSelect from "~/documents/components/DocumentAttributeSelect.svelte";
   import DocumentModSelect from "../../../documents/components/DocumentModSelect.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");

   // Application reference
   const application = getContext("external").application;

   export let operationOptions = void 0;
   export let idx = void 0;

   // Selector options
   const selectorOptions = [
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

   // Dynamic element
   $: element = $document.system.rulesElement[idx];

   // Updates the key when the selector changes
   function onSelectorChange() {
      switch (element.selector) {
         case "attribute": {
            element.key = "body";
            break;
         }
         case "training":
         case "expertise": {
            element.key = "arcana";
            break;
         }
         case "mod": {
            element.key = "armor";
            break;
         }

         default: {
            break;
         }
      }

      $document.update({
         system: $document.system,
      });
   }

   // Setup tabs
</script>

{#if element && element.operation === "flatModifier"}
   <div class="element">
      <!--Element Operation-->
      <div class="settings">
         <div class="field select">
            <DocumentSelect options={operationOptions} bind:value={element.operation} />
         </div>

         <div class="field select">
            <DocumentSelect options={selectorOptions} bind:value={element.selector} on:change={onSelectorChange} />
         </div>

         <div class="field select">
            {#if element.selector === "training" || element.selector === "expertise"}
               <!--Training and Expertise-->
               <DocumentSkillSelect bind:value={element.key} />
            {:else if element.selector === "attribute"}
               <!--Attribute-->
               <DocumentAttributeSelect bind:value={element.key} />
            {:else if element.selector === "mod"}
               <!--Attribute-->
               <DocumentModSelect bind:value={element.key} />
            {/if}
         </div>

         <div class="field number">
            <DocumentIntegerInput bind:value={element.value} />
         </div>
      </div>

      <!--Delete Element-->
      <div class="delete-button">
         <IconButton
            icon={"fas fa-trash"}
            on:click={() => {
               application.removeRulesElement(idx);
            }}
         />
      </div>
   </div>
{/if}

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .element {
      @include flex-row;
      @include flex-space-between;
      @include border;
      width: 100%;
      background-color: var(--label-background-color);

      &:not(:first-child) {
         margin-top: 0.5rem;
      }

      .settings {
         @include flex-row;
         @include flex-group-left;
         flex-wrap: wrap;
         width: 100%;
         margin-bottom: 0.5rem;

         .field {
            @include flex-row;
            margin: 0.5rem 0.25rem 0 0.25rem;

            &.select {
               @include flex-group-left;
            }

            &.number {
               @include flex-group-center;
               width: 2rem;
            }
         }
      }

      .delete-button {
         @include flex-column;
         @include flex-group-top;
         height: 100%;
         margin: 0.5rem 0.25rem 0 0;
      }
   }
</style>
