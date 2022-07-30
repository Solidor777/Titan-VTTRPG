<script>
   import { setContext } from "svelte";
   import ResistanceSelect from "../components/ResistanceSelect.svelte";
   import CheckDifficultySelect from "../../components/CheckDifficultySelect.svelte";
   import IntegerInput from "../../../helpers/svelte-components/IntegerInput.svelte";

   // The actor document making this check
   export let storeDoc = void 0;

   // Initial check options
   export let inData = void 0;

   let checkParameters = {
      resistance: inData.resistance ? inData.resistance : "reflexes",
      difficulty: inData.difficulty ? inData.difficulty : 4,
      complexity: inData.complexity ? inData.complexity : 0,
      diceMod: inData.diceMod ? inData.diceMod : 0,
   };

   // Setup context and store
   setContext("DialogObject", storeDoc);
</script>

<div class="resistance-check-dialog">
   <ResistanceSelect bind:value={checkParameters.resistance} />
   <CheckDifficultySelect bind:difficulty={checkParameters.difficulty} />
   <IntegerInput bind:value={checkParameters.complexity} positive={true} />
   <IntegerInput bind:value={checkParameters.diceMod} />
</div>

<style lang="scss">
   @import "../../../styles/Mixins.scss";

   .resistance-check-dialog {
      @include grid(2);
   }
</style>
