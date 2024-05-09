<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { ATTACK_TRAIT_DESCRIPTIONS } from '~/document/types/item/types/weapon/AttackTraits.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import DocumentTextInput from '~/document/components/input/DocumentTextInput.svelte';
   import DocumentIntegerInput from '~/document/components/input/DocumentIntegerInput.svelte';
   import DocumentAttributeSelect from '~/document/components/select/DocumentAttributeSelect.svelte';
   import DocumentSkillSelect from '~/document/components/select/DocumentSkillSelect.svelte';
   import DocumentCheckboxInput from '~/document/components/input/DocumentCheckboxInput.svelte';
   import DocumentAttackTypeSelect from '~/document/components/select/DocumentAttackTypeSelect.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import EditDeleteTag from '~/helpers/svelte-components/tag/EditDeleteTag.svelte';
   import {
      COLLAPSED_ICON,
      CREATE_ICON,
      DAMAGE_ICON,
      DELETE_ICON,
      EDIT_ICON,
      EXPANDED_ICON,
      RANGE_ICON,
   } from '~/system/Icons.js';

   // Attack idx
   export let idx = void 0;

   // Setup context variables
   const document = getContext('document');
   const appState = getContext('applicationState');
   const traitDescriptions = ATTACK_TRAIT_DESCRIPTIONS;

   $: attack = $document.system.attack[idx];
   $: isExpanded = $appState.isExpanded.attacks[idx];

   async function updateAttackSkill() {
      if ($document?.isOwner && attack) {
         if (attack.type === 'melee') {
            if (attack.skill === 'rangedWeapons') {
               attack.skill = 'meleeWeapons';
               $document.update({
                  system: {
                     attack: $document.system.attack,
                  },
               });
            }
         }
         else if (attack.skill === 'meleeWeapons') {
            attack.skill = 'rangedWeapons';
            $document.update({
               system: {
                  attack: $document.system.attack,
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
                  icon="{EXPANDED_ICON}"
                  on:click={() => {
                     $appState.isExpanded.attacks[idx] = false;
                  }}
               />
            {:else}
               <!--Expand button-->
               <IconButton
                  icon="{COLLAPSED_ICON}"
                  on:click={() => {
                     $appState.isExpanded.attacks[idx] = true;
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
               on:click={() => {
                  $document.system.removeAttack(idx);
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
                        on:change={updateAttackSkill}
                     />
                  </div>
               </div>

               <!--Range-->
               <div class="field">
                  <!--Icon-->
                  <i class="{RANGE_ICON}"/>

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
                  <i class={DAMAGE_ICON}/>

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
                     <Button
                        on:click={() => {
                           $document.system.editAttackTraits(idx);
                        }}
                     >
                        <i class="{EDIT_ICON}"/>
                        {localize('editTraits')}
                     </Button>
                  </div>

                  <!--Custom Traits-->
                  <div class="button">
                     <Button
                        on:click={() => {
                           $document.system.addCustomAttackTrait(idx);
                        }}
                     >
                        <i class="{CREATE_ICON}"/>
                        {localize('addCustomTrait')}
                     </Button>
                  </div>
               </div>
               {#if attack.trait.length > 0 || attack.customTrait.length > 0}
                  <div class="traits-container">
                     <!--Each trait-->
                     {#each attack.trait as trait (trait.name)}
                        <div
                           class="trait"
                           use:tooltip={{
                              content: localize(traitDescriptions[trait.name]),
                           }}
                        >
                           {#if trait.type === 'number'}
                              <!--Number Trait-->
                              <StatTag
                                 label={localize(trait.name)}
                                 value={trait.value}
                              />
                           {:else}
                              <!--Bool Trait-->
                              <Tag label={localize(trait.name)}/>
                           {/if}
                        </div>
                     {/each}

                     <!--Each custom trait-->
                     {#each attack.customTrait as trait, traitIdx (trait.uuid)}
                        <div class="trait">
                           <!--Bool Trait-->
                           <EditDeleteTag
                              label={trait.name}
                              editFunction={() => {
                                 $document.system.editCustomAttackTrait(
                                    idx,
                                    traitIdx,
                                 );
                              }}
                              deleteFunction={() => {
                                 $document.system.deleteCustomAttackTrait(
                                    idx,
                                    traitIdx,
                                 );
                              }}
                              labelTooltip={trait.description}
                              editTooltip={localize('editTrait')}
                              deleteTooltip={localize('deleteTrait')}
                           />
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
         padding: var(--padding-standard);
         width: 100%;

         .label {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            margin: 0 var(--padding-large);
            --input-font-size: var(--font-size-large);
            --input-height: 32px;
         }
      }

      .expandable-content {
         @include flex-column;
         @include flex-group-top;
         @include border-bottom-sides;
         @include panel-3;
         width: calc(100% - 16px);
         padding: var(--padding-standard);
         @include font-size-small;

         .row {
            @include flex-row;
            @include flex-group-center;
            padding-top: var(--padding-large);
            width: 100%;

            &:not(:first-child) {
               @include border-top;
               margin-top: var(--padding-large);
            }

            .field {
               @include flex-row;
               @include flex-group-center;

               &:not(:first-child) {
                  @include border-left;
                  margin-left: var(--padding-large);
                  padding-left: var(--padding-large);
               }

               i {
                  margin-right: var(--padding-standard);
               }

               .label {
                  @include flex-row;
                  @include flex-group-center;
                  font-weight: bold;
               }

               .input {
                  @include flex-row;
                  @include flex-group-center;
                  margin-left: var(--padding-standard);
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
            margin-top: var(--padding-standard);
            padding-top: var(--padding-standard);

            .traits-header {
               @include flex-row;
               @include flex-group-center;

               .button {
                  --button-font-size: var(--font-size-small);
                  --button-line-height: 20px;

                  &:not(:first-child) {
                     margin-left: var(--padding-standard);
                  }
               }
            }

            .traits-container {
               @include flex-row;
               @include flex-group-center;
               flex-wrap: wrap;
               width: 100%;
               margin-bottom: 0var (--padding-standard);

               .trait {
                  margin: var(--padding-large) var(--padding-standard) 0 var(--padding-standard);
               }
            }
         }
      }
   }
</style>
