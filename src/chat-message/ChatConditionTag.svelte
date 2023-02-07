<script>
   import { getDarkSVGClass } from '~/helpers/Utility.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';

   export let label = void 0;
   export let img = void 0;
   export let description = void 0;
</script>

<div class="tag" use:tooltip={{ content: description }}>
   <!--Image-->
   <img src={img} alt="img" class={getDarkSVGClass(img)} />

   <!--Label-->
   <div>
      {label}
   </div>
</div>

<style lang="scss">
   @import '../styles/mixins.scss';

   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include font-size-small;
      @include label;
      font-weight: bold;
      padding: 0.25rem;

      img {
         width: 1.5rem;
         border: none;
         margin-right: 0.25rem;
      }
   }
</style>
