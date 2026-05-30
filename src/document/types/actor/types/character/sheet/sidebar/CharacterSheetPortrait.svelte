<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import DocumentImagePicker from '~/document/svelte-components/input/DocumentImagePicker.svelte';
   import {
      LONG_REST_ICON,
      REMOVE_TEMP_EFFECTS_ICON,
      SHORT_REST_ICON,
      SPEND_RESOLVE_ICON,
   } from '~/system/Icons.js';
   import DocumentOwnerIconButton from '~/document/svelte-components/DocumentOwnerIconButton.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div class="portrait">
   <!--Image Picker-->
   <div class="image">
      <DocumentImagePicker alt={'character portrait'} bind:value={document.data.img}/>
   </div>

   <!--Buttons for managing resources-->
   <div class="buttons">
      <!--Take a Long Rest Button-->
      <div
         class="button"
         use:tooltipAction={'longRest.desc'}
      >
         <DocumentOwnerIconButton
            icon={LONG_REST_ICON}
            label={localize('longRest')}
            onclick={() => {
            document.data.system.longRest();
         }}
         />
      </div>

      <!--Take a Short Rest Button-->
      <div
         class="button"
         use:tooltipAction={'shortRest.desc'}
      >
         <DocumentOwnerIconButton
            icon={SHORT_REST_ICON}
            label={localize('shortRest')}
            onclick={() => {
            document.data.system.shortRest();
         }}
         />
      </div>

      <!--Remove Combat Effects button-->
      <div
         class="button"
         use:tooltipAction={'removeCombatEffects.desc'}
      >
         <DocumentOwnerIconButton
            icon={REMOVE_TEMP_EFFECTS_ICON}
            label={localize('removeCombatEffects')}
            onclick={() => {
            document.data.system.removeCombatEffects();
         }}
         />
      </div>

      <!--Spend Resolve button-->
      <div
         class="button"
         use:tooltipAction={{
            text: 'spend{x}Resolve',
            format: {x: 1}
         }}
      >
         <DocumentOwnerIconButton
            icon={SPEND_RESOLVE_ICON}
            label={localize('spendResolve')}
            onclick={() => {
            document.data.system.spendResolve(1);
         }}
         />
      </div>
   </div>
</div>

<style lang="scss">
   .portrait {
      @include flex-row;
      @include flex-group-center;

      width: 100%;
      height: 100%;

      .image {
         width: 160px;

         --titan-border-style: none;
      }

      .buttons {
         @include flex-column;
         @include flex-space-between;
         @include border-left;
         @include padding-left-standard;

         height: 160px;
      }
   }
</style>
