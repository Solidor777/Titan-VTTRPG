<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import OpposedCheckLabel from "~/helpers/svelte-components/OpposedCheckLabel.svelte";
   import ResistedByTag from "~/helpers/svelte-components/ResistedByTag.svelte";
   import StatTag from "~/helpers/svelte-components/StatTag.svelte";
   import CharacterItemCheckButton from "./CharacterItemCheckButton.svelte";
   import CharacterCheckLabelLong from "../checks/CharacterCheckLabelLong.svelte";

   // Reference to the application
   const application = getContext("external").application;

   // Reference to the docuement
   const document = getContext("DocumentStore");

   // Reference to the item
   export let id = void 0;

   // The idx of the check
   export let checkIdx = void 0;

   // Reference to the weapon id
   $: check = $document.items.get(id).system.check[checkIdx];
</script>

<!--Check-->
{#if check}
   <div class="check">
      <!--Button-->
      <div class="row">
         <CharacterItemCheckButton
            {check}
            on:click={() => {
               application.rollItemCheck(id, checkIdx);
            }}
         />
      </div>

      <div class="row">
         <!--Main check stats-->
         <div class="tag">
            <CharacterCheckLabelLong {check} />
         </div>

         <!--Resolve Cost-->
         {#if check.resolveCost > 0}
            <div class="tag">
               <StatTag label={localize("resolveCost")} value={check.resolveCost} />
            </div>
         {/if}

         <!--Resistance Check-->
         {#if check.resistanceCheck !== "none"}
            <div class="tag">
               <ResistedByTag resistance={check.resistanceCheck} />
            </div>
         {/if}

         <!--Opposed Check-->
         {#if check.opposedCheck.enabled}
            <div class="tag">
               <OpposedCheckLabel opposedCheck={check.opposedCheck} />
            </div>
         {/if}
      </div>
   </div>
{/if}

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .check {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .row {
         @include flex-row;
         @include flex-group-center;
         flex-wrap: wrap;

         .tag {
            margin: 0.5rem 0.25rem 0 0.25rem;
         }
      }
   }
</style>
