import { annotationKeyword } from "./utilities.js";

/**
 * `examples`
 */
export default annotationKeyword("https://json-schema.org/keyword/examples", new URL("./examples.schema.json", import.meta.url).href);
