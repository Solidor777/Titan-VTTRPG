<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import DocumentOwnerIconButton from '~/document/svelte-components/DocumentOwnerIconButton.svelte';
   import CharacterSheetEffectChecks
      from '~/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectChecks.svelte';
   import {
      DECREMENT_ICON,
      DELETE_ICON,
      INCREMENT_ICON,
      SEND_TO_CHAT_ICON,
      SHEET_ICON,
   } from '~/system/Icons.js';

   /** @type {object} The embedded effect bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The HUD's top-level actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   /** @type {boolean} Whether this entry is a full effect (vs an inert condition). */
   const isEffect = $derived(document.data?.type === 'effect');

   /** @type {string} The entry's description HTML, sourced per subtype. */
   const description = $derived(
      isEffect
         ? (document.data?.description ?? '')
         : (document.data?.flags?.titan?.description ?? ''),
   );

   /** @type {number} The effect's embedded-check count (conditions have none). */
   const checkLength = $derived(isEffect ? (document.data?.system.check.length ?? 0) : 0);

   /**
    * Steps the effect's remaining duration, flooring at zero.
    * @param {number} delta - The signed step.
    * @returns {void}
    */
   function stepDuration(delta) {
      /** @type {number} The current remaining duration. */
      const remaining = document.data?.system.duration.remaining ?? 0;
      document.doc?.update({ system: { duration: { remaining: Math.max(0, remaining + delta) } } });
   }
</script>

<!--Description-->
{#if description !== '' && description !== '<p></p>'}
   <div class="description">
      <RichText value={description}/>
   </div>
{/if}

<!--Embedded checks (context-sourced, mirroring the sheet; the checkLength gate is reactive)-->
{#if checkLength > 0}
   <div class="checks">
      <CharacterSheetEffectChecks/>
   </div>
{/if}

<!--Controls-->
<div class="controls">
   {#if isEffect}
      <IconButton
         icon={INCREMENT_ICON}
         label={localize('increaseDuration')}
         tooltip={'increaseDuration'}
         testId="player-hud-effect-duration-up"
         onclick={() => stepDuration(1)}
      />
      <IconButton
         icon={DECREMENT_ICON}
         label={localize('decreaseDuration')}
         tooltip={'decreaseDuration'}
         testId="player-hud-effect-duration-down"
         onclick={() => stepDuration(-1)}
      />
      <IconButton
         icon={SEND_TO_CHAT_ICON}
         label={localize('sendToChat')}
         tooltip={'sendToChat'}
         testId="player-hud-effect-chat"
         onclick={() => document.doc?.sendToChat()}
      />
   {/if}
   <IconButton
      icon={SHEET_ICON}
      label={localize('openSheet')}
      tooltip={'openSheet'}
      testId="player-hud-effect-sheet"
      onclick={() => document.doc?.sheet.render(true)}
   />
   <DocumentOwnerIconButton
      icon={DELETE_ICON}
      label={localize('deleteEffect')}
      tooltip={'deleteEffect'}
      testId="player-hud-effect-delete"
      onclick={() => sheetDocument.data.system.requestEffectDeletion(document.data?.id)}
   />
</div>

<style lang="scss">
   .description,
   .checks {
      @include margin-top-standard;

      width: 100%;
   }

   .controls {
      @include flex-row;
      @include flex-group-right;
      @include margin-top-standard;

      width: 100%;
      gap: var(--titan-spacing-standard);
   }
</style>
