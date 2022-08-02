<svelte:options accessors={true} />

<script>
   import { ApplicationShell } from "@typhonjs-fvtt/runtime/svelte/component/core";
   import { setContext } from "svelte";
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import ActorResourceMeter from "~/actor/sheet/ActorResourceMeter.svelte";
   import ActorResistance from "~/actor/sheet/ActorResistance.svelte";
   import ActorRating from "~/actor/sheet/ActorRating.svelte";
   import ActorSpeed from "~/actor/sheet/ActorSpeed.svelte";
   import ActorAttribute from "../../sheet/ActorAttribute.svelte";

   // Setup
   export let elementRoot;
   export let storeDoc;
   setContext("DocumentSheetObject", storeDoc);
   const document = getContext("DocumentSheetObject");
</script>

<ApplicationShell bind:elementRoot>
   <!--Sheet-->
   <div class="player-sheet">
      <!--Sidebar-->
      <div class="sidebar">
         <!--Character Portrait-->
         <div class="portrait">
            <DocumentImagePicker path={"img"} alt={"character portrait"} />
         </div>

         <!--Resources-->
         <div class="resources">
            <!--Each Resource Meter-->
            {#each Object.entries($document.system.resource) as [key, resource]}
               <div class="resource {key}">
                  <ActorResourceMeter
                     bind:value={$document.system.resource[key].value}
                     bind:staticMod={$document.system.resource[key].staticMod}
                     max={$document.system.resource[key].maxValue}
                     label={localize(`LOCAL.${key}.label`)}
                     editStaticModTooltip={localize(`LOCAL.${key}.editStaticMod.label`)}
                     editValueTooltip={localize(`LOCAL.${key}.editValue.label`)}
                     valueTooltip={localize(`LOCAL.${key}.valueDesc.label`)}
                     maxTooltip={localize(`LOCAL.${key}.max.label`)}
                  />
               </div>
            {/each}
         </div>

         <!--Ratings-->
         <div class="ratings">
            {#each Object.entries($document.system.rating) as [key]}
               <div class="rating">
                  <ActorRating bind:key />
               </div>
            {/each}
         </div>

         <!--Speeds-->
         <div class="speeds">
            <div class="label">
               <div class="name">Speed</div>
               <div class="base">Base</div>
               <div class="mod">Mod</div>
            </div>
            {#each Object.entries($document.system.speed) as [key]}
               <div class="speed">
                  <ActorSpeed bind:key />
               </div>
            {/each}
         </div>
      </div>
      <!--Main Sheet-->
      <div class="main">
         <!--Header -->
         <div class="header">
            <!--Name and EXP-->
            <div class="row">
               <!--Actor name Sheet-->
               <div class="actor-name">
                  <DocumentTextInput bind:value={$document.name} />
               </div>

               <!--Exp-->
               <div class="exp">
                  <!--Available-->
                  <div class="available" data-tooltip={localize("LOCAL.expAvailable.label")}>
                     {$document.system.exp.available} /
                  </div>

                  <!--Earned Input-->
                  <div class="earned" data-tooltip={localize("LOCAL.expEarned.label")}>
                     <DocumentTextInput bind:value={$document.system.exp.earned} type="integer" />
                  </div>

                  <!--Label-->
                  <div class="label">{localize("LOCAL.exp.label")}</div>
               </div>
            </div>

            <!--Attributes and Resistances-->
            <div class="row">
               <!--Attributes-->
               <div class="attributes">
                  <div class="label">
                     <div class="name">{localize("LOCAL.attribute.label")}</div>
                     <div class="base">{localize("LOCAL.base.label")}</div>
                     <div class="mod">{localize("LOCAL.mod.label")}</div>
                  </div>
                  {#each Object.entries($document.system.attribute) as [key]}
                     <div class="attribute">
                        <ActorAttribute bind:key />
                     </div>
                  {/each}
               </div>

               <!--Divider-->
               <div class="divider" />

               <!--Resistances-->
               <div class="resistances">
                  <div class="label">
                     <div class="name">{localize("LOCAL.attribute.label")}</div>
                     <div class="base">{localize("LOCAL.base.label")}</div>
                     <div class="mod">{localize("LOCAL.mod.label")}</div>
                  </div>
                  {#each Object.entries($document.system.resistance) as [key]}
                     <div class="resistance">
                        <ActorResistance bind:key />
                     </div>
                  {/each}
               </div>
            </div>
         </div>
         <!--Tab Content-->
         <div class="tab-content">TEst</div>
      </div>
   </div>
</ApplicationShell>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .player-sheet {
      display: flex;
      flex: 1;

      .sidebar {
         @include border-normal;
         @include flex-column;
         @include flex-group-top;

         width: 14rem;
         min-width: 14rem;
         height: 100%;
         margin-right: 0.5rem;
         padding: 0.5rem;

         .portrait {
            width: 10rem;
            --border-style-normal: none;
         }

         .resources {
            @include flex-column;
            @include flex-group-top;
            @include border-bottom-normal;
            width: 100%;
            padding-bottom: 0.25rem;

            .resource {
               width: 100%;

               &:not(:first-child) {
                  margin-top: 0.25rem;
               }

               &:not(:last-child) {
                  padding-bottom: 0.25rem;
                  @include border-bottom-normal;
               }

               &.stamina {
                  --meter-color: var(--color-stamina-dark);
               }

               &.wounds {
                  --meter-color: var(--color-wounds-dark);
               }

               &.resolve {
                  --meter-color: var(--color-resolve-dark);
               }
            }
         }

         .resistances {
            @include flex-column;
            @include flex-group-top;
            @include border-bottom-normal;
            width: 100%;
            margin-top: 0.5rem;
            padding-bottom: 0.5rem;

            .resistance {
               width: 100%;
               margin-top: 0.25rem;

               &:not(:last-child) {
                  @include border-bottom-normal;
                  padding-bottom: 0.25rem;
               }
            }
         }

         .ratings {
            @include flex-column;
            @include flex-group-top;
            @include border-bottom-normal;
            width: 100%;
            margin-top: 0.5rem;
            padding-bottom: 0.5rem;

            .rating {
               width: 100%;
               margin-top: 0.25rem;

               &:not(:last-child) {
                  @include border-bottom-normal;
                  padding-bottom: 0.25rem;
               }
            }
         }

         .speeds {
            @include flex-column;
            @include flex-group-top;
            width: 100%;
            margin-top: 0.5rem;

            .label {
               @include flex-row;
               @include flex-group-left;
               font-size: 1rem;
               font-weight: bold;
               width: 100%;

               .name {
                  @include flex-row;
                  text-align: left;
                  width: 5rem;
               }
               .base {
                  margin-left: 0.325rem;
                  width: 2.5rem;
               }

               .mod {
                  width: 2.5rem;
                  margin-left: 0.875rem;
               }
            }
            .speed {
               width: 100%;
               margin-top: 0.25rem;

               &:not(:last-child) {
                  @include border-bottom-normal;
                  padding-bottom: 0.25rem;
               }
            }
         }
      }

      .main {
         display: flex;
         flex: 1;
         @include flex-column;

         .header {
            @include border-normal;
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
                  @include border-top-normal;
                  margin-top: 0.5rem;
                  padding-top: 0.5rem;
               }

               .actor-name {
                  font-family: var(--font-family);
                  font-size: 1.6rem;
                  width: 50%;
                  --height-input: 2.5rem;
                  --border-radius-input: 10px;
                  --font-size: 1.5rem;
               }

               .exp {
                  margin-right: 0.5rem;
                  display: flex;
                  width: 10rem;
                  align-items: center;
                  text-align: center;
                  justify-content: flex-end;

                  .available {
                     font-family: var(--font-family);
                     font-weight: bold;
                     font-size: 1.1rem;
                     display: flex;
                     margin-right: 0.25rem;
                  }

                  .earned {
                     font-family: var(--font-family);
                     display: flex;
                     margin-right: 0.5rem;
                     width: 3rem;
                     --border-radius-input: 10px;
                     --height-input: 1.8rem;
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
                     font-size: 1rem;
                     font-weight: bold;
                     @include flex-row;
                     width: 100%;
                     .name {
                        @include flex-row;
                        @include flex-group-center;
                        width: 6rem;
                     }
                     .base {
                        width: 2.5rem;
                     }

                     .mod {
                        width: 2.5rem;
                        margin-left: 0.4rem;
                     }
                  }

                  .attribute {
                     height: 100%;
                     &:not(:first-child) {
                        margin-top: 0.25rem;
                     }

                     &:not(:last-child) {
                        @include border-bottom-normal;
                        padding-bottom: 0.25rem;
                     }
                  }
               }

               .resistances {
                  @include flex-column;
                  @include flex-group-top;

                  .label {
                     @include flex-row;
                     font-size: 1rem;
                     font-weight: bold;
                     width: 100%;

                     .name {
                        @include flex-row;
                        @include flex-group-center;
                        width: 5.5rem;
                        margin-left: 0.325rem;
                     }

                     .base {
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
                        @include border-bottom-normal;
                        padding-bottom: 0.25rem;
                     }
                  }
               }

               .divider {
                  //width: var(--border-width-normal);
                  height: 100%;
                  width: --border-width-normal;
                  border-left: var(--border-style-normal);
                  border-width: var(--border-width-normal);
               }
            }
         }

         .tab-content {
            display: flex;
            flex: 1;
            height: 10rem;
         }
      }
   }
</style>
