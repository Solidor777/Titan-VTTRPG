<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { DELETE_ICON, EDIT_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} EditDeleteTagProps
    * @property {Function} [deleteFunction] - Callback for when the Delete button is clicked.
    * @property {Function} [editFunction] - Callback for when the Edit button is clicked.
    * @property {string} [label] - The text to display for this element.
    * @property {string} [labelTooltip] - The tooltip to display when the Label is hovered.
    * @property {string} [deleteTooltip] - The tooltip to display when the Delete Icon is hovered.
    * @property {string} [editTooltip] - The tooltip to display when the Edit Icon is hovered.
    */

   /** @type {EditDeleteTagProps} */
   let {
      deleteFunction = undefined,
      editFunction = undefined,
      label = undefined,
      labelTooltip = undefined,
      deleteTooltip = undefined,
      editTooltip = undefined,
   } = $props();
</script>

<div class="tag">
   <!--Edit Icon-->
   <!-- svelte-ignore a11y-missing-attribute -->
   <!-- svelte-ignore a11y-missing-content -->
   <a
      aria-label="Edit"
      class={EDIT_ICON}
      onclick={() => {
         editFunction();
      }}
      onkeypress={() => {
         editFunction();
      }}
      role="button"
      tabindex="0"
      use:tooltipAction={editTooltip}
   ></a>

   <!--Label-->
   <div use:tooltipAction={labelTooltip}>
      {label}
   </div>

   <!--Delete Icon-->
   <!-- svelte-ignore a11y-missing-attribute -->
   <!-- svelte-ignore a11y-missing-content -->
   <a
      aria-label="Delete"
      class={DELETE_ICON}
      onclick={() => {
         deleteFunction();
      }}
      onkeypress={() => {
         deleteFunction();
      }}
      role="button"
      tabindex="0"
      use:tooltipAction={deleteTooltip}
   ></a>
</div>

<style lang="scss">
   .tag {
      @include tag;

      :not(:first-child) {
         @include separator-left;
      }
   }
</style>
