<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import ResistanceTag from "~/helpers/svelte-components/tag/ResistanceTag.svelte";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";

   export let idx = 0;

   // Application statee reference
   const document = getContext("DocumentStore");

   $: aspect = $document.system.aspect[idx];
</script>

{#if aspect}
   <div class="aspect">
      <div class="aspect-label">
         <!--Damage icon-->
         {#if aspect.isDamage}
            <i class="fas fa-bolt" />
         {/if}

         <!--Healing icon-->
         {#if aspect.isHealing}
            <i class="fas fa-heart" />
         {/if}

         <!--Range icon-->
         {#if aspect.label === "range"}
            <i class="fas fa-ruler" />
         {/if}

         <!--Radius icon-->
         {#if aspect.label === "radius"}
            <i class="fas fa-bullseye" />
         {/if}
         {localize(aspect.label)}
      </div>

      <!--Initial Value-->
      {#if aspect.initialValue}
         <div class="initial-value">
            {typeof aspect.initialValue === `string` ? localize(aspect.initialValue) : aspect.initialValue}
            {#if aspect.scaling}
               {#if aspect.cost > 1}
                  {`+ (${aspect.cost} / ${localize("extraSuccesses.short")})`}
               {:else}
                  {`+ ${localize("extraSuccesses.short")}`}
               {/if}
            {/if}
         </div>
      {/if}

      <!--Options-->
      {#if aspect.option}
         <div class="options">
            {#if aspect.allOptions}
               <!--All Options-->
               <div class="option">
                  <Tag label={localize("all")} />
               </div>
            {:else}
               {#each aspect.option as option}
                  <!--Each option-->
                  <div class="option">
                     <Tag label={localize(option)} />
                  </div>
               {/each}
            {/if}
         </div>
      {/if}

      <!--Resistance Check-->
      {#if aspect.resistanceCheck && aspect.resistanceCheck !== "none"}
         <div class="labeled-stat" transition:slide|local>
            <!--Label-->
            <div class="label">
               {localize("resistedBy")}
            </div>

            <!--Value-->
            <div class="value">
               <ResistanceTag resistance={aspect.resistanceCheck} />
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

      .options {
         @include flex-row;
         @include flex-group-center;
         flex-wrap: wrap;
         width: 100%;

         .option {
            @include tag-margin;
            @include font-size-small;
         }
      }

      .labeled-stat {
         @include flex-column;
         @include flex-group-top;
         margin-top: 0.5rem;

         .label {
            @include flex-row;
            @include flex-group-center;
            @include font-size-small;
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
