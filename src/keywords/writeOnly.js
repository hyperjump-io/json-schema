import { annotationKeyword } from "./utilities.js";
import { boolean } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `writeOnly`. `false` is the same as leaving it out, so it isn't an
 * annotation.
 *
 * @type Keyword<boolean, "data">
 */
export default {
  ...annotationKeyword("https://json-schema.org/keyword/writeOnly", boolean),
  lower: (value) => value ? { op: "annotate", value } : { op: "pass" }
};
