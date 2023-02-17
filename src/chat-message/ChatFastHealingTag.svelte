<script>
   import { localize } from '~/helpers/Utility.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';

   export let fastHealing = void 0;

   // Calculate the tooltip for the max value
   function getTooltip() {
      // Base label
      let retVal = `<p>${localize(`fastHealing.desc`)}</p>`;

      // Equipment
      if (fastHealing.equipment) {
         retVal += `<p>${localize('equipment')}: ${fastHealing.equipment}</p>`;
      }

      // Abilities
      if (fastHealing.ability) {
         retVal += `<p>${localize('abilities')}: ${fastHealing.ability}</p>`;
      }

      // Effects
      if (fastHealing.effect) {
         retVal += `<p>${localize('effects')}: ${fastHealing.effect}</p>`;
      }

      return retVal;
   }

   function getTotalValue() {
      let retVal = 0;
      // Equipment
      if (fastHealing.equipment) {
         retVal += fastHealing.equipment;
      }

      // Abilities
      if (fastHealing.ability) {
         retVal += fastHealing.ability;
      }

      // Effects
      if (fastHealing.effect) {
         retVal += fastHealing.effect;
      }

      return retVal;
   }
</script>

<div class="tag" use:tooltip={{ content: getTooltip() }}>
   <!--Icon-->
   <i class="fas fa-heart" />

   <!--Label-->
   <div class="label">
      {localize('fastHealing')}
   </div>

   <!--Value-->
   <div>{getTotalValue()}</div>
</div>

<style lang="scss">
   @import '../styles/mixins.scss';

   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include font-size-small;
      @include fast-healing;
      font-weight: bold;
      padding: 0.25rem;

      i {
         margin-right: 0.25rem;
      }

      .label {
         @include border-right;
         padding-right: 0.25rem;
         margin-right: 0.25rem;
      }
   }
</style>
