import { jsonValue } from "@hyperjump/browser/json";
import { siblingKeyword } from "./utilities.js";

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
  shape: "schema",
  valueSchema: new URL("./contentSchema.schema.json", import.meta.url).href,
  compile(valueNode, context) {
    const contentMediaTypeNode = siblingKeyword(context.schemaNode, "https://json-schema.org/keyword/contentMediaType");
    return contentMediaTypeNode === undefined ? null : jsonValue(valueNode);
  },
  evaluate(contentSchema, { instance, annotate }) {
    if (contentSchema === null || annotate === undefined) {
      return () => true;
    }

    return (node) => {
      if (instance.typeOf(node) === "string") {
        annotate(contentSchema);
      }
      return true;
    };
  }
};
