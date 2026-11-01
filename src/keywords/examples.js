import { annotationKeyword } from "./utilities.js";
import { array } from "./checks.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `examples`
 *
 * @type Keyword<Json[], "data">
 */
export default annotationKeyword("https://json-schema.org/keyword/examples", array);
