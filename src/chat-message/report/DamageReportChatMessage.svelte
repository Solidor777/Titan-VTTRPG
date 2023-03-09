<script>
   import { getContext } from 'svelte';
   import { localize } from '~/helpers/utility';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import ChatResource from '~/chat-message/ChatResource.svelte';
   import ReportHeader from '~/chat-message/report/components/ReportHeader.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   // Document reference
   const document = getContext('DocumentStore');
   const chatContext = $document.flags.titan;
</script>

<div class="report">
   <!--Header-->
   <ReportHeader
      icon={'fas fa-burst'}
      label={localize('took%xDamage').replace('%x', chatContext.damageTaken)}
   />

   <!--Damage resisted-->
   {#if chatContext.damageResisted}
      <div class="message">
         {localize('resisted%xDamage').replace(
            '%x',
            chatContext.damageResisted
         )}
      </div>
   {:else if chatContext.ignoredArmor}
      <!--Ignored Armor-->
      <div class="message">{localize('armorIgnored')}</div>
   {/if}

   {#if chatContext.penetrating}
      <div
         class="message"
         use:tooltip={{ content: localize('attack.penetrating.desc') }}
      >
         <Tag label={localize('penetrating')} />
      </div>
   {/if}

   <!--Wounds Suffered-->
   {#if chatContext.woundsSuffered}
      <div class="message">
         {localize('suffered%xWounds').replace(
            '%x',
            chatContext.woundsSuffered
         )}
      </div>
   {/if}

   <!--Stamina-->
   <div class="message">
      <ChatResource
         icon={'fas fa-heart'}
         label={localize('stamina')}
         value={chatContext.stamina.value}
         max={chatContext.stamina.max}
      />
   </div>

   <!--Wounds-->
   <div class="message">
      <ChatResource
         icon={'fas fa-face-head-bandage'}
         label={localize('wounds')}
         value={chatContext.wounds.value}
         max={chatContext.wounds.max}
      />
   </div>
</div>

<style lang="scss">
   @import '../../styles/Mixins.scss';

   .report {
      @include flex-column;
      @include flex-group-top;
      @include font-size-normal;
      width: 100%;
      font-weight: bold;

      .message {
         @include flex-row;
         @include flex-group-center;
         margin-top: 0.5rem;
         flex-wrap: wrap;
         padding-bottom: 0.5rem;

         &:not(:last-child) {
            @include border-bottom;
         }
      }
   }
</style>
