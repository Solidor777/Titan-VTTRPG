<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { CREATE_ICON, FOLDER_ICON, LOCK_ICON, UNLOCK_ICON } from '~/system/Icons.js';

   /** @type {import('~/sidebar/tray/EffectTrayState.svelte.js').default} The reactive tray state from context. */
   const trayState = getContext('trayState');

   // The dropdown options: one per visible ActiveEffect compendium. The pack label is already a
   // resolved display name, so it is wrapped as non-localizing TextData to avoid the Text/tooltip
   // layer re-localizing it into a `LOCAL.<name>.text` key.
   /** @type {{ value: string, label: { text: string, localize: false } }[]} The pack-select options. */
   const packOptions = $derived(trayState.compendiums.map((pack) => ({
      value: pack.collection,
      label: { text: pack.metadata.label, localize: false },
   })));

   /** @type {string} The localized aria-label for the New Effect button. */
   const newLabel = localize('effectTrayNew');

   /** @type {string} The localized aria-label for the New Folder button. */
   const newFolderLabel = localize('effectTrayNewFolder');

   /** @type {boolean} Whether the selected pack supports folders (compendium packs do). */
   const supportsFolders = $derived(!!trayState.selectedPack?.folders);

   /** @type {string} The localized aria-label for the lock/unlock toggle, reflecting current state. */
   const lockLabel = $derived(trayState.isLocked ? localize('effectTrayUnlock') : localize('effectTrayLock'));

   /** @type {string} The i18n key for the lock/unlock tooltip, localized once by the tooltip action. */
   const lockTooltipKey = $derived(trayState.isLocked ? 'effectTrayUnlock' : 'effectTrayLock');
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

      <!--New Effect / New Folder / Lock toggle buttons-->
      <div class="effect-tray-header-new">
         <IconButton
            disabled={!trayState.canEdit}
            icon={CREATE_ICON}
            label={newLabel}
            onclick={() => trayState.createBlankEffect()}
            testId="effect-tray-new"
            tooltip={'effectTrayNew'}
         />

         {#if supportsFolders}
            <IconButton
               disabled={!trayState.canEdit}
               icon={FOLDER_ICON}
               label={newFolderLabel}
               onclick={() => trayState.createFolder()}
               testId="effect-tray-new-folder"
               tooltip={'effectTrayNewFolder'}
            />
         {/if}

         {#if trayState.isOwner}
            <IconButton
               icon={trayState.isLocked ? LOCK_ICON : UNLOCK_ICON}
               label={lockLabel}
               onclick={() => trayState.toggleLock()}
               testId="effect-tray-lock"
               tooltip={lockTooltipKey}
            />
         {/if}
      </div>
   </div>

   <!--Filter row (mirrors the actor-sheet tab header)-->
   <div class="effect-tray-filter-row">
      <div class="label">
         {localize('filter')}
      </div>
      <div class="input">
         <TextInput
            testId="effect-tray-search"
            bind:value={trayState.filter}
         />
      </div>
   </div>
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

      .effect-tray-filter-row {
         @include flex-row;
         @include flex-group-center;
         @include margin-top-standard;

         width: 100%;

         .label {
            font-weight: bold;

            @include margin-right-standard;
         }

         .input {
            @include flex-group-left;

            flex: 1;
         }
      }
   }
</style>
