import { annotationKeyword } from "./utilities.js";
import keywordSchema from "./examples.schema.json" with { type: "json" };

/**
 * `examples`
 */
export default annotationKeyword("https://json-schema.org/keyword/examples", keywordSchema);
