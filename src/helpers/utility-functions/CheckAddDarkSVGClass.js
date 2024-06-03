/**
 * If the source image is an SVG file, returns the dark svg CSS class.
 * Otherwise, returns an empty string.
 * @param {string} source - The source image.
 * @returns {string} Dark-svg if the source is a svg file, otherwise an empty string.
 */
export default function checkAddDarkSVGClass(source) {
   return source.includes('.svg') ? 'dark-svg' : '';
}
