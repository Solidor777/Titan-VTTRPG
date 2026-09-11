<script>
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { exportCompendium } from '~/spreadsheet/io/ExportCompendium.js';

   /**
    * @typedef {object} ExportDialogShellProps
    * @property {CompendiumCollection} pack - The pack to export.
    */

   /** @type {ExportDialogShellProps} */
   const { pack } = $props();

   /** @type {'xlsx'|'csv'} The selected file format. */
   let format = $state('xlsx');

   /** @type {'wide'|'relational'} The selected array layout. */
   let layout = $state('wide');

   /** @type {boolean} Whether an export is currently running (disables the button to prevent a double-click). */
   let exporting = $state(false);

   /**
    * Runs the export, re-enabling the button once the download has been triggered or the export fails.
    * @returns {Promise<void>} Resolves once `exportCompendium` finishes or its rejection is reported.
    */
   async function onExport() {
      exporting = true;
      try {
         await exportCompendium(pack, format, layout);
      } catch (error) {
         ui.notifications.error(`TITAN | ${error.message}`);
      } finally {
         exporting = false;
      }
   }
</script>

<div class="titan-export-dialog">
   <Select
      options={[
         {
            value: 'xlsx',
            label: localize('xlsxFormat') 
         },
         {
            value: 'csv',
            label: localize('csvFormat') 
         },
      ]}
      bind:value={format}
      testId="export-format-select"
   />
   <Select
      options={[
         {
            value: 'wide',
            label: localize('wideLayout') 
         },
         {
            value: 'relational',
            label: localize('relationalLayout') 
         },
      ]}
      bind:value={layout}
      testId="export-layout-select"
   />
   <Button
      disabled={exporting}
      onclick={onExport}
      testId="export-confirm-button"
   >
      {localize('exportToSpreadsheet')}
   </Button>
</div>

<style lang="scss">
   .titan-export-dialog {
      @include flex-column;
      @include padding-standard;

      gap: var(--titan-spacing-standard);
   }
</style>
