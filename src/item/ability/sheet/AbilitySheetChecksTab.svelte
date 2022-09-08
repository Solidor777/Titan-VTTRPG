<script>
   import { getContext } from "svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import ItemSheetCheckSettings from "~/item/sheet/ItemSheetCheckSettings.svelte";
   import ItemSheetAddCheckButton from "~/item/sheet/ItemSheetAddCheckButton.svelte";

   // Document reference
   const document = getContext("DocumentSheetObject");

   // Application refernce
   const application = getContext("external").application;
</script>

<ScrollingContainer bind:scrollTop={application.scrollTop.checks}>
   <div class="checks-tab">
      <!--Checks List-->
      <ol>
         <!--Each Check-->
         {#each $document.system.check as check, idx}
            <li>
               <ItemSheetCheckSettings {idx} />
            </li>
         {/each}
      </ol>
      <div class="add-check-button">
         <ItemSheetAddCheckButton />
      </div>
   </div>
</ScrollingContainer>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .checks-tab {
      padding: 0;

      ol {
         list-style: none;
         padding: 0;
         margin: 0;

         li {
            width: 100%;

            &:not(:first-child) {
               margin-top: 0.5rem;
            }
         }
      }

      .add-check-button {
         margin-top: 0.5rem;
      }
   }
</style>
