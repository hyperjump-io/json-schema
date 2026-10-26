import { annotationKeyword } from "./utilities.js";
import { string } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `description`
 *
 * @type Keyword<string, "data">
 */
export default annotationKeyword("https://json-schema.org/keyword/description", string);
