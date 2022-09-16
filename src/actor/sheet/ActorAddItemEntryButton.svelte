<script>
   import { getContext } from "svelte";
   import EfxButton from "~/helpers/svelte-components/EfxButton.svelte";

   // The type of item to add
   export let itemType = void 0;

   // Actor reference
   const document = getContext("DocumentStore");

   // Reference to the application
   const application = getContext("external").application;
</script>

<EfxButton on:click={application.addItem.bind(application, itemType)}><i class="fas fa-circle-plus" /></EfxButton>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .fas {
      padding: 0.25rem;
   }
</style>
