<script>
   import { getContext } from 'svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import getSetting from '~/helpers/utility-functions/GetSetting.js';
   import playerHudOptions from '~/helpers/Settings/PlayerHudOptions.js';

   /** @type {PlayerHudSettingsApplication} The owning settings application. */
   const application = getContext('application');

   /** @type {object} A live, editable copy of the effective HUD options. */
   const options = $state(playerHudOptions());

   /** @type {boolean} Mirror of the master enable setting. */
   let hudEnabled = $state(getSetting('enablePlayerHud'));

   /** @type {boolean} Mirror of the hotbar visibility setting. */
   let hotbarShown = $state(getSetting('showFoundryHotbar'));

   /** @type {Array<{key: string, labelKey: string}>} The action-menu categories, in display order. */
   const categories = [
      { key: 'skills', labelKey: 'skills' },
      { key: 'resistances', labelKey: 'resistances' },
      { key: 'weapons', labelKey: 'weapons' },
      { key: 'inventory', labelKey: 'inventory' },
      { key: 'abilities', labelKey: 'abilities' },
      { key: 'spells', labelKey: 'spells' },
      { key: 'effects', labelKey: 'effects' },
      { key: 'utility', labelKey: 'utility' },
   ];

   /** @type {Array<{key: string, labelKey: string}>} The per-type sub-button gates. */
   const subButtons = [
      { key: 'attacks', labelKey: 'attacks' },
      { key: 'checks', labelKey: 'checks' },
      { key: 'equipped', labelKey: 'equipped' },
      { key: 'quantity', labelKey: 'quantity' },
      { key: 'duration', labelKey: 'duration' },
      { key: 'remove', labelKey: 'deleteEffect' },
      { key: 'sendToChat', labelKey: 'sendToChat' },
      { key: 'openSheet', labelKey: 'openSheet' },
   ];

   /** @type {Array<{key: string, labelKey: string}>} The content filters. */
   const filters = [
      { key: 'weaponsWithActions', labelKey: 'filterWeaponsWithActions' },
      { key: 'inventoryWithChecks', labelKey: 'filterInventoryWithChecks' },
      { key: 'abilitiesWithChecks', labelKey: 'filterAbilitiesWithChecks' },
      { key: 'effectsWithChecks', labelKey: 'filterEffectsWithChecks' },
   ];

   /**
    * Persists the edited options object.
    * @returns {Promise<void>} Resolves once the setting write lands.
    */
   async function save() {
      await game.settings.set('titan', 'playerHudOptions', $state.snapshot(options));
   }

   /**
    * Persists the master enable setting from its mirror.
    * @returns {Promise<void>} Resolves once the setting write lands.
    */
   async function saveEnabled() {
      await game.settings.set('titan', 'enablePlayerHud', hudEnabled);
   }

   /**
    * Persists the hotbar visibility setting from its mirror.
    * @returns {Promise<void>} Resolves once the setting write lands.
    */
   async function saveHotbar() {
      await game.settings.set('titan', 'showFoundryHotbar', hotbarShown);
   }

   /**
    * Enters layout-edit mode and closes this window so the HUD is unobstructed.
    * @returns {void}
    */
   function editLayout() {
      game.titan?.playerHud?.toggleEditMode();
      application.close();
   }

   /**
    * Restores the default element layout (positions, sizes, minimized states).
    * @returns {void}
    */
   function resetLayout() {
      game.titan?.playerHud?.resetLayout();
   }

   /**
    * Restores every Player HUD setting and the layout to factory defaults.
    * @returns {Promise<void>} Resolves once all setting writes land.
    */
   async function resetAll() {
      await game.settings.set('titan', 'playerHudOptions', {});
      await game.settings.set('titan', 'showFoundryHotbar', false);
      await game.settings.set('titan', 'enablePlayerHud', true);
      game.titan?.playerHud?.resetLayout();
      Object.assign(options, playerHudOptions());
      hudEnabled = true;
      hotbarShown = false;
   }
</script>

<div class="settings">
   <!--General-->
   <div class="group">
      <div class="group-title">{localize('general')}</div>
      <label>
         <input
            type="checkbox"
            bind:checked={hudEnabled}
            data-testid="player-hud-settings-general-enable"
            onchange={saveEnabled}
         />
         {localize('playerHud')}
      </label>
      <label>
         <input
            type="checkbox"
            bind:checked={hotbarShown}
            data-testid="player-hud-settings-general-hotbar"
            onchange={saveHotbar}
         />
         {localize('showFoundryHotbar')}
      </label>
      <button
         type="button"
         data-testid="player-hud-settings-general-edit-layout"
         onclick={editLayout}
      >
         {localize('editLayout')}
      </button>
   </div>

   <!--Portrait-->
   <div class="group">
      <div class="group-title">{localize('portrait')}</div>
      <label>
         <input
            type="checkbox"
            bind:checked={options.portrait.enabled}
            data-testid="player-hud-settings-portrait-enabled"
            onchange={save}
         />
         {localize('enabled')}
      </label>
      <label>
         <input
            type="checkbox"
            bind:checked={options.portrait.combatOnly}
            data-testid="player-hud-settings-portrait-combat-only"
            onchange={save}
         />
         {localize('onlyShowInCombat')}
      </label>
      <label>
         {localize('style')}
         <select
            bind:value={options.portrait.style}
            data-testid="player-hud-settings-portrait-style"
            onchange={save}
         >
            <option value="panelCard">{localize('panelCard')}</option>
            <option value="roundToken">{localize('roundToken')}</option>
            <option value="wideStrip">{localize('wideStrip')}</option>
         </select>
      </label>
   </div>

   <!--Action menu-->
   <div class="group">
      <div class="group-title">{localize('actionMenu')}</div>
      <label>
         <input
            type="checkbox"
            bind:checked={options.actionMenu.enabled}
            data-testid="player-hud-settings-menu-enabled"
            onchange={save}
         />
         {localize('enabled')}
      </label>
      <label>
         <input
            type="checkbox"
            bind:checked={options.actionMenu.combatOnly}
            data-testid="player-hud-settings-menu-combat-only"
            onchange={save}
         />
         {localize('onlyShowInCombat')}
      </label>
      <label>
         {localize('layout')}
         <select
            bind:value={options.actionMenu.layout}
            data-testid="player-hud-settings-menu-layout"
            onchange={save}
         >
            <option value="vertical">{localize('vertical')}</option>
            <option value="horizontal">{localize('horizontal')}</option>
         </select>
      </label>
      {#if options.actionMenu.layout === 'vertical'}
         <!--Vertical sub-buttons follow the sub-option direction, so only one control is shown.-->
         <label>
            {localize('subOptionDirection')}
            <select
               bind:value={options.actionMenu.directions.vertical.subOptions}
               data-testid="player-hud-settings-menu-sub-options-direction"
               onchange={save}
            >
               <option value="left">{localize('expandLeft')}</option>
               <option value="right">{localize('expandRight')}</option>
            </select>
         </label>
         <label>
            {localize('subOptionFlow')}
            <select
               bind:value={options.actionMenu.directions.vertical.subOptionsFlow}
               data-testid="player-hud-settings-menu-sub-options-flow"
               onchange={save}
            >
               <option value="down">{localize('expandDown')}</option>
               <option value="up">{localize('expandUp')}</option>
            </select>
         </label>
      {:else}
         <label>
            {localize('subOptionDirection')}
            <select
               bind:value={options.actionMenu.directions.horizontal.subOptions}
               data-testid="player-hud-settings-menu-sub-options-direction"
               onchange={save}
            >
               <option value="up">{localize('expandUp')}</option>
               <option value="down">{localize('expandDown')}</option>
            </select>
         </label>
         <label>
            {localize('subButtonDirection')}
            <select
               bind:value={options.actionMenu.directions.horizontal.subButtons}
               data-testid="player-hud-settings-menu-sub-buttons-direction"
               onchange={save}
            >
               <option value="left">{localize('expandLeft')}</option>
               <option value="right">{localize('expandRight')}</option>
            </select>
         </label>
      {/if}
      <label>
         {localize('visibleSubOptions')}
         <span class="number-field">
            <IntegerInput
               bind:value={options.actionMenu.windowSize}
               max={20}
               min={3}
               onchange={save}
               testId="player-hud-settings-menu-window-size"
            />
         </span>
      </label>

      <div class="sub-title">{localize('categories')}</div>
      <div class="checkbox-grid">
         {#each categories as category (category.key)}
            <label>
               <input
                  type="checkbox"
                  bind:checked={options.actionMenu.categories[category.key]}
                  data-testid={`player-hud-settings-menu-category-${category.key}`}
                  onchange={save}
               />
               {localize(category.labelKey)}
            </label>
         {/each}
      </div>

      <div class="sub-title">{localize('subButtons')}</div>
      <div class="checkbox-grid">
         {#each subButtons as subButton (subButton.key)}
            <label>
               <input
                  type="checkbox"
                  bind:checked={options.actionMenu.subButtons[subButton.key]}
                  data-testid={`player-hud-settings-menu-sub-button-${subButton.key}`}
                  onchange={save}
               />
               {localize(subButton.labelKey)}
            </label>
         {/each}
      </div>

      <div class="sub-title">{localize('filters')}</div>
      {#each filters as filter (filter.key)}
         <label>
            <input
               type="checkbox"
               bind:checked={options.actionMenu.filters[filter.key]}
               data-testid={`player-hud-settings-menu-filter-${filter.key}`}
               onchange={save}
            />
            {localize(filter.labelKey)}
         </label>
      {/each}
   </div>

   <!--Effects panel-->
   <div class="group">
      <div class="group-title">{localize('effects')}</div>
      <label>
         <input
            type="checkbox"
            bind:checked={options.effectsPanel.enabled}
            data-testid="player-hud-settings-effects-enabled"
            onchange={save}
         />
         {localize('enabled')}
      </label>
      <label>
         <input
            type="checkbox"
            bind:checked={options.effectsPanel.combatOnly}
            data-testid="player-hud-settings-effects-combat-only"
            onchange={save}
         />
         {localize('onlyShowInCombat')}
      </label>
      <label>
         {localize('style')}
         <select
            bind:value={options.effectsPanel.style}
            data-testid="player-hud-settings-effects-style"
            onchange={save}
         >
            <option value="list">{localize('listPanel')}</option>
            <option value="tray">{localize('iconTray')}</option>
         </select>
      </label>
   </div>

   <!--Danger zone-->
   <div class="group">
      <div class="group-title">{localize('dangerZone')}</div>
      <div class="button-row">
         <button
            type="button"
            data-testid="player-hud-settings-reset-layout"
            onclick={resetLayout}
         >
            {localize('resetLayout')}
         </button>
         <button
            type="button"
            data-testid="player-hud-settings-reset-all"
            onclick={resetAll}
         >
            {localize('resetAllDefaults')}
         </button>
      </div>
   </div>
</div>

<style lang="scss">
   .settings {
      @include panel-1;
      @include padding-standard;
      @include flex-column;
      @include flex-group-top;
      @include font-size-small;

      width: 100%;
      height: 100%;
      gap: var(--titan-spacing-large);
      overflow-y: auto;

      .group {
         @include panel-2;
         @include padding-standard;
         @include flex-column;
         @include flex-group-top;

         width: 100%;
         gap: var(--titan-spacing-standard);
         border-radius: var(--titan-border-radius);

         .group-title {
            width: 100%;
            text-transform: uppercase;
            opacity: 0.7;
         }

         .sub-title {
            @include margin-top-standard;

            width: 100%;
            opacity: 0.7;
         }

         label {
            @include flex-row;
            @include flex-group-left;

            width: 100%;
            gap: var(--titan-spacing-standard);

            select,
            .number-field {
               margin-left: auto;
               max-width: 180px;
            }
         }

         .checkbox-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            width: 100%;
            gap: 2px var(--titan-spacing-standard);

            label {
               width: auto;
            }
         }

         .button-row {
            @include flex-row;
            @include flex-group-left;

            width: 100%;
            gap: var(--titan-spacing-standard);
         }

         button {
            @include panel-3;
            @include padding-standard;

            border: none;
            border-radius: var(--titan-border-radius);
            color: inherit;
            cursor: pointer;
         }
      }
   }
</style>
