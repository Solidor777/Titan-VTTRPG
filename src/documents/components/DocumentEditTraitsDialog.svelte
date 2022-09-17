<svelte:options accessors={true} />

<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import IntegerInput from "~/helpers/svelte-components/input/IntegerInput.svelte";

   // The document
   export let document = void 0;

   // The document traits to update
   export let documentTraits = void 0;

   // The options
   export let traitOptions = void 0;

   // Application reference
   const application = getContext("external").application;

   // Initialize trait options to the current value of the traits
   documentTraits.forEach((trait) => {
      for (let idx = 0; idx < traitOptions.length; idx++) {
         if (traitOptions[idx].name === trait.name) {
            traitOptions[idx].value = trait.value;
            break;
         }
      }
   });

   function applyTraitEdits() {
      // If the document and traits are still valid
      if (document && documentTraits) {
         // Filter the active traits
         documentTraits = traitOptions.filter(
            (trait) =>
               (trait.type === "boolean" && trait.value === true) || (trait.type === "number" && trait.value === true)
         );

         // Update the document
         const system = document.system;
         document.update({ system: system });
      }

      application.close();
      return;
   }
</script>

<div class="attack-trait-dialog">
   <!--Traits list-->
   <ol>
      {#each traitOptions as trait, idx}
         <!--Trait-->
         <li>
            <!--Label-->
            <div class="label">
               {localize(`${trait.name}`)}
            </div>

            <!--Input-->
            <div class="input">
               {#if trait.type === "boolean"}
                  <!--Boolean-->
                  <input type="checkbox" bind:checked={traitOptions[idx].value} />
               {:else}
                  <!--Integer-->
                  <IntegerInput bind:value={traitOptions[idx].value} />
               {/if}
            </div>
         </li>
      {/each}
   </ol>

   <!--Buttons-->
   <div class="row">
      <button on:click={applyTraitEdits}>{localize("applyEdits")}</button>
      <button
         on:click={() => {
            application.close();
         }}>{localize("cancel")}</button
      >
   </div>
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";
   .attack-trait-dialog {
      ol {
         list-style: none;
         column-count: var(--trait-column-count);
         margin: 0;
         padding: 0;

         li {
            @include border;
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            height: 2.5rem;
            margin-bottom: 0.5rem;
            padding: 0.25rem;
            font-size: 1rem;
            font-weight: bold;
            page-break-inside: avoid;

            &:not(:first-child) {
               margin-top: 0.5rem;
            }

            .label {
               @include flex-row;
               @include flex-group-center;
               width: 100%;
               height: 100%;
            }

            .input {
               @include flex-row;
               @include flex-group-center;
               width: 30%;
               height: 100%;
            }
         }
      }

      .row {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
         margin-top: 0.5rem;

         button {
            font-size: 1rem;
         }
      }
   }
</style>
