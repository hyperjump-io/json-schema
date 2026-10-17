import { parseIri, resolveIri } from "@hyperjump/uri";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `$id` since 2019-09. It identifies a schema resource. It can't have a
 * fragment, except an empty one.
 *
 * @type Keyword
 */
export default {
  uri: "https://json-schema.org/keyword/id",
  shape: "data",
  resolve(valueNode, context) {
    if (valueNode.type !== "json" || valueNode.jsonType !== "string") {
      return;
    }

    let uri;
    try {
      uri = resolveIri(valueNode.value, context.baseUri);
    } catch (_error) {
      context.message(`'${valueNode.value}' isn't a valid URI reference`);
      return;
    }

    if (parseIri(uri).fragment) {
      context.message("'$id' can't have a fragment. Use '$anchor' to identify a schema with a fragment.");
      return;
    }

    context.setBaseUri(uri);
  }
};
