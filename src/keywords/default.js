import { annotationKeyword } from "./utilities.js";
import keywordSchema from "./default.schema.json" with { type: "json" };

/**
 * `default`. It doesn't change the instance.
 */
export default annotationKeyword("https://json-schema.org/keyword/default", keywordSchema);
