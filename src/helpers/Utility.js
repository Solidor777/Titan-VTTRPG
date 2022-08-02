export default class TitanUtility {
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }
}
