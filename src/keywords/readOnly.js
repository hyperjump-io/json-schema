import { annotationKeyword } from "./utilities.js";
import { boolean } from "./checks.js";

/**
 * `readOnly`
 */
export default {
  ...annotationKeyword("https://json-schema.org/keyword/readOnly", boolean),
  default: false
};
