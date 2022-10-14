<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import ResistanceTag from "~/helpers/svelte-components/tag/ResistanceTag.svelte";

   export let idx = 0;

   // Application statee reference
   const document = getContext("DocumentStore");
   console.log(idx);

   $: aspect = $document.system.customAspect[idx];
</script>

{#if aspect}
   <div class="aspect">
      <div class="aspect-label">
         <!--Damage Icon-->
         {#if aspect.isDamage}
            <i class="fas fa-bolt" />
         {/if}

         <!--Healing Icon-->
         {#if aspect.isHealing}
            <i class="fas fa-heart" />
         {/if}

         {aspect.label}
      </div>

      <!--Initial Value-->
      <div class="initial-value">
         {aspect.initialValue}
         {#if aspect.scaling}
            {#if aspect.cost > 1}
               {`+ (${aspect.cost} / ${localize("extraSuccesses.short")})`}
            {:else}
               {`+ ${localize("extraSuccesses.short")}`}
            {/if}
         {/if}
      </div>

      <!--Resistance Check-->
      {#if aspect.resistanceCheck && aspect.resistanceCheck !== "none"}
         <div class="labeled-stat" transition:slide|local>
            <!--Label-->
            <div class="label">
               {localize("resistedBy")}
            </div>

            <!--Value-->
            <div class="value">
               <ResistanceTag resistance={aspect.resistanceCheck} label={localize(aspect.resistanceCheck)} />
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .aspect {
      @include flex-column;
      @include flex-group-top;
      @include z-index-app;
      width: 100%;
      margin: 0.25rem 0;

      .aspect-label {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;
         font-weight: bold;

         i {
            margin-right: 0.25rem;
         }
      }

      .labeled-stat {
         @include flex-column;
         @include flex-group-top;
         @include font-size-small;
         margin-top: 0.5rem;

         .label {
            @include flex-row;
            @include flex-group-center;
            font-weight: bold;
         }

         .value {
            @include flex-row;
            @include flex-group-center;
            margin-top: 0.25rem;
         }
      }
   }
</style>
