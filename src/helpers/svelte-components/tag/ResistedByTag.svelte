<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import ResistanceTag from '~/helpers/svelte-components/tag/ResistanceTag.svelte';

   /**
    * @typedef {object} ResistedByTagProps
    * @property {string} [resistance] - The resistance type (e.g. `'reflexes'`, `'resilience'`, `'willpower'`).
    * @property {string | TooltipAction} [tooltip] - The tooltip to display on hover, if any.
    * @property {string} [testId] - Optional test identifier forwarded to the root element of ResistanceTag.
    */

   /** @type {ResistedByTagProps} */
   let { resistance = void 0, tooltip = void 0, testId = void 0 } = $props();
</script>

<ResistanceTag {resistance} {tooltip} {testId}>
   <!--Label-->
   <div class="label">
      {localize('resistedBy')}
   </div>

   <!--Resistance-->
   <div class="stat">
      {localize(resistance)}
   </div>
</ResistanceTag>

<style lang="scss">
   .label {
      @include border-right;

      font-weight: bold;

      @include padding-right-standard;
      @include margin-right-standard;
   }
</style>
