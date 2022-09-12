<script>
   import ActorCheckLabelLong from "~/actor/sheet/ActorCheckLabelLong.svelte";
   import ActorItemCheckButton from "./ActorItemCheckButton.svelte";
   import { getContext } from "svelte";

   // Reference to the application
   const application = getContext("external").application;

   // Reference to the docuement
   const document = getContext("DocumentSheetObject");

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
         <ActorItemCheckButton
            {check}
            on:click={() => {
               application.rollItemCheck(id, checkIdx);
            }}
         />
      </div>

      <!--Stats-->
      <div class="row">
         <div classs="tag">
            <ActorCheckLabelLong {check} />
         </div>
      </div>
   </div>
{/if}

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .check {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .row {
         @include flex-row;
         @include flex-group-center;
         flex-wrap: wrap;

         &:not(:first-child) {
            margin-top: 0.5rem;
         }

         .tag {
            &:not(:first-child) {
               margin-left: 0.25rem;
            }
         }
      }
   }
</style>
