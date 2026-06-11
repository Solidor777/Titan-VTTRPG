<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import {
      INSPIRATION_ICON,
      LONG_REST_ICON,
      SHORT_REST_ICON,
      SPEND_RESOLVE_ICON,
   } from '~/system/Icons.js';

   /** @type {object} The primary actor bridge. */
   const document = getContext('document');

   /** @type {boolean} Whether the actor is a Player (inspiration is Player-only). */
   const isPlayer = $derived(document.data.type === 'player');
</script>

<div class="utility-row">
   <IconButton
      icon={SPEND_RESOLVE_ICON}
      label={localize('spendResolve')}
      tooltip={'spendResolve'}
      testId="player-hud-spend-resolve"
      onclick={() => document.data.system.spendResolve(1)}
   />
   {#if isPlayer}
      <IconButton
         icon={INSPIRATION_ICON}
         label={localize('toggleInspiration')}
         tooltip={'toggleInspiration'}
         testId="player-hud-toggle-inspiration"
         onclick={() => document.data.system.toggleInspiration()}
      />
   {/if}
   <IconButton
      icon={SHORT_REST_ICON}
      label={localize('shortRest')}
      tooltip={'shortRest'}
      testId="player-hud-short-rest"
      onclick={() => document.data.system.shortRest({})}
   />
   <IconButton
      icon={LONG_REST_ICON}
      label={localize('longRest')}
      tooltip={'longRest'}
      testId="player-hud-long-rest"
      onclick={() => document.data.system.longRest({})}
   />
   <IconButton
      icon={'fas fa-rotate-left'}
      label={localize('removeCombatEffects')}
      tooltip={'removeCombatEffects'}
      testId="player-hud-remove-combat-effects"
      onclick={() => document.data.system.removeCombatEffects({})}
   />
</div>

<style lang="scss">
   .utility-row {
      @include flex-row;
      @include flex-group-center;

      width: 100%;
      gap: var(--titan-spacing-standard);
   }
</style>
