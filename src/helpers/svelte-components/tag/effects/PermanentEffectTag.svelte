<script>
   import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';
   import checkAddDarkSVGClass from '~/helpers/utility-functions/CheckAddDarkSVGClass.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { EFFECT_DURATION_PERMANENT_ICON } from '~/system/Icons.js';

   export let label = void 0;
   export let img = void 0;
   export let description = void 0;

   // Calculate the tooltip
   const formattedTooltip = !isHTMLBlank(description)
      ? `${localize('effect.permanent.desc')}${description}`
      : localize('effect.permanent.desc');
</script>

<div class="tag" use:tooltip={{ content: formattedTooltip }}>
   <!--Image-->
   <img src={img} alt="img" class={checkAddDarkSVGClass(img)}/>

   <!--Label-->
   <div>
      {label}
   </div>

   <!--Icon-->
   <i class={EFFECT_DURATION_PERMANENT_ICON}/>
</div>

<style lang="scss">
   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include font-size-small;
      @include effect-permanent;

      font-weight: bold;
      padding: var(--padding-standard);

      img {
         width: 24px;
         border: none;
         margin-right: var(--padding-standard);
      }

      i {
         margin-left: var(--padding-standard);
      }
   }
</style>
