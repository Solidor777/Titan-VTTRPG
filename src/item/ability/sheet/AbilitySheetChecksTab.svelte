<script>
   import { getContext } from "svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import ItemSheetCheckSettings from "../../sheet/ItemSheetCheckSettings.svelte";
   import AbilitySheetAddCheckButton from "./AbilitySheetAddCheckButton.svelte";

   // Document reference
   const document = getContext("DocumentSheetObject");

   // Application refernce
   const application = getContext("external").application;
</script>

<ScrollingContainer bind:scrollTop={application.scrollTop.checks}>
   <div class="checks-tab">
      <!--Checks List-->
      <ol class="checks-list">
         <!--Each Check-->
         {#each $document.system.check as check, idx}
            <li>
               <ItemSheetCheckSettings {idx} />
            </li>
         {/each}
      </ol>
      <AbilitySheetAddCheckButton />
   </div>
</ScrollingContainer>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .checks-tab {
      padding: 0;

      .checks-list {
         list-style: none;
         padding: 0;
         margin: 0;
      }
   }
</style>
