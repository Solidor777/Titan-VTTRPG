<script>
   import { BUILT_IN_THEMES } from '~/theme/ThemeManager.js';
   import { THEME_COLOR_TOKENS, THEME_TOKEN_GROUPS } from '~/theme/ThemeTokenContract.js';
   import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import prettifyTokenName from '~/theme/editor/PrettifyTokenName.js';
   import ThemePreviewPane from '~/theme/editor/ThemePreviewPane.svelte';

   /** @type {object} The singleton theme manager. */
   const themeManager = game.titan.themeManager;

   /** @type {string} The id of the theme currently shown in the editor. */
   let selectedId = $state(themeManager.getActiveTheme().id);

   /** @type {object} A deep editable copy of the selected theme. */
   let draft = $state(structuredClone(themeManager.getTheme(selectedId)));

   /** @type {boolean} Whether the selected theme is a built-in (read-only). */
   const isBuiltIn = $derived(BUILT_IN_THEMES.some((theme) => theme.id === selectedId));

   /** @type {number} Bump counter forcing the theme list to re-read after each mutation. */
   let listBump = $state(0);

   /** @type {object[]} Every selectable theme. */
   const allThemes = $derived.by(() => {
      void listBump;
      return themeManager.getAllThemes();
   });

   /** @type {string[]} The bundled font families offered by the font pickers. */
   const BUNDLED_FONTS = ["'Lato'", "'Open Sans'", "'Signika'"];

   /** @type {HTMLInputElement | undefined} The hidden file input backing the import button. */
   let importInput = $state();

   /**
    * Switches the editor to another theme, discarding the current draft.
    * @param {string} id - The theme id to select.
    */
   function select(id) {
      selectedId = id;
      draft = structuredClone(themeManager.getTheme(id));
   }

   /**
    * Duplicates the selected theme into a new editable custom theme.
    * @returns {Promise<void>} Resolves once the duplicate is stored and selected.
    */
   async function duplicate() {
      /** @type {object} The duplicated theme with a fresh id and a derived name. */
      const copy = $state.snapshot(draft);
      copy.id = `custom-${foundry.utils.randomID(8)}`;
      copy.name = `${draft.name} (Copy)`;
      await themeManager.saveCustomTheme(copy);
      listBump += 1;
      select(copy.id);
   }

   /**
    * Persists the current custom draft.
    * @returns {Promise<void>} Resolves once the theme is stored.
    */
   async function save() {
      await themeManager.saveCustomTheme($state.snapshot(draft));
      listBump += 1;
   }

   /**
    * Deletes the selected custom theme after confirmation.
    */
   function requestDelete() {
      new ConfirmationDialog(
         localize('deleteTheme'),
         [draft.name],
         localize('deleteTheme.confirmation'),
         localize('deleteTheme'),
         async () => {
            await themeManager.deleteCustomTheme(selectedId);
            listBump += 1;
            select('heritage-dark');
         },
      ).render(true);
   }

   /**
    * Resets all custom themes and the theme selection after confirmation.
    */
   function requestReset() {
      new ConfirmationDialog(
         localize('resetThemes'),
         [],
         localize('resetThemes.confirmation'),
         localize('resetThemes'),
         async () => {
            await themeManager.resetThemes();
            listBump += 1;
            select('heritage-dark');
         },
      ).render(true);
   }

   /**
    * Downloads the draft as a theme JSON file.
    */
   function exportTheme() {
      foundry.utils.saveDataToFile(
         themeManager.exportThemeText($state.snapshot(draft)),
         'application/json',
         `titan-theme-${draft.name.slugify()}.json`,
      );
   }

   /**
    * Imports the picked theme file, surfacing validation errors as UI notifications.
    * @returns {Promise<void>} Resolves once the import completes or fails.
    */
   async function importTheme() {
      /** @type {File | undefined} The file chosen in the hidden input. */
      const file = importInput?.files?.[0];
      if (!file) {
         return;
      }
      const text = await foundry.utils.readTextFromFile(file);
      const result = await themeManager.importThemeText(text);
      if (result.ok) {
         listBump += 1;
         select(result.theme.id);
      }
      else {
         ui.notifications.error(`TITAN | ${result.error}`);
      }
      importInput.value = '';
   }
</script>

<div class="theme-editor">
   <header class="toolbar">
      <select
         class="picker"
         value={selectedId}
         onchange={(event) => select(event.target.value)}
      >
         {#each allThemes as theme (theme.id)}
            <option value={theme.id}>{theme.name}</option>
         {/each}
      </select>
      <button onclick={duplicate}>{localize('duplicateTheme')}</button>
      <button
         disabled={isBuiltIn}
         onclick={save}
      >
         {localize('saveTheme')}
      </button>
      <button onclick={exportTheme}>{localize('exportTheme')}</button>
      <button onclick={() => importInput?.click()}>{localize('importTheme')}</button>
      <button
         disabled={isBuiltIn}
         onclick={requestDelete}
      >
         {localize('deleteTheme')}
      </button>
      <button onclick={requestReset}>{localize('resetThemes')}</button>
      <input
         bind:this={importInput}
         accept="application/json"
         class="import-input"
         onchange={importTheme}
         type="file"
      />
   </header>

   <div class="identity">
      <label>
         {localize('themeName')}
         <input
            disabled={isBuiltIn}
            type="text"
            bind:value={draft.name}
         />
      </label>
      <label>
         {localize('darkTheme')}
         <input
            disabled={isBuiltIn}
            type="checkbox"
            bind:checked={draft.dark}
         />
      </label>
   </div>

   <div class="body">
      <div class="groups">
         {#each Object.entries(THEME_TOKEN_GROUPS) as [group, tokens] (group)}
            <section>
               <h3>{localize(`themeGroup.${group}`)}</h3>
               {#each tokens as token (token)}
                  <div class="token-row">
                     <span>{prettifyTokenName(token)}</span>
                     {#if THEME_COLOR_TOKENS.includes(token)}
                        <input
                           disabled={isBuiltIn}
                           type="color"
                           bind:value={draft.tokens[token]}
                        />
                     {:else}
                        <span class="font-inputs">
                           <select
                              disabled={isBuiltIn}
                              bind:value={draft.tokens[token]}
                           >
                              {#each BUNDLED_FONTS as font (font)}
                                 <option value={font}>{font.replaceAll("'", '')}</option>
                              {/each}
                              {#if !BUNDLED_FONTS.includes(draft.tokens[token])}
                                 <option value={draft.tokens[token]}>{draft.tokens[token]}</option>
                              {/if}
                           </select>
                           <input
                              disabled={isBuiltIn}
                              type="text"
                              bind:value={draft.tokens[token]}
                           />
                        </span>
                     {/if}
                  </div>
               {/each}
            </section>
         {/each}
      </div>
      <ThemePreviewPane tokens={draft.tokens}/>
   </div>
</div>

<style lang="scss">
   .theme-editor {
      @include flex-column;

      background: var(--titan-app-background);
      color: var(--titan-app-font-color);
      font-family: var(--titan-font-family-normal), sans-serif;
      height: 100%;
      padding: var(--titan-spacing-large);

      .toolbar {
         @include flex-row;

         gap: var(--titan-spacing-standard);
         width: 100%;

         .picker {
            @include input;

            width: auto;
            flex: 1;
         }

         button {
            @include button;

            width: auto;
         }

         .import-input {
            display: none;
         }
      }

      .identity {
         @include flex-row;

         gap: var(--titan-spacing-large);
         margin: var(--titan-spacing-large) 0;

         label {
            @include flex-row;

            align-items: center;
            gap: var(--titan-spacing-standard);
            font-weight: bold;

            input[type='text'] {
               @include input;

               width: auto;
            }
         }
      }

      .body {
         @include flex-row;

         align-items: stretch;
         flex: 1;
         gap: var(--titan-spacing-large);
         min-height: 0;
         width: 100%;

         .groups {
            flex: 1;
            overflow-y: auto;
            scrollbar-color: var(--titan-scrollbar-color) var(--titan-scrollbar-gutter-color);

            section {
               margin-bottom: var(--titan-spacing-large);

               h3 {
                  border-bottom: 1px solid var(--titan-border-color);
                  margin: 0 0 var(--titan-spacing-standard);
                  padding-bottom: 2px;
               }

               .token-row {
                  @include flex-row;

                  align-items: center;
                  gap: var(--titan-spacing-standard);
                  justify-content: space-between;
                  padding: 2px 0;

                  input[type='color'] {
                     background: none;
                     border: 1px solid var(--titan-border-color);
                     border-radius: var(--titan-tag-border-radius);
                     height: 24px;
                     padding: 0;
                     width: 48px;
                  }

                  .font-inputs {
                     @include flex-row;

                     gap: var(--titan-spacing-standard);

                     select,
                     input {
                        @include input;

                        width: auto;
                     }
                  }
               }
            }
         }
      }
   }
</style>
