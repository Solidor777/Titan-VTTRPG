<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import ResistanceTag from '~/helpers/svelte-components/tag/ResistanceTag.svelte';

   /** @type string The Resistance to associate with the tag. */
   export let resistance = void 0;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<ResistanceTag {resistance} {tooltip}>
   <!--Label-->
   <div class="label">
      {localize('resistedBy')}
   </div>

   <!--Resistance-->
   <div class="resistance">
      {localize(resistance)}
   </div>
</ResistanceTag>

<style lang="scss">
   .label {
      @include border-right;

      font-weight: bold;
      padding-right: var(--titan-padding-standard);
      margin-right: var(--titan-padding-standard);
   }
</style>
