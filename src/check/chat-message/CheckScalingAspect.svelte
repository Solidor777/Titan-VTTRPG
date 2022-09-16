<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
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
      chatContext.results.extraSuccessesRemaining -= aspect.cost;

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
      chatContext.results.extraSuccessesRemaining += aspect.cost;

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
      const delta = aspect.currentValue - aspect.initialValue;
      const cost = delta * aspect.cost;

      // Reset the aspect to its original value
      aspect.currentValue = aspect.initialValue;

      // Reset the extra successes
      chatContext.results.extraSuccessesRemaining += cost;

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
         return `(${aspect.cost} / ${localize("extraSuccesses.short")})`;
      }
      return localize("extraSuccesses.short");
   }
</script>

<!--Aspect-->
<div class="aspect">
   <!--Label and value-->
   <div class="label">
      <div class="label-inner">
         {aspect.label}: {aspect.currentValue}
      </div>
      <div>
         + {getExtraSuccessCostLabel()}
      </div>
   </div>

   <div class="controls">
      <!--Reset Button-->
      <div class="control">
         <EfxButton on:click={resetAspect} disabled={aspect.currentValue <= aspect.initialValue}>
            <div class="button-inner">
               <i class="fas fa-arrow-rotate-left" />
            </div>
         </EfxButton>
      </div>

      <!--Decrease Button-->
      <div class="control">
         <EfxButton on:click={decreaseAspect} disabled={aspect.currentValue <= aspect.initialValue}>
            <div class="button-inner">
               <i class="fas fa-minus" />
            </div>
         </EfxButton>
      </div>

      <!--Increase Button-->
      <div class="control">
         <EfxButton on:click={increaseAspect} disabled={chatContext.results.extraSuccessesRemaining < aspect.cost}>
            <div class="button-inner">
               <i class="fas fa-plus" />
            </div>
         </EfxButton>
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../styles/mixins.scss";
   .aspect {
      @include flex-row;
      @include flex-space-between;
      width: 100%;
      min-height: 2rem;
      height: 100%;
      font-size: 0.9rem;

      .label {
         @include flex-column;
         @include flex-group-top;
         height: 100%;
         width: 100%;
         flex-wrap: wrap;
         font-weight: bold;
         margin-right: 0.5rem;

         .label-inner {
            @include flex-row;
            @include flex-group-center;
            margin-right: 0.25rem;
            height: 100%;
            margin-bottom: 0.25rem;
         }
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
