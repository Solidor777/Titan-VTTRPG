<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";

   // Document reference
   const document = getContext("DocumentStore");
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="report">
   <img src={chatContext.actorImg} alt="img" />

   <!--Header-->
   <div class="header">
      <div class="label">
         <i class="fas fa-burst" />{localize("damageReport")}
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
   @import "../../styles/Mixins.scss";

   .report {
      @include flex-column;
      @include flex-group-top;
      @include font-size-normal;
      width: 100%;

      img {
         @include border;
         height: 5rem;
         margin-bottom: 0.5rem;
      }

      .header {
         @include border;
         @include panel-2;
         width: 100%;
         padding: (0.25rem);
         font-weight: bold;

         i {
            margin-right: 0.25rem;
         }

         .label {
            @include font-size-large;
         }

         .name {
            @include font-size-normal;
            margin-top: 0.25rem;
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
