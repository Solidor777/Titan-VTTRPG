<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import {DELETE_ICON, EDIT_ICON} from '~/system/Icons.js';

   /** @type function Callback for when the Delete icon is pressed. */
   export let deleteFunction = void 0;

   /** @type function Callback for when the Edit icon is pressed. */
   export let editFunction = void 0;

   /** @type string The Label to display for this element. */
   export let label = void 0;

   /** @type string The Tooltip to display when the Label is hovered. */
   export let labelTooltip = void 0;

   /** @type string The Tooltip to display when the Delete Icon is hovered. */
   export let deleteTooltip = void 0;

   /** @type string The Tooltip to display when the Edit Icon is hovered. */
   export let editTooltip = void 0;
</script>

<div class="tag">
   <!--Edit Icon-->
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
      use:tooltipAction={editTooltip}
   />

   <!--Label-->
   <div use:tooltipAction={labelTooltip}>
      {label}
   </div>

   <!--Delete Icon-->
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
      use:tooltipAction={deleteTooltip}
   />
</div>

<style lang="scss">
   .tag {
      @include tag;

      :not(:first-child) {
         @include border-left;

         margin-left: var(--titan-padding-standard);
         padding-left: var(--titan-padding-standard);
      }
   }
</style>
