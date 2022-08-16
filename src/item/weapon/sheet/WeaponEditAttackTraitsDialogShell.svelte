<svelte:options accessors={true} />

<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import IntegerInput from "~/helpers/svelte-components/IntegerInput.svelte";

   // The weapon item owning the attack
   export let item = void 0;

   // The idx of the attack we are editing
   export let attackIdx = void 0;

   // Application reference
   const application = getContext("external").application;

   // The trait options
   let traitOptions = structuredClone(CONFIG.TITAN.constants.trait.attack);

   // Initialize trait options
   for (let [k, v] of Object.entries(item.system.attack[attackIdx].traits)) {
      traitOptions[k] = v;
   }

   function applyTraitEdits() {
      // If the attack and item are still valid
      if (item && item.system.attack[attackIdx]) {
         // Filter traits
         let traits = {};
         for (let [k, v] of Object.entries(traitOptions)) {
            const type = typeof v;
            switch (type) {
               case "boolean": {
                  if (v === true) {
                     traits[k] = v;
                  }
                  break;
               }
               case "number": {
                  if (v > 0) {
                     traits[k] = v;
                  }
                  break;
               }

               default: {
                  break;
               }
            }
         }

         // Update the item
         const system = item.system;
         system.attack[attackIdx].traits = traits;
         item.update({ system: system });
      }

      application.close();
      return;
   }
</script>

<div class="attack-trait-dialog">
   <!--Traits list-->
   <ol>
      {#each Object.entries(traitOptions) as [key, trait]}
         <!--Trait-->
         <li>
            <!--Label-->
            <div class="label">
               {localize(`LOCAL.${key}.label`)}
            </div>

            <!--Input-->
            <div class="input">
               {#if typeof trait === "boolean"}
                  <!--Boolean-->
                  <input type="checkbox" bind:checked={traitOptions[key]} />
               {:else}
                  <!--Integer-->
                  <IntegerInput bind:value={traitOptions[key]} />
               {/if}
            </div>
         </li>
      {/each}
   </ol>

   <!--Buttons-->
   <div class="row">
      <button on:click={applyTraitEdits}>{localize("LOCAL.applyEdits.label")}</button>
      <button
         on:click={() => {
            application.close();
         }}>{localize("LOCAL.cancel.label")}</button
      >
   </div>
</div>

<style lang="scss">
   @import "../../../styles/Mixins.scss";
   .attack-trait-dialog {
      ol {
         list-style: none;
         column-count: 2;
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

            &:not(:first-child) {
               margin-top: 0.5rem;
            }

            .label {
               @include flex-row;
               @include flex-group-left;
               width: 100%;
               height: 100%;
            }

            .input {
               @include flex-row;
               justify-content: flex-end;
               align-items: center;
               text-align: center;
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
