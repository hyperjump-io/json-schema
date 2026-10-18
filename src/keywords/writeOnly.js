import { annotationKeyword } from "./utilities.js";
import keywordSchema from "./writeOnly.schema.json" with { type: "json" };

/**
 * `writeOnly`
 */
export default annotationKeyword("https://json-schema.org/keyword/writeOnly", keywordSchema);
