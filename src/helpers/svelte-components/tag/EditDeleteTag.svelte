<script>
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import { DELETE_ICON, EDIT_ICON } from '~/system/Icons.js';

   export let label = void 0;
   export let deleteFunction = void 0;
   export let editFunction = void 0;
   export let deleteTooltip = void 0;
   export let editTooltip = void 0;
   export let labelTooltip = void 0;
</script>

<div class="tag">
   <div use:tooltip={{ content: labelTooltip }}>
      {label}
   </div>
   <!-- svelte-ignore a11y-missing-attribute -->
   <!-- svelte-ignore a11y-missing-content -->
   <a
      role="button"
      tabindex="0"
      use:tooltip={{ content: editTooltip }}
      class="{EDIT_ICON}"
      on:keypress={() => {
         editFunction();
      }}
      on:click={() => {
         editFunction();
      }}
   />
   <!-- svelte-ignore a11y-missing-attribute -->
   <!-- svelte-ignore a11y-missing-content -->
   <a
      role="button"
      tabindex="0"
      use:tooltip={{ content: deleteTooltip }}
      class="{DELETE_ICON}"
      on:keypress={() => {
         deleteFunction();
      }}
      on:click={() => {
         deleteFunction();
      }}
   />
</div>

<style lang="scss">
   .tag {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include label;
      font-weight: bold;
      padding: var(--padding-standard);

      a {
         @include border-left;
         margin-left: var(--padding-standard);
         padding-left: var(--padding-standard);
      }
   }
</style>
