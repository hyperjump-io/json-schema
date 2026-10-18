import { annotationKeyword } from "./utilities.js";
import keywordSchema from "./readOnly.schema.json" with { type: "json" };

/**
 * `readOnly`
 */
export default annotationKeyword("https://json-schema.org/keyword/readOnly", keywordSchema);
