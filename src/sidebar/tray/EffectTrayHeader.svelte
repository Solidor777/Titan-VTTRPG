<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { CREATE_ICON } from '~/system/Icons.js';

   /** @type {object} The reactive tray state from context. */
   const trayState = getContext('trayState');

   // The dropdown options: one per visible ActiveEffect compendium.
   /** @type {{ value: string, label: string }[]} The pack-select options. */
   const packOptions = $derived(trayState.compendiums.map((pack) => ({
      value: pack.collection,
      label: pack.metadata.label,
   })));

   /** @type {string} The localized label for the New Effect button. */
   const newLabel = localize('effectTrayNew');
</script>

<div class="effect-tray-header">
   <div class="effect-tray-header-row">
      <Select
         disabled={packOptions.length === 0}
         onchange={() => trayState.selectPack(trayState.selectedPackId)}
         options={packOptions}
         testId="effect-tray-pack-select"
         bind:value={trayState.selectedPackId}
      />

      <!--New Effect button-->
      <div class="effect-tray-header-new">
         <IconButton
            disabled={!trayState.canEdit}
            icon={CREATE_ICON}
            label={newLabel}
            onclick={() => trayState.createBlankEffect()}
            testId="effect-tray-new"
            tooltip={newLabel}
         />
      </div>
   </div>
   <input
      class="effect-tray-search"
      data-testid="effect-tray-search"
      placeholder={localize('effectTraySearch')}
      type="text"
      bind:value={trayState.filter}
   />
</div>

<style lang="scss">
   .effect-tray-header {
      @include flex-column;
      @include flex-group-top;
      @include padding-standard;

      width: 100%;

      .effect-tray-header-row {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         .effect-tray-header-new {
            @include margin-left-standard;
         }
      }

      .effect-tray-search {
         @include input;
         @include margin-top-standard;

         width: 100%;
      }
   }
</style>
