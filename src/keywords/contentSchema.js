/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `contentSchema`. A schema for a string instance's content, if the sibling
 * `contentMediaType` says what it is. It's an annotation, so the content
 * isn't validated. Its value is a schema so anything in it that identifies a
 * schema works, but it isn't compiled.
 *
 * @type Keyword<Json>
 */
export default {
  uri: "https://json-schema.org/keyword/contentSchema",
  siblings: { contentMediaType: "https://json-schema.org/keyword/contentMediaType" },
  shape: "unappliedSchema",
  default: true,
  lower: (schema, { contentMediaType }) => contentMediaType === undefined
    ? { op: "pass" }
    : { op: "annotate", value: schema, types: ["string"] }
};
