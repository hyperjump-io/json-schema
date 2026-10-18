import { annotationKeyword } from "./utilities.js";
import keywordSchema from "./title.schema.json" with { type: "json" };

/**
 * `title`
 */
export default annotationKeyword("https://json-schema.org/keyword/title", keywordSchema);
