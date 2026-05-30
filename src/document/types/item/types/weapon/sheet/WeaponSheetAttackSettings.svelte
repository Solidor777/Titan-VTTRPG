<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import { ATTACK_TRAIT_DESCRIPTIONS } from '~/document/types/item/types/weapon/AttackTraits.js';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import DocumentTextInput from '~/document/svelte-components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import DocumentAttributeSelect from '~/document/svelte-components/select/DocumentAttributeSelect.svelte';
   import DocumentSkillSelect from '~/document/svelte-components/select/DocumentSkillSelect.svelte';
   import DocumentCheckboxInput from '~/document/svelte-components/input/DocumentCheckboxInput.svelte';
   import DocumentAttackTypeSelect from '~/document/svelte-components/select/DocumentAttackTypeSelect.svelte';
   import DocumentOwnerButton from '~/document/svelte-components/DocumentOwnerButton.svelte';
   import {
      COLLAPSED_ICON,
      CREATE_ICON,
      DAMAGE_ICON,
      DELETE_ICON,
      EDIT_ICON,
      EXPANDED_ICON,
      RANGE_ICON,
   } from '~/system/Icons.js';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import WeaponSheetAttackCustomTraitTag
      from '~/document/types/item/types/weapon/sheet/WeaponSheetAttackCustomTraitTag.svelte';

   /**
    * @typedef {object} WeaponSheetAttackSettingsProps
    * @property {number} [idx] The index of the attack in the weapon's attack array.
    */

   /** @type {WeaponSheetAttackSettingsProps} */
   const { idx = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {Record<string, string>} Map of attack trait names to their description localization keys. */
   const traitDescriptions = ATTACK_TRAIT_DESCRIPTIONS;

   /** @type {object} The attack data for this component. */
   const attack = $derived(document.data.system.attack[idx]);

   /** @type {boolean} Whether this attack component is currently expanded. */
   const isExpanded = $derived($appState.attacks.isExpanded[idx]);

   /**
    * Updates the attack skill when the attack type changes.
    * @returns {Promise<void>} Returns after the document update completes if needed.
    */
   async function updateAttackSkill() {
      if (document.data?.isOwner && attack) {
         if (attack.type === 'melee') {
            if (attack.skill === 'rangedWeapons') {
               attack.skill = 'meleeWeapons';
               document.data.update({
                  system: {
                     attack: structuredClone(document.data.system.attack),
                  },
               });
            }
         }
         else if (attack.skill === 'meleeWeapons') {
            attack.skill = 'rangedWeapons';
            document.data.update({
               system: {
                  attack: structuredClone(document.data.system.attack),
               },
            });
         }
      }
   }
</script>

{#if attack}
   <div class="attack" transition:slide|local>
      <!--Header-->
      <div class="header">
         <!--Expand Toggle-->
         <div>
            {#if isExpanded}
               <!--Collapse button-->
               <IconButton
                  icon={EXPANDED_ICON}
                  label={localize('collapse')}
                  onclick={() => {
                     $appState.attacks.isExpanded[idx] = false;
                  }}
               />
            {:else}
               <!--Expand button-->
               <IconButton
                  icon={COLLAPSED_ICON}
                  label={localize('expand')}
                  onclick={() => {
                     $appState.attacks.isExpanded[idx] = true;
                  }}
               />
            {/if}
         </div>

         <!--Label-->
         <div class="label">
            <DocumentTextInput bind:value={attack.label}/>
         </div>

         <!--Delete button-->
         <div class="delete-button">
            <!--Delete button-->
            <IconButton
               icon={DELETE_ICON}
               label={localize('delete')}
               onclick={() => {
                  document.data.system.deleteAttack(idx);
               }}
            />
         </div>
      </div>

      <!--Expandable Content-->
      {#if isExpanded}
         <div class="expandable-content" transition:slide|local>
            <div class="row">
               <!--Type-->
               <div class="field">
                  <!--Label-->
                  <div class="label">{localize('type')}</div>

                  <!--Input-->
                  <div class="input">
                     <DocumentAttackTypeSelect
                        bind:value={attack.type}
                        onchange={updateAttackSkill}
                     />
                  </div>
               </div>

               <!--Range-->
               <div class="field">
                  <!--Icon-->
                  <i class={RANGE_ICON}></i>

                  <!--Label-->
                  <div class="label">{localize('range')}</div>

                  <!--Input-->
                  <div class="input number">
                     <DocumentIntegerInput bind:value={attack.range} min={1}/>
                  </div>
               </div>
            </div>

            <div class="row">
               <!--Damage-->
               <div class="field">
                  <!--Icon-->
                  <i class={DAMAGE_ICON}></i>

                  <!--Label-->
                  <div class="label">{localize('damage')}</div>

                  <!--Input-->
                  <div class="input number">
                     <DocumentIntegerInput bind:value={attack.damage} min={0}/>
                  </div>

                  <!--Plus Success Damage-->
                  <div class="input">
                     + {localize('extraSuccesses.short')}
                     <DocumentCheckboxInput
                        bind:value={attack.plusExtraSuccessDamage}
                     />
                  </div>
               </div>
            </div>

            <div class="row">
               <!--Attribute select-->
               <div class="field">
                  <!--Label-->
                  <div class="label">{localize('attribute')}</div>

                  <!--Input-->
                  <div class="input">
                     <DocumentAttributeSelect bind:value={attack.attribute}/>
                  </div>
               </div>

               <!--Skill select-->
               <div class="field">
                  <!--Label-->
                  <div class="label">{localize('skill')}</div>

                  <!--Input-->
                  <div class="input">
                     <DocumentSkillSelect bind:value={attack.skill}/>
                  </div>
               </div>
            </div>

            <!--Traits-->
            <div class="traits">
               <!--Header-->
               <div class="traits-header">
                  <!--Edit Traits-->
                  <div class="button">
                     <DocumentOwnerButton
                        onclick={() => {
                           document.data.system.editAttackTraits(idx);
                        }}
                     >
                        <i class={EDIT_ICON}></i>
                        <Text text="editTraits"/>
                     </DocumentOwnerButton>
                  </div>

                  <!--Custom Traits-->
                  <div class="button">
                     <DocumentOwnerButton
                        onclick={() => {
                           document.data.system.addCustomAttackTrait(idx);
                        }}
                     >
                        <i class={CREATE_ICON}></i>
                        <Text text="addCustomTrait"/>
                     </DocumentOwnerButton>
                  </div>
               </div>
               {#if attack.trait.length > 0 || attack.customTrait.length > 0}
                  <div class="traits-container">
                     <!--Each trait-->
                     {#each attack.trait as trait (trait.name)}
                        <div class="trait">
                           {#if typeof (trait.value) === 'number'}
                              <!--Number Trait-->
                              <StatTag
                                 tooltip={traitDescriptions[trait.name]}
                                 label={localize(trait.name)}
                                 value={trait.value}
                              />
                           {:else}
                              <!--Bool Trait-->
                              <Tag tooltip={traitDescriptions[trait.name]}>{localize(trait.name)}</Tag>
                           {/if}
                        </div>
                     {/each}

                     <!--Each custom trait-->
                     {#each attack.customTrait as trait, traitIdx (trait.uuid)}
                        <div class="trait">
                           <WeaponSheetAttackCustomTraitTag attackIdx={idx} {traitIdx}/>
                        </div>
                     {/each}
                  </div>
               {/if}
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   .attack {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .header {
         @include border;
         @include flex-row;
         @include flex-space-between;
         @include panel-1;
         @include padding-standard;

         width: 100%;

         .label {
            @include flex-row;
            @include flex-group-center;

            width: 100%;
            margin: 0 var(--titan-spacing-large);

            --input-font-size: var(--titan-font-size-large);
            --titan-input-height: 32px;
         }
      }

      .expandable-content {
         @include flex-column;
         @include flex-group-top;
         @include border-bottom-sides;
         @include panel-3;

         width: calc(100% - 16px);

         @include padding-standard;
         @include font-size-small;

         .row {
            @include flex-row;
            @include flex-group-center;
            @include padding-top-large;

            width: 100%;

            &:not(:first-child) {
               @include border-top;
               @include margin-top-large;
            }

            .field {
               @include flex-row;
               @include flex-group-center;

               &:not(:first-child) {
                  @include separator-left-large;
               }

               i {
                  @include margin-right-standard;
               }

               .label {
                  @include flex-row;
                  @include flex-group-center;

                  font-weight: bold;
               }

               .input {
                  @include flex-row;
                  @include flex-group-center;
                  @include margin-left-standard;
                  @include font-size-normal;

                  &.number {
                     width: 56px;
                  }
               }
            }
         }

         .traits {
            @include border-top;

            width: 100%;

            @include margin-top-standard;
            @include padding-top-standard;

            .traits-header {
               @include flex-row;
               @include flex-group-center;

               .button {
                  --titan-button-font-size: var(--titan-font-size-small);
                  --titan-button-line-height: 20px;

                  &:not(:first-child) {
                     @include margin-left-standard;
                  }
               }
            }

            .traits-container {
               @include flex-row;
               @include flex-group-center;

               flex-wrap: wrap;
               width: 100%;

               @include margin-bottom-standard;

               .trait {
                  margin: var(--titan-spacing-large) var(--titan-spacing-standard) 0 var(--titan-spacing-standard);
               }
            }
         }
      }
   }
</style>
