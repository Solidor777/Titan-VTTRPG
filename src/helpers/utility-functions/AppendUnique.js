import mergeArrays from "~/helpers/utility-functions/MergeArrays.js";

/**
 * Adds each entry from the source array to the destination array,
 * provided that said entry is not already in the destination array.
 * Note that if any arrays have duplicate entries, those entries will not be included in the returned result.
 * @param {*[] = []} destination - The destination array.
 * @param {*[] = []} source - The source array.
 */
export default function appendUnique(destination = [], source = []) {
   destination = mergeArrays(destination, source);
}
