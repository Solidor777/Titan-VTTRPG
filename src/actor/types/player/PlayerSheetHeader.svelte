<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import DocumentName from "~/documents/components/input/DocumentNameInput.svelte";
   import CharacterAttribute from "~/actor/types/character/sheet/sidebar/CharacterAttribute.svelte";
   import CharacterResistance from "~/actor/types/character/sheet/sidebar/CharacterResistance.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
</script>

<div class="header">
   <!--Name and XP-->
   <div class="row">
      <!--Character name Sheet-->
      <div class="actor-name">
         <DocumentName />
      </div>

      <!--Exp-->
      <div class="xp">
         <!--Available-->
         <div class="available" data-tooltip={localize("xpAvailable")}>
            {$document.system.xp.available} /
         </div>

         <!--Earned Input-->
         <div class="earned" data-tooltip={localize("xpEarned")}>
            <DocumentIntegerInput bind:value={$document.system.xp.earned} />
         </div>

         <!--Label-->
         <div class="label">{localize("xp")}</div>
      </div>
   </div>

   <!--Attributes and Resistances-->
   <div class="row">
      <!--Attributes-->
      <div class="attributes">
         <div class="label">
            <div class="name">{localize("attribute")}</div>
            <div class="base">{localize("base")}</div>
            <div class="mod">{localize("mod")}</div>
         </div>
         {#each Object.entries($document.system.attribute) as [key]}
            <div class="attribute">
               <CharacterAttribute bind:key />
            </div>
         {/each}
      </div>

      <!--Divider-->
      <div class="divider" />

      <!--Resistances-->
      <div class="resistances">
         <div class="label">
            <div class="name">{localize("resistance")}</div>
            <div class="base">{localize("base")}</div>
            <div class="mod">{localize("mod")}</div>
         </div>
         {#each Object.entries($document.system.resistance) as [key]}
            <div class="resistance">
               <CharacterResistance bind:key />
            </div>
         {/each}
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .header {
      @include border;
      @include flex-column;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.5rem;

      .row {
         @include flex-row;
         @include flex-space-between;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            margin-top: 0.5rem;
            padding-top: 0.5rem;
         }

         .actor-name {
            width: 50%;
         }

         .xp {
            margin-right: 0.5rem;
            display: flex;
            width: 10rem;
            align-items: center;
            text-align: center;
            justify-content: flex-end;

            .available {
               font-family: var(--font-family);
               font-weight: bold;
               @include font-size-normal;
               display: flex;
               margin-right: 0.25rem;
            }

            .earned {
               font-family: var(--font-family);
               display: flex;
               margin-right: 0.5rem;
               width: 3rem;
               --input-border-radius: 10px;
               --input-height: 1.8rem;
            }

            .label {
               font-family: var(--font-family);
               font-weight: bold;
            }
         }

         .attributes {
            @include flex-column;
            height: 100%;

            .label {
               @include font-size-normal;
               font-weight: bold;
               @include flex-row;
               width: 100%;
               .name {
                  @include flex-row;
                  @include flex-group-center;
                  width: 5.5rem;
                  margin-left: 0.5rem;
               }
               .base {
                  margin-left: 0.25rem;
                  width: 2.5rem;
               }

               .mod {
                  width: 2.5rem;
                  margin-left: 0.75rem;
               }
            }

            .attribute {
               height: 100%;
               &:not(:first-child) {
                  margin-top: 0.25rem;
               }

               &:not(:last-child) {
                  @include border-bottom;
                  padding-bottom: 0.25rem;
               }
            }
         }

         .resistances {
            @include flex-column;
            @include flex-group-top;

            .label {
               @include flex-row;
               @include font-size-normal;
               font-weight: bold;
               width: 100%;

               .name {
                  @include flex-row;
                  @include flex-group-center;
                  width: 5.5rem;
                  margin-left: 0.325rem;
               }

               .base {
                  margin-left: 0.25rem;
                  width: 2.5rem;
               }

               .mod {
                  width: 2.5rem;
                  margin-left: 0.325rem;
               }
            }

            .resistance {
               width: 100%;
               margin-top: 0.25rem;

               &:not(:last-child) {
                  @include border-bottom;
                  padding-bottom: 0.25rem;
               }
            }
         }

         .divider {
            height: 100%;
            width: 0;
            border-left: var(--border-style);
            border-width: var(--border-width);
         }
      }
   }
</style>
