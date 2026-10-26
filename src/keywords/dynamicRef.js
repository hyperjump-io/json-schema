import { anchorName } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `$dynamicRef` in v1. Its value is the name of a dynamic anchor, and the
 * outermost schema in the dynamic scope with that anchor applies to the
 * instance.
 *
 * @type Keyword<string, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/dynamicRef",
  shape: "data",
  check: anchorName,
  lower: (name) => ({ op: "dynamicApply", anchor: name, fallback: null })
};
