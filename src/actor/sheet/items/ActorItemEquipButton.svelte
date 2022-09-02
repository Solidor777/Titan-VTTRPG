<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // Reference to the application
   const application = getContext("external").application;

   // Collapsed object
   export let item = void 0;

   export let equipped = void 0;
</script>

<div class="item-equip-button">
   <EfxButton efx={ripple} on:click={application.toggleEquipped.bind(application, item._id)}>
      {localize("LOCAL.equipped.label")}:
      <div class="spacer" />
      <i class={equipped ? "fas fa-square-check" : "fas fa-square"} />
   </EfxButton>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .item-equip-button {
      .spacer {
         width: 0.25rem;
      }
   }
</style>
