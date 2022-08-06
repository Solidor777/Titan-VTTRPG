<svelte:options accessors={true} />

<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import IntegerInput from "~/helpers/svelte-components/IntegerInput.svelte";

   // Initial check options
   export let item = void 0;
   export let attackIdx = void 0;

   let traitsOptions = structuredClone(CONFIG.TITAN.constants.trait.attack);
   console.log(traitsOptions);
</script>

<div class="attack-trait-dialog">Attack Traits</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";
</style>
