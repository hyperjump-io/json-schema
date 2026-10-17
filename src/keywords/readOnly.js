import { annotationKeyword } from "./utilities.js";

/**
 * `readOnly`
 */
export default annotationKeyword("https://json-schema.org/keyword/readOnly", new URL("./readOnly.schema.json", import.meta.url).href);
