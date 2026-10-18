import { annotationKeyword } from "./utilities.js";
import keywordSchema from "./description.schema.json" with { type: "json" };

/**
 * `description`
 */
export default annotationKeyword("https://json-schema.org/keyword/description", keywordSchema);
