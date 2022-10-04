<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import ResistanceTag from "~/helpers/svelte-components/tag/ResistanceTag.svelte";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";

   // Application statee reference
   const document = getContext("DocumentStore");
</script>

<ol>
   {#each $document.aspect as aspect}
      <!--Each Aspect-->
      <li transition:slide|local>
         <!--Label-->
         <div class="aspect-label">
            <!--Damage icon-->
            {#if aspect.label === localize("damage") || aspect.isDamage}
               <i class="fas fa-bolt" />
            {/if}

            <!--Healing icon-->
            {#if aspect.label === localize("healing") || aspect.isHealing}
               <i class="fas fa-heart" />
            {/if}
            {aspect.label}
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
         {#if aspect.resistanceCheck}
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
      </li>
   {/each}
</ol>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   ol {
      @include flex-column;
      @include flex-group-top;
      @include list;
      @include border-bottom-sides;
      @include panel-3;
      width: calc(100% - 0.5rem);
      padding: 0 0.25rem;

      li {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         margin: 0.25rem 0;

         &:not(:first-child) {
            @include border-top;
            padding-top: 0.25rem;
         }

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
               @include tag-padding;
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
   }
</style>
