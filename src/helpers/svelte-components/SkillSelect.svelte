<script>
   import { localize } from "~/helpers/Utility.js";
   import Select from "~/helpers/svelte-components/Select.svelte";

   // Value
   export let value = void 0;

   // Options
   const skillOptions = [
      {
         label: localize("arcana"),
         value: "arcana",
      },
      {
         label: localize("athletics"),
         value: "athletics",
      },
      {
         label: localize("deception"),
         value: "deception",
      },
      {
         label: localize("dexterity"),
         value: "dexterity",
      },
      {
         label: localize("diplomacy"),
         value: "diplomacy",
      },
      {
         label: localize("engineering"),
         value: "engineering",
      },
      {
         label: localize("intimidation"),
         value: "intimidation",
      },
      {
         label: localize("investigation"),
         value: "investigation",
      },
      {
         label: localize("deception"),
         value: "deception",
      },
      {
         label: localize("dexterity"),
         value: "dexterity",
      },
      {
         label: localize("diplomacy"),
         value: "diplomacy",
      },
      {
         label: localize("engineering"),
         value: "engineering",
      },
      {
         label: localize("intimidation"),
         value: "intimidation",
      },
      {
         label: localize("investigation"),
         value: "investigation",
      },
      {
         label: localize("lore"),
         value: "lore",
      },
      {
         label: localize("medicine"),
         value: "medicine",
      },
      {
         label: localize("meleeWeapons"),
         value: "meleeWeapons",
      },
      {
         label: localize("metaphysics"),
         value: "metaphysics",
      },
      {
         label: localize("nature"),
         value: "nature",
      },
      {
         label: localize("perception"),
         value: "perception",
      },
      {
         label: localize("performance"),
         value: "performance",
      },
      {
         label: localize("rangedWeapons"),
         value: "rangedWeapons",
      },
      {
         label: localize("subterfuge"),
         value: "subterfuge",
      },
      {
         label: localize("stealth"),
         value: "stealth",
      },
      {
         label: localize("none"),
         value: "none",
      },
   ];
</script>

<div class="skill-select {value}" on:change>
   <Select options={skillOptions} bind:value />
</div>
