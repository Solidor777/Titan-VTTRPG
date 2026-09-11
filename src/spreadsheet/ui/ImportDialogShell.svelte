<script>
   import { untrack } from 'svelte';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { planImport } from '~/spreadsheet/io/PlanImport.js';
   import { applyImport } from '~/spreadsheet/io/ApplyImport.js';

   /**
    * @typedef {object} ImportDialogShellProps
    * @property {CompendiumCollection|null} initialPack - The preselected target pack, or null.
    */

   /** @type {ImportDialogShellProps} */
   const { initialPack } = $props();

   /** @type {'existing'|'new'} Whether to target an existing pack or create a new compendium. */
   let targetMode = $state(untrack(() => (initialPack ? 'existing' : 'new')));

   /** @type {string} The collection id of the selected existing pack. */
   let targetCollection = $state(untrack(() => initialPack?.collection ?? ''));

   /** @type {string} The label for a newly created compendium. */
   let newCompendiumLabel = $state('');

   /** @type {boolean} Whether pack documents absent from the file should be deleted. */
   let deleteMissing = $state(false);

   /** @type {File[]} The currently selected files. */
   let selectedFiles = $state([]);

   /** @type {import('~/spreadsheet/io/PlanImport.js').ImportPlan|null} The last computed plan, if any. */
   let plan = $state(null);

   /** @type {boolean} Whether planning or applying is currently running. */
   let busy = $state(false);

   /** @type {Array<{value:string,label:string}>} Every pack whose type is known once a plan has run. */
   const packOptions = $derived(
      game.packs
         .filter((pack) => !plan || pack.metadata.type === plan.packType)
         .map((pack) => ({
            value: pack.collection,
            label: pack.metadata.label,
         })),
   );

   // A stored plan is only valid against the target pack and options it was computed with; Apply must stay
   // disabled (plan cleared) whenever the target pack or delete-missing option no longer matches the plan.
   $effect(() => {
      targetCollection;
      deleteMissing;
      plan = null;
   });

   /**
    * Reads the chosen files from the native file input into local state, clearing any stale plan.
    * @param {Event} event - The file input's change event.
    * @returns {void}
    */
   function onFilesChosen(event) {
      selectedFiles = [...event.target.files];
      plan = null;
   }

   /**
    * Resolves the current target pack from the selected collection id.
    * @returns {CompendiumCollection|null} The target pack, or null when targeting a new compendium.
    */
   function resolveTargetPack() {
      return targetMode === 'existing' ? game.packs.get(targetCollection) ?? null : null;
   }

   /**
    * Runs planImport against the current selections and stores the resulting plan. A thrown planning
    * error (e.g. a file whose manifest names a packType that is not a real document type) is reported
    * via ui.notifications.error rather than left to strand the dialog in its busy state.
    * @returns {Promise<void>} Resolves once the plan attempt (success or failure) has been handled.
    */
   async function onPreview() {
      busy = true;
      try {
         plan = await planImport(selectedFiles, resolveTargetPack(), deleteMissing);
      }
      catch (error) {
         plan = null;
         ui.notifications.error(`TITAN | ${error.message}`);
      }
      finally {
         busy = false;
      }
   }

   /**
    * Applies the current plan, reporting the outcome and resetting the file selection on success. A
    * thrown ApplyImport error (e.g. a genuinely missing embedded-document parent) is reported via
    * ui.notifications.error rather than left to leave the Apply button stuck disabled.
    * @returns {Promise<void>} Resolves once the apply attempt (success or failure) has been handled.
    */
   async function onApply() {
      busy = true;
      try {
         /** @type {{created:number, updated:number, deleted:number}} */
         const result = await applyImport(plan, resolveTargetPack(), newCompendiumLabel);
         ui.notifications.info(game.i18n.format('LOCAL.importSpreadsheetComplete.text', {
            created: result.created,
            updated: result.updated,
            deleted: result.deleted,
         }));
      }
      catch (error) {
         ui.notifications.error(`TITAN | ${error.message}`);
         return;
      }
      finally {
         busy = false;
      }
      plan = null;
      selectedFiles = [];
   }
</script>

<div class="titan-import-dialog">
   <input
      accept=".xlsx,.csv,.zip"
      data-testid="import-file-input"
      multiple
      onchange={onFilesChosen}
      type="file"
   />

   <Select
      options={[
         {
            value: 'existing',
            label: localize('importIntoExisting'),
         },
         {
            value: 'new',
            label: localize('importIntoNew'),
         },
      ]}
      bind:value={targetMode}
      testId="import-target-mode-select"
   />

   {#if targetMode === 'existing'}
      <Select
         options={packOptions}
         bind:value={targetCollection}
         testId="import-target-pack-select"
      />
   {:else}
      <input
         bind:value={newCompendiumLabel}
         data-testid="import-new-label-input"
         placeholder={localize('newCompendiumLabel')}
         type="text"
      />
   {/if}

   <label>
      <CheckboxInput
         bind:value={deleteMissing}
         testId="import-delete-missing-checkbox"
      />
      <Text text={localize('deletePackDocumentsAbsentFromFile')} />
   </label>

   <Button
      disabled={busy || selectedFiles.length === 0}
      onclick={onPreview}
      testId="import-preview-button"
   >
      {localize('previewImport')}
   </Button>

   {#if plan}
      <div class="titan-import-preview" data-testid="import-preview-summary">
         <Text
            text={game.i18n.format('LOCAL.importPlanSummary.text', {
               creates: plan.creates.length,
               updates: plan.updates.length,
               deletes: plan.deletes.length,
            })}
         />
         {#if plan.errors.length > 0}
            <ul>
               {#each plan.errors as error (error.sheet + error.row + error.column)}
                  <li>{error.sheet} row {error.row}: {error.message}</li>
               {/each}
            </ul>
         {/if}
      </div>
      <Button
         disabled={busy || plan.errors.length > 0}
         onclick={onApply}
         testId="import-apply-button"
      >
         {localize('applyImport')}
      </Button>
   {/if}
</div>

<style lang="scss">
   .titan-import-dialog {
      @include flex-column;
      @include padding-standard;

      gap: var(--titan-spacing-standard);
   }

   .titan-import-preview ul {
      @include flex-column;

      color: var(--titan-failed-font-color);
      gap: var(--titan-spacing-standard);
      max-height: 200px;
      overflow-y: auto;
   }
</style>
