<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import DocumentAttributeSelect from "~/documents/components/select/DocumentAttributeSelect.svelte";
   import ModTag from "~/helpers/svelte-components/tag/ModTag.svelte";

   // Key for the skill
   export let key;

   // Document reference
   const document = getContext("DocumentStore");

   // Application reference
   const application = getContext("external").application;
</script>

<div class="skill">
   <div class="column">
      <!--Roll Button-->
      <div class="button" data-tooltip={localize(`${key}.desc`)}>
         <EfxButton on:click={application.rollSkillCheck.bind(application, key)}>
            <div class="button-content">
               <!--Icon-->
               <i class="fas fa-dice" />

               <!--Label-->
               <div class="label">
                  {localize(key)}
               </div>
            </div>
         </EfxButton>
      </div>

      <!--Default Attribute-->
      <div class="attribute">
         <!--Label-->
         <div class="label">
            {localize("attribute")}
         </div>

         <!--Select-->
         <div class="select">
            <DocumentAttributeSelect bind:value={$document.system.skill[key].defaultAttribute} />
         </div>
      </div>
   </div>

   <!--Training and Expertise-->
   <div class="column">
      <!--Training row-->
      <div class="row">
         <!--Label-->
         <div class="label">{localize("training")}</div>

         <!--Base Value-->
         <div class="input">
            <DocumentIntegerInput bind:value={$document.system.skill[key].training.baseValue} />
         </div>

         <!--Static Mod-->
         <div class="symbol">+</div>
         <div class="input">
            <DocumentIntegerInput bind:value={$document.system.skill[key].training.mod.static} />
         </div>

         <!--Total Value-->
         <div class="symbol">=</div>
         <div class="value">
            <ModTag
               currentValue={$document.system.skill[key].training.value}
               baseValue={$document.system.skill[key].training.baseValue +
                  $document.system.skill[key].training.mod.ability +
                  $document.system.skill[key].training.mod.equipment}
            />
         </div>
      </div>

      <!--Expertise row-->
      <div class="row">
         <!--Label-->
         <div class="label">{localize("expertise")}</div>

         <!--Base Value-->
         <div class="input">
            <DocumentIntegerInput bind:value={$document.system.skill[key].expertise.baseValue} />
         </div>

         <!--Static Mod-->
         <div class="symbol">+</div>
         <div class="input">
            <DocumentIntegerInput bind:value={$document.system.skill[key].expertise.mod.static} />
         </div>

         <!--Total Value-->
         <div class="symbol">=</div>
         <div class="value">
            <ModTag
               currentValue={$document.system.skill[key].expertise.value}
               baseValue={$document.system.skill[key].expertise.baseValue +
                  $document.system.skill[key].expertise.mod.ability +
                  $document.system.skill[key].expertise.mod.equipment}
            />
         </div>
      </div>
   </div>

   <!--Total Dice-->
   <div class="column">
      <div class="tag">
         <!--Label-->
         <div class="label">{localize("totalDice")}</div>

         <!--Total Value-->
         <div class="value">
            {$document.system.skill[key].training.value +
               $document.system.attribute[$document.system.skill[key].defaultAttribute].value}
         </div>
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../../../../Styles/Mixins.scss";

   .skill {
      @include flex-row;
      @include flex-space-between;
      @include border;
      @include panel-3;
      width: 100%;
      padding: 0.5rem;

      .column {
         @include flex-column;
         @include flex-group-top;
         height: 100%;

         .button {
            @include flex-row;
            @include flex-group-center;
            min-width: 11rem;

            .button-content {
               @include flex-row;
               @include flex-group-center;
               i {
                  margin-right: 0.25rem;
               }
            }
         }

         .attribute {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            width: 100%;
            margin-top: 0.25rem;

            .label {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
               font-weight: bold;
            }

            .select {
               @include flex-row;
               @include flex-group-center;
               margin-left: 0.25rem;
               height: 100%;
            }
         }

         .row {
            @include flex-row;
            @include flex-group-right;
            width: 100%;

            &:not(:first-child) {
               @include border-top;
               padding-top: 0.25rem;
               margin-top: 0.25rem;
            }

            .label {
               @include flex-row;
               @include flex-group-right;
               height: 100%;
               font-weight: bold;
               margin-right: 0.25rem;
            }

            .input {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
               width: 1.75rem;
               margin-left: 0.25rem;
               font-weight: bold;
            }

            .value {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
               width: 1.75rem;
               margin-left: 0.25rem;
               font-weight: bold;
            }

            .symbol {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
               margin-left: 0.25rem;
            }
         }

         .tag {
            @include flex-column;
            @include flex-group-top;
            @include border;
            @include label;
            padding: 0.25rem;

            .label {
               @include flex-row;
               @include flex-group-center;
               @include border-bottom;
               font-weight: bold;
            }

            .value {
               @include flex-row;
               @include flex-group-center;
            }
         }
      }
   }
</style>
