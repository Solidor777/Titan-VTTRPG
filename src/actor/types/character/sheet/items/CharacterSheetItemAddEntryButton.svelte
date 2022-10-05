<script>
   import { getContext } from "svelte";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";

   // The type of item to add
   export let itemType = void 0;
   export let label = void 0;

   // Character reference
   const document = getContext("DocumentStore");

   // Reference to the application
   const application = getContext("external").application;
</script>

<EfxButton on:click={application.addItem.bind(application, itemType)}>
   <i class="fas fa-circle-plus" />
   <div>
      {label}
   </div>
</EfxButton>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .fas {
      margin-right: 0.25rem;
   }
</style>
