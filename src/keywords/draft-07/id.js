import { assertIriReference } from "@hyperjump/uri";
import { iriPlace, iriProblem } from "../../identifiers.js";
import { string } from "../checks.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `id` in draft-04 and `$id` in draft-06 and draft-07. A fragment-only value
 * (`#foo`) is a plain-name anchor. Otherwise, it identifies a schema resource,
 * and a fragment in it is also an anchor.
 *
 * @type Keyword<string, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/draft-07/id",
  shape: "data",
  check: string,
  resolve(valueNode, context) {
    if (valueNode.type !== "json" || valueNode.jsonType !== "string") {
      return;
    }

    // `setBaseUri` checks the value. A fragment-only one is only an anchor,
    // so it's checked here.
    const value = valueNode.value;
    if (!value.startsWith("#")) {
      context.setBaseUri(value);
    } else {
      try {
        assertIriReference(value);
      } catch (error) {
        context.message(`'${value}' isn't a valid URI reference: ${iriProblem(error)}`, { type: valueNode.type, position: iriPlace(valueNode, error) });
        return;
      }
    }

    const hash = value.indexOf("#");
    const fragment = hash === -1 ? "" : value.slice(hash + 1);
    if (fragment) {
      if (fragment.startsWith("/")) {
        context.message("An identifier can't have a JSON Pointer fragment");
      } else {
        context.addAnchor(fragment);
      }
    }
  }
};
