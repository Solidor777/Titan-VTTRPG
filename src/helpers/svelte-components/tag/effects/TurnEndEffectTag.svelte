<script>
   import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';
   import checkAddDarkSVGClass from '~/helpers/utility-functions/CheckAddDarkSVGClass.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import {EFFECT_DURATION_TURN_END_ICON} from '~/system/Icons.js';

   export let label = void 0;
   export let img = void 0;
   export let description = void 0;
   export let remaining = void 0;

   // Calclate the tooltip
   const formattedTooltip = !isHTMLBlank(description)
      ? `${localize('effect.turnEnd.desc')}${description}`
      : localize('effect.turnEnd.desc');
</script>

<div class="tag" use:tooltip={{ content: formattedTooltip }}>
   <!--Image-->
   <img alt="img" class={checkAddDarkSVGClass(img)} src={img}/>

   <!--Label-->
   <div>
      {label}
   </div>

   <div class="time">
      {remaining}
   </div>

   <!--Icon-->
   <i class={EFFECT_DURATION_TURN_END_ICON}/>
</div>

<style lang="scss">
   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include font-size-small;
      @include effect-turn-end;

      font-weight: bold;
      padding: var(--titan-padding-standard);

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
