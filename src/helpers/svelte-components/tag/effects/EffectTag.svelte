<script>
   import checkAddDarkSVGClass from '~/helpers/utility-functions/CheckAddDarkSVGClass.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';

   /**
    * @typedef CustomEffectData
    * Data object for an Effect with a Custom duration.
    * @property {string} label The label to display for the effect.
    * @property {string} img The image to display for the effect.
    * @property {string} description The description of the effect.
    * @property {string} custom The custom duration unit for the effect.
    * @property {number} remaining The number of duration units remaining for the effect.
    * @augments {object}
    */

   /**
    * @typedef ExpiredEffectData
    * Data object for an Effect with an Expired duration.
    * @property {string} label The label to display for the effect.
    * @property {string} img The image to display for the effect.
    * @property {string} description The description of the effect.
    * @augments {object}
    */

   /**
    * @typedef InitiativeEffectData
    * Data object for an Effect with an Initiative-based duration.
    * @property {string} label The label to display for the effect.
    * @property {string} img The image to display for the effect.
    * @property {string} description The description of the effect.
    * @property {number} initiative The Initiative turn in combat on which this effect's duration should decrease.
    * @property {number} remaining The number of duration units remaining for the effect.
    * @augments {object}
    */

   /**
    * @typedef PermanentEffectData
    * Data object for an Effect with a Permanent duration.
    * @property {string} label The label to display for the effect.
    * @property {string} img The image to display for the effect.
    * @property {string} description The description of the effect.
    * @augments {object}
    */

   /**
    * @typedef TurnEffectData
    * Data object for an Effect with a Turn-Start or Turn-End based duration.
    * @property {string} label The label to display for the effect.
    * @property {string} img The image to display for the effect.
    * @property {string} description The description of the effect.
    * @property {number} remaining The number of duration units remaining for the effect.
    * @augments {object}
    */


   /**
    * @type {CustomEffectData|ExpiredEffectData|InitiativeEffectData|PermanentEffectData|TurnEffectData}
    * Object containing the essential data for this effect.
    */
   export let effect = void 0;

   /** @type string The icon to show for the Effect. */
   export let icon = void 0;

   /** @type string Calculated tooltipAction depending on whether the effect has a description */
   const formattedTooltip = !isHTMLBlank(effect.description) ?
      `${localize('effect.custom.desc')}${effect.description}` :
      localize('effect.custom.desc');
</script>

<div class="tag" use:tooltipAction={formattedTooltip}>
   <!--Image-->
   <img alt="img" class={checkAddDarkSVGClass(effect.img)} src={effect.img}/>

   <!--Label-->
   <div>
      {effect.label}
   </div>

   <!--Time Remaining-->
   {#if effect.remaining}
      <div class="time">
         {#if effect.custom}
            <!--Custom Duration-->
            {`${effect.remaining} (${effect.custom})`}
         {:else if effect.initiative}
            <!--Initiative Based Duration-->
            {`${effect.remaining} (${effect.initiative})`}
         {:else}
            <!--Turn Start or End Based-->
            {effect.remaining}
         {/if}
      </div>
   {/if}

   <!--Icon-->
   <i class={icon}/>
</div>

<style lang="scss">
   .tag {
      @include tag;

      .time {
         @include border-left;

         margin-left: var(--titan-padding-standard);
         padding-left: var(--titan-padding-standard);
      }

      img {
         width: 24px;
         border: none;
         margin-right: var(--titan-padding-standard);
      }

      i {
         margin-left: var(--titan-padding-standard);
      }
   }
</style>
