<script>
   import { getContext } from 'svelte';
   import getApplication from '~/helpers/utility-functions/GetApplication.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { EDIT_TOKEN_ICON, IMPORT_ICON, LINKED_ICON, UNLINKED_ICON } from '~/system/Icons.js';

   /** @type {object} The reactive Document bridge shared via context. */
   const document = getContext('document');

   /** @type {import('./TitanActorSheet.js').default} The owning Actor sheet. */
   const application = getApplication();

   /** @type {TokenDocument | null} The active Token, or null for a directory Actor. Stable per sheet. */
   const token = application.token;

   /** @type {boolean} Whether the active user may configure this Actor's tokens. */
   const canEditToken = game.user.isGM || (application.actor.isOwner && game.user.can('TOKEN_CONFIGURE'));

   /** @type {boolean} Whether the active user may import this Actor from its compendium pack. */
   const canImport = game.user.isGM && !!application.actor.pack;
</script>

{#if canImport}
   <!-- Import Actor -->
   <button aria-label={localize('importActor')}
           class="header-control icon titan-header-button import-actor-button"
           onclick={() => application._onImportActor()}
           use:tooltipAction={'importActorToWorld'}
   >
      <i class={IMPORT_ICON}></i>
   </button>
{/if}

{#if canEditToken}
   <!-- Edit Token: tooltip reflects whether edits affect linked instances -->
   <button aria-label={localize('editToken')}
           class="header-control icon titan-header-button edit-token-button"
           onclick={() => application._onEditToken()}
           use:tooltipAction={
              (token?.actorLink || (token === null && document.data.prototypeToken?.actorLink))
                 ? 'editLinkedToken.desc'
                 : 'editUnlinkedToken.desc'
           }
   >
      <i class={EDIT_TOKEN_ICON}></i>
   </button>

   {#if token === null}
      <!-- Directory Actor: toggle the prototype token link (reactive icon + tooltip + glow) -->
      <button aria-label={localize('toggleTokenLink')}
              class="header-control icon titan-header-button toggle-token-linked-button"
              onclick={() => application._onToggleTokenLink()}
              use:tooltipAction={
                 document.data.prototypeToken?.actorLink
                    ? 'toggleTokenUnlinkedButton.desc'
                    : 'toggleTokenLinkedButton.desc'
              }
      >
         <i
            class={document.data.prototypeToken?.actorLink
               ? `linked ${LINKED_ICON}`
               : `unlinked ${UNLINKED_ICON}`}
         ></i>
      </button>
   {:else if token.actorLink === true}
      <!-- Placed, linked Token: irreversible unlink -->
      <button aria-label={localize('unlinkToken')}
              class="header-control icon titan-header-button unlink-token-button"
              onclick={() => application._onUnlinkToken()}
              use:tooltipAction={'unlinkTokenButton.desc'}
      >
         <i class="linked {LINKED_ICON}"></i>
      </button>
   {:else}
      <!-- Placed, already-unlinked Token: informational (disabled) -->
      <div class="inactive-button" use:tooltipAction={'unlinkedTokenButton.desc'}>
         <button aria-label={localize('tokenUnlinked')}
                 class="header-control icon titan-header-button unlinked-token-button"
                 disabled={true}
         >
            <i class="unlinked {UNLINKED_ICON}"></i>
         </button>
      </div>
   {/if}
{/if}

<style lang="scss">
   .linked {
      color: darkorange;
      text-shadow: 0 0 8px darkorange;
   }

   .unlinked {
      color: brown;
      text-shadow: 0 0 8px brown;
   }

   .inactive-button {
      cursor: not-allowed;
   }
</style>
