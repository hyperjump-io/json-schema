import keywordSchema from "./contentEncoding.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `contentEncoding`. The encoding of a string instance, such as `base64`. It's an annotation, so the instance isn't decoded.
 *
 * @type Keyword<string>
 */
export default {
  uri: "https://json-schema.org/keyword/contentEncoding",
  shape: "data",
  schema: keywordSchema,
  evaluate(contentEncoding, { instance, annotate }) {
    if (annotate === undefined) {
      return () => true;
    }

    return (node) => {
      if (instance.typeOf(node) === "string") {
        annotate(contentEncoding);
      }
      return true;
    };
  }
};
