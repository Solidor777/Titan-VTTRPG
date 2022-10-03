<script>
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";

   // Collapsed object
   export let isExpanded = void 0;

   // Item
   export let item = void 0;

   // Optional override for the name teext
   export let name = false;
</script>

<div class="item-expand-button">
   <EfxButton
      on:click={() => {
         isExpanded = !isExpanded;
      }}
   >
      <div class="item-expand-button-inner">
         <!--Image-->
         <img class="item-image" src={item.img} alt="item" />

         <!--Name-->
         <div class="name">{name === false ? item.name : name}</div>

         <!--Icon-->
         <i class="fas fa-angle-double-down" />
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .item-expand-button {
      @include flex-row;
      margin-right: 0.5rem;

      .item-expand-button-inner {
         @include flex-row;
         @include flex-space-between;
         width: 100%;
         height: 100%;

         :not(:first-child) {
            margin-left: 0.5rem;
         }

         .item-image {
            @include flex-row;
            @include flex-group-center;
            width: 2rem;
            border: none;
            border-radius: 10px;
            padding: 0.1rem;
            background: black;
         }

         .name {
            @include flex-row;
            @include flex-group-center;
            padding: 0.25rem;
            flex-wrap: wrap;
            width: 100%;
            line-height: normal;
         }
      }
   }
</style>
