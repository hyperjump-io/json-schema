import { annotationKeyword } from "./utilities.js";

/**
 * `writeOnly`
 */
export default annotationKeyword("https://json-schema.org/keyword/writeOnly", new URL("./writeOnly.schema.json", import.meta.url).href);
