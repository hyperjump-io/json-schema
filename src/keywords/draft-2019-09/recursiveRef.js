/**
 * @import { Keyword, Reference } from "../../keyword.d.ts"
 */

/**
 * `$recursiveRef` in 2019-09. It works like `$ref`, unless the schema it
 * identifies has `$recursiveAnchor: true`, which is a dynamic anchor named
 * `""`. Then the outermost schema in the dynamic scope with
 * `$recursiveAnchor: true` applies instead.
 *
 * @type Keyword<Reference>
 */
export default {
  uri: "https://json-schema.org/keyword/draft-2019-09/recursiveRef",
  shape: "reference",
  lower: ({ schema, handle, dynamicAnchors }) => dynamicAnchors === undefined || dynamicAnchors[""] === handle
    ? { op: "dynamicApply", anchor: "", fallback: handle }
    : schema
};
