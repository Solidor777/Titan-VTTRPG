import { localize } from '~/helpers/Utility';

const TITAN_CONDITIONS = [
   {
      id: 'blinded',
      label: 'LOCAL.blinded.label',
      icon: 'icons/svg/blind.svg'
   },
   {
      id: 'contaminated',
      label: 'LOCAL.contaminated.label',
      icon: 'icons/svg/poison.svg'
   },
   {
      id: 'dead',
      label: 'LOCAL.dead.label',
      icon: 'icons/svg/skull.svg'
   },
   {
      id: 'deafened',
      label: 'LOCAL.deafened.label',
      icon: 'icons/svg/deaf.svg'
   },
   {
      id: 'frightened',
      label: 'LOCAL.frightened.label',
      icon: 'icons/svg/terror.svg'
   },
   {
      id: 'incapacitated',
      label: 'LOCAL.incapacitated.label',
      icon: 'icons/svg/paralysis.svg'
   },
   {
      id: 'prone',
      label: 'LOCAL.prone.label',
      icon: 'icons/svg/falling.svg'
   },
   {
      id: 'restrained',
      label: 'LOCAL.restrained.label',
      icon: 'icons/svg/net.svg'
   },
   {
      id: 'stunned',
      label: 'LOCAL.stunned.label',
      icon: 'icons/svg/stoned.svg'
   },
   {
      id: 'sleeping',
      label: 'LOCAL.sleeping.label',
      icon: 'icons/svg/sleep.svg'
   },
   {
      id: 'unconscious',
      label: 'LOCAL.unconscious.label',
      icon: 'icons/svg/unconscious.svg'
   },
];

export default function setupConditions() {
   // Sort conditions
   const conditions = TITAN_CONDITIONS.sort((a, b) => {
      const textA = game.i18n.localize(a.label);
      const textB = game.i18n.localize(b.label);
      return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
   });

   // For each condition
   for (const condition of conditions) {
      // Set the description
      const description = localize(`${condition.id}.desc`);
      condition.flags = {
         titan: {
            description: description,
            type: 'condition'
         },
         'visual-active-effects.data.content': description
      };
   }

   CONFIG.statusEffects = conditions;
}