import deepFreeze from '~/helpers/utility-functions/DeepFreeze.js';

/**
 * All traits specific to Attacks.
 * @type StandardTrait[]
 */
export const ATTACK_TRAITS = deepFreeze([
   {
      name: 'blast',
      value: 0,
   },
   {
      name: 'cleave',
      value: false,
   },
   {
      name: 'close',
      value: false,
   },
   {
      name: 'crushing',
      value: false,
   },
   {
      name: 'ineffective',
      value: false,
   },
   {
      name: 'loud',
      value: false,
   },
   {
      name: 'magical',
      value: false,
   },
   {
      name: 'flurry',
      value: false,
   },
   {
      name: 'penetrating',
      value: false,
   },
   {
      name: 'piercing',
      value: false,
   },
   {
      name: 'push',
      value: false,
   },
   {
      name: 'reload',
      value: false,
   },
   {
      name: 'rend',
      value: false,
   },
   {
      name: 'restraining',
      value: false,
   },
   {
      name: 'slashing',
      value: false,
   },
   {
      name: 'splash',
      value: false,
   },
   {
      name: 'twoHanded',
      value: false,
   },
   {
      name: 'vicious',
      value: false,
   },
]);

/**
 * Keys for the localized description strings for Attack Traits, mapped to the Trait name.
 * @type object
 */
export const ATTACK_TRAIT_DESCRIPTIONS = deepFreeze({
   blast: 'attack.blast.desc',
   cleave: 'attack.cleave.desc',
   close: 'attack.close.desc',
   crushing: 'attack.crushing.desc',
   flurry: 'attack.flurry.desc',
   ineffective: 'attack.ineffective.desc',
   loud: 'attack.loud.desc',
   magical: 'attack.magical.desc',
   penetrating: 'attack.penetrating.desc',
   piercing: 'attack.piercing.desc',
   push: 'attack.push.desc',
   reload: 'attack.reload.desc',
   rend: 'attack.rend.desc',
   restraining: 'attack.restraining.desc',
   slashing: 'attack.slashing.desc',
   splash: 'attack.splash.desc',
   twoHanded: 'attack.twoHanded.desc',
   vicious: 'attack.vicious.desc',
});
