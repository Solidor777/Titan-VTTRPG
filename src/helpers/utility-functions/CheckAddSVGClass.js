/**
 * If the source image is an SVG file, returns the svg CSS class.
 * Otherwise, returns an empty string.
 * @param {string} source - The source image.
 * @returns {string} Svg if the source is a svg file, otherwise an empty string.
 */
export default function checkAddSVGClass(source) {
   return source.includes('.svg') ? 'svg' : '';
}
