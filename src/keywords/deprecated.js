import { annotationKeyword } from "./utilities.js";
import keywordSchema from "./deprecated.schema.json" with { type: "json" };

/**
 * `deprecated`
 */
export default annotationKeyword("https://json-schema.org/keyword/deprecated", keywordSchema);
