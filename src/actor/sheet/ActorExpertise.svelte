<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";

   export let skill = "athletics";
   export let attribute = "";

   // Reference to the docuement
   const document = getContext("DocumentSheetObject");
</script>

<!--Dice Pool-->
<div class="expertise {attribute}">
   <!--Label-->
   <div class="label">
      <i class="fas fa-graduation-cap" />
      {localize("expertise")}:
   </div>

   <!--Value-->
   <div class="value">
      {$document.system.skill[skill].expertise.value}
   </div>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .expertise {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include attribute-colors;
      padding: 0.25rem;

      .label {
         margin-right: 0.25rem;
      }
   }
</style>
