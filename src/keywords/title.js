import { annotationKeyword } from "./utilities.js";
import { string } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `title`
 *
 * @type Keyword<string, "data">
 */
export default annotationKeyword("https://json-schema.org/keyword/title", string);
