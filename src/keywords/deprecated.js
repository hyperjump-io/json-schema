import { annotationKeyword } from "./utilities.js";

/**
 * `deprecated`
 */
export default annotationKeyword("https://json-schema.org/keyword/deprecated", new URL("./deprecated.schema.json", import.meta.url).href);
