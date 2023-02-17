<script>
   import { localize } from '~/helpers/Utility.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';

   export let persistentDamage = void 0;

   // Calculate the tooltip for the max value
   function getTooltip() {
      // Base label
      let retVal = `<p>${localize(`persistentDamage.desc`)}</p>`;

      // Equipment
      if (persistentDamage.equipment) {
         retVal += `<p>${localize('equipment')}: ${
            persistentDamage.equipment
         }</p>`;
      }

      // Abilities
      if (persistentDamage.ability) {
         retVal += `<p>${localize('abilities')}: ${
            persistentDamage.ability
         }</p>`;
      }

      // Effects
      if (persistentDamage.effect) {
         retVal += `<p>${localize('effects')}: ${persistentDamage.effect}</p>`;
      }

      return retVal;
   }

   function getTotalValue() {
      let retVal = 0;
      // Equipment
      if (persistentDamage.equipment) {
         retVal += persistentDamage.equipment;
      }

      // Abilities
      if (persistentDamage.ability) {
         retVal += persistentDamage.ability;
      }

      // Effects
      if (persistentDamage.effect) {
         retVal += persistentDamage.effect;
      }

      return retVal;
   }
</script>

<div class="tag" use:tooltip={{ content: getTooltip() }}>
   <!--Icon-->
   <i class="fas fa-heart" />

   <!--Label-->
   <div class="label">
      {localize('persistentDamage')}
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
      @include persistent-damage;
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
