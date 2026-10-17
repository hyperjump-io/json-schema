import { annotationKeyword } from "./utilities.js";

/**
 * `description`
 */
export default annotationKeyword("https://json-schema.org/keyword/description", new URL("./description.schema.json", import.meta.url).href);
