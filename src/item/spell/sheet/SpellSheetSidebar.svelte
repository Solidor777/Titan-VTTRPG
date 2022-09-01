<svelte:options accessors={true} />

<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";

   // Setup
   const document = getContext("DocumentSheetObject");
</script>

<div class="sidebar">
   <!--Casting Check-->
   <div class="casting-check">
      <!--Label-->
      <div class="label">
         {localize("LOCAL.castingCheck.label")}:
      </div>
      <!--Value-->
      <div class="value">
         {$document.system.check.difficulty}:{$document.system.check.complexity}
      </div>
   </div>
   <!--Aspects List-->
   <ScrollingContainer>
      <ol class="aspects-list">
         {#each $document.aspects as aspect}
            <!--Each Aspect-->
            <li class="aspect">
               <!--Label-->
               <div class="aspect-label">
                  {aspect.label}
               </div>

               <!--Initial Value-->
               {#if aspect.initialValue}
                  <div class="aspect-value">
                     {typeof aspect.initialValue === `string`
                        ? localize(`LOCAL.${aspect.initialValue}.label`)
                        : aspect.initialValue}
                     {#if aspect.overcast}
                        {#if aspect.cost > 1}
                           {`+ (${aspect.cost} / ${localize("LOCAL.extraSuccesses.short.label")})`}
                        {:else}
                           {`+ ${localize("LOCAL.extraSuccesses.short.label")}`}
                        {/if}
                     {/if}
                  </div>
               {/if}

               <!--Options-->
               {#if aspect.option}
                  <div class="aspect-options">
                     {#if aspect.allOptions}
                        <!--All Options-->
                        <div class="aspect-option">
                           {localize("LOCAL.all.label")}
                        </div>
                     {:else}
                        {#each aspect.option as option}
                           <!--Each option-->
                           <div class="aspect-option">
                              {localize(`LOCAL.${option}.label`)}
                           </div>
                        {/each}
                     {/if}
                  </div>
               {/if}

               <!--Resistance Check-->
               {#if aspect.resistanceCheck}
                  <div class="aspect-resistance-check">
                     <div class="resistance-check-label">
                        {localize("LOCAL.resistedBy.label")}
                     </div>
                     <div class="resistance-check-value {aspect.resistanceCheck}">
                        {localize(`LOCAL.${aspect.resistanceCheck}.label`)}
                     </div>
                  </div>
               {/if}
            </li>
         {/each}
      </ol>
   </ScrollingContainer>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";
   .sidebar {
      @include flex-column;
      @include flex-group-top;
      @include border;
      box-sizing: border-box;
      width: 13rem;
      min-width: 13rem;
      padding: 0.5rem;
      margin-top: 0.5rem;

      .casting-check {
         @include flex-row;
         @include flex-group-center;
         @include border-bottom;
         width: 100%;
         padding-bottom: 0.5rem;

         .label {
            font-weight: bold;
            margin-right: 0.25rem;
         }
      }

      .aspects-list {
         @include flex-column;
         @include flex-group-top;
         list-style: none;
         padding: 0;
         margin: 0 0 0 0;
         width: 100%;

         .aspect {
            @include flex-column;
            @include flex-group-top;
            width: 100%;

            &:not(:first-child) {
               @include border-top;
               padding-top: 0.25rem;
               margin-top: 0.5rem;
            }

            .aspect-label {
               @include flex-row;
               @include flex-group-center;
               font-size: 1rem;
               font-weight: bold;
            }

            .aspect-options {
               @include flex-row;
               @include flex-group-center;
               margin-top: 0.25rem;
               flex-wrap: wrap;
               width: 100%;

               .aspect-option {
                  @include border;
                  font-size: 0.9rem;
                  font-weight: bold;
                  margin: 0.25rem;
                  padding: 0.25rem;
               }
            }

            .aspect-resistance-check {
               @include flex-column;
               @include flex-group-top;
               margin-top: 0.5rem;

               .resistance-check-label {
                  font-size: 0.9rem;
                  font-weight: bold;
               }

               .resistance-check-value {
                  @include border;
                  margin-top: 0.25rem;
                  padding: 0.25rem;

                  &.reflexes {
                     background-color: var(--reflexes-color-bright);
                  }

                  &.resilience {
                     background-color: var(--resilience-color-bright);
                  }

                  &.willpower {
                     background-color: var(--willpower-color-bright);
                  }
               }
            }
         }
      }
   }
</style>
