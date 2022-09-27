<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";

   // Document reference
   const document = getContext("DocumentStore");
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="damage-report">
   <!--Header-->
   <div class="header">
      <div class="label">
         <i class="fas fa-bolt" />{localize("damageReport")}
      </div>
      <div class="name">
         {chatContext.actorName}
      </div>
   </div>

   {#if chatContext.ignoreArmor}
      <!--Ignore Armor-->
      <div class="row">
         <div class="label">
            {localize("ignoreArmor")}
         </div>
      </div>
   {:else}
      <!--Base Damage-->
      <div class="row">
         <div class="label">
            {localize("baseDamage")}:
         </div>
         <div class="value">
            {chatContext.baseDamage}
         </div>
      </div>

      <!--Armor-->
      <div class="row">
         <div class="label">
            {localize("armor")}:
         </div>
         <div class="value">
            {chatContext.armor}
         </div>
      </div>
   {/if}

   <!--Damage taken-->
   <div class="row">
      <div class="label">
         {localize("damageTaken")}:
      </div>
      <div class="value">
         {chatContext.damage}
      </div>
   </div>

   <!--Stamina-->
   <div class="row">
      <div class="label">
         {localize("stamina")}:
      </div>
      <div class="value">
         {chatContext.stamina.value} / {chatContext.stamina.maxValue}
      </div>
   </div>

   <!--Wounds-->
   <div class="row">
      <div class="label">
         {localize("wounds")}:
      </div>
      <div class="value">
         {chatContext.wounds.value} / {chatContext.wounds.maxValue}
      </div>
   </div>
</div>

<style lang="scss">
   @import "../styles/Mixins.scss";
   @import "../styles/Variables.scss";

   .damage-report {
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      @include font-size-normal;

      .header {
         @include border;
         width: 100%;
         padding: (0.25rem);
         font-weight: bold;
         background: var(--label-background-color);

         i {
            margin-right: 0.25rem;
         }

         .label {
            @include font-size-large;
         }

         .name {
            @include font-size-normal;
         }
      }

      .row {
         @include flex-row;
         margin-top: 0.5rem;

         .label {
            font-weight: bold;
         }

         .value {
            margin-left: 0.25rem;
         }
      }
   }
</style>
