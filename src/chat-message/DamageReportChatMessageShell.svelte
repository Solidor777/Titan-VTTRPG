<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

   // Document reference
   const document = getContext("DocumentSheetObject");
   const chatContext = $document.flags.titan.data.chatContext;
</script>

<div class="damage-report">
   <!--Header-->
   <div class="header">
      <div class="label">
         <i class="fas fa-bolt" />{localize("LOCAL.damageReport.label")}
      </div>
      <div class="name">
         {chatContext.actorName}
      </div>
   </div>

   {#if chatContext.ignoreArmor}
      <!--Ignore Armor-->
      <div class="row">
         <div class="label">
            {localize("LOCAL.ignoreArmor.label")}
         </div>
      </div>
   {:else}
      <!--Base Damage-->
      <div class="row">
         <div class="label">
            {localize("LOCAL.baseDamage.label")}:
         </div>
         <div class="value">
            {chatContext.baseDamage}
         </div>
      </div>

      <!--Armor-->
      <div class="row">
         <div class="label">
            {localize("LOCAL.armor.label")}:
         </div>
         <div class="value">
            {chatContext.armor}
         </div>
      </div>
   {/if}

   <!--Damage taken-->
   <div class="row">
      <div class="label">
         {localize("LOCAL.damageTaken.label")}:
      </div>
      <div class="value">
         {chatContext.damage}
      </div>
   </div>

   <!--Stamina-->
   <div class="row">
      <div class="label">
         {localize("LOCAL.stamina.label")}:
      </div>
      <div class="value">
         {chatContext.stamina.value} / {chatContext.stamina.maxValue}
      </div>
   </div>

   <!--Wounds-->
   <div class="row">
      <div class="label">
         {localize("LOCAL.wounds.label")}:
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
      font-size: 1rem;

      .header {
         @include border;
         width: 100%;
         padding: (0.25rem);
         font-weight: bold;
         background-color: var(--label-background-color);

         i {
            margin-right: 0.25rem;
         }

         .label {
            font-size: 1.25rem;
         }

         .name {
            font-size: 1.1rem;
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
