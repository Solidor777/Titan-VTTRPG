<script>
   import { UNLINKED_ICON } from '~/system/Icons.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
</script>

<!--Unlink Button-->
<div class="inactive-button" use:tooltipAction={'unlinkedTokenButton.desc'}>
   <button aria-label="Token Unlinked" class="header-control icon" disabled={true}>
      <i class="unlinked {UNLINKED_ICON}"></i>
   </button>
</div>


<style lang="scss">
   .inactive-button {
      cursor: not-allowed;

      .unlinked {
         color: brown;
         text-shadow: 0 0 8px brown;
      }
   }
</style>
