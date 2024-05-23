/**
 * Returns whether the inputted HTML is blank or an empty paragraph.
 * @param {string} html - HTML to test.
 * @returns {boolean} Whether the HTML is blank, empty, or null.
 */
export default function isHTMLBlank(html) {
   return (!html || html === '' || html === '<p></p>');
}
