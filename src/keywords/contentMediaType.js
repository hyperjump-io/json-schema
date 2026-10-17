/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `contentMediaType`. The media type of a string instance's content. It's an annotation, so the content isn't parsed.
 *
 * @type Keyword<string>
 */
export default {
  uri: "https://json-schema.org/keyword/contentMediaType",
  shape: "data",
  valueSchema: new URL("./contentMediaType.schema.json", import.meta.url).href,
  evaluate(contentMediaType, { instance, annotate }) {
    if (annotate === undefined) {
      return () => true;
    }

    return (node) => {
      if (instance.typeOf(node) === "string") {
        annotate(contentMediaType);
      }
      return true;
    };
  }
};
