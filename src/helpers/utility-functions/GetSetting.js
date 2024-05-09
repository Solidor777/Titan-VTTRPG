/**
 * Returns the value of the inputted setting for the Titan system.
 * @param {string}   setting  Setting to get the value of.
 * @returns {*}               The value of the setting.
 */
export default function getSetting(setting) {
   return game.settings.get('titan', setting);
}
