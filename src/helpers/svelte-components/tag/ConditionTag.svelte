<script>
   import checkAddDarkSVGClass from '~/helpers/utility-functions/CheckAddDarkSVGClass.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';

   export let label = void 0;
   export let img = void 0;
   export let description = void 0;
</script>

<div class="tag" use:tooltip={{ content: description }}>
   <!--Image-->
   <img src={img} alt="img" class={checkAddDarkSVGClass(img)}/>

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
      @include label;
      font-weight: bold;
      padding: var(--padding-standard);

      img {
         width: 24px;
         border: none;
         margin-right: var(--padding-standard);
      }
   }
</style>
