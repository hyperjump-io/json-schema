import { getFragment } from "@hyperjump/uri";

/**
 * @import { Keyword, Reference } from "../../keyword.d.ts"
 */

/**
 * `$dynamicRef` in 2020-12. It works like `$ref`, unless the schema it
 * identifies has a dynamic anchor with the same name as the reference's
 * fragment (bookending). Then the outermost schema in the dynamic scope with
 * that anchor applies instead, if there is one. `fragment` is the
 * reference's plain-name fragment, if it has one.
 *
 * @type Keyword<Reference, "reference">
 */
export default {
  uri: "https://json-schema.org/keyword/draft-2020-12/dynamicRef",
  shape: "reference",
  lower({ uri, schema, handle, dynamicAnchors }) {
    // A plain-name fragment identifies the schema it resolved to, so the
    // schema has the dynamic anchor if its resource does. If the resource's
    // anchors aren't known (lint), it might.
    const fragment = getFragment(uri);
    return fragment && !fragment.startsWith("/") && (dynamicAnchors === undefined || Object.hasOwn(dynamicAnchors, fragment))
      ? { op: "dynamicApply", anchor: fragment, fallback: handle }
      : schema;
  }
};
