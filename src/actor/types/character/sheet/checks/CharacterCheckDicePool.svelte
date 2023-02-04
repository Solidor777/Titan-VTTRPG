<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';

   export let attribute = 'body';
   export let skill = void 0;

   // Reference to the docuement
   const document = getContext('DocumentStore');
</script>

<!--Dice Pool-->
<div class="dice-pool {attribute}">
   <!--Label-->
   <div class="label">
      <i class="fas fa-dice-d6" />
      {localize('dice')}:
   </div>

   <!--Value-->
   <div class="value">
      {$document.system.attribute[attribute].value +
         (skill ? $document.system.skill[skill].training.value : 0)}
   </div>
</div>

<style lang="scss">
   @import '../../../../../Styles/Mixins.scss';

   .dice-pool {
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
