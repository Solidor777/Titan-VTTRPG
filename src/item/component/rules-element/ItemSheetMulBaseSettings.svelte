<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import { slide } from "svelte/transition";
   import DocumentSelect from "~/documents/components/select/DocumentSelect.svelte";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";
   import DocumentSkillSelect from "~/documents/components/select/DocumentSkillSelect.svelte";
   import DocumentAttributeSelect from "~/documents/components/select/DocumentAttributeSelect.svelte";
   import DocumentModSelect from "~/documents/components/select/DocumentModSelect.svelte";
   import DocumentRatingSelect from "~/documents/components/select/DocumentRatingSelect.svelte";
   import DocumentResistanceSelect from "~/documents/components/select/DocumentResistanceSelect.svelte";
   import DocumentResourceSelect from "~/documents/components/select/DocumentResourceSelect.svelte";
   import DocumentSpeedSelect from "~/documents/components/select/DocumentSpeedSelect.svelte";
   import onRulesElementOperationChanged from "./RulesElementUpdateOperation";
   import DocumentFloatInput from "~/documents/components/input/DocumentFloatInput.svelte";

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
         case "rating": {
            element.key = "awareness";
            break;
         }
         case "resistance": {
            element.key = "reflexes";
            break;
         }
         case "resource": {
            element.key = "resolve";
            break;
         }
         case "speed": {
            element.key = "burrow";
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

   function getSelector() {
      switch (element.selector) {
         case "attribute": {
            return DocumentAttributeSelect;
         }
         case "training":
         case "expertise": {
            return DocumentSkillSelect;
         }
         case "mod": {
            return DocumentModSelect;
         }
         case "rating": {
            return DocumentRatingSelect;
         }
         case "resistance": {
            return DocumentResistanceSelect;
         }
         case "resource": {
            return DocumentResourceSelect;
         }
         case "speed": {
            return DocumentSpeedSelect;
         }

         default: {
            break;
         }
      }
   }
</script>

{#if element && element.operation === "mulBase"}
   <div class="element" transition:slide|local>
      <!--Element Operation-->
      <div class="settings">
         <div class="field select">
            <DocumentSelect
               options={operationOptions}
               bind:value={element.operation}
               on:change={() => {
                  onRulesElementOperationChanged($document, idx);
               }}
            />
         </div>

         <!--Selector-->
         <div class="field select">
            <DocumentSelect options={selectorOptions} bind:value={element.selector} on:change={onSelectorChange} />
         </div>

         <!--Key-->
         <div class="field select">
            <svelte:component this={getSelector()} bind:value={element.key} />
         </div>

         <!--Value-->
         <div class="field number">
            <DocumentFloatInput bind:value={element.value} />
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
      @include panel-1;
      width: 100%;
      height: 100%;

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
