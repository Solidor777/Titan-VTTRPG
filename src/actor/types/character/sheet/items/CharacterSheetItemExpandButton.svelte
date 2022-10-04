<script>
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";

   // Collapsed object
   export let isExpanded = void 0;

   // Item
   export let item = void 0;

   // Optional override for the name teext
   export let name = false;
</script>

<div class="button">
   <EfxButton
      on:click={() => {
         isExpanded = !isExpanded;
      }}
   >
      <div class="button-inner">
         <!--Name-->
         <div class="name">{name === false ? item.name : name}</div>

         <!--Icon-->
         <i class="fas fa-angle-{isExpanded ? 'double-down' : 'double-right'}" />
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .button {
      @include flex-row;
      margin-right: 0.5rem;

      .button-inner {
         @include flex-row;
         @include flex-space-between;
         width: 100%;
         height: 100%;

         .name {
            @include flex-row;
            @include flex-group-center;
            padding: 0.25rem 0;
            flex-wrap: wrap;
            width: 100%;
            line-height: normal;
         }

         i {
            width: 1rem;
            margin-left: 0.25rem;
         }
      }
   }
</style>
