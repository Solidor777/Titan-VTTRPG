<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import Select from '~/helpers/svelte-components/select/Select.svelte';

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether to allow None as an option. */
   export let allowNone = false;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type SelectOption[] Options for the Select. */
   const options = [
      {
         label: localize('arcana'),
         value: 'arcana',
      },
      {
         label: localize('athletics'),
         value: 'athletics',
      },
      {
         label: localize('deception'),
         value: 'deception',
      },
      {
         label: localize('dexterity'),
         value: 'dexterity',
      },
      {
         label: localize('diplomacy'),
         value: 'diplomacy',
      },
      {
         label: localize('engineering'),
         value: 'engineering',
      },
      {
         label: localize('intimidation'),
         value: 'intimidation',
      },
      {
         label: localize('investigation'),
         value: 'investigation',
      },
      {
         label: localize('deception'),
         value: 'deception',
      },
      {
         label: localize('dexterity'),
         value: 'dexterity',
      },
      {
         label: localize('diplomacy'),
         value: 'diplomacy',
      },
      {
         label: localize('engineering'),
         value: 'engineering',
      },
      {
         label: localize('intimidation'),
         value: 'intimidation',
      },
      {
         label: localize('investigation'),
         value: 'investigation',
      },
      {
         label: localize('lore'),
         value: 'lore',
      },
      {
         label: localize('medicine'),
         value: 'medicine',
      },
      {
         label: localize('meleeWeapons'),
         value: 'meleeWeapons',
      },
      {
         label: localize('metaphysics'),
         value: 'metaphysics',
      },
      {
         label: localize('nature'),
         value: 'nature',
      },
      {
         label: localize('perception'),
         value: 'perception',
      },
      {
         label: localize('performance'),
         value: 'performance',
      },
      {
         label: localize('rangedWeapons'),
         value: 'rangedWeapons',
      },
      {
         label: localize('subterfuge'),
         value: 'subterfuge',
      },
      {
         label: localize('stealth'),
         value: 'stealth',
      },
   ];

   // Add none option
   if (allowNone) {
      options.push({
         label: localize('none'),
         value: 'none',
      });
   }
</script>

<Select bind:value {disabled} on:change {options}/>
