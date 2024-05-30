<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';
   import {DICE_ICON} from '~/system/Icons.js';

   export let attribute = 'body';
   export let skill = void 0;

   // Reference to the docuement
   const document = getContext('document');
</script>

<!--Dice Pool-->
<div class="dice-pool {attribute}">
   <!--Label-->
   <div class="label">
      <i class="{DICE_ICON}"/>
      {localize('dice')}:
   </div>

   <!--Value-->
   <div class="value">
      {$document.system.attribute[attribute].value +
      (skill ? $document.system.skill[skill].training.value : 0)}
   </div>
</div>

<style lang="scss">
   .dice-pool {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include attribute-colors;

      padding: var(--titan-padding-standard);

      .label {
         margin-right: var(--titan-padding-standard);
      }
   }
</style>
