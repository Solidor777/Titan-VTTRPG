<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";

   // Item Reference
   export let item = void 0;
   // Reference to the application
   const application = getContext("external").application;
</script>

<div class="item-equip-button">
   <EfxButton on:click={application.toggleMultiAttack.bind(application, item._id)}>
      <div class="button-inner">
         <i class={item.system.multiAttack ? "fas fa-swords" : "fas fa-sword"} />
         <div class="label">
            {localize("multiAttack")}
         </div>
         <i class={item.system.multiAttack ? "fas fa-square-check" : "fas fa-square"} />
      </div>
   </EfxButton>
</div>

<style lang="scss">
   @import "../../../../../../Styles/Mixins.scss";

   .item-equip-button {
      .button-inner {
         @include flex-row;
         @include flex-group-center;
         height: 100%;

         :not(:first-child) {
            margin-left: 0.25rem;
         }
      }
   }
</style>
