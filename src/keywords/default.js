import { annotationKeyword } from "./utilities.js";

/**
 * `default`. It doesn't change the instance.
 */
export default annotationKeyword("https://json-schema.org/keyword/default", new URL("./default.schema.json", import.meta.url).href);
