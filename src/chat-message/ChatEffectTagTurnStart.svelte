<script>
   import {
      getDarkSVGClass,
      isHTMLBlank,
      localize,
   } from '~/helpers/Utility.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';

   export let label = void 0;
   export let img = void 0;
   export let description = void 0;
   export let remaining = void 0;

   // Calclate the tooltip
   const formattedTooltip = !isHTMLBlank(description)
      ? `${localize('effect.turnStart.desc')}${description}`
      : localize('effect.turnStart.desc');
</script>

<div class="tag" use:tooltip={{ content: formattedTooltip }}>
   <!--Image-->
   <img src={img} alt="img" class={getDarkSVGClass(img)} />

   <!--Label-->
   <div>
      {label}
   </div>

   <div class="time">
      {remaining}
   </div>

   <!--Icon-->
   <i class={'fas fa-hourglass-start'} />
</div>

<style lang="scss">
   @import '../styles/mixins.scss';

   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include font-size-small;
      @include effect-turn-start;
      font-weight: bold;
      padding: 0.25rem;

      .time {
         @include border-left;
         margin-left: 0.25rem;
         padding-left: 0.25rem;
      }

      img {
         width: 1.5rem;
         border: none;
         margin-right: 0.25rem;
      }

      i {
         margin-left: 0.25rem;
      }
   }
</style>
