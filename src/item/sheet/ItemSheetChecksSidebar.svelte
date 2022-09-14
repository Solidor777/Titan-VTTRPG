<script>
   import { getContext } from "svelte";

   // Document reference
   const document = getContext("DocumentSheetObject");

   // Application staore reference
   const appState = getContext("ApplicationStateStore");

   $: checks = $document.system.check;
</script>

<ol>
   {#each checks as check}
      <li>
         <div class="header">
            {check.label}
         </div>
      </li>
   {/each}
</ol>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   ol {
      @include flex-column;
      @include flex-group-top;
      @include list;
      width: 100%;

      li {
         @include flex-column;
         @include flex-group-top;
         margin-top: 0.5rem;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
         }

         .header {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            font-weight: bold;
         }
      }
   }
</style>
