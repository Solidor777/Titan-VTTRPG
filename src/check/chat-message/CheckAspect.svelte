<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // Aspect
   export let aspect = void 0;

   // Chat context
   const document = getContext("DocumentSheetObject");
   const chatContext = $document.flags.titan.chatContext;

   function increaseAspect() {
      // Increase the aspect
      aspect.currentValue += aspect.initialValue;

      // Decrease the extra successes by the cost
      chatContext.results.extraSuccesses -= aspect.cost;

      // Update damage if appropruate
      if (aspect.isDamage) {
         chatContext.results.damage += aspect.initialValue;
      }

      // Update healing if appropruate
      if (aspect.isHealing) {
         chatContext.results.healing += aspect.initialValue;
      }

      // Update the document
      $document.update({
         flags: $document.flags,
      });

      return;
   }

   function decreaseAspect() {
      // Decrease the aspect
      aspect.currentValue -= aspect.initialValue;

      // Increase the extra successes by the cost
      chatContext.results.extraSuccesses += aspect.cost;

      // Update damage if appropruate
      if (aspect.isDamage) {
         chatContext.results.damage -= aspect.initialValue;
      }

      // Update healing if appropruate
      if (aspect.isHealing) {
         chatContext.results.healing -= aspect.initialValue;
      }

      // Update the document
      $document.update({
         flags: $document.flags,
      });

      return;
   }

   function resetAspect() {
      // Get the aspect delta
      const delta = (aspect.currentValue - aspect.initialValue) * aspect.cost;

      // Reset the aspect to its original value
      aspect.currentValue = aspect.initialValue;

      // Reset the extra successes
      chatContext.results.extraSuccesses += delta;

      // Update damage if appropruate
      if (aspect.isDamage) {
         chatContext.results.damage -= delta;
      }

      // Update healing if appropruate
      if (aspect.isHealing) {
         chatContext.results.healing -= delta;
      }

      // Update the document
      $document.update({
         flags: $document.flags,
      });

      return;
   }

   function getExtraSuccessCostLabel() {
      if (aspect.cost > 1) {
         return `(${aspect.cost} / ${localize("LOCAL.extraSuccesses.short.label")})`;
      }
      return localize("LOCAL.extraSuccesses.short.label");
   }
</script>

<!--Aspect-->
<div class="aspect">
   <!--Label and value-->
   <div class="label">
      {aspect.label}: {aspect.currentValue} + {getExtraSuccessCostLabel()}
   </div>

   <div class="controls">
      {#if aspect.currentValue > aspect.initialValue}
         <!--Reset Button-->
         <div class="control">
            <EfxButton on:click={resetAspect}>
               <div class="button-inner">
                  <i class="fas fa-arrow-rotate-left" />
               </div>
            </EfxButton>
         </div>

         <!--Decrease Button-->
         <div class="control">
            <EfxButton on:click={decreaseAspect}>
               <div class="button-inner">
                  <i class="fas fa-minus" />
               </div>
            </EfxButton>
         </div>
      {/if}

      <!--Increase Button-->
      {#if chatContext.results.extraSuccesses && chatContext.results.extraSuccesses >= aspect.cost}
         <div class="control">
            <EfxButton on:click={increaseAspect}>
               <div class="button-inner">
                  <i class="fas fa-plus" />
               </div>
            </EfxButton>
         </div>
      {/if}
   </div>
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";
   .aspect {
      @include flex-row;
      @include flex-space-between;
      font-size: 1rem;
      width: 100%;
      min-height: 2rem;
      height: 100%;

      .label {
         @include flex-row;
         @include flex-group-left;
         flex-wrap: wrap;
         font-weight: bold;
      }

      .controls {
         @include flex-row;
         @include flex-group-right;
         flex-wrap: nowrap;
         height: 100%;
         --button-border-radius: 10px;

         .control {
            height: 2rem;

            &:not(:first-child) {
               margin-left: 0.25rem;
            }

            .button-inner {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
            }
         }
      }
   }
</style>
