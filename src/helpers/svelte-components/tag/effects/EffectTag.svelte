<script>
   import checkAddDarkSVGClass from '~/helpers/utility-functions/CheckAddDarkSVGClass.js';
   import buildEffectTagTooltip from '~/helpers/utility-functions/BuildEffectTagTooltip.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} CustomEffectData
    * Data object for an Effect with a Custom duration.
    * @property {string} label - The label to display for the effect.
    * @property {string} img - The image to display for the effect.
    * @property {string} description - The description of the effect.
    * @property {string} custom - The custom duration unit for the effect.
    * @property {number} remaining - The number of duration units remaining for the effect.
    */

   /**
    * @typedef {object} ExpiredEffectData
    * Data object for an Effect with an Expired duration.
    * @property {string} label - The label to display for the effect.
    * @property {string} img - The image to display for the effect.
    * @property {string} description - The description of the effect.
    */

   /**
    * @typedef {object} InitiativeEffectData
    * Data object for an Effect with an Initiative-based duration.
    * @property {string} label - The label to display for the effect.
    * @property {string} img - The image to display for the effect.
    * @property {string} description - The description of the effect.
    * @property {number} initiative - The Initiative turn in combat on which this effect's duration should decrease.
    * @property {number} remaining - The number of duration units remaining for the effect.
    */

   /**
    * @typedef {object} PermanentEffectData
    * Data object for an Effect with a Permanent duration.
    * @property {string} label - The label to display for the effect.
    * @property {string} img - The image to display for the effect.
    * @property {string} description - The description of the effect.
    */

   /**
    * @typedef {object} TurnEffectData
    * Data object for an Effect with a Turn-Start or Turn-End based duration.
    * @property {string} label - The label to display for the effect.
    * @property {string} img - The image to display for the effect.
    * @property {string} description - The description of the effect.
    * @property {number} remaining - The number of duration units remaining for the effect.
    */

   /**
    * @typedef {object} ConditionEffectData
    * Data object for a standard Condition Effect.
    * @property {string} label - The label to display for the effect.
    * @property {string} img - The image to display for the effect.
    * @property {string} [descriptionKey] - The localization key of the condition's description, localized at render.
    * @property {string} [description] - The condition's localized description, which only an entry from a report
    * posted before conditions stored keys carries.
    */

   /**
    * @typedef {CustomEffectData | ExpiredEffectData | InitiativeEffectData | PermanentEffectData | TurnEffectData
    * | ConditionEffectData} EffectTagEffectData Any of the duration-specific effect data shapes this tag can render.
    */

   /**
    * @typedef {object} EffectTagProps
    * @property {EffectTagEffectData} effect - The effect data this tag displays.
    * @property {string} [icon] - Optional font-icon class shown alongside the effect.
    * @property {string} [leadKey] - The localization key of the duration text the tooltip leads with
    * (`effect.<type>.desc`, passed by each duration's tag); a condition entry has none.
    * @property {string} [testId] - Optional test id bound to the root element for probing.
    */

   /** @type {EffectTagProps} */
   let { effect = void 0, icon = void 0, leadKey = void 0, testId = void 0 } = $props();

   /** @type {TextData} The tooltip: the duration lead text, then the entry's description. */
   const tooltip = $derived(buildEffectTagTooltip(effect, leadKey));
</script>

<div class="tag" data-testid={testId} use:tooltipAction={tooltip}>
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
   {#if icon}
      <i class={icon}></i>
   {/if}
</div>

<style lang="scss">
   .tag {
      @include large-tag;

      .time {
         @include separator-left;
      }

      img {
         width: 24px;
         border: none;

         @include margin-right-standard;
      }

      i {
         @include margin-left-standard;
      }
   }
</style>
