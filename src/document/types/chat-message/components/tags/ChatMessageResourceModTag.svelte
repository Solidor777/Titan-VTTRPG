<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import { getContext } from 'svelte';

   /** @type ChatMessage Reference to the Chat Message document. */
   const document = getContext('document');

   /** @type string The Key of the resource to display information for. */
   export let key = void 0;

   /** @type string The Icon to use for the tag.. */
   export let icon = void 0;

   /** @type string The ctyle class to use for the tag.. */
   export let styleClass = void 0;

   // Calculate the tooltip for the resource mod
   /**
    *
    */
   function getTooltip() {
      // Base label
      let retVal = `<p>${localize(`${key}.desc`)}</p>`;

      // Equipment
      if ($document.flags.titan[key].equipment) {
         retVal += `<p>${localize('equipment')}: ${$document.flags.titan[key].equipment}</p>`;
      }

      // Abilities
      if ($document.flags.titan[key].ability) {
         retVal += `<p>${localize('abilities')}: ${$document.flags.titan[key].ability}</p>`;
      }

      // Effects
      if ($document.flags.titan[key].effect) {
         retVal += `<p>${localize('effects')}: ${$document.flags.titan[key].effect}</p>`;
      }

      return retVal;
   }
</script>

<div class="tag {styleClass}" use:tooltip={{ content: getTooltip() }}>
   <!--Icon-->
   <i class="{icon}"/>

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
         @include fast-healing;
      }

      &.persistent-damage {
         @include persistent-damage;
      }

      &.resolve-regain {
         @include resolve-regain;
      }

      i {
         margin-right: var(--padding-standard);
      }

      .label {
         @include border-right;
         padding-right: var(--padding-standard);
         margin-right: var(--padding-standard);
      }
   }
</style>
