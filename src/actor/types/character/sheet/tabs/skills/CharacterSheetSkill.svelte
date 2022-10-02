<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import EfxButton from "~/helpers/svelte-components/button/EfxButton.svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import DocumentAttributeSelect from "~/documents/components/select/DocumentAttributeSelect.svelte";

   // Key for the skill
   export let key;

   // Document reference
   const document = getContext("DocumentStore");

   // Application reference
   const application = getContext("external").application;
</script>

<div class="skill">
   <!--Button and Attribute-->
   <div class="column">
      <!--Button for rolling the skill-->
      <div class="skill-button" data-tooltip={localize(`${key}.desc`)}>
         <EfxButton on:click={application.rollSkillCheck.bind(application, key)}>
            {localize(key)}<i class="fas fa-dice" />
         </EfxButton>
      </div>

      <!--Default Attribute Select-->
      <div class="default-attribute">
         <div class="label">
            {localize("defaultAttribute")}
         </div>
         <div class="select">
            <DocumentAttributeSelect bind:value={$document.system.skill[key].defaultAttribute} />
         </div>
      </div>
   </div>
   <!--Training and Expertise-->
   <div class="column">
      <!--Training row-->
      <div class="row">
         <div class="label">{localize("training")}</div>
         <div class="input">
            <DocumentIntegerInput bind:value={$document.system.skill[key].training.baseValue} />
         </div>
         <div class="symbol">+</div>
         <div class="input">
            <DocumentIntegerInput bind:value={$document.system.skill[key].training.mod.static} />
         </div>
         <div class="symbol">=</div>
         <div class="value">
            {`${$document.system.skill[key].training.value} (${
               $document.system.skill[key].training.value +
               $document.system.attribute[$document.system.skill[key].defaultAttribute].value
            })`}
         </div>
      </div>
      <!--Expertise Row-->
      <div class="row">
         <div class="label">{localize("expertise")}</div>
         <div class="input">
            <DocumentIntegerInput bind:value={$document.system.skill[key].expertise.baseValue} />
         </div>
         <div class="symbol">+</div>
         <div class="input">
            <DocumentIntegerInput bind:value={$document.system.skill[key].expertise.mod.static} />
         </div>
         <div class="symbol">=</div>
         <div class="value">
            {$document.system.skill[key].expertise.value}
         </div>
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../../../../Styles/Mixins.scss";

   .skill {
      @include flex-row;
      @include border;
      @include panel-3;
      width: 100%;
      padding: 0.5rem;

      .column {
         @include flex-column;
         height: 100%;
         &:not(:first-child) {
            margin-left: 0.5rem;
         }

         .row {
            @include flex-row;
            @include flex-group-center;
            &:not(:first-child) {
               margin-top: 0.5rem;
            }
            width: 100%;

            .label {
               @include flex-row;
               @include flex-group-right;
               height: 100%;
               width: 5rem;
               font-weight: bold;
               text-align: right;
            }
            .input {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
               width: 2.5rem;
               margin-left: 0.5rem;
               font-weight: bold;
            }
            .value {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
               width: 3.2rem;
               margin-left: 0.5rem;
               font-weight: bold;
            }
            .symbol {
               @include flex-row;
               @include flex-group-center;
               height: 100%;
               width: 0.5rem;
               margin-left: 0.5rem;
            }
         }
      }

      .skill-button {
         width: 11rem;
         i {
            margin-left: 0.25rem;
         }
      }
      .default-attribute {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         width: 100%;

         .label {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            width: 100%;
            font-weight: bold;
         }

         .select {
            @include flex-row;
            @include flex-group-center;
            margin-left: 0.25rem;
            height: 100%;
            width: 100%;
         }
      }
   }
</style>
