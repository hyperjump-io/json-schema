import { string } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `$id` since 2019-09. It identifies a schema resource. It can't have a
 * fragment, except an empty one.
 *
 * @type Keyword<string, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/id",
  shape: "data",
  check: string,
  resolve(valueNode, context) {
    if (valueNode.type !== "json" || valueNode.jsonType !== "string") {
      return;
    }

    // `setBaseUri` checks the value, so the fragment is read as it's written
    const hash = valueNode.value.indexOf("#");
    if (hash !== -1 && hash < valueNode.value.length - 1) {
      context.message("'$id' can't have a fragment. Use '$anchor' to identify a schema with a fragment.");
      return;
    }

    context.setBaseUri(valueNode.value);
  }
};
