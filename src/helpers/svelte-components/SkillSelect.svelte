<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import Select from "~/helpers/svelte-components/Select.svelte";

   // Value
   export let value = void 0;

   // Options
   const skillOptions = [
      {
         label: localize("LOCAL.arcana.label"),
         value: "arcana",
      },
      {
         label: localize("LOCAL.athletics.label"),
         value: "athletics",
      },
      {
         label: localize("LOCAL.deception.label"),
         value: "deception",
      },
      {
         label: localize("LOCAL.dexterity.label"),
         value: "dexterity",
      },
      {
         label: localize("LOCAL.diplomacy.label"),
         value: "diplomacy",
      },
      {
         label: localize("LOCAL.engineering.label"),
         value: "engineering",
      },
      {
         label: localize("LOCAL.intimidation.label"),
         value: "intimidation",
      },
      {
         label: localize("LOCAL.investigation.label"),
         value: "investigation",
      },
      {
         label: localize("LOCAL.deception.label"),
         value: "deception",
      },
      {
         label: localize("LOCAL.dexterity.label"),
         value: "dexterity",
      },
      {
         label: localize("LOCAL.diplomacy.label"),
         value: "diplomacy",
      },
      {
         label: localize("LOCAL.engineering.label"),
         value: "engineering",
      },
      {
         label: localize("LOCAL.intimidation.label"),
         value: "intimidation",
      },
      {
         label: localize("LOCAL.investigation.label"),
         value: "investigation",
      },
      {
         label: localize("LOCAL.lore.label"),
         value: "lore",
      },
      {
         label: localize("LOCAL.medicine.label"),
         value: "medicine",
      },
      {
         label: localize("LOCAL.meleeWeapons.label"),
         value: "meleeWeapons",
      },
      {
         label: localize("LOCAL.metaphysics.label"),
         value: "metaphysics",
      },
      {
         label: localize("LOCAL.nature.label"),
         value: "nature",
      },
      {
         label: localize("LOCAL.perception.label"),
         value: "perception",
      },
      {
         label: localize("LOCAL.performance.label"),
         value: "performance",
      },
      {
         label: localize("LOCAL.rangedWeapons.label"),
         value: "rangedWeapons",
      },
      {
         label: localize("LOCAL.subterfuge.label"),
         value: "subterfuge",
      },
      {
         label: localize("LOCAL.stealth.label"),
         value: "stealth",
      },
      {
         label: localize("LOCAL.none.label"),
         value: "none",
      },
   ];
</script>

<div class="skill-select {value}" on:change>
   <Select options={skillOptions} bind:value />
</div>
