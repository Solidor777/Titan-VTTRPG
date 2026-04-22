<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} The Key of the resource to display information for. */
   export let key = void 0;

   /** @type {string} The icon class to use for the tag. */
   export let icon = void 0;

   /** @type {string} The style class to use for the tag. */
   export let styleClass = void 0;

   /**
    * Calculates the tooltip HTML for the resource mod tag.
    */
   function getTooltip() {
      // Base label.
      let retVal = `<p>${localize(`${key}.desc`)}</p>`;

      // Equipment.
      if ($document.flags.titan[key].equipment) {
         retVal += `<p>${localize('equipment')}: ${$document.flags.titan[key].equipment}</p>`;
      }

      // Abilities.
      if ($document.flags.titan[key].ability) {
         retVal += `<p>${localize('abilities')}: ${$document.flags.titan[key].ability}</p>`;
      }

      // Effects.
      if ($document.flags.titan[key].effect) {
         retVal += `<p>${localize('effects')}: ${$document.flags.titan[key].effect}</p>`;
      }

      return retVal;
   }
</script>

<div class="tag {styleClass}" use:tooltipAction={{
   text: getTooltip(),
   localize: false,
}}>
   <!--Icon-->
   <i class={icon}/>

   <!--Label-->
   <div class="label">
      {localize(key)}
   </div>

   <!--Value-->
   <div>{$document.flags.titan[key].total}</div>
</div>

<style lang="scss">
   .tag {
      @include tag;

      &.fast-healing {
         @include fast-healing-tag;
      }

      &.persistent-damage {
         @include persistent-damage-tag;
      }

      &.resolve-regain {
         @include resolve-regain-tag;
      }

      i {
         @include margin-right-standard;
      }

      .label {
         @include border-right;
         @include padding-right-standard;
         @include margin-right-standard;
      }
   }
</style>
