<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import { slide } from "svelte/transition";
   import SpellSheetEnableAspectButton from "./SpellSheetEnableAspectButton.svelte";

   export let aspectOptions = void 0;

   // Setup context variables
   const document = getContext("DocumentStore");

   // Determines whether an aspect should have a details div
   function hasDetails() {
      return aspectOptions.settings || aspectOptions.template.resistanceCheck;
   }

   function toggleAspect() {
      // If disabled, add the aspect
      if (idx === -1) {
         $document.system.aspect.push(aspectOptions.template);
      } else {
         // Otherwise remove the aspect
         $document.system.aspect.splice(aspectOptions.idx, 1);
      }

      // Update the document
      $document.update({
         system: {
            aspect: $document.system.aspect,
         },
      });
   }

   $: idx = $document.system.aspect.findIndex((aspect) => {
      return aspect.label === aspectOptions.template.label;
   });
</script>

<div class="aspect">
   <!--Header Button-->
   <SpellSheetEnableAspectButton
      enabled={idx !== -1}
      label={localize(aspectOptions.template.label)}
      cost={idx === -1 ? 0 : $document.system.aspect[idx].cost}
      on:click={() => {
         toggleAspect();
      }}
   />
   <!--Aspect details-->
   {#if idx !== -1 && hasDetails()}
      <div class="details" transition:slide|local />
   {/if}
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .aspect {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .details {
         @include flex-column;
         @include flex-group-top;
         @include border-bottom-sides;
         @include z-index-app;
         @include font-size-small;
         @include panel-3;
         padding: 0.25rem;
         width: calc(100% - 30px);
      }
   }
</style>
