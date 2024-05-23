<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';

   export let skill = 'athletics';
   export let attribute = '';

   // Reference to the docuement
   const document = getContext('document');
</script>

<!--Dice Pool-->
<div class="expertise {attribute}">
   <!--Label-->
   <div class="label">
      <i class="{EXPERTISE_ICON}"/>
      {localize('expertise')}:
   </div>

   <!--Value-->
   <div class="value">
      {$document.system.skill[skill].expertise.value}
   </div>
</div>

<style lang="scss">
   .expertise {
      @include flex-row;
      @include flex-group-center;
      @include border;
      @include attribute-colors;

      padding: var(--padding-standard);

      .label {
         margin-right: var(--padding-standard);
      }
   }
</style>
