/**
 * @typedef {object} E2EUser
 * @property {string} name - The user's display name as it appears in the /join user picker.
 * @property {('gm'|'player')} role - The user's role for permission and socket tests.
 */

/** @type {E2EUser[]} The four dedicated E2E identities (no passwords). */
export const E2E_USERS = [
   { name: 'E2E GM 1', role: 'gm' },
   { name: 'E2E GM 2', role: 'gm' },
   { name: 'E2E Player 1', role: 'player' },
   { name: 'E2E Player 2', role: 'player' },
];

/** @type {E2EUser[]} The two Gamemaster identities. */
export const GM_USERS = E2E_USERS.filter((user) => user.role === 'gm');

/** @type {E2EUser[]} The two Player identities. */
export const PLAYER_USERS = E2E_USERS.filter((user) => user.role === 'player');

/** @type {string} The default login identity — the first test GM, never the developer's Gamemaster. */
export const DEFAULT_GM = GM_USERS[0].name;
