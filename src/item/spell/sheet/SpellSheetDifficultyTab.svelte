<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { slide } from "svelte/transition";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import DocumentCheckboxInput from "~/documents/components/DocumentCheckboxInput.svelte";
   import DocumentResistanceSelectAllowNone from "~/documents/components/DocumentResistanceSelectAllowNone.svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";
   import IconButton from "~/helpers/svelte-components/IconButton.svelte";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";
   import DocumentIntegerSelect from "~/documents/components/DocumentIntegerSelect.svelte";

   // Document Setup
   const document = getContext("DocumentSheetObject");

   const difficultyOptions = [2, 3, 4, 5, 6];
</script>

<div class="difficulty-tab">
   <!--Difficulty Settings-->
   <div class="difficulty-settings">
      <!--Auto Calculate Difficulty-->
      <div class="row">
         <!--Difficulty-->
         <div class="stat">
            <!--Label-->
            <div class="label">
               {localize("LOCAL.autoCalculateDifficulty.label")}
            </div>

            <!--Checkbox-->
            <div class="checkbox">
               <DocumentCheckboxInput bind:value={$document.system.autoCalculateDifficulty} />
            </div>
         </div>
      </div>

      <div class="row">
         <!--Difficulty-->
         <div class="stat">
            <!--Label-->
            <div class="label">
               {localize("LOCAL.difficulty.label")}
            </div>

            <!--Select-->
            <div class="select">
               <DocumentIntegerSelect
                  options={difficultyOptions}
                  bind:value={$document.system.difficulty}
                  disabled={$document.system.autoCalculateDifficulty}
               />
            </div>
         </div>

         <div class="divider" />

         <!--Complexity-->
         <div class="stat">
            <!--Label-->
            <div class="label">
               {localize("LOCAL.complexity.label")}
            </div>

            <!--Input-->
            <div class="input">
               <DocumentIntegerInput
                  bind:value={$document.system.complexity}
                  min={1}
                  max={16}
                  disabled={$document.system.autoCalculateDifficulty}
               />
            </div>
         </div>
      </div>

      {#if !$document.system.autoCalculateDifficulty}
         <div class="row" transition:slide|local>
            <!--Difficulty-->
            <div class="stat">
               <!--Label-->
               <div class="label">
                  {localize("LOCAL.suggestedValueAndComplexity.label")}:
               </div>

               <!--Value-->
               <div class="value">
                  {$document.suggestedDifficulty}:{$document.suggestedComplexity}
               </div>
            </div>
         </div>
      {/if}
   </div>

   <!--Aspects-->
   <div class="aspect-costs">
      <div class="header">
         {localize("LOCAL.aspectCosts.label")}
      </div>

      <ScrollingContainer>
         <ol>
            {#each $document.aspects as aspect}
               <li>
                  <div class="label">
                     {aspect.label}
                  </div>
                  <div class="value">
                     {aspect.cost}
                  </div>
               </li>
            {/each}
         </ol>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .difficulty-tab {
      @include flex-column;
      height: 100%;

      .row {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
         margin-top: 0.5rem;

         &:not(:first-child) {
            @include border-top;
            padding-top: 0.5rem;
         }

         &:last-child {
            margin-bottom: 0.5rem;
         }
      }

      .difficulty-settings {
         @include flex-column;
         @include flex-group-top;
         @include border;
         margin-top: 0.5rem;
         background-color: var(--label-background-color);

         .stat {
            @include flex-row;
            @include flex-group-center;
            height: 100%;

            .label {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
               font-weight: bold;
               margin-right: 0.25rem;
            }

            .input {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
               width: 2rem;
            }

            .value {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
            }
         }

         .divider {
            @include border-left;
            height: 100%;
            margin-left: 0.5rem;
            padding-right: 0.5rem;
         }
      }

      .aspect-costs {
         @include flex-column;
         height: 100%;
         width: 100%;

         .header {
            @include flex-row;
            @include flex-group-center;
            @include border-bottom;
            padding-bottom: 0.25rem;
            margin-top: 0.5rem;
            width: 100%;
            font-weight: bold;
         }

         ol {
            @include grid(2);
            list-style: none;
            margin: 0.25rem 0 0 0;

            li {
               @include flex-row;
               @include flex-space-between;
               @include border;
               padding: 0.25rem;
               page-break-inside: avoid;
               background-color: var(--label-background-color);
               font-weight: bold;
            }
         }
      }
   }
</style>
