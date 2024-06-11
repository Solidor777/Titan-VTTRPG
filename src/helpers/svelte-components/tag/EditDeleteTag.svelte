<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import {DELETE_ICON, EDIT_ICON} from '~/system/Icons.js';

   export let label = void 0;
   export let deleteFunction = void 0;
   export let editFunction = void 0;
   export let deleteTooltip = void 0;
   export let editTooltip = void 0;
   export let labelTooltip = void 0;
</script>

<div class="tag">
   <div use:tooltipAction="{labelTooltip}">
      {label}
   </div>
   <!-- svelte-ignore a11y-missing-attribute -->
   <!-- svelte-ignore a11y-missing-content -->
   <a
      class="{EDIT_ICON}"
      on:click={() => {
         editFunction();
      }}
      on:keypress={() => {
         editFunction();
      }}
      role="button"
      tabindex="0"
      use:tooltipAction="{editTooltip}"
   />
   <!-- svelte-ignore a11y-missing-attribute -->
   <!-- svelte-ignore a11y-missing-content -->
   <a
      class="{DELETE_ICON}"
      on:click={() => {
         deleteFunction();
      }}
      on:keypress={() => {
         deleteFunction();
      }}
      role="button"
      tabindex="0"
      use:tooltipAction="{deleteTooltip}"
   />
</div>

<style lang="scss">
   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include tag;

      font-weight: bold;
      padding: var(--titan-padding-standard);

      a {
         @include border-left;

         margin-left: var(--titan-padding-standard);
         padding-left: var(--titan-padding-standard);
      }
   }
</style>
