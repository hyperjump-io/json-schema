import { jsonValue } from "@hyperjump/browser/json";
import keywordSchema from "./unknown.schema.json" with { type: "json" };

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Keyword } from "../keyword.d.ts"
 * @import { JsonSchema } from "../json-schema.d.ts"
 */

/**
 * A property of a schema that isn't a keyword in its dialect. Each one gets
 * this URI with its name as the fragment
 * (`https://json-schema.org/keyword/unknown#foo`). The dialect, usually
 * through its meta-schema, decides whether unknown keywords are allowed.
 * It's added to every {@link JsonSchema} by default. Add a keyword with this
 * URI to change how unknown keywords are handled.
 *
 * Unknown keywords are annotations in dialects whose `unknownKeywords` is
 * `annotation`. In dialects whose `unknownKeywords` is `error`, keywords
 * starting with `x-` are allowed, and they're annotations (v1). Otherwise,
 * they have no effect.
 *
 * @type Keyword<{ annotation: Json } | null>
 */
export default {
  uri: "https://json-schema.org/keyword/unknown",
  shape: "data",
  schema: keywordSchema,
  compile(valueNode, context) {
    const { unknownKeywords } = context.dialect;
    const isAnnotation = unknownKeywords === "annotation"
      || (unknownKeywords === "error" && context.keywordName.startsWith("x-"));
    return isAnnotation ? { annotation: jsonValue(valueNode) } : null;
  },
  evaluate(compiled, context) {
    const annotate = context.annotate;
    if (compiled === null || annotate === undefined) {
      return;
    }

    return () => {
      annotate(compiled.annotation);
      return true;
    };
  }
};
