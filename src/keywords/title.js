import { annotationKeyword } from "./utilities.js";

/**
 * `title`
 */
export default annotationKeyword("https://json-schema.org/keyword/title", new URL("./title.schema.json", import.meta.url).href);
