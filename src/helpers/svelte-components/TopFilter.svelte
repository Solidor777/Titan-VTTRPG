<script>
   import { localize } from "~/helpers/Utility.js";
   import TextInput from "~/helpers/svelte-components/input/TextInput.svelte";

   // Filter Items
   export let filter = void 0;
</script>

<!--Filter-->
<div class="filter">
   <div class="label">{localize("filter")}</div>
   <div class="input"><TextInput bind:value={filter} /></div>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .filter {
      @include flex-row;
      @include flex-group-center;
      @include border-bottom;
      @include panel-1;
      width: 100%;
      @include font-size-normal;
      font-weight: bold;
      padding: 0.25rem;

      .input {
         @include font-size-normal;
         margin-left: 0.5rem;
      }
   }
</style>
