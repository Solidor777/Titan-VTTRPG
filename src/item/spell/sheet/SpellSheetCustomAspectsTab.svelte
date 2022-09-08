<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { slide } from "svelte/transition";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentCheckboxInput from "~/documents/components/DocumentCheckboxInput.svelte";
   import DocumentResistanceSelect from "~/documents/components/DocumentResistanceSelect.svelte";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";
   import SpellSheetAddAspectButton from "./SpellSheetAddAspectButton.svelte";
   import SpellSheetCustomAspectSettings from "./SpellSheetCustomAspectSettings.svelte";

   // Document reference
   const document = getContext("DocumentSheetObject");

   // Application refernce
   const application = getContext("external").application;

   // Resistance options
   const resistanceSelectOptions = [
      {
         label: localize("LOCAL.reflexes.label"),
         value: "reflexes",
      },
      {
         label: localize("LOCAL.resilience.label"),
         value: "resilience",
      },
      {
         label: localize("LOCAL.willpower.label"),
         value: "willpower",
      },
      {
         label: localize("LOCAL.none.label"),
         value: "none",
      },
   ];

   // Filter for the aspects to display
   let filter = "";
   let filteredAspects = [];
   $: {
      filteredAspects = [];
      $document.system.customAspects.forEach((aspect, idx) => {
         if (aspect.label.toLowerCase().indexOf(filter.toLowerCase()) !== -1) {
            filteredAspects.push(idx);
         }
      });
   }
</script>

<div class="custom-aspects-tab">
   <!-- Filter-->
   <div class="filter">
      <!--Label-->
      <div class="label">
         {localize("LOCAL.filter.label")}
      </div>

      <!--Input-->
      <div class="input">
         <DocumentTextInput bind:value={filter} />
      </div>
   </div>

   <!--Scrolling Aspects list-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={application.scrollTop.customAspects}>
         <ol class="aspects-list">
            <!--Each Aspect-->
            {#each filteredAspects as idx}
               <li class="aspect" transition:slide|local>
                  <SpellSheetCustomAspectSettings bind:idx />
               </li>
            {/each}
         </ol>
         <SpellSheetAddAspectButton />
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .custom-aspects-tab {
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      height: 100%;

      .filter {
         @include flex-row;
         @include flex-group-center;
         @include border-bottom;
         width: 100%;
         padding: 0.25rem;

         .label {
            font-weight: bold;
            margin-right: 0.25rem;
         }
      }

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         height: 100%;

         .aspects-list {
            @include flex-column;
            @include flex-group-top;
            list-style: none;
            padding: 0;
            margin: 0;
            width: 100%;

            .aspect {
               width: 100%;
            }
         }
      }
   }
</style>
