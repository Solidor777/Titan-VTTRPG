<script>
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";

   // Check reference
   export let check = void 0;
</script>

<div class="item-check-button {check.attribute}">
   <EfxButton on:click>
      <div class="button-inner">
         <i class="fa fa-dice" />
         <div>
            {check.label}
         </div>
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .item-check-button {
      @include flex-row;

      &.body {
         --button-background-color: var(--body-color-bright);
      }

      &.mind {
         --button-background-color: var(--mind-color-bright);
      }

      &.soul {
         --button-background-color: var(--soul-color-bright);
      }

      .button-inner {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;
         height: 100%;
         line-height: normal;
         padding: 0.25rem;

         i {
            margin-right: 0.25rem;
         }
      }
   }
</style>
