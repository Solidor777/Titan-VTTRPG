/**
 * The canonical source string of each system situation, by localization key. The camel-case form of the string is the
 * situation key on every client, so it never depends on the client's language and equals the key a user-typed situation
 * with the same English text gets. The displayed label is localized separately from the key; a unit test requires
 * every key's `LOCAL.<key>.text` entry in the English localization. Armor traits and conditions both impose these
 * situations.
 * @type {Readonly<Record<string, string>>}
 */
export const CANONICAL_SITUATIONS = Object.freeze({
   situationJump: 'Jump',
   situationReliesOnHearing: 'Relies on Hearing',
   situationReliesOnSight: 'Relies on Sight',
   situationRemainUndetectedByHearing: 'Remain Undetected by Hearing',
   situationSwimFlyClimb: 'Swim, Fly, or Climb',
});
