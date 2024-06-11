<script>
   import checkAddDarkSVGClass from '~/helpers/utility-functions/CheckAddDarkSVGClass.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   export let label = void 0;
   export let img = void 0;
   export let description = void 0;
</script>

<div class="tag" use:tooltipAction="{description}">
   <!--Image-->
   <img alt="img" class={checkAddDarkSVGClass(img)} src={img}/>

   <!--Label-->
   <div>
      {label}
   </div>
</div>

<style lang="scss">
   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include font-size-small;
      @include tag;

      font-weight: bold;
      padding: var(--titan-padding-standard);

      img {
         width: 24px;
         border: none;
         margin-right: var(--titan-padding-standard);
      }
   }
</style>
