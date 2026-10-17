import { parseIri, resolveIri, toAbsoluteIri } from "@hyperjump/uri";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `id` in draft-04 and `$id` in draft-06 and draft-07. A fragment-only value
 * (`#foo`) is a plain-name anchor. Otherwise, it identifies a schema resource,
 * and a fragment in it is also an anchor.
 *
 * @type Keyword
 */
export default {
  uri: "https://json-schema.org/keyword/draft-04/id",
  shape: "data",
  valueSchema: new URL("./id.schema.json", import.meta.url).href,
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

    const { fragment } = parseIri(uri);
    if (!valueNode.value.startsWith("#")) {
      context.setBaseUri(toAbsoluteIri(uri));
    }

    if (fragment) {
      if (fragment.startsWith("/")) {
        context.message("An identifier can't have a JSON Pointer fragment");
      } else {
        context.addAnchor(fragment);
      }
    }
  }
};
