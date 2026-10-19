import anchorKeyword from "../anchor.js";
import { expected } from "../checks.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `$anchor` in 2019-09. It's the same as since 2020-12, except for which
 * names are allowed: they can contain `:` but can't start with `_`.
 *
 * @type Keyword
 */
export default {
  ...anchorKeyword,
  uri: "https://json-schema.org/keyword/draft-2019-09/anchor",
  check: expected("an anchor name: a letter followed by letters, digits, '-', '.', ':', or '_'", (node) => {
    return node.jsonType === "string" && /^[A-Za-z][-A-Za-z0-9.:_]*$/.test(node.value);
  })
};
