<script>
   import { getContext } from "svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import AbilitySheetAddCheckButton from "./AbilitySheetAddCheckButton.svelte";

   const document = getContext("DocumentSheetObject");
</script>

<ScrollingContainer>
   <!--Checks List-->
   <ol class="checks-list">
      <!--Each Check-->
      {#each $document.system.checks as check}
         <li>
            {check.label}
         </li>
      {/each}
   </ol>
   <AbilitySheetAddCheckButton />
</ScrollingContainer>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .checks-list {
      list-style: none;
      padding: 0;
      margin-top: 0;
   }
</style>
